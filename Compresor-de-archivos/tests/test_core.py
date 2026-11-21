"""Pruebas de deteccion de formato, niveles y rutas seguras."""

from __future__ import annotations

from pathlib import Path

import pytest

from compresor import compress, extract
from compresor.core import detector, levels
from compresor.core.paths import safe_target


@pytest.mark.parametrize(
    "name,expected",
    [
        ("a.zip", detector.ZIP),
        ("A.ZIP", detector.ZIP),
        ("e.txt", None),
        ("b.7z", None),
        ("c.tar.gz", None),
        ("d.tgz", None),
    ],
)
def test_format_from_extension(name, expected) -> None:
    assert detector.format_from_extension(name) == expected


def test_format_from_magic() -> None:
    assert detector.format_from_magic(b"PK\x03\x04resto") == detector.ZIP
    assert detector.format_from_magic(b"7z\xbc\xaf\x27\x1cresto") is None
    assert detector.format_from_magic(b"\x1f\x8b\x08resto") is None
    assert detector.format_from_magic(b"nada") is None



def test_strip_extension() -> None:
    assert detector.strip_extension("foo.zip") == "foo"
    assert detector.strip_extension("foo.tar.gz") == "foo.tar.gz"
    assert detector.strip_extension("foo.7z") == "foo.7z"
    assert detector.strip_extension("foo.txt") == "foo.txt"



@pytest.mark.parametrize(
    "value,expected",
    [(0, 1), (1, 1), (6, 6), (9, 9), (50, 9), ("x", levels.DEFAULT_LEVEL)],
)
def test_level_normalize(value, expected) -> None:
    assert levels.normalize(value) == expected


def test_level_describe() -> None:
    assert "Maxima" in levels.describe(9)
    assert "Muy rapida" in levels.describe(1)


def test_safe_target_ok(tmp_path: Path) -> None:
    target = safe_target(tmp_path, "sub/dir/file.txt")
    assert target == str((tmp_path / "sub/dir/file.txt").resolve())


@pytest.mark.parametrize("bad", ["../evil.txt", "sub/../../evil.txt"])
def test_safe_target_rejects(tmp_path: Path, bad: str) -> None:
    with pytest.raises(ValueError):
        safe_target(tmp_path, bad)


def test_safe_target_neutralizes_absolute(tmp_path: Path) -> None:
    # Las rutas absolutas no se rechazan: se reinterpretan dentro del destino.
    target = safe_target(tmp_path, "/etc/passwd")
    assert target == str((tmp_path / "etc/passwd").resolve())
    assert tmp_path.resolve() in Path(target).parents


def test_compress_unknown_extension(tmp_path: Path) -> None:
    src = tmp_path / "a.txt"
    src.write_text("x", encoding="utf-8")
    with pytest.raises(ValueError):
        compress([src], tmp_path / "out.rar")
    with pytest.raises(ValueError):
        compress([src], tmp_path / "out.7z")
    with pytest.raises(ValueError):
        compress([src], tmp_path / "out.tar.gz")



def test_extract_unknown_format(tmp_path: Path) -> None:
    bad = tmp_path / "archivo.bin"
    bad.write_bytes(b"no soy un archivo comprimido")
    with pytest.raises(ValueError):
        extract(bad, tmp_path / "out")
