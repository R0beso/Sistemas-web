"""Utilidades de rutas seguras para evitar la escritura fuera del destino
(zip-slip / path traversal) al extraer archivos."""

from __future__ import annotations

import os
from pathlib import Path


def safe_target(destination: str | os.PathLike, member_name: str) -> str:
    """Devuelve la ruta absoluta de destino de un miembro, validada.

    Lanza :class:`ValueError` si el miembro intentaria escribirse fuera de la
    carpeta de destino.
    """
    dest = Path(destination).resolve()
    # Normalizar separadores y quitar raices absolutas o de unidad.
    name = member_name.replace("\\", "/").lstrip("/")
    # Descartar componentes vacios o de navegacion hacia arriba.
    parts = [p for p in name.split("/") if p not in ("", ".")]
    if any(p == ".." for p in parts):
        raise ValueError(f"Ruta insegura en el archivo: {member_name!r}")

    target = dest.joinpath(*parts).resolve()
    if target != dest and dest not in target.parents:
        raise ValueError(f"Ruta insegura en el archivo: {member_name!r}")
    return str(target)


def human_size(num_bytes: int) -> str:
    """Formatea un tamano en bytes de forma legible."""
    size = float(num_bytes)
    for unit in ("B", "KB", "MB", "GB", "TB"):
        if size < 1024 or unit == "TB":
            if unit == "B":
                return f"{int(size)} {unit}"
            return f"{size:.1f} {unit}"
        size /= 1024
    return f"{size:.1f} TB"


__all__ = ["safe_target", "human_size"]

