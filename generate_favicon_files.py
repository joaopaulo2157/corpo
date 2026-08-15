#!/usr/bin/env python3
"""Gera as variações PNG a partir do favicon.ico do projeto."""

from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parent
SOURCE = ROOT / "favicon.ico"
OUTPUT_DIR = ROOT / "img"


def main() -> None:
    if not SOURCE.is_file():
        raise SystemExit(f"Arquivo não encontrado: {SOURCE}")

    OUTPUT_DIR.mkdir(exist_ok=True)
    with Image.open(SOURCE) as image:
        rgba = image.convert("RGBA")
        rgba.resize((32, 32), Image.Resampling.LANCZOS).save(OUTPUT_DIR / "favicon.png", optimize=True)
        rgba.resize((180, 180), Image.Resampling.LANCZOS).save(OUTPUT_DIR / "apple-touch-icon.png", optimize=True)

    print("Favicons gerados em img/favicon.png e img/apple-touch-icon.png")


if __name__ == "__main__":
    main()
