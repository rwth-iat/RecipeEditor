from pathlib import Path

from werkzeug.datastructures import FileStorage
from werkzeug.utils import secure_filename


ALLOWED_EXTENSIONS = {"owl", "aasx", "xml", "mtp", "aml"}


def allowed_file(filename, allowed_extensions=None):
    extensions = allowed_extensions or ALLOWED_EXTENSIONS
    return "." in filename and filename.rsplit(".", 1)[1].lower() in extensions


def save_uploaded_file(file_storage: FileStorage, target_directory, filename: str | None = None) -> Path:
    target_dir = Path(target_directory)
    target_dir.mkdir(parents=True, exist_ok=True)

    final_name = filename or secure_filename(file_storage.filename)
    final_path = target_dir / final_name
    file_storage.save(final_path)
    return final_path


def resolve_safe_file_path(target_directory, filename: str) -> Path:
    target_dir = Path(target_directory).resolve()
    target_dir.mkdir(parents=True, exist_ok=True)

    candidate = (target_dir / Path(filename).name).resolve()
    if candidate.parent != target_dir:
        raise FileNotFoundError(filename)
    return candidate


def delete_uploaded_file(target_directory, filename: str) -> Path:
    file_path = resolve_safe_file_path(target_directory, filename)
    if not file_path.exists():
        raise FileNotFoundError(filename)
    file_path.unlink()
    return file_path
