"""Ejecucion de tareas en segundo plano para no bloquear la interfaz."""

from __future__ import annotations

import queue
import threading
from typing import Callable

PROGRESS_INTERVAL_MS = 80


class BackgroundTask:
    """Ejecuta ``work`` en un hilo y entrega progreso/resultado al hilo de Tk.

    ``work`` recibe una funcion ``progress(done, total, name)`` que puede
    invocarse desde el hilo de trabajo sin peligro: los eventos se encolan y se
    procesan en el hilo principal de Tkinter.
    """

    def __init__(self, root) -> None:
        self._root = root
        self._queue: "queue.Queue[tuple[str, object]]" = queue.Queue()
        self.on_progress: Callable[[int, int, str], None] | None = None
        self.on_done: Callable[[object], None] | None = None
        self.on_error: Callable[[BaseException], None] | None = None

    def start(self, work: Callable[[Callable[[int, int, str], None]], object]) -> None:
        thread = threading.Thread(target=self._run, args=(work,), daemon=True)
        thread.start()
        self._root.after(PROGRESS_INTERVAL_MS, self._poll)

    def _run(self, work) -> None:
        def progress(done: int, total: int, name: str) -> None:
            self._queue.put(("progress", (done, total, name)))

        try:
            result = work(progress)
            self._queue.put(("done", result))
        except BaseException as exc:  # noqa: BLE001 - se reporta en la UI
            self._queue.put(("error", exc))

    def _poll(self) -> None:
        reschedule = True
        while True:
            try:
                kind, payload = self._queue.get_nowait()
            except queue.Empty:
                break

            if kind == "progress":
                if self.on_progress:
                    self.on_progress(*payload)  # type: ignore[arg-type]
            elif kind == "done":
                reschedule = False
                if self.on_done:
                    self.on_done(payload)
            elif kind == "error":
                reschedule = False
                if self.on_error:
                    self.on_error(payload)  # type: ignore[arg-type]

        if reschedule:
            self._root.after(PROGRESS_INTERVAL_MS, self._poll)
