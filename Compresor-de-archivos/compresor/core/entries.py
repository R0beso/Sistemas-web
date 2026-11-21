"""Recorrido de archivos y carpetas para construir entradas de archivo.

Convierte una lista heterogenea de rutas (archivos sueltos y/o carpetas) en una
secuencia de :class:`Entry` con el nombre que tendra cada elemento *dentro* del
archivo comprimido, conservando la estructura de directorios.
"""

from __future__ import annotations

import os
from pathlib import Path
from typing import Iterator, NamedTuple, Sequence


class Entry(NamedTuple):
    """Un elemento a incluir en el archivo comprimido."""

    source: Path
    """Ruta real en el sistema de archivos."""

    arcname: str
    """Nombre dentro del archivo (siempre con '/' y terminado en '/' si es carpeta)."""

    is_dir: bool


def _arcname(path: Path, base: Path) -> str:
    return path.relative_to(base).as_posix()


def iter_entries(paths: Sequence[str | os.PathLike]) -> Iterator[Entry]:
    """Genera las entradas para las rutas indicadas.

    Para cada carpeta se emite primero la propia carpeta (para no perder
    directorios vacios) y despues su contenido, con nombres relativos a la
    carpeta contenedora, de forma que la estructura se conserve al extraer.
    """
    for raw in paths:
        path = Path(raw).expanduser()
        if not path.exists():
            raise FileNotFoundError(f"No existe: {path}")

        if path.is_dir():
            base = path.parent
            yield Entry(path, path.name + "/", True)
            for root, dirs, files in os.walk(path):
                dirs.sort()
                files.sort()
                root_path = Path(root)
                for name in dirs:
                    item = root_path / name
                    yield Entry(item, _arcname(item, base) + "/", True)
                for name in files:
                    item = root_path / name
                    yield Entry(item, _arcname(item, base), False)
        else:
            yield Entry(path, path.name, False)


def total_bytes(entries: Sequence[Entry]) -> int:
    """Suma el tamano de todos los archivos (ignora carpetas)."""
    total = 0
    for entry in entries:
        if entry.is_dir:
            continue
        try:
            total += entry.source.stat().st_size
        except OSError:
            pass
    return total


__all__ = ["Entry", "iter_entries", "total_bytes"]




