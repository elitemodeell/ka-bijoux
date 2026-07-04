from pathlib import Path
import csv
import math

from PIL import Image, ImageEnhance, ImageFilter, ImageOps
from rembg import remove


SOURCE_DIR = Path(r"C:\Users\bruno\Downloads\produtos editar")
OUTPUT_DIR = Path(r"C:\Users\bruno\Downloads\produtos editar editados\montagens-finais")
CUTOUT_DIR = Path(r"C:\Users\bruno\Downloads\produtos editar editados\recortes")
REPORT_PATH = Path(r"C:\Users\bruno\Downloads\produtos editar editados\montagens-finais\relatorio-montagens.csv")


PAIRS = [
    {
        "item": "01",
        "product": "26560d24-d1c8-44df-b7a6-7b5d9ee56ccf.jpg",
        "background": "ChatGPT Image 2 de jul. de 2026, 19_19_48 (3).png",
        "name": "MYDICK PROTESE COM ESCROTO",
        "code": "3104000004938",
        "scale": 0.54,
        "x": 0.61,
        "base": 0.755,
    },
    {
        "item": "02",
        "product": "1251d5c1-1bf8-4723-8c29-74a58b9b4e14.jpg",
        "background": "ChatGPT Image 2 de jul. de 2026, 19_19_48 (5).png",
        "name": "PROTESE P SEXY NUDE",
        "code": "3104000004943",
        "scale": 0.49,
        "x": 0.61,
        "base": 0.748,
    },
    {
        "item": "03",
        "product": "f5b0dd82-46ce-4d69-a0c7-34fa6794d5ee.jpg",
        "background": "ChatGPT Image 2 de jul. de 2026, 19_19_48 (2).png",
        "name": "PROTESE PP COM ESCROTO",
        "code": "3104000004945",
        "scale": 0.38,
        "x": 0.62,
        "base": 0.742,
    },
    {
        "item": "04",
        "product": "2ce72005-b8fd-44cd-9d74-974361a4133d.jpg",
        "background": "714e3c37-fb8f-4f06-ae26-38cfa7c98c5b.png",
        "name": "PROTESE TEXTURIZADA PRETA COM VENTOSA",
        "code": "",
        "scale": 0.50,
        "x": 0.62,
        "base": 0.747,
    },
    {
        "item": "05",
        "product": "5a4aa2d0-0224-42eb-a8dc-7e328a165eb1.jpg",
        "background": "29adc494-a688-43e7-bc72-09bf27a5e124.png",
        "name": "PROTESE REALISTICA PRETA COM VENTOSA",
        "code": "",
        "scale": 0.49,
        "x": 0.61,
        "base": 0.748,
    },
    {
        "item": "06",
        "product": "90d89e81-96ad-44da-abc8-e9a6d147a2c2.jpg",
        "background": "1bf5ad43-82f7-40de-b59e-250e9eda4f36.png",
        "name": "PROTESE COM ANEL E BASE DE APOIO",
        "code": "",
        "scale": 0.43,
        "x": 0.62,
        "base": 0.746,
    },
    {
        "item": "07",
        "product": "52f43b2d-9193-4422-bd7c-822cf4864d4d.jpg",
        "background": "cd11e16f-28bd-490d-b4d3-3984ac7eaf71.png",
        "name": "PROTESE COM VENTOSA LARANJA",
        "code": "",
        "scale": 0.45,
        "x": 0.62,
        "base": 0.748,
    },
    {
        "item": "08",
        "product": "b0d2b2f7-fce8-4f03-9331-08bc9c7cfa19.jpg",
        "background": "559ed1ff-1116-4a0b-9fab-cc9f802c2beb.png",
        "name": "PROTESE TRANSPARENTE ROXA COM VENTOSA",
        "code": "",
        "scale": 0.45,
        "x": 0.62,
        "base": 0.748,
    },
    {
        "item": "09",
        "product": "efec6e90-1ef3-4a9c-8a59-ef929da0a844.jpg",
        "background": "ChatGPT Image 2 de jul. de 2026, 19_19_48 (4).png",
        "name": "PROTESE REALISTICA ROSA COM VENTOSA",
        "code": "",
        "scale": 0.47,
        "x": 0.62,
        "base": 0.748,
    },
    {
        "item": "10",
        "product": "4285e4ed-7719-47f6-a2f0-2743bca14ef1.jpg",
        "background": "ChatGPT Image 2 de jul. de 2026, 19_19_48 (1).png",
        "name": "PROTESE COM VENTOSA VERMELHA EMBALADA",
        "code": "",
        "scale": 0.45,
        "x": 0.62,
        "base": 0.748,
    },
]


def slug(text):
    cleaned = "".join(ch.lower() if ch.isalnum() else "-" for ch in text)
    return "-".join(part for part in cleaned.split("-") if part)[:90]


def alpha_bbox(image):
    alpha = image.getchannel("A")
    bbox = alpha.getbbox()
    if bbox:
        return bbox
    return (0, 0, image.width, image.height)


def make_cutout(product_path, out_path):
    if out_path.exists():
        return Image.open(out_path).convert("RGBA")

    original = Image.open(product_path).convert("RGBA")
    cutout = remove(original)
    cutout = cutout.convert("RGBA")

    bbox = alpha_bbox(cutout)
    pad = 24
    left = max(0, bbox[0] - pad)
    top = max(0, bbox[1] - pad)
    right = min(cutout.width, bbox[2] + pad)
    bottom = min(cutout.height, bbox[3] + pad)
    cutout = cutout.crop((left, top, right, bottom))

    alpha = cutout.getchannel("A").filter(ImageFilter.GaussianBlur(0.45))
    cutout.putalpha(alpha)
    cutout.save(out_path)
    return cutout


def resize_product(product, background, target_height_ratio):
    target_h = int(background.height * target_height_ratio)
    target_w = int(background.width * 0.34)
    ratio = min(target_h / product.height, target_w / product.width)
    ratio = max(0.1, ratio)
    new_size = (max(1, int(product.width * ratio)), max(1, int(product.height * ratio)))
    return product.resize(new_size, Image.LANCZOS)


def add_shadow(canvas, product, x, y):
    alpha = product.getchannel("A")
    shadow = Image.new("RGBA", product.size, (0, 0, 0, 0))
    shadow.putalpha(alpha.point(lambda value: int(value * 0.20)))
    shadow = shadow.filter(ImageFilter.GaussianBlur(max(5, product.width // 42)))
    canvas.alpha_composite(shadow, (x + max(5, product.width // 35), y + max(8, product.height // 42)))

    ellipse_w = int(product.width * 0.72)
    ellipse_h = max(18, int(product.height * 0.055))
    base_shadow = Image.new("RGBA", (ellipse_w, ellipse_h), (0, 0, 0, 0))
    mask = Image.new("L", (ellipse_w, ellipse_h), 0)
    mask_draw = ImageDrawProxy(mask)
    mask_draw.ellipse((0, 0, ellipse_w - 1, ellipse_h - 1), fill=92)
    base_shadow.putalpha(mask.filter(ImageFilter.GaussianBlur(max(5, ellipse_h // 3))))
    canvas.alpha_composite(base_shadow, (x + (product.width - ellipse_w) // 2, y + product.height - ellipse_h // 2))


class ImageDrawProxy:
    def __init__(self, image):
        from PIL import ImageDraw
        self.draw = ImageDraw.Draw(image)

    def ellipse(self, *args, **kwargs):
        return self.draw.ellipse(*args, **kwargs)


def polish_product(product):
    rgb = Image.new("RGBA", product.size, (255, 255, 255, 0))
    rgb.alpha_composite(product)
    rgb = ImageEnhance.Contrast(rgb).enhance(1.04)
    rgb = ImageEnhance.Sharpness(rgb).enhance(1.10)
    rgb.putalpha(product.getchannel("A"))
    return rgb


def compose(pair):
    bg_path = SOURCE_DIR / pair["background"]
    product_path = SOURCE_DIR / pair["product"]
    cutout_path = CUTOUT_DIR / f"{pair['item']}-{slug(pair['name'])}.png"

    bg = Image.open(bg_path).convert("RGBA")
    cutout = make_cutout(product_path, cutout_path)
    product = resize_product(cutout, bg, pair["scale"])
    product = polish_product(product)

    x = int(bg.width * pair["x"] - product.width / 2)
    y = int(bg.height * pair["base"] - product.height)
    x = max(10, min(x, bg.width - product.width - 10))
    y = max(10, min(y, bg.height - product.height - 10))

    canvas = bg.copy()
    add_shadow(canvas, product, x, y)
    canvas.alpha_composite(product, (x, y))

    out_name = f"{pair['item']}-{slug(pair['name'])}.png"
    out_path = OUTPUT_DIR / out_name
    canvas.convert("RGB").save(out_path, quality=96)

    return {
        "item": pair["item"],
        "codigo": pair["code"],
        "nome": pair["name"],
        "produto_origem": pair["product"],
        "fundo_usado": pair["background"],
        "arquivo_final": str(out_path),
        "tamanho_final_px": f"{canvas.width}x{canvas.height}",
    }


def make_contact_sheet(files):
    from PIL import ImageDraw, ImageFont

    thumb_w, thumb_h = 260, 420
    label_h = 72
    cols = 5
    rows = math.ceil(len(files) / cols)
    sheet = Image.new("RGB", (cols * thumb_w, rows * (thumb_h + label_h)), "white")
    draw = ImageDraw.Draw(sheet)
    try:
        font = ImageFont.truetype("arial.ttf", 14)
    except OSError:
        font = ImageFont.load_default()

    for index, file in enumerate(files):
        image = Image.open(file).convert("RGB")
        image.thumbnail((thumb_w - 18, thumb_h - 18), Image.LANCZOS)
        col = index % cols
        row = index // cols
        x = col * thumb_w + (thumb_w - image.width) // 2
        y = row * (thumb_h + label_h) + 8
        sheet.paste(image, (x, y))
        draw.text((col * thumb_w + 8, row * (thumb_h + label_h) + thumb_h + 2), file.name[:34], fill="black", font=font)
        draw.text((col * thumb_w + 8, row * (thumb_h + label_h) + thumb_h + 22), f"{Image.open(file).size[0]}x{Image.open(file).size[1]}", fill="gray", font=font)

    sheet.save(OUTPUT_DIR / "preview-montagens-finais.png", quality=95)


def main():
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    CUTOUT_DIR.mkdir(parents=True, exist_ok=True)

    rows = []
    final_files = []
    for pair in PAIRS:
        row = compose(pair)
        rows.append(row)
        final_files.append(Path(row["arquivo_final"]))
        print(row["arquivo_final"])

    with REPORT_PATH.open("w", encoding="utf-8-sig", newline="") as file:
        writer = csv.DictWriter(file, fieldnames=list(rows[0].keys()), delimiter=";")
        writer.writeheader()
        writer.writerows(rows)

    make_contact_sheet(final_files)
    print(f"Relatorio: {REPORT_PATH}")
    print(f"Preview: {OUTPUT_DIR / 'preview-montagens-finais.png'}")


if __name__ == "__main__":
    main()
