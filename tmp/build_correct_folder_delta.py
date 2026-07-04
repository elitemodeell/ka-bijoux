from __future__ import annotations

from datetime import datetime
from pathlib import Path
import hashlib
import json

from PIL import Image, ImageDraw, ImageFont, ImageOps


ROOT = Path(__file__).resolve().parents[1]
SOURCE_DIR = Path.home() / "Downloads" / "produtos atualizados"
BASE_INVENTORY = ROOT / "reports" / "product-image-review" / "downloads-image-inventory.json"
OUT_DIR = ROOT / "reports" / "product-image-review-correct-folder-new"


def sha1_file(path: Path) -> str:
    h = hashlib.sha1()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def avg_hash(image: Image.Image, size: int = 8) -> str:
    small = ImageOps.grayscale(image).resize((size, size), Image.Resampling.LANCZOS)
    pixels = list(small.getdata())
    mean = sum(pixels) / len(pixels)
    bits = "".join("1" if p > mean else "0" for p in pixels)
    return f"{int(bits, 2):016x}"


def load_font(size: int) -> ImageFont.ImageFont:
    for candidate in (Path("C:/Windows/Fonts/arial.ttf"), Path("C:/Windows/Fonts/segoeui.ttf")):
        if candidate.exists():
            return ImageFont.truetype(str(candidate), size)
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
            continue
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
        draw.text((pad, 12), f"KA Bijoux - novos na pasta correta - folha {sheet_idx}", fill=(35, 29, 32), font=font_title)

        for idx, item in enumerate(sheet_items):
            col = idx % cols
            row = idx // cols
            x = pad + col * (thumb_w + pad)
            y = 60 + pad + row * (thumb_h + label_h + pad)

            img = ImageOps.exif_transpose(Image.open(item["sourcePath"])).convert("RGB")
            img.thumbnail((thumb_w, thumb_h), Image.Resampling.LANCZOS)
            frame = Image.new("RGB", (thumb_w, thumb_h), (255, 255, 255))
            frame.paste(img, ((thumb_w - img.width) // 2, (thumb_h - img.height) // 2))
            sheet.paste(frame, (x, y))
            draw.rectangle((x, y, x + thumb_w, y + thumb_h), outline=(188, 179, 174), width=1)

            label_y = y + thumb_h + 7
            draw.text((x, label_y), item["id"], fill=(111, 36, 75), font=font_label)
            for line_no, line in enumerate(wrap_text(item["name"], font_small, thumb_w - 4)):
                draw.text((x, label_y + 24 + line_no * 17), line, fill=(55, 48, 52), font=font_small)

        sheet.save(OUT_DIR / f"contact-sheet-{sheet_idx:02d}.jpg", "JPEG", quality=92, optimize=True)


def main() -> None:
    if not SOURCE_DIR.exists():
        raise SystemExit(f"Pasta fonte nao encontrada: {SOURCE_DIR}")
    if not BASE_INVENTORY.exists():
        raise SystemExit(f"Inventario base nao encontrado: {BASE_INVENTORY}")

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    base_items = json.loads(BASE_INVENTORY.read_text(encoding="utf-8-sig"))
    base_hashes = {item.get("sha1") for item in base_items if item.get("sha1")}

    files = sorted(
        [p for p in SOURCE_DIR.iterdir() if p.suffix.lower() in {".png", ".jpg", ".jpeg", ".webp"}],
        key=lambda p: (p.stat().st_mtime, p.name.lower()),
    )

    all_items: list[dict] = []
    new_items: list[dict] = []
    for index, path in enumerate(files, start=1):
        file_hash = sha1_file(path)
        with ImageOps.exif_transpose(Image.open(path)).convert("RGB") as img:
            item = {
                "id": f"CF-IMG{index:03d}",
                "newId": "",
                "name": path.name,
                "sourcePath": str(path),
                "sizeBytes": path.stat().st_size,
                "lastModified": datetime.fromtimestamp(path.stat().st_mtime).isoformat(timespec="seconds"),
                "width": img.width,
                "height": img.height,
                "avgHash": avg_hash(img),
                "sha1": file_hash,
                "isNewComparedToFirstBatch": file_hash not in base_hashes,
            }
        all_items.append(item)
        if item["isNewComparedToFirstBatch"]:
            item["newId"] = f"NEW-IMG{len(new_items) + 1:03d}"
            new_items.append(item)

    (OUT_DIR / "current-folder-inventory.json").write_text(
        json.dumps(all_items, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    (OUT_DIR / "new-files-inventory.json").write_text(
        json.dumps(new_items, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    build_contact_sheets(new_items)

    report = [
        "# Novas imagens na pasta correta",
        "",
        f"- Pasta analisada: `{SOURCE_DIR}`",
        f"- Total atual na pasta: {len(all_items)}",
        f"- Total do primeiro lote aprovado: {len(base_items)}",
        f"- Novas imagens detectadas por hash: {len(new_items)}",
        "",
        "## Arquivos novos",
        "",
        "| ID | Arquivo | Dimensao | Modificado |",
        "| --- | --- | --- | --- |",
    ]
    for item in new_items:
        report.append(
            f"| {item['newId']} | {item['name']} | {item['width']}x{item['height']} | {item['lastModified']} |"
        )
    report.extend(["", "## Folhas de contato", "", "- `contact-sheet-01.jpg`", "- `contact-sheet-02.jpg`"])
    (OUT_DIR / "preflight-report.md").write_text("\n".join(report) + "\n", encoding="utf-8")

    print(f"source={SOURCE_DIR}")
    print(f"total_current={len(all_items)}")
    print(f"base_total={len(base_items)}")
    print(f"new_total={len(new_items)}")
    print(f"output={OUT_DIR}")


if __name__ == "__main__":
    main()
