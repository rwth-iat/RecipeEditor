from __future__ import annotations

from dataclasses import dataclass
from datetime import date
from pathlib import Path
from typing import Iterable
import re
import uuid

import owlready2
from django.utils.encoding import iri_to_uri
from rdflib import Graph
from werkzeug.datastructures import FileStorage

from manchesterConverter import convert_manchester_to_rdfxml, is_probable_manchester


ONTOLOGY_CATEGORIES = ("processes", "materials")
CANONICAL_FORMAT = "rdfxml"
CANONICAL_EXTENSION = ".owl"


class OntologyServiceError(Exception):
    status_code = 500

    def __init__(self, error: str, details: str = "") -> None:
        super().__init__(error)
        self.error = error
        self.details = details


class InvalidOntologyCategoryError(OntologyServiceError):
    status_code = 400


class OntologyNotFoundError(OntologyServiceError):
    status_code = 404


class OntologyValidationError(OntologyServiceError):
    status_code = 422


@dataclass(frozen=True)
class UploadOntologyResult:
    filename: str
    category: str
    detected_format: str
    canonical_format: str = CANONICAL_FORMAT


def get_category_directory(config: dict, category: str) -> Path:
    category_name = validate_category(category)
    root = Path(config["ONTOLOGY_UPLOAD_ROOT"])
    category_dir = root / category_name
    category_dir.mkdir(parents=True, exist_ok=True)
    return category_dir


def get_staging_directory(config: dict) -> Path:
    staging_dir = Path(config["ONTOLOGY_STAGING_ROOT"])
    staging_dir.mkdir(parents=True, exist_ok=True)
    return staging_dir


def list_ontologies(config: dict, category: str, logger=None) -> list[str]:
    category_dir = get_category_directory(config, category)
    available = []
    for ontology_path in sorted(category_dir.glob(f"*{CANONICAL_EXTENSION}")):
        try:
            load_ontology(config, category, ontology_path.name)
        except OntologyServiceError as exc:
            if logger:
                logger.warning(
                    "Skipping invalid ontology '%s' in category '%s': %s %s",
                    ontology_path.name,
                    category,
                    exc.error,
                    exc.details,
                )
            continue
        available.append(ontology_path.name)
    return available


def upload_ontology(file_storage: FileStorage, category: str, config: dict) -> UploadOntologyResult:
    validate_category(category)
    if file_storage is None:
        raise OntologyValidationError("No file uploaded.")
    if not file_storage.filename:
        raise OntologyValidationError("Uploaded ontology has an empty filename.")

    get_category_directory(config, category)
    staging_dir = get_staging_directory(config)
    stage_id = uuid.uuid4().hex
    upload_suffix = Path(file_storage.filename).suffix or ".upload"
    staged_upload = staging_dir / f"{stage_id}{upload_suffix}"
    staged_canonical = staging_dir / f"{stage_id}{CANONICAL_EXTENSION}"

    try:
        file_storage.save(staged_upload)
        detected_format = detect_ontology_format(staged_upload)
        actual_format = normalize_ontology_to_rdfxml(
            staged_upload,
            staged_canonical,
            config=config,
            detected_format=detected_format,
        )
        final_path = allocate_final_path(config, category, file_storage.filename)
        final_path.parent.mkdir(parents=True, exist_ok=True)
        final_path.write_bytes(staged_canonical.read_bytes())
        return UploadOntologyResult(
            filename=final_path.name,
            category=category,
            detected_format=actual_format,
        )
    finally:
        cleanup_paths([staged_upload, staged_canonical])


def delete_ontology(config: dict, category: str, filename: str) -> Path:
    ontology_path = resolve_ontology_path(config, category, filename)
    ontology_path.unlink()
    return ontology_path


def load_ontology(config: dict, category: str, filename: str):
    ontology_path = resolve_ontology_path(config, category, filename)
    world = owlready2.World()
    configure_onto_path(config)
    try:
        with ontology_path.open("rb") as fileobj:
            ontology = world.get_ontology(build_temp_ontology_iri(ontology_path.stem)).load(
                fileobj=fileobj,
                format=CANONICAL_FORMAT,
                only_local=True,
            )
    except Exception as exc:
        raise OntologyValidationError(
            f"Ontology '{filename}' could not be loaded.",
            str(exc),
        ) from exc
    return ontology


def get_ontology_classes(config: dict, category: str, filename: str) -> list[str]:
    ontology = load_ontology(config, category, filename)
    return sorted(cls.name for cls in ontology.classes())


def get_ontology_class_tree(config: dict, category: str, filename: str) -> list[dict]:
    ontology = load_ontology(config, category, filename)
    return [recursively_add_subclasses(root_class) for root_class in get_root_classes(ontology)]


def get_ontology_subclasses(config: dict, category: str, filename: str, super_class: str) -> list[dict]:
    ontology = load_ontology(config, category, filename)
    super_class_obj = ontology[super_class]
    if super_class_obj is None:
        raise OntologyNotFoundError(
            f"Superclass '{super_class}' was not found in ontology '{filename}'."
        )
    return [recursively_add_subclasses(super_class_obj)]


def resolve_ontology_path(config: dict, category: str, filename: str) -> Path:
    category_dir = get_category_directory(config, category).resolve()
    candidate = (category_dir / Path(filename).name).resolve()
    if candidate.parent != category_dir or not candidate.exists():
        raise OntologyNotFoundError(
            f"Ontology '{filename}' was not found in category '{category}'."
        )
    return candidate


def validate_category(category: str) -> str:
    if category not in ONTOLOGY_CATEGORIES:
        raise InvalidOntologyCategoryError(
            f"Unsupported ontology category '{category}'.",
            f"Supported categories are: {', '.join(ONTOLOGY_CATEGORIES)}.",
        )
    return category


def detect_ontology_format(path: Path) -> str:
    preview = path.read_bytes()[:2048]
    if not preview:
        raise OntologyValidationError("Uploaded ontology file is empty.")

    text = preview.decode("utf-8", errors="ignore").lstrip()
    if is_probable_manchester(text):
        return "manchester"
    if text.startswith("@prefix") or text.startswith("@base"):
        return "turtle"
    if "<rdf:RDF" in text or (text.startswith("<?xml") and "<rdf:RDF" in text):
        return "rdfxml"
    if "<Ontology" in text or "<!DOCTYPE Ontology" in text or "<!DOCTYPE owl:Ontology" in text:
        return "owlxml"
    if looks_like_ntriples(text):
        return "ntriples"
    return "unknown"


def normalize_ontology_to_rdfxml(
    source_path: Path,
    canonical_path: Path,
    *,
    config: dict,
    detected_format: str,
) -> str:
    candidate_formats = build_candidate_formats(detected_format)
    failures = []

    for candidate_format in candidate_formats:
        try:
            if candidate_format == "manchester":
                convert_manchester_to_rdfxml(source_path, canonical_path, config)
            elif candidate_format == "turtle":
                canonicalize_with_rdflib(source_path, canonical_path)
            else:
                canonicalize_with_owlready2(source_path, canonical_path, config, candidate_format)
            validate_canonical_ontology(canonical_path, config)
            return candidate_format
        except Exception as exc:
            failures.append(f"{candidate_format}: {exc}")

    raise OntologyValidationError(
        "Ontology format is unsupported or the ontology is invalid.",
        " | ".join(failures),
    )


def build_candidate_formats(detected_format: str) -> list[str]:
    ordered = []
    fallback_formats = ["rdfxml", "owlxml", "ntriples", "turtle"]
    if detected_format == "manchester":
        fallback_formats.append("manchester")

    for fmt in [detected_format, *fallback_formats]:
        if fmt and fmt not in ordered and fmt != "unknown":
            ordered.append(fmt)
    if not ordered:
        ordered = ["rdfxml", "owlxml", "ntriples", "turtle"]
    return ordered


def canonicalize_with_rdflib(source_path: Path, canonical_path: Path) -> None:
    graph = Graph()
    graph.parse(source_path.as_posix(), format="turtle")
    graph.serialize(destination=canonical_path.as_posix(), format="xml")


def canonicalize_with_owlready2(source_path: Path, canonical_path: Path, config: dict, input_format: str) -> None:
    world = owlready2.World()
    configure_onto_path(config)
    with source_path.open("rb") as fileobj:
        ontology = world.get_ontology(build_temp_ontology_iri(source_path.stem)).load(
            fileobj=fileobj,
            format=input_format,
            only_local=True,
        )
    ontology.save(file=canonical_path.as_posix(), format=CANONICAL_FORMAT)


def validate_canonical_ontology(canonical_path: Path, config: dict) -> None:
    world = owlready2.World()
    configure_onto_path(config)
    with canonical_path.open("rb") as fileobj:
        world.get_ontology(build_temp_ontology_iri(canonical_path.stem)).load(
            fileobj=fileobj,
            format=CANONICAL_FORMAT,
            only_local=True,
        )


def configure_onto_path(config: dict) -> None:
    root = Path(config["ONTOLOGY_UPLOAD_ROOT"])
    candidate_paths = [
        root,
        root / "processes",
        root / "materials",
    ]
    for candidate in candidate_paths:
        candidate.mkdir(parents=True, exist_ok=True)
        candidate_str = candidate.as_posix()
        if candidate_str not in owlready2.onto_path:
            owlready2.onto_path.append(candidate_str)


def allocate_final_path(config: dict, category: str, original_filename: str) -> Path:
    category_dir = get_category_directory(config, category)
    base_stem = sanitize_ontology_stem(original_filename)
    primary_candidate = category_dir / f"{base_stem}{CANONICAL_EXTENSION}"
    if not primary_candidate.exists():
        return primary_candidate

    prefix = date.today().strftime("%Y-%m-%d")
    numbered_index = 0
    while True:
        suffix = "" if numbered_index == 0 else f" ({numbered_index + 1})"
        candidate = category_dir / f"{prefix} {base_stem}{suffix}{CANONICAL_EXTENSION}"
        if not candidate.exists():
            return candidate
        numbered_index += 1


def sanitize_ontology_stem(filename: str) -> str:
    raw_stem = Path(filename).stem
    cleaned = re.sub(r"[^A-Za-z0-9.\- ]+", "", raw_stem)
    cleaned = re.sub(r"\s+", " ", cleaned).strip(" .")
    return cleaned or "ontology"


def cleanup_paths(paths: Iterable[Path]) -> None:
    for path in paths:
        try:
            if path.exists():
                path.unlink()
        except FileNotFoundError:
            continue


def looks_like_ntriples(text: str) -> bool:
    for line in text.splitlines():
        stripped = line.strip()
        if not stripped or stripped.startswith("#"):
            continue
        return stripped.startswith("<") and stripped.endswith(".")
    return False


def build_temp_ontology_iri(stem: str) -> str:
    return f"http://recipe-editor.local/ontology/{uuid.uuid4().hex}/{stem}"


def get_root_classes(ontology) -> list:
    classes = sorted(list(ontology.classes()), key=lambda cls: cls.name)
    class_set = set(classes)
    roots = []

    for cls in classes:
        direct_named_parents = [
            parent
            for parent in cls.is_a
            if parent in class_set and getattr(parent, "name", None)
        ]
        if not direct_named_parents:
            roots.append(cls)

    return roots


def recursively_add_subclasses(super_class):
    output_obj = {
        "name": str(super_class).split(".")[-1],
        "otherInformation": [{
            "otherInfoID": "SemanticDescription",
            "description": ["URI referencing the Ontology Class definition"],
            "otherValue": [{
                "valueString": iri_to_uri(super_class.iri),
                "dataType": "uriReference",
                "key": str(super_class),
            }],
        }],
        "children": [],
    }
    if super_class is None:
        return output_obj

    for subclass in list(super_class.subclasses()):
        output_obj["children"].append(recursively_add_subclasses(subclass))
    return output_obj


def format_error_payload(exc: OntologyServiceError) -> dict:
    payload = {"error": exc.error}
    if exc.details:
        payload["details"] = exc.details
    return payload
