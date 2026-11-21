"""Operacion de alto nivel: extraer un archivo comprimido."""

from __future__ import annotations

import os
from pathlib import Path

from . import detector
from .compress import ProgressFn


def extract(
    archive: str | os.PathLike,
    destination: str | os.PathLike,
    progress: ProgressFn | None = None,
) -> Path:
    """Extrae ``archive`` dentro de ``destination``.

    El formato se detecta por extension y, si hiciera falta, por los magic
    bytes del archivo. Devuelve la carpeta de destino.
    """
    from ..backends import get_backend

    src = Path(archive).expanduser()
    if not src.exists():
        raise FileNotFoundError(f"No existe: {src}")

    fmt = detector.detect(src)
    if fmt is None:
        raise ValueError(
            f"Formato no reconocido para {src.name!r}. Soportados: .zip."
        )

    dest = Path(destination).expanduser()
    dest.mkdir(parents=True, exist_ok=True)

    backend = get_backend(fmt)
    backend.extract(src, dest, progress)
    return dest
