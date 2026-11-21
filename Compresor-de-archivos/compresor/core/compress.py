"""Operacion de alto nivel: comprimir una lista de rutas a un archivo."""

from __future__ import annotations

import os
from pathlib import Path
from typing import Callable, Iterable, Sequence

from . import detector, levels

# Firma del callback de progreso: (bytes_hechos, bytes_totales, nombre_actual).
ProgressFn = Callable[[int, int, str], None]


def compress(
    paths: Iterable[str | os.PathLike],
    destination: str | os.PathLike,
    level: int = levels.DEFAULT_LEVEL,
    progress: ProgressFn | None = None,
) -> Path:
    """Comprime ``paths`` (archivos y/o carpetas) en ``destination``.

    El formato se deduce de la extension de ``destination`` (``.zip``,
    ``.7z`` o ``.tar.gz``). Devuelve la ruta del archivo creado.
    """
    # Import perezoso para evitar ciclos de importacion entre core y backends.
    from ..backends import get_backend

    resolved: list[Path] = [Path(p).expanduser() for p in paths]
    if not resolved:
        raise ValueError("No hay archivos ni carpetas que comprimir.")
    for path in resolved:
        if not path.exists():
            raise FileNotFoundError(f"No existe: {path}")

    dest = Path(destination).expanduser()
    fmt = detector.format_from_extension(dest.name)
    if fmt is None:
        raise ValueError(
            f"Extension de salida no soportada. Usa una de: {detector.DEFAULT_EXTENSION[detector.ZIP]}."
        )

    dest.parent.mkdir(parents=True, exist_ok=True)
    backend = get_backend(fmt)
    backend.compress(resolved, dest, levels.normalize(level), progress)
    return dest
