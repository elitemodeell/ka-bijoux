from __future__ import annotations

from pathlib import Path
import hashlib
import json
from datetime import datetime

from PIL import Image, ImageDraw, ImageFont, ImageOps


ROOT = Path(__file__).resolve().parents[1]
SOURCE_DIR = Path.home() / "Downloads" / "produtos atualizados"
OUT_DIR = ROOT / "reports" / "product-image-review"


def avg_hash(image: Image.Image, size: int = 8) -> str:
    small = ImageOps.grayscale(image).resize((size, size), Image.Resampling.LANCZOS)
    pixels = list(small.getdata())
    mean = sum(pixels) / len(pixels)
    bits = "".join("1" if p > mean else "0" for p in pixels)
    return f"{int(bits, 2):016x}"


def sha1_file(path: Path) -> str:
    h = hashlib.sha1()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def load_font(size: int) -> ImageFont.ImageFont:
    candidates = [
        Path("C:/Windows/Fonts/arial.ttf"),
        Path("C:/Windows/Fonts/segoeui.ttf"),
    ]
    for p in candidates:
        if p.exists():
            return ImageFont.truetype(str(p), size)
    return ImageFont.load_default()


def wrap_text(text: str, font: ImageFont.ImageFont, max_width: int) -> list[str]:
    words = text.split()
    lines: list[str] = []
    current = ""
    probe = Image.new("RGB", (1, 1))
    draw = ImageDraw.Draw(probe)
    for word in words:
        candidate = f"{current} {word}".strip()
        if draw.textbbox((0, 0), candidate, font=font)[2] <= max_width:
            current = candidate
        else:
            if current:
                lines.append(current)
            current = word
    if current:
        lines.append(current)
    return lines[:2]


def build_contact_sheets(items: list[dict]) -> None:
    font_title = load_font(24)
    font_label = load_font(18)
    font_small = load_font(14)
    cols, rows = 4, 4
    thumb_w, thumb_h = 238, 338
    label_h = 78
    pad = 18
    sheet_w = cols * thumb_w + (cols + 1) * pad
    sheet_h = rows * (thumb_h + label_h) + (rows + 1) * pad + 48

    for sheet_idx, start in enumerate(range(0, len(items), cols * rows), start=1):
        sheet_items = items[start : start + cols * rows]
        sheet = Image.new("RGB", (sheet_w, sheet_h), (245, 242, 239))
        draw = ImageDraw.Draw(sheet)
        draw.text((pad, 12), f"KA Bijoux - imagens prontas - folha {sheet_idx}", fill=(35, 29, 32), font=font_title)

        for idx, item in enumerate(sheet_items):
            col = idx % cols
            row = idx // cols
            x = pad + col * (thumb_w + pad)
            y = 60 + pad + row * (thumb_h + label_h + pad)

            img = ImageOps.exif_transpose(Image.open(item["sourcePath"])).convert("RGB")
            img.thumbnail((thumb_w, thumb_h), Image.Resampling.LANCZOS)
            frame = Image.new("RGB", (thumb_w, thumb_h), (255, 255, 255))
            px = (thumb_w - img.width) // 2
            py = (thumb_h - img.height) // 2
            frame.paste(img, (px, py))
            sheet.paste(frame, (x, y))
            draw.rectangle((x, y, x + thumb_w, y + thumb_h), outline=(188, 179, 174), width=1)

            label_y = y + thumb_h + 7
            draw.text((x, label_y), item["id"], fill=(111, 36, 75), font=font_label)
            for line_no, line in enumerate(wrap_text(item["name"], font_small, thumb_w - 4)):
                draw.text((x, label_y + 24 + line_no * 17), line, fill=(55, 48, 52), font=font_small)

        out = OUT_DIR / f"contact-sheet-{sheet_idx:02d}.jpg"
        sheet.save(out, "JPEG", quality=92, optimize=True)


def main() -> None:
    if not SOURCE_DIR.exists():
        raise SystemExit(f"Source folder not found: {SOURCE_DIR}")
    OUT_DIR.mkdir(parents=True, exist_ok=True)

    files = sorted(
        [p for p in SOURCE_DIR.iterdir() if p.suffix.lower() in {".png", ".jpg", ".jpeg", ".webp"}],
        key=lambda p: (p.stat().st_mtime, p.name.lower()),
    )

    items = []
    for i, path in enumerate(files, start=1):
        with ImageOps.exif_transpose(Image.open(path)).convert("RGB") as img:
            item = {
                "id": f"IMG{i:03d}",
                "name": path.name,
                "sourcePath": str(path),
                "sizeBytes": path.stat().st_size,
                "lastModified": datetime.fromtimestamp(path.stat().st_mtime).isoformat(timespec="seconds"),
                "width": img.width,
                "height": img.height,
                "avgHash": avg_hash(img),
                "sha1": sha1_file(path),
            }
            items.append(item)

    (OUT_DIR / "downloads-image-inventory.json").write_text(
        json.dumps(items, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    build_contact_sheets(items)
    print(f"source={SOURCE_DIR}")
    print(f"total={len(items)}")
    print(f"output={OUT_DIR}")


if __name__ == "__main__":
    main()
