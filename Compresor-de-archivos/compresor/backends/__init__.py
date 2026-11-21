"""Motores de compresion/extraccion por formato.

Cada backend expone dos funciones:

``compress(paths, destination, level, progress=None)``
    Crea ``destination`` a partir de la lista de rutas.

``extract(archive, destination, progress=None)``
    Extrae ``archive`` dentro de ``destination``.

Ambas aceptan un ``progress`` opcional con la firma
``progress(bytes_hechos, bytes_totales, nombre_actual)``.

Actualmente el unico formato soportado es ``.zip``, usando ``zipfile`` de la
biblioteca estandar.
"""

from __future__ import annotations

from ..core import detector
from . import zip_backend

_REGISTRY = {
    detector.ZIP: zip_backend,
}


def get_backend(fmt: str):
    """Devuelve el modulo backend correspondiente a un formato."""
    try:
        return _REGISTRY[fmt]
    except KeyError:
        raise ValueError(f"Formato no soportado: {fmt!r}") from None


__all__ = ["get_backend", "zip_backend"]
