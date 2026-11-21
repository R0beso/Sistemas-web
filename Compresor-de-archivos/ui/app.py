"""Ventana principal de la aplicacion."""

from __future__ import annotations

import tkinter as tk
from tkinter import ttk

from .tab_compress import CompressTab
from .tab_extract import ExtractTab


def create_root():
    """Crea la raiz de Tk.

    Usa ``TkinterDnD.Tk`` si ``tkinterdnd2`` esta disponible para habilitar
    arrastrar y soltar; en caso contrario cae en un ``tk.Tk`` normal.
    """
    try:
        from tkinterdnd2 import TkinterDnD

        return TkinterDnD.Tk(), True
    except Exception:  # noqa: BLE001 - DnD es opcional
        return tk.Tk(), False


class App:
    def __init__(self) -> None:
        self.root, self.dnd_enabled = create_root()
        self.root.title("Compresor de archivos")
        self.root.geometry("760x560")
        self.root.minsize(680, 500)

        self._setup_style()

        self.notebook = ttk.Notebook(self.root)
        self.compress_tab = CompressTab(self.notebook, self)
        self.extract_tab = ExtractTab(self.notebook, self)
        self.notebook.add(self.compress_tab, text="  Comprimir  ")
        self.notebook.add(self.extract_tab, text="  Extraer  ")
        self.notebook.pack(fill="both", expand=True, padx=10, pady=(10, 4))

        self.status_var = tk.StringVar(value="Listo.")
        status = ttk.Label(
            self.root,
            textvariable=self.status_var,
            anchor="w",
            relief="sunken",
            padding=(8, 4),
        )
        status.pack(fill="x", side="bottom")

    def _setup_style(self) -> None:
        style = ttk.Style(self.root)
        if "clam" in style.theme_names():
            style.theme_use("clam")
        style.configure("Accent.TButton", font=("", 10, "bold"))

    def set_status(self, text: str) -> None:
        self.status_var.set(text)

    def run(self) -> None:
        self.root.mainloop()


def main() -> None:
    App().run()
