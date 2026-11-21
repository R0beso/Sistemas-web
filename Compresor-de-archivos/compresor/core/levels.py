"""Nivel de compresion unificado (1-9) y su traduccion a cada motor."""

from __future__ import annotations

MIN_LEVEL = 1
MAX_LEVEL = 9
DEFAULT_LEVEL = 6


def normalize(level) -> int:
    """Fuerza un nivel dentro del rango valido [1, 9]."""
    try:
        value = int(level)
    except (TypeError, ValueError):
        return DEFAULT_LEVEL
    return max(MIN_LEVEL, min(MAX_LEVEL, value))


def describe(level) -> str:
    """Descripcion legible del nivel de compresion."""
    value = normalize(level)
    if value <= 2:
        quality = "Muy rapida"
    elif value <= 4:
        quality = "Rapida"
    elif value <= 6:
        quality = "Normal"
    elif value <= 8:
        quality = "Alta"
    else:
        quality = "Maxima"
    return f"{value}: {quality}"


def zip_level(level) -> int:
    """Nivel para `zipfile` (DEFLATED admite 1-9)."""
    return normalize(level)


__all__ = ["MIN_LEVEL", "MAX_LEVEL", "DEFAULT_LEVEL", "normalize", "describe", "zip_level"]




