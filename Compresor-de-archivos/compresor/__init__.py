"""Compresor de archivos.

Paquete principal con el nucleo de compresion/extraccion (`compresor.core`)
y los motores por formato (`compresor.backends`).
"""

from .core.compress import compress
from .core.extract import extract

__all__ = ["compress", "extract", "__version__"]

__version__ = "0.1.0"
