"""Pestana "Comprimir"."""

from __future__ import annotations

import os
import tkinter as tk
from pathlib import Path
from tkinter import filedialog, messagebox, ttk

from compresor.core import detector, levels
from compresor.core.compress import compress

from .tasks import BackgroundTask

EXTENSION = detector.DEFAULT_EXTENSION[detector.ZIP]
FILETYPES = [("ZIP", "*.zip"), ("Todos los archivos", "*.*")]


class CompressTab(ttk.Frame):
    def __init__(self, master, app) -> None:
        super().__init__(master, padding=12)
        self.app = app
        self.paths: list[str] = []
        self.task: BackgroundTask | None = None
        self._build()

    # ------------------------------------------------------------------ UI
    def _build(self) -> None:
        files = ttk.LabelFrame(self, text="Archivos y carpetas", padding=8)
        files.pack(fill="both", expand=True)

        list_frame = ttk.Frame(files)
        list_frame.pack(fill="both", expand=True)
        self.listbox = tk.Listbox(list_frame, selectmode="extended", activestyle="none")
        scroll = ttk.Scrollbar(list_frame, orient="vertical", command=self.listbox.yview)
        self.listbox.configure(yscrollcommand=scroll.set)
        self.listbox.pack(side="left", fill="both", expand=True)
        scroll.pack(side="right", fill="y")

        buttons = ttk.Frame(files)
        buttons.pack(fill="x", pady=(8, 0))
        ttk.Button(buttons, text="Añadir archivos", command=self.add_files).pack(side="left")
        ttk.Button(buttons, text="Añadir carpeta", command=self.add_folder).pack(side="left", padx=6)
        ttk.Button(buttons, text="Quitar", command=self.remove_selected).pack(side="left")
        ttk.Button(buttons, text="Limpiar", command=self.clear).pack(side="left", padx=6)

        self.drop_hint = ttk.Label(
            files, text="", foreground="#6b6b6b", justify="center"
        )
        self.drop_hint.pack(fill="x", pady=(6, 0))

        # --- Salida -----------------------------------------------------
        out = ttk.LabelFrame(self, text="Archivo de salida", padding=8)
        out.pack(fill="x", pady=(10, 0))
        out.columnconfigure(1, weight=1)

        ttk.Label(out, text="Guardar como:").grid(row=0, column=0, sticky="w")
        self.output_var = tk.StringVar()
        entry = ttk.Entry(out, textvariable=self.output_var)
        entry.grid(row=0, column=1, sticky="ew", padx=(6, 6))
        ttk.Button(out, text="Examinar...", command=self.choose_output).grid(
            row=0, column=2
        )

        # --- Nivel ------------------------------------------------------
        lvl = ttk.LabelFrame(self, text="Nivel de compresion", padding=8)
        lvl.pack(fill="x", pady=(10, 0))
        self.level_var = tk.IntVar(value=levels.DEFAULT_LEVEL)
        self.level_scale = tk.Scale(
            lvl,
            from_=levels.MIN_LEVEL,
            to=levels.MAX_LEVEL,
            orient="horizontal",
            variable=self.level_var,
            resolution=1,
            tickinterval=1,
            showvalue=False,
            command=self._on_level_change,
        )
        self.level_scale.pack(side="left", fill="x", expand=True)
        self.level_label = ttk.Label(lvl, text=levels.describe(levels.DEFAULT_LEVEL), width=14)
        self.level_label.pack(side="left", padx=(10, 0))

        # --- Accion -----------------------------------------------------
        action = ttk.Frame(self)
        action.pack(fill="x", pady=(10, 0))
        self.compress_button = ttk.Button(
            action, text="Comprimir", style="Accent.TButton", command=self.start_compress
        )
        self.compress_button.pack(side="left")
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

            for widget in (self.listbox, self.drop_hint):
                widget.drop_target_register(DND_FILES)
                widget.dnd_bind("<<Drop>>", self._on_drop)
            self.drop_hint.configure(text="Arrastra aqui archivos o carpetas.")
        except Exception:  # noqa: BLE001
            self.drop_hint.configure(text="")

    def _on_drop(self, event) -> None:
        try:
            items = self.winfo_toplevel().tk.splitlist(event.data)
        except tk.TclError:
            items = [event.data]
        self.add_paths(items)

    # ------------------------------------------------------------ Gestion
    def add_files(self) -> None:
        selected = filedialog.askopenfilenames(title="Selecciona archivos")
        self.add_paths(selected)

    def add_folder(self) -> None:
        selected = filedialog.askdirectory(title="Selecciona una carpeta")
        if selected:
            self.add_paths([selected])

    def add_paths(self, items) -> None:
        added = False
        for item in items:
            path = os.path.normpath(item)
            if path and path not in self.paths:
                self.paths.append(path)
                self.listbox.insert("end", path)
                added = True
        if added:
            self._suggest_output()

    def remove_selected(self) -> None:
        for index in reversed(self.listbox.curselection()):
            del self.paths[index]
            self.listbox.delete(index)

    def clear(self) -> None:
        self.paths.clear()
        self.listbox.delete(0, "end")

    def _suggest_output(self) -> None:
        if self.output_var.get().strip() or not self.paths:
            return
        first = Path(self.paths[0])
        base = first.name if first.is_dir() else first.stem
        self.output_var.set(str(first.parent / f"{base}{EXTENSION}"))

    def choose_output(self) -> None:
        initial = self.output_var.get().strip()
        initialdir = os.path.dirname(initial) or None
        selected = filedialog.asksaveasfilename(
            title="Guardar archivo comprimido",
            defaultextension=EXTENSION,
            filetypes=FILETYPES,
            initialfile=os.path.basename(initial) or f"comprimido{EXTENSION}",
            initialdir=initialdir,
        )
        if selected:
            self.output_var.set(selected)

    def _on_level_change(self, _value=None) -> None:
        self.level_label.configure(text=levels.describe(self.level_var.get()))

    # ------------------------------------------------------------ Comprimir
    def start_compress(self) -> None:
        if not self.paths:
            messagebox.showwarning("Comprimir", "Añade al menos un archivo o carpeta.")
            return

        dest = self.output_var.get().strip()
        if not dest:
            messagebox.showwarning("Comprimir", "Indica el archivo de salida.")
            return

        if detector.format_from_extension(dest) != detector.ZIP:
            dest = str(Path(dest).with_name(Path(dest).name + EXTENSION))
            self.output_var.set(dest)

        paths = list(self.paths)
        level = levels.normalize(self.level_var.get())

        self.compress_button.configure(state="disabled")
        self.progress.configure(mode="determinate", value=0)
        self.app.set_status("Comprimiendo...")

        task = BackgroundTask(self)
        self.task = task

        def work(progress):
            return compress(paths, dest, level=level, progress=progress)

        def on_progress(done: int, total: int, name: str) -> None:
            if total > 0:
                self.progress.configure(value=min(100, done * 100 / total))
            self.app.set_status(
                f"Comprimiendo {os.path.basename(name)}  ({done * 100 // max(total, 1)}%)"
            )

        def on_done(result) -> None:
            self.compress_button.configure(state="normal")
            self.progress.configure(value=100)
            self.app.set_status(f"Listo: {result}")
            messagebox.showinfo("Comprimir", f"Archivo creado:\n{result}")

        def on_error(exc: BaseException) -> None:
            self.compress_button.configure(state="normal")
            self.progress.configure(value=0)
            self.app.set_status("Error al comprimir.")
            messagebox.showerror("Error al comprimir", str(exc))

        task.on_progress = on_progress
        task.on_done = on_done
        task.on_error = on_error
        task.start(work)
