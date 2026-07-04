from pathlib import Path

from PIL import Image, ImageEnhance, ImageFilter, ImageDraw
from rembg import remove


SRC = Path(r"C:\Users\bruno\Downloads\produtos editar")
OUT = Path(r"C:\Users\bruno\Downloads\produtos editar editados\montagens-finais")
CUTOUT = Path(r"C:\Users\bruno\Downloads\produtos editar editados\recortes\protese-vermelha-sem-saco-cutout.png")

BACKGROUND = SRC / "ChatGPT Image 2 de jul. de 2026, 19_19_48 (1).png"
CLEAN_PRODUCT = SRC / "WhatsApp Image 2026-06-23 at 16.18.43.jpeg"
FINAL = OUT / "10-protese-com-ventosa-vermelha-sem-saco-v3.png"


def crop_alpha(image, pad=18):
    bbox = image.getchannel("A").getbbox()
    if not bbox:
        return image
    return image.crop((
        max(0, bbox[0] - pad),
        max(0, bbox[1] - pad),
        min(image.width, bbox[2] + pad),
        min(image.height, bbox[3] + pad),
    ))


def make_cutout():
    if CUTOUT.exists():
        return Image.open(CUTOUT).convert("RGBA")

    source = Image.open(CLEAN_PRODUCT).convert("RGBA")
    cutout = remove(source).convert("RGBA")
    cutout = crop_alpha(cutout)
    alpha = cutout.getchannel("A").point(lambda v: 0 if v < 220 else 255)
    alpha = alpha.filter(ImageFilter.GaussianBlur(0.45))
    cutout.putalpha(alpha)
    CUTOUT.parent.mkdir(parents=True, exist_ok=True)
    cutout.save(CUTOUT)
    return cutout


def recolor_to_coral(product):
    # Recolore o produto bege para coral/vermelho sem destruir luz e textura.
    rgb = product.convert("RGB")
    gray = rgb.convert("L")
    colorized = Image.merge("RGB", (
        gray.point(lambda v: min(255, int(v * 1.22 + 42))),
        gray.point(lambda v: min(255, int(v * 0.50 + 34))),
        gray.point(lambda v: min(255, int(v * 0.42 + 28))),
    ))
    colorized = ImageEnhance.Color(colorized).enhance(1.22)
    colorized = ImageEnhance.Contrast(colorized).enhance(1.04)

    result = colorized.convert("RGBA")
    result.putalpha(product.getchannel("A"))
    return result


def add_shadow(canvas, product, x, y):
    ellipse_w = int(product.width * 0.58)
    ellipse_h = max(18, int(product.height * 0.055))
    shadow = Image.new("RGBA", (ellipse_w, ellipse_h), (0, 0, 0, 0))
    mask = Image.new("L", (ellipse_w, ellipse_h), 0)
    draw = ImageDraw.Draw(mask)
    draw.ellipse((0, 0, ellipse_w - 1, ellipse_h - 1), fill=54)
    shadow.putalpha(mask.filter(ImageFilter.GaussianBlur(10)))
    canvas.alpha_composite(shadow, (x + (product.width - ellipse_w) // 2, y + product.height - int(ellipse_h * 0.62)))


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    bg = Image.open(BACKGROUND).convert("RGBA")
    product = make_cutout()
    product = recolor_to_coral(product)

    target_h = int(bg.height * 0.42)
    target_w = int(bg.width * 0.27)
    ratio = min(target_h / product.height, target_w / product.width)
    product = product.resize((int(product.width * ratio), int(product.height * ratio)), Image.LANCZOS)
    product = ImageEnhance.Sharpness(product).enhance(1.10)

    x = int(bg.width * 0.62 - product.width / 2)
    y = int(bg.height * 0.742 - product.height)

    canvas = bg.copy()
    canvas.alpha_composite(product, (x, y))
    canvas.convert("RGB").save(FINAL, quality=96)
    print(FINAL)


if __name__ == "__main__":
    main()
