from __future__ import annotations

from pathlib import Path
import os
import shlex
import shutil
import subprocess


MANCHESTER_PREFIX_MARKERS = (
    "Prefix:",
    "Ontology:",
    "Class:",
    "ObjectProperty:",
    "DataProperty:",
    "Individual:",
    "AnnotationProperty:",
)


class ManchesterConverterError(RuntimeError):
    pass


def get_default_robot_converter_command(base_dir: str | Path | None = None) -> list[str]:
    base_path = Path(base_dir).resolve() if base_dir else Path(__file__).resolve().parent
    java_executable = find_java_executable(base_path)
    robot_jar = find_robot_jar(base_path)
    if not java_executable or not robot_jar:
        return []

    return [
        str(java_executable),
        "-jar",
        str(robot_jar),
        "convert",
        "--input",
        "{input}",
        "--output",
        "{output}",
    ]


def is_probable_manchester(text: str) -> bool:
    meaningful_lines = [
        line.strip()
        for line in (text or "").splitlines()
        if line.strip() and not line.strip().startswith("#")
    ]
    if not meaningful_lines:
        return False

    head = meaningful_lines[:20]
    return any(
        any(line.startswith(marker) for marker in MANCHESTER_PREFIX_MARKERS)
        for line in head
    )


def ensure_converter_available(config: dict) -> list[str]:
    command_template = normalize_command_template(config.get("MANCHESTER_CONVERTER_CMD"))
    if not command_template and config.get("MANCHESTER_CONVERTER_AUTO_DISCOVERY", True):
        command_template = get_default_robot_converter_command(
            config.get("MANCHESTER_CONVERTER_BASE_DIR")
        )
        if command_template:
            config["MANCHESTER_CONVERTER_CMD"] = command_template

    if not command_template:
        raise ManchesterConverterError(
            "Manchester ontology conversion is not configured. "
            "Set MANCHESTER_CONVERTER_CMD with {input} and {output} placeholders."
        )

    executable = command_template[0]
    if Path(executable).exists():
        return command_template
    if shutil.which(executable) is not None:
        return command_template

    raise ManchesterConverterError(
        f"Manchester ontology converter executable '{executable}' was not found."
    )


def convert_manchester_to_rdfxml(source_path: Path, target_path: Path, config: dict) -> None:
    command_template = ensure_converter_available(config)
    command = [
        token.format(input=source_path.resolve(), output=target_path.resolve())
        for token in command_template
    ]

    timeout_seconds = int(config.get("ONTOLOGY_CONVERTER_TIMEOUT_SECONDS", 60))

    try:
        result = subprocess.run(
            command,
            capture_output=True,
            text=True,
            timeout=timeout_seconds,
            check=False,
            shell=False,
        )
    except subprocess.TimeoutExpired as exc:
        raise ManchesterConverterError(
            f"Manchester ontology conversion timed out after {timeout_seconds} seconds."
        ) from exc
    except OSError as exc:
        raise ManchesterConverterError(
            f"Manchester ontology converter could not be started: {exc}"
        ) from exc

    if result.returncode != 0:
        raise ManchesterConverterError(
            "Manchester ontology conversion failed. "
            f"{summarize_process_output(result.stderr or result.stdout)}"
        )

    if not target_path.exists() or target_path.stat().st_size == 0:
        raise ManchesterConverterError(
            "Manchester ontology converter did not produce an RDF/XML output file."
        )


def normalize_command_template(command_template) -> list[str]:
    if command_template is None:
        return []
    if isinstance(command_template, (list, tuple)):
        return [str(token) for token in command_template if str(token).strip()]
    if isinstance(command_template, str):
        stripped = command_template.strip()
        if not stripped:
            return []
        return shlex.split(stripped, posix=os.name != "nt")

    raise ManchesterConverterError(
        "MANCHESTER_CONVERTER_CMD must be a string, list, or tuple."
    )


def find_java_executable(base_path: Path) -> Path | None:
    java_name = "java.exe" if os.name == "nt" else "java"
    candidates = []

    local_java = base_path / "tools" / "jre" / "bin" / java_name
    candidates.append(local_java)

    java_home = os.environ.get("JAVA_HOME")
    if java_home:
        candidates.append(Path(java_home) / "bin" / java_name)

    for candidate in candidates:
        if candidate.exists():
            return candidate.resolve()

    java_from_path = shutil.which(java_name)
    if java_from_path:
        return Path(java_from_path).resolve()

    return None


def find_robot_jar(base_path: Path) -> Path | None:
    candidates = [
        base_path / "tools" / "robot" / "robot.jar",
        base_path / "tools" / "robot.jar",
    ]
    for candidate in candidates:
        if candidate.exists():
            return candidate.resolve()
    return None


def summarize_process_output(output: str, limit: int = 600) -> str:
    normalized = " ".join((output or "").split())
    if not normalized:
        return "The converter did not return any error output."
    if len(normalized) <= limit:
        return normalized
    return f"{normalized[:limit]}..."
