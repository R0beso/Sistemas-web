"""Pruebas del backend ZIP."""

from __future__ import annotations

import zipfile
from pathlib import Path

from compresor import compress, extract


def test_roundtrip_folder(sample_tree: Path, snapshot, tmp_path: Path) -> None:
    archive = tmp_path / "salida.zip"
    compress([sample_tree], archive, level=6)

    assert archive.exists()
    with zipfile.ZipFile(archive) as zf:
        names = zf.namelist()
    assert "src/a.txt" in names
    assert "src/sub/b.txt" in names
    assert "src/sub/deep/c.bin" in names
    assert "src/empty/" in names

    out = tmp_path / "out"
    extract(archive, out)
    assert snapshot(out / "src") == snapshot(sample_tree)


def test_multiple_files(sample_tree: Path, snapshot, tmp_path: Path) -> None:
    files = [sample_tree / "a.txt", sample_tree / "sub" / "b.txt"]
    archive = tmp_path / "varios.zip"
    compress(files, archive, level=1)

    with zipfile.ZipFile(archive) as zf:
        assert sorted(zf.namelist()) == ["a.txt", "b.txt"]

    out = tmp_path / "out"
    extract(archive, out)
    assert (out / "a.txt").read_text(encoding="utf-8") == "hola mundo"
    assert (out / "sub" / "b.txt").exists() is False


def test_levels_produce_valid_archives(sample_tree: Path, tmp_path: Path) -> None:
    for level in (1, 9):
        archive = tmp_path / f"nivel{level}.zip"
        compress([sample_tree], archive, level=level)
        with zipfile.ZipFile(archive) as zf:
            assert zf.testzip() is None
