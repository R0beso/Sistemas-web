"""Deteccion del formato de un archivo comprimido.

Se reconoce por extension y, si esta no es concluyente, por los *magic bytes*
(cabecera binaria) del propio archivo.
"""

from __future__ import annotations

import os
from pathlib import Path

# Identificador interno de formato.
ZIP = "zip"

SUPPORTED: tuple[str, ...] = (ZIP,)

# Extension de salida asociada a cada formato.
DEFAULT_EXTENSION: dict[str, str] = {
    ZIP: ".zip",
}

# Extensiones reconocidas (en minusculas) -> formato.
_EXTENSIONS: dict[str, str] = {
    ".zip": ZIP,
}


def format_from_extension(name: str | os.PathLike) -> str | None:
    """Deduce el formato a partir del nombre/ruta (por su extension)."""
    text = str(name).lower()
    for ext in sorted(_EXTENSIONS, key=len, reverse=True):
        if text.endswith(ext):
            return _EXTENSIONS[ext]
    return None


def format_from_magic(head: bytes) -> str | None:
    """Deduce el formato a partir de los primeros bytes del archivo."""
    if (
        head.startswith(b"PK\x03\x04")
        or head.startswith(b"PK\x05\x06")
        or head.startswith(b"PK\x07\x08")
    ):
        return ZIP
    return None


__all__ = [
    "ZIP",
    "SUPPORTED",
    "DEFAULT_EXTENSION",
    "format_from_extension",
    "format_from_magic",
    "detect",
    "strip_extension",
    "is_supported",
]



def detect(path: str | os.PathLike) -> str | None:
    """Determina el formato de ``path`` (extension y, si falla, magic bytes)."""
    fmt = format_from_extension(path)
    if fmt is not None:
        return fmt
    try:
        with open(path, "rb") as handle:
            head = handle.read(8)
    except OSError:
        return None
    return format_from_magic(head)


def strip_extension(name: str | os.PathLike) -> str:
    """Quita del nombre la extension soportada (si la tiene)."""
    text = str(name)
    lower = text.lower()
    for ext in sorted(_EXTENSIONS, key=len, reverse=True):
        if lower.endswith(ext):
            return text[: -len(ext)]
    return text


def is_supported(name: str | os.PathLike) -> bool:
    return format_from_extension(name) is not None


__all__ = [
    "ZIP",
    "SUPPORTED",
    "DEFAULT_EXTENSION",
    "format_from_extension",
    "format_from_magic",
    "detect",
    "strip_extension",
    "is_supported",
]

