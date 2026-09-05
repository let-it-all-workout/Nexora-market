"""Build a simple multi-page PDF study guide from the personal presentation markdown."""

from __future__ import annotations

import re
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent
SOURCE = ROOT / "PERSONAL_PRESENTATION_STUDY_GUIDE.md"
OUTPUT = ROOT / "PERSONAL_PRESENTATION_STUDY_GUIDE.pdf"

PAGE_W = 1240
PAGE_H = 1754
MARGIN_X = 90
MARGIN_Y = 90
CONTENT_W = PAGE_W - (MARGIN_X * 2)
BOTTOM_Y = PAGE_H - MARGIN_Y - 70

BG = (255, 255, 255)
TEXT = (17, 24, 39)
MUTED = (71, 85, 105)
ACCENT = (16, 185, 129)


def load_font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    candidates = (
        [
            "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
            "/usr/share/fonts/truetype/liberation2/LiberationSans-Bold.ttf",
        ]
        if bold
        else [
            "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
            "/usr/share/fonts/truetype/liberation2/LiberationSans-Regular.ttf",
        ]
    )
    for path in candidates:
        if Path(path).exists():
            return ImageFont.truetype(path, size=size)
    return ImageFont.load_default()


TITLE_FONT = load_font(38, bold=True)
H2_FONT = load_font(30, bold=True)
H3_FONT = load_font(25, bold=True)
BODY_FONT = load_font(22)
BODY_BOLD = load_font(22, bold=True)
SMALL_FONT = load_font(16)


def clean_text(text: str) -> str:
    text = text.replace("**", "")
    text = text.replace("`", "")
    text = re.sub(r"(?<!\*)\*(?!\*)", "", text)
    return text.strip()


def wrap_text(draw: ImageDraw.ImageDraw, text: str, font: ImageFont.ImageFont, max_width: int) -> list[str]:
    words = text.split()
    if not words:
        return [""]
    lines: list[str] = []
    current = words[0]
    for word in words[1:]:
        trial = f"{current} {word}"
        if draw.textlength(trial, font=font) <= max_width:
            current = trial
        else:
            lines.append(current)
            current = word
    lines.append(current)
    return lines


def line_height(font: ImageFont.ImageFont) -> int:
    bbox = font.getbbox("Ag")
    return (bbox[3] - bbox[1]) + 8


def new_page() -> tuple[Image.Image, ImageDraw.ImageDraw, int]:
    image = Image.new("RGB", (PAGE_W, PAGE_H), BG)
    draw = ImageDraw.Draw(image)
    draw.rectangle((0, 0, PAGE_W, 26), fill=ACCENT)
    return image, draw, MARGIN_Y


def add_footer(draw: ImageDraw.ImageDraw, page_no: int) -> None:
    draw.line((MARGIN_X, PAGE_H - 60, PAGE_W - MARGIN_X, PAGE_H - 60), fill=(226, 232, 240), width=2)
    footer = f"Personal Presentation Study Guide  |  Page {page_no}"
    draw.text((MARGIN_X, PAGE_H - 48), footer, font=SMALL_FONT, fill=MUTED)


def ensure_space(
    pages: list[Image.Image],
    image: Image.Image,
    draw: ImageDraw.ImageDraw,
    y: int,
    required: int,
) -> tuple[Image.Image, ImageDraw.ImageDraw, int]:
    if y + required <= BOTTOM_Y:
        return image, draw, y
    pages.append(image)
    return new_page()


def render_markdown(lines: list[str]) -> list[Image.Image]:
    pages: list[Image.Image] = []
    image, draw, y = new_page()

    for raw in lines:
        line = raw.rstrip()
        stripped = line.strip()

        if not stripped:
            y += 12
            continue

        if stripped.startswith("# "):
            text = clean_text(stripped[2:])
            image, draw, y = ensure_space(pages, image, draw, y, line_height(TITLE_FONT) + 18)
            draw.text((MARGIN_X, y), text, font=TITLE_FONT, fill=TEXT)
            y += line_height(TITLE_FONT) + 10
            continue

        if stripped.startswith("## "):
            text = clean_text(stripped[3:])
            image, draw, y = ensure_space(pages, image, draw, y, line_height(H2_FONT) + 18)
            draw.text((MARGIN_X, y), text, font=H2_FONT, fill=TEXT)
            y += line_height(H2_FONT) + 8
            continue

        if stripped.startswith("### "):
            text = clean_text(stripped[4:])
            image, draw, y = ensure_space(pages, image, draw, y, line_height(H3_FONT) + 14)
            draw.text((MARGIN_X, y), text, font=H3_FONT, fill=TEXT)
            y += line_height(H3_FONT) + 6
            continue

        bullet_text = None
        indent = 0
        prefix = ""
        font = BODY_FONT

        numbered = re.match(r"^(\d+\.)\s+(.*)$", stripped)
        if stripped.startswith("- "):
            bullet_text = clean_text(stripped[2:])
            prefix = "•"
            indent = 34
        elif numbered:
            prefix = numbered.group(1)
            bullet_text = clean_text(numbered.group(2))
            indent = 42

        if bullet_text is not None:
            wrapped = wrap_text(draw, bullet_text, font, CONTENT_W - indent)
            needed = len(wrapped) * line_height(font) + 10
            image, draw, y = ensure_space(pages, image, draw, y, needed)
            draw.text((MARGIN_X, y), prefix, font=BODY_BOLD, fill=TEXT)
            for idx, segment in enumerate(wrapped):
                x = MARGIN_X + indent
                yy = y + (idx * line_height(font))
                draw.text((x, yy), segment, font=font, fill=TEXT)
            y += needed
            continue

        text = clean_text(stripped)
        font = BODY_BOLD if text.endswith(":") and len(text.split()) <= 8 else BODY_FONT
        wrapped = wrap_text(draw, text, font, CONTENT_W)
        needed = len(wrapped) * line_height(font) + 8
        image, draw, y = ensure_space(pages, image, draw, y, needed)
        for idx, segment in enumerate(wrapped):
            draw.text((MARGIN_X, y + (idx * line_height(font))), segment, font=font, fill=TEXT)
        y += needed

    pages.append(image)
    return pages


def build_pdf() -> None:
    lines = SOURCE.read_text(encoding="utf-8").splitlines()
    pages = render_markdown(lines)
    for idx, page in enumerate(pages, start=1):
        add_footer(ImageDraw.Draw(page), idx)
    first, *rest = pages
    first.save(OUTPUT, "PDF", resolution=150.0, save_all=True, append_images=rest)


if __name__ == "__main__":
    build_pdf()
    print(f"Wrote {OUTPUT}")
