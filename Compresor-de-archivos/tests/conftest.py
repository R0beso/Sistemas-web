"""Configuracion y utilidades compartidas de las pruebas."""

from __future__ import annotations

import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parent.parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))


@pytest.fixture
def sample_tree(tmp_path: Path) -> Path:
    """Crea una carpeta de ejemplo con subcarpetas, archivo vacio y binarios."""
    src = tmp_path / "src"
    (src / "sub" / "deep").mkdir(parents=True)
    (src / "empty").mkdir()
    (src / "a.txt").write_text("hola mundo", encoding="utf-8")
    (src / "sub" / "b.txt").write_text("contenido repetido " * 200, encoding="utf-8")
    (src / "sub" / "deep" / "c.bin").write_bytes(bytes(range(256)) * 8)
    return src


@pytest.fixture
def snapshot():
    """Devuelve una funcion que mapea rutas relativas -> contenido."""

    def _snapshot(root: Path) -> dict[str, bytes]:
        root = Path(root)
        return {
            path.relative_to(root).as_posix(): path.read_bytes()
            for path in root.rglob("*")
            if path.is_file()
        }

    return _snapshot
