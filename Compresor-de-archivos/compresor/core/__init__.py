"""Nucleo: deteccion de formato, niveles y operaciones de alto nivel.

Este paquete no importa `compresor.backends` en tiempo de import, de modo que
los backends puedan importar utilidades de `compresor.core` sin ciclos.
"""

from . import detector, entries, levels, paths

__all__ = ["detector", "entries", "levels", "paths"]
