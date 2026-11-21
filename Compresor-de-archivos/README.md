# Compresor de archivos

Aplicación de escritorio con interfaz gráfica (Tkinter) para comprimir y
extraer archivos, escrita en Python.

## Características

- **Formatos soportados:** `.zip` (crear y extraer).
- **Comprimir carpetas y múltiples archivos** en una sola operación.
- **Nivel de compresión ajustable** del 1 (más rápido) al 9 (máxima compresión).
- **Extraer archivos** con detección automática de formato (extensión + *magic
  bytes*).
- **Conserva la estructura de directorios**, incluidos los directorios vacíos.
- **Arrastrar y soltar** archivos y carpetas sobre la ventana.
- **Extracción segura:** valida cada entrada para no escribir fuera de la
  carpeta de destino (protección contra *zip-slip*).

## Requisitos

- Python 3.10 o superior.
- Tkinter (normalmente incluido con Python).
  - Debian/Ubuntu/WSL: `sudo apt install python3-tk`
  - Windows/macOS: ya viene con el instalador oficial de Python.

## Instalación

```bash
python -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

`requirements.txt` incluye:

- [`tkinterdnd2`](https://pypi.org/project/tkinterdnd2/) — arrastrar y soltar
  (si no está instalado, la app funciona igual pero sin DnD).

`zipfile` forma parte de la biblioteca estándar.

## Uso

```bash
python main.py
```

### Pestaña "Comprimir"

1. Añade archivos (`Añadir archivos`) y/o carpetas (`Añadir carpeta`), o
   arrástralos a la ventana.
2. Elige el **formato** de salida.
3. Elige dónde guardar y el **nivel de compresión**.
4. Pulsa **Comprimir**.

### Pestaña "Extraer"

1. Selecciona o arrastra el archivo comprimido.
2. Elige la carpeta de **destino** (se sugiere una automáticamente).
3. Pulsa **Extraer**.

## Estructura del proyecto

```
Compresor-de-archivos/
├── main.py                       # Punto de entrada
├── compresor/                    # Núcleo (sin dependencias de GUI)
│   ├── core/
│   │   ├── detector.py           # Detección de formato
│   │   ├── entries.py            # Recorrido de archivos/carpetas
│   │   ├── levels.py             # Nivel unificado 1-9
│   │   ├── paths.py              # Rutas seguras y formateo
│   │   ├── compress.py           # API de compresión
│   │   └── extract.py            # API de extracción
│   └── backends/
│       └── zip_backend.py        # zipfile

├── ui/                           # Interfaz gráfica (Tkinter)
│   ├── app.py                    # Ventana principal
│   ├── tab_compress.py
│   ├── tab_extract.py
│   └── tasks.py                  # Tareas en segundo plano
├── tests/                        # Pruebas con pytest
├── requirements.txt
└── README.md
```

## Uso como biblioteca

El núcleo se puede usar sin la interfaz gráfica:

```python
from compresor import compress, extract

compress(["documentos/", "foto.jpg"], "backup.zip", level=9)
extract("backup.zip", "restaurado/")

```

## Pruebas

```bash
pytest -q
```

Las pruebas cubren: ida y vuelta (comprimir → extraer) para `.zip`,
estructuras anidadas, directorios vacíos, múltiples archivos, niveles de
compresión, detección de formato y rutas seguras.
