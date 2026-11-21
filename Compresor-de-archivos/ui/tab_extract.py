"""Pestana "Extraer"."""

from __future__ import annotations

import os
import tkinter as tk
from pathlib import Path
from tkinter import filedialog, messagebox, ttk

from compresor.core import detector
from compresor.core.extract import extract

from .tasks import BackgroundTask

ARCHIVE_PATTERNS = [
    ("ZIP", "*.zip"),
    ("Archivos comprimidos", "*.zip"),
    ("Todos los archivos", "*.*"),
]



class ExtractTab(ttk.Frame):
    def __init__(self, master, app) -> None:
        super().__init__(master, padding=12)
        self.app = app
        self.task: BackgroundTask | None = None
        self._build()

    # ------------------------------------------------------------------ UI
    def _build(self) -> None:
        box = ttk.LabelFrame(self, text="Extraer archivo comprimido", padding=8)
        box.pack(fill="both", expand=True)
        box.columnconfigure(1, weight=1)

        ttk.Label(box, text="Archivo:").grid(row=0, column=0, sticky="w")
        self.archive_var = tk.StringVar()
        ttk.Entry(box, textvariable=self.archive_var).grid(
            row=0, column=1, sticky="ew", padx=(6, 6)
        )
        ttk.Button(box, text="Examinar...", command=self.choose_archive).grid(row=0, column=2)

        ttk.Label(box, text="Destino:").grid(row=1, column=0, sticky="w", pady=(8, 0))
        self.dest_var = tk.StringVar()
        ttk.Entry(box, textvariable=self.dest_var).grid(
            row=1, column=1, sticky="ew", padx=(6, 6), pady=(8, 0)
        )
        ttk.Button(box, text="Examinar...", command=self.choose_dest).grid(
            row=1, column=2, pady=(8, 0)
        )

        self.drop_hint = ttk.Label(
            box, text="", foreground="#6b6b6b", justify="center"
        )
        self.drop_hint.grid(row=2, column=0, columnspan=3, sticky="ew", pady=(14, 0))

        action = ttk.Frame(self)
        action.pack(fill="x", pady=(12, 0))
        self.extract_button = ttk.Button(
            action, text="Extraer", style="Accent.TButton", command=self.start_extract
        )
        self.extract_button.pack(side="left")
        self.progress = ttk.Progressbar(action, mode="determinate", maximum=100)
        self.progress.pack(side="left", fill="x", expand=True, padx=10)

        self._register_dnd()

    # --------------------------------------------------------------- DnD
    def _register_dnd(self) -> None:
        if not self.app.dnd_enabled:
            self.drop_hint.configure(
                text="Arrastrar y soltar no disponible (instala tkinterdnd2)."
            )
            return
        try:
            from tkinterdnd2 import DND_FILES

            self.drop_target_register(DND_FILES)
            self.dnd_bind("<<Drop>>", self._on_drop)
            self.drop_hint.configure(text="Arrastra aqui un archivo comprimido.")
        except Exception:  # noqa: BLE001
            self.drop_hint.configure(text="")

    def _on_drop(self, event) -> None:
        try:
            items = self.winfo_toplevel().tk.splitlist(event.data)
        except tk.TclError:
            items = [event.data]
        if items:
            self.archive_var.set(os.path.normpath(items[0]))
            self._suggest_dest()

    # ------------------------------------------------------------ Seleccion
    def choose_archive(self) -> None:
        initial = self.archive_var.get().strip()
        selected = filedialog.askopenfilename(
            title="Selecciona el archivo a extraer",
            filetypes=ARCHIVE_PATTERNS,
            initialdir=os.path.dirname(initial) or None,
        )
        if selected:
            self.archive_var.set(selected)
            self._suggest_dest()

    def choose_dest(self) -> None:
        selected = filedialog.askdirectory(title="Selecciona la carpeta de destino")
        if selected:
            self.dest_var.set(selected)

    def _suggest_dest(self) -> None:
        archive = self.archive_var.get().strip()
        if not archive:
            return
        path = Path(archive)
        stem = Path(detector.strip_extension(path.name)).name or path.stem
        self.dest_var.set(str(path.parent / stem))

    # ------------------------------------------------------------- Extraer
    def start_extract(self) -> None:
        archive = self.archive_var.get().strip()
        if not archive:
            messagebox.showwarning("Extraer", "Indica el archivo a extraer.")
            return
        if not os.path.exists(archive):
            messagebox.showwarning("Extraer", f"No existe el archivo:\n{archive}")
            return

        dest = self.dest_var.get().strip() or str(Path(archive).parent)

        self.extract_button.configure(state="disabled")
        self.progress.configure(mode="determinate", value=0)
        self.app.set_status("Extrayendo...")

        task = BackgroundTask(self)
        self.task = task

        def work(progress):
            return extract(archive, dest, progress=progress)

        def on_progress(done: int, total: int, name: str) -> None:
            if total > 0:
                self.progress.configure(value=min(100, done * 100 / total))
            self.app.set_status(
                f"Extrayendo {os.path.basename(name)}  ({done * 100 // max(total, 1)}%)"
            )

        def on_done(result) -> None:
            self.extract_button.configure(state="normal")
            self.progress.configure(value=100)
            self.app.set_status(f"Listo: {result}")
            messagebox.showinfo("Extraer", f"Extraido en:\n{result}")

        def on_error(exc: BaseException) -> None:
            self.extract_button.configure(state="normal")
            self.progress.configure(value=0)
            self.app.set_status("Error al extraer.")
            messagebox.showerror("Error al extraer", str(exc))

        task.on_progress = on_progress
        task.on_done = on_done
        task.on_error = on_error
        task.start(work)
