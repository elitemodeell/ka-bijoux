from __future__ import annotations

from pathlib import Path
import math
import random

import numpy as np
from PIL import Image, ImageDraw, ImageFilter


ROOT = Path(__file__).resolve().parents[1]
SRC_DIR = ROOT / "generated-product-images"
OUT = SRC_DIR / "produto-fundo-elegante-sem-mao.jpg"


def latest_jpg() -> Path:
    candidates = [
        p
        for p in SRC_DIR.iterdir()
        if p.suffix.lower() in {".jpg", ".jpeg", ".png", ".webp"}
        and not p.name.startswith("produto-fundo-")
    ]
    if not candidates:
        raise SystemExit("No source image found in generated-product-images")
    return max(candidates, key=lambda p: p.stat().st_mtime)


def make_background(size: tuple[int, int]) -> Image.Image:
    width, height = size
    y = np.linspace(0, 1, height, dtype=np.float32)[:, None]
    x = np.linspace(0, 1, width, dtype=np.float32)[None, :]

    top = np.array([38, 8, 22], dtype=np.float32)
    mid = np.array([94, 17, 48], dtype=np.float32)
    bottom = np.array([16, 7, 16], dtype=np.float32)

    base = (top * (1 - y) + bottom * y)[:, None, :]
    glow = np.exp(-(((x - 0.52) / 0.36) ** 2 + ((y - 0.48) / 0.42) ** 2))
    base = base + glow[..., None] * (mid - top) * 0.95

    velvet = (np.sin((x * 22 + y * 13) * math.pi) * 4.5) + (
        np.sin((x * 7 - y * 17) * math.pi) * 3.5
    )
    rng = np.random.default_rng(42)
    noise = rng.normal(0, 2.4, (height, width, 1))
    img = np.clip(base + velvet[..., None] + noise, 0, 255).astype(np.uint8)

    bg = Image.fromarray(img, "RGB").filter(ImageFilter.GaussianBlur(0.45))
    draw = ImageDraw.Draw(bg, "RGBA")

    random.seed(7)
    for _ in range(34):
        cx = random.randint(40, width - 40)
        cy = random.randint(60, height - 80)
        r = random.randint(10, 44)
        alpha = random.randint(12, 38)
        color = random.choice(
            [(255, 207, 150, alpha), (208, 95, 133, alpha), (128, 63, 110, alpha)]
        )
        draw.ellipse((cx - r, cy - r, cx + r, cy + r), fill=color)

    spotlight = Image.new("RGBA", size, (0, 0, 0, 0))
    sd = ImageDraw.Draw(spotlight, "RGBA")
    sd.ellipse(
        (width * 0.11, height * 0.06, width * 0.93, height * 0.92),
        fill=(255, 196, 144, 32),
    )
    spotlight = spotlight.filter(ImageFilter.GaussianBlur(85))
    bg = Image.alpha_composite(bg.convert("RGBA"), spotlight)

    vignette = Image.new("L", size, 0)
    vd = ImageDraw.Draw(vignette)
    vd.ellipse(
        (width * -0.22, height * -0.12, width * 1.23, height * 1.08),
        fill=225,
    )
    vignette = vignette.filter(ImageFilter.GaussianBlur(90))
    dark = Image.new("RGBA", size, (0, 0, 0, 125))
    bg = Image.composite(bg, dark, vignette)
    return bg.convert("RGBA")


def rounded_rect(draw: ImageDraw.ImageDraw, box, radius, fill, outline=None, width=1):
    draw.rounded_rectangle(box, radius=radius, fill=fill, outline=outline, width=width)


def draw_clean_product(size: tuple[int, int]) -> tuple[Image.Image, Image.Image]:
    layer = Image.new("RGBA", size, (0, 0, 0, 0))
    mask = Image.new("L", size, 0)
    draw = ImageDraw.Draw(layer, "RGBA")
    md = ImageDraw.Draw(mask)

    # Geometry approximates the product in the uploaded 900x1600 source.
    shell_box = (389, 314, 590, 866)
    rounded_rect(draw, shell_box, 86, (91, 34, 166, 185), (178, 130, 255, 150), 4)
    rounded_rect(md, shell_box, 86, 255)

    draw.ellipse((420, 312, 587, 512), fill=(117, 54, 192, 170), outline=(191, 143, 255, 135), width=4)
    md.ellipse((420, 312, 587, 512), fill=255)
    draw.rectangle((418, 412, 584, 582), fill=(97, 39, 177, 160))
    md.rectangle((418, 412, 584, 582), fill=255)

    rounded_rect(draw, (358, 760, 606, 1047), 46, (210, 185, 244, 240), (148, 86, 215, 180), 4)
    rounded_rect(md, (358, 760, 606, 1047), 46, 255)
    draw.rectangle((356, 742, 607, 799), fill=(172, 121, 222, 225))
    md.rectangle((356, 742, 607, 799), fill=255)
    draw.line((366, 776, 598, 776), fill=(246, 224, 255, 135), width=5)
    draw.line((362, 1005, 602, 1005), fill=(126, 75, 186, 120), width=3)

    rounded_rect(draw, (382, 983, 542, 1403), 58, (244, 247, 239, 252), (205, 215, 213, 180), 4)
    rounded_rect(md, (382, 983, 542, 1403), 58, 255)
    draw.line((389, 1088, 538, 1088), fill=(224, 230, 225, 170), width=4)
    draw.line((391, 1172, 536, 1172), fill=(231, 235, 230, 130), width=3)
    draw.ellipse((390, 1328, 539, 1434), fill=(239, 244, 239, 250), outline=(206, 214, 212, 130), width=3)
    md.ellipse((390, 1328, 539, 1434), fill=255)

    # Soft shadows and highlights to make the reconstructed hidden areas less flat.
    shade = Image.new("RGBA", size, (0, 0, 0, 0))
    sd = ImageDraw.Draw(shade, "RGBA")
    sd.rectangle((522, 382, 598, 1060), fill=(25, 0, 55, 44))
    sd.rectangle((504, 988, 548, 1398), fill=(150, 155, 150, 44))
    shade.putalpha(Image.composite(shade.getchannel("A"), Image.new("L", size, 0), mask))
    shade = shade.filter(ImageFilter.GaussianBlur(18))
    layer = Image.alpha_composite(layer, shade)

    draw = ImageDraw.Draw(layer, "RGBA")
    for x, y, r, a in [
        (453, 541, 11, 90),
        (481, 540, 9, 86),
        (515, 545, 10, 80),
        (452, 590, 12, 82),
        (484, 600, 13, 86),
        (528, 604, 11, 72),
    ]:
        draw.ellipse((x - r, y - r, x + r, y + r), fill=(178, 128, 255, a), outline=(225, 206, 255, a + 45), width=2)

    for x in (401, 580):
        draw.line((x, 455, x, 770), fill=(219, 191, 255, 86), width=3)
    draw.arc((421, 336, 579, 502), 196, 336, fill=(235, 215, 255, 110), width=4)
    draw.line((448, 398, 570, 371), fill=(235, 212, 255, 85), width=4)
    draw.line((431, 806, 470, 1018), fill=(255, 255, 255, 85), width=5)
    draw.line((507, 803, 558, 1012), fill=(126, 75, 180, 80), width=3)
    draw.line((434, 1004, 435, 1357), fill=(255, 255, 255, 95), width=5)

    return layer, mask.filter(ImageFilter.GaussianBlur(0.35))


def product_color_mask(src: Image.Image, silhouette: Image.Image) -> Image.Image:
    arr = np.asarray(src.convert("RGB")).astype(np.int16)
    r, g, b = arr[..., 0], arr[..., 1], arr[..., 2]
    lum = (r + g + b) / 3

    purple = (b > 92) & (r > 54) & (b > g + 22) & (r > g - 10)
    lavender = (r > 130) & (b > 135) & (g > 95) & (b >= r - 28) & (lum > 115)
    white_handle = (lum > 170) & (np.abs(r - g) < 28) & (np.abs(g - b) < 32)

    h, w = r.shape
    yy, xx = np.mgrid[:h, :w]
    roi = (xx > 315) & (xx < 645) & (yy > 250) & (yy < 1448)
    handle_roi = (xx > 360) & (xx < 562) & (yy > 920) & (yy < 1438)

    skin = (r > 105) & (g > 55) & (b > 35) & (r > g + 12) & (r > b + 25) & (g > b + 5)
    floor = (r > 95) & (g > 70) & (b < 75) & (yy > 420)

    keep = roi & ((purple | lavender) | (handle_roi & white_handle)) & ~skin & ~floor
    keep &= np.asarray(silhouette) > 15

    mask = Image.fromarray((keep.astype(np.uint8) * 255), "L")
    mask = mask.filter(ImageFilter.MaxFilter(5))
    mask = mask.filter(ImageFilter.MinFilter(3))
    mask = mask.filter(ImageFilter.GaussianBlur(1.1))
    return mask


def main() -> None:
    src_path = latest_jpg()
    src = Image.open(src_path).convert("RGB")
    size = src.size

    bg = make_background(size)
    base_product, silhouette = draw_clean_product(size)

    source_details_mask = product_color_mask(src, silhouette)
    source_details = Image.new("RGBA", size, (0, 0, 0, 0))
    source_details.paste(src.convert("RGBA"), (0, 0), source_details_mask)

    product = Image.alpha_composite(base_product, source_details)

    shadow = Image.new("RGBA", size, (0, 0, 0, 0))
    sd = ImageDraw.Draw(shadow, "RGBA")
    sd.ellipse((278, 1350, 660, 1468), fill=(0, 0, 0, 88))
    shadow = shadow.filter(ImageFilter.GaussianBlur(32))

    result = Image.alpha_composite(bg, shadow)
    result = Image.alpha_composite(result, product)

    glow = Image.new("RGBA", size, (0, 0, 0, 0))
    gd = ImageDraw.Draw(glow, "RGBA")
    gd.rectangle((350, 295, 625, 1440), fill=(161, 71, 166, 18))
    glow.putalpha(silhouette.filter(ImageFilter.GaussianBlur(13)))
    result = Image.alpha_composite(result, glow)
    result = Image.alpha_composite(result, product)

    result.convert("RGB").save(OUT, "JPEG", quality=94, subsampling=1, optimize=True)
    print(f"source={src_path}")
    print(f"output={OUT}")


if __name__ == "__main__":
    main()
