from pathlib import Path

from PIL import Image, ImageEnhance, ImageFilter, ImageDraw


SOURCE_DIR = Path(r"C:\Users\bruno\Downloads\produtos editar")
CUTOUT_DIR = Path(r"C:\Users\bruno\Downloads\produtos editar editados\recortes")
OUTPUT_DIR = Path(r"C:\Users\bruno\Downloads\produtos editar editados\montagens-finais")


ITEMS = [
    {
        "item": "07",
        "cutout": "07-protese-com-ventosa-laranja.png",
        "background": "cd11e16f-28bd-490d-b4d3-3984ac7eaf71.png",
        "output": "07-protese-com-ventosa-laranja-baixada-v2.png",
        "scale": 0.45,
        "x": 0.62,
        "base": 0.835,
    },
    {
        "item": "08",
        "cutout": "08-protese-transparente-roxa-com-ventosa.png",
        "background": "559ed1ff-1116-4a0b-9fab-cc9f802c2beb.png",
        "output": "08-protese-transparente-roxa-com-ventosa-baixada-v2.png",
        "scale": 0.45,
        "x": 0.62,
        "base": 0.835,
    },
]


def resize_product(product: Image.Image, background: Image.Image, target_height_ratio: float) -> Image.Image:
    target_h = int(background.height * target_height_ratio)
    target_w = int(background.width * 0.34)
    ratio = min(target_h / product.height, target_w / product.width)
    new_size = (max(1, int(product.width * ratio)), max(1, int(product.height * ratio)))
    return product.resize(new_size, Image.LANCZOS)


def polish_product(product: Image.Image) -> Image.Image:
    alpha = product.getchannel("A")
    polished = ImageEnhance.Contrast(product).enhance(1.04)
    polished = ImageEnhance.Sharpness(polished).enhance(1.10)
    polished.putalpha(alpha)
    return polished


def add_contact_shadow(canvas: Image.Image, product: Image.Image, x: int, y: int) -> None:
    bbox = product.getchannel("A").getbbox()
    if not bbox:
        return

    visible_w = bbox[2] - bbox[0]
    shadow_w = int(visible_w * 0.72)
    shadow_h = max(18, int(product.height * 0.045))
    shadow = Image.new("RGBA", (shadow_w, shadow_h), (0, 0, 0, 0))
    mask = Image.new("L", (shadow_w, shadow_h), 0)
    draw = ImageDraw.Draw(mask)
    draw.ellipse((0, 0, shadow_w - 1, shadow_h - 1), fill=72)
    shadow.putalpha(mask.filter(ImageFilter.GaussianBlur(8)))

    visible_bottom = y + bbox[3]
    visible_center_x = x + bbox[0] + visible_w // 2
    canvas.alpha_composite(
        shadow,
        (visible_center_x - shadow_w // 2, visible_bottom - shadow_h // 2),
    )


def compose(item: dict) -> Path:
    background = Image.open(SOURCE_DIR / item["background"]).convert("RGBA")
    product = Image.open(CUTOUT_DIR / item["cutout"]).convert("RGBA")
    product = resize_product(product, background, item["scale"])
    product = polish_product(product)

    bbox = product.getchannel("A").getbbox()
    visible_bottom_offset = bbox[3] if bbox else product.height
    base_y = int(background.height * item["base"])
    x = int(background.width * item["x"] - product.width / 2)
    y = base_y - visible_bottom_offset

    canvas = background.copy()
    add_contact_shadow(canvas, product, x, y)
    canvas.alpha_composite(product, (x, y))

    out_path = OUTPUT_DIR / item["output"]
    canvas.convert("RGB").save(out_path, quality=96)
    return out_path


def main() -> None:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    for item in ITEMS:
        print(compose(item))


if __name__ == "__main__":
    main()
