#!/usr/bin/env python3
"""Punto de entrada de la aplicacion Compresor de archivos."""

from __future__ import annotations

import sys
from pathlib import Path

# Permite ejecutar el script directamente (python main.py) desde cualquier cwd.
sys.path.insert(0, str(Path(__file__).resolve().parent))

from ui.app import main  # noqa: E402

if __name__ == "__main__":
    main()
