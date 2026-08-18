import hashlib
import json
from pathlib import Path


def get_labels_sha256(labels_file_path: str = "shared/labels.json") -> str:
    """Calculates SHA256 hash of shared/labels.json single source of truth."""
    path = Path(labels_file_path)
    if not path.is_absolute():
        # Fallback relative to repo root
        root = Path(__file__).resolve().parent.parent.parent
        path = root / labels_file_path

    if not path.exists():
        raise FileNotFoundError(f"Labels file not found at {path}")

    with open(path, "rb") as f:
        data = f.read()

    return hashlib.sha256(data).hexdigest()
