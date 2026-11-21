"""Backend para archivos ZIP (`.zip`) usando `zipfile` de la stdlib."""

from __future__ import annotations

import os
import shutil
import zipfile

from ..core import levels
from ..core.entries import iter_entries, total_bytes
from ..core.paths import safe_target


def compress(paths, destination, level, progress=None) -> None:
    entries = list(iter_entries(paths))
    total = total_bytes(entries)
    done = 0
    compresslevel = levels.zip_level(level)

    with zipfile.ZipFile(
        destination,
        "w",
        compression=zipfile.ZIP_DEFLATED,
        compresslevel=compresslevel,
    ) as archive:
        for entry in entries:
            if entry.is_dir:
                archive.writestr(entry.arcname, b"")
                if progress:
                    progress(done, total, entry.arcname)
                continue
            archive.write(entry.source, entry.arcname)
            done += entry.source.stat().st_size
            if progress:
                progress(done, total, entry.arcname)


def extract(archive, destination, progress=None) -> None:
    dest = os.fspath(destination)
    with zipfile.ZipFile(archive) as zf:
        infos = zf.infolist()
        total = sum(info.file_size for info in infos)
        done = 0
        for info in infos:
            target = safe_target(dest, info.filename)
            if info.is_dir() or info.filename.endswith("/"):
                os.makedirs(target, exist_ok=True)
                if progress:
                    progress(done, total, info.filename)
                continue
            os.makedirs(os.path.dirname(target), exist_ok=True)
            with zf.open(info) as src, open(target, "wb") as out:
                shutil.copyfileobj(src, out, 1024 * 256)
            done += info.file_size
            if progress:
                progress(done, total, info.filename)
