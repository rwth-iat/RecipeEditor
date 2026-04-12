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


class OntologyRequestError(OntologyServiceError):
    status_code = 400


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
    return [
        get_ontology_class_display_name(cls)
        for cls in get_sorted_ontology_classes(ontology)
    ]


def get_ontology_class_tree(config: dict, category: str, filename: str) -> dict:
    ontology = load_ontology(config, category, filename)
    return build_normalized_ontology_class_graph(ontology)


def get_ontology_subclasses(
    config: dict,
    category: str,
    filename: str,
    *,
    class_iri: str | None = None,
    class_name: str | None = None,
) -> list[dict]:
    ontology = load_ontology(config, category, filename)
    super_class_obj = resolve_ontology_class(
        ontology,
        filename,
        class_iri=class_iri,
        class_name=class_name,
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
    classes = get_sorted_ontology_classes(ontology)
    class_set = set(classes)
    roots = []

    for cls in classes:
        direct_named_parents = get_direct_named_parents(cls, class_set)
        if not direct_named_parents:
            roots.append(cls)

    return roots


def sort_ontology_classes(classes: Iterable[object]) -> list[object]:
    return sorted(
        list(classes),
        key=lambda cls: (
            get_ontology_class_display_name(cls).lower(),
            normalize_ontology_class_iri(getattr(cls, "iri", "")),
        ),
    )


def get_sorted_ontology_classes(ontology) -> list:
    return sort_ontology_classes(ontology.classes())


def get_direct_named_parents(cls, classes_or_class_set: Iterable[object]) -> list[object]:
    class_set = classes_or_class_set if isinstance(classes_or_class_set, set) else set(classes_or_class_set)
    direct_named_parents = [
        parent
        for parent in cls.is_a
        if parent in class_set and get_ontology_class_display_name(parent)
    ]
    return sort_ontology_classes(direct_named_parents)


def build_ontology_class_other_information(cls) -> list[dict]:
    return [{
        "otherInfoID": "SemanticDescription",
        "description": ["URI referencing the Ontology Class definition"],
        "otherValue": [{
            "valueString": iri_to_uri(cls.iri),
            "dataType": "uriReference",
            "key": str(cls),
        }],
    }]


def get_ontology_class_label(cls) -> str:
    raw_label = getattr(cls, "label", None)
    if isinstance(raw_label, list):
        for value in raw_label:
            label = str(value).strip()
            if label:
                return label
        return ""

    if isinstance(raw_label, str):
        return raw_label.strip()

    return ""


def is_deprecated_ontology_class(cls) -> bool:
    raw_value = getattr(cls, "deprecated", False)
    if isinstance(raw_value, list):
        return any(str(value).strip().lower() == "true" for value in raw_value)

    if isinstance(raw_value, str):
        return raw_value.strip().lower() == "true"

    return bool(raw_value)


def get_direct_named_parent_map(classes: list[object]) -> dict[str, list[object]]:
    class_set = set(classes)
    parent_map = {}

    for cls in classes:
        class_iri = normalize_ontology_class_iri(getattr(cls, "iri", ""))
        if not class_iri:
            continue
        parent_map[class_iri] = get_direct_named_parents(cls, class_set)

    return parent_map


def get_nearest_visible_named_parents(
    cls,
    direct_parent_map: dict[str, list[object]],
    visible_classes: set[object],
    cache: dict[str, list[object]],
    path: set[str] | None = None,
) -> list[object]:
    class_iri = normalize_ontology_class_iri(getattr(cls, "iri", ""))
    if not class_iri:
        return []

    if class_iri in cache:
        return cache[class_iri]

    active_path = path or set()
    if class_iri in active_path:
        return []

    active_path.add(class_iri)
    visible_parents = []

    for parent in direct_parent_map.get(class_iri, []):
        parent_iri = normalize_ontology_class_iri(getattr(parent, "iri", ""))
        if not parent_iri:
            continue

        if parent in visible_classes:
            visible_parents.append(parent)
            continue

        visible_parents.extend(
            get_nearest_visible_named_parents(
                parent,
                direct_parent_map,
                visible_classes,
                cache,
                active_path,
            )
        )

    active_path.remove(class_iri)
    visible_parents = deduplicate_ontology_classes(visible_parents)
    cache[class_iri] = visible_parents
    return visible_parents


def deduplicate_ontology_classes(classes: Iterable[object]) -> list[object]:
    ordered_unique_classes = []
    seen_iris = set()

    for cls in classes:
        class_iri = normalize_ontology_class_iri(getattr(cls, "iri", ""))
        if not class_iri or class_iri in seen_iris:
            continue
        seen_iris.add(class_iri)
        ordered_unique_classes.append(cls)

    return sort_ontology_classes(ordered_unique_classes)


def build_normalized_ontology_class_graph(ontology) -> dict:
    all_classes = get_sorted_ontology_classes(ontology)
    classes = [cls for cls in all_classes if not is_deprecated_ontology_class(cls)]
    visible_class_set = set(classes)
    direct_parent_map = get_direct_named_parent_map(all_classes)
    visible_parent_cache = {}
    parent_map = {}
    child_map = {}
    root_iris = []

    for cls in classes:
        class_iri = normalize_ontology_class_iri(getattr(cls, "iri", ""))
        if not class_iri:
            continue

        direct_named_parents = get_nearest_visible_named_parents(
            cls,
            direct_parent_map,
            visible_class_set,
            visible_parent_cache,
        )
        parent_map[class_iri] = direct_named_parents
        child_map.setdefault(class_iri, [])

        if not direct_named_parents:
            root_iris.append(class_iri)

        for parent in direct_named_parents:
            parent_iri = normalize_ontology_class_iri(getattr(parent, "iri", ""))
            if not parent_iri:
                continue
            child_map.setdefault(parent_iri, []).append(cls)

    nodes = {}
    for cls in classes:
        class_iri = normalize_ontology_class_iri(getattr(cls, "iri", ""))
        if not class_iri:
            continue

        child_iris = [
            normalize_ontology_class_iri(getattr(child, "iri", ""))
            for child in sort_ontology_classes(child_map.get(class_iri, []))
        ]
        parent_iris = [
            normalize_ontology_class_iri(getattr(parent, "iri", ""))
            for parent in parent_map.get(class_iri, [])
        ]

        nodes[class_iri] = {
            "iri": class_iri,
            "name": get_ontology_class_display_name(cls),
            "label": get_ontology_class_label(cls),
            "childIris": deduplicate_ontology_iris(child_iris),
            "parentIris": deduplicate_ontology_iris(parent_iris),
            "otherInformation": build_ontology_class_other_information(cls),
        }

    root_iris = deduplicate_ontology_iris(root_iris)
    hidden_root_iris = {
        root_iri
        for root_iri in root_iris
        if root_iri in nodes and not nodes[root_iri]["label"] and not nodes[root_iri]["childIris"]
    }

    if hidden_root_iris:
        root_iris = [root_iri for root_iri in root_iris if root_iri not in hidden_root_iris]
        for hidden_root_iri in hidden_root_iris:
            nodes.pop(hidden_root_iri, None)

    return {
        "rootIris": root_iris,
        "nodes": nodes,
    }


def get_ontology_class_display_name(cls) -> str:
    name = getattr(cls, "name", None)
    if isinstance(name, str) and name.strip():
        return name.strip()

    iri = normalize_ontology_class_iri(getattr(cls, "iri", ""))
    if iri:
        fragment = iri.rsplit("#", 1)[-1]
        if fragment != iri:
            return fragment
        return iri.rsplit("/", 1)[-1]

    return str(cls).split(".")[-1]


def normalize_ontology_class_iri(value: str | None) -> str:
    normalized = (value or "").strip()
    return iri_to_uri(normalized) if normalized else ""


def deduplicate_ontology_iris(values: Iterable[str]) -> list[str]:
    ordered_unique_iris = []
    seen = set()

    for value in values:
        normalized_iri = normalize_ontology_class_iri(value)
        if not normalized_iri or normalized_iri in seen:
            continue
        seen.add(normalized_iri)
        ordered_unique_iris.append(normalized_iri)

    return ordered_unique_iris


def build_ontology_class_lookups(ontology) -> tuple[dict[str, object], dict[str, list[object]]]:
    iri_lookup = {}
    name_lookup = {}

    for cls in ontology.classes():
        normalized_iri = normalize_ontology_class_iri(getattr(cls, "iri", ""))
        if normalized_iri:
            iri_lookup[normalized_iri] = cls

        display_name = get_ontology_class_display_name(cls)
        if display_name:
            name_lookup.setdefault(display_name, []).append(cls)

    return iri_lookup, name_lookup


def resolve_ontology_class(
    ontology,
    filename: str,
    *,
    class_iri: str | None = None,
    class_name: str | None = None,
):
    iri_lookup, name_lookup = build_ontology_class_lookups(ontology)

    normalized_iri = normalize_ontology_class_iri(class_iri)
    if normalized_iri:
        resolved = iri_lookup.get(normalized_iri)
        if resolved is None:
            raise OntologyNotFoundError(
                f"Superclass '{normalized_iri}' was not found in ontology '{filename}'."
            )
        return resolved

    normalized_name = (class_name or "").strip()
    if normalized_name:
        matches = name_lookup.get(normalized_name, [])
        if not matches:
            raise OntologyNotFoundError(
                f"Superclass '{normalized_name}' was not found in ontology '{filename}'."
            )
        return matches[0]

    raise OntologyRequestError("Missing required query parameter 'classIri'.")


def recursively_add_subclasses(super_class):
    output_obj = {
        "name": get_ontology_class_display_name(super_class),
        "iri": normalize_ontology_class_iri(getattr(super_class, "iri", "")),
        "otherInformation": build_ontology_class_other_information(super_class),
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
