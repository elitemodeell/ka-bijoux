from __future__ import annotations

from pathlib import Path
import math

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageOps


ROOT = Path(__file__).resolve().parents[1]
SRC_DIR = ROOT / "generated-product-images"
OUT = SRC_DIR / "produto-fundo-elegante-sem-mao-v2.jpg"


def latest_source() -> Path:
    candidates = [
        p
        for p in SRC_DIR.iterdir()
        if p.suffix.lower() in {".jpg", ".jpeg", ".png", ".webp"}
        and not p.name.startswith("produto-fundo-")
    ]
    if not candidates:
        raise SystemExit("No source image found")
    return max(candidates, key=lambda p: p.stat().st_mtime)


def center_x(y: np.ndarray | float) -> np.ndarray | float:
    # Fitted from the product-colored pixels in the original photo.
    return -1.5155315840948394e-05 * np.asarray(y) ** 2 - 0.052418706424234414 * np.asarray(y) + 523.7833110780994


def make_background(size: tuple[int, int]) -> Image.Image:
    w, h = size
    yy = np.linspace(0, 1, h, dtype=np.float32)[:, None]
    xx = np.linspace(0, 1, w, dtype=np.float32)[None, :]

    top = np.array([24, 8, 18], dtype=np.float32)
    mid = np.array([86, 19, 48], dtype=np.float32)
    bottom = np.array([13, 7, 14], dtype=np.float32)
    base = top * (1 - yy)[:, :, None] + bottom * yy[:, :, None]
    base = np.broadcast_to(base, (h, w, 3)).copy()

    glow = np.exp(-(((xx - 0.50) / 0.38) ** 2 + ((yy - 0.47) / 0.46) ** 2))
    base += glow[:, :, None] * (mid - top) * 0.88

    rng = np.random.default_rng(9)
    texture = rng.normal(0, 1.8, (h, w, 1))
    soft_lines = np.sin((xx * 9.5 + yy * 7.0) * math.pi)[:, :, None] * 2.0
    arr = np.clip(base + texture + soft_lines, 0, 255).astype(np.uint8)
    bg = Image.fromarray(arr, "RGB").filter(ImageFilter.GaussianBlur(0.55)).convert("RGBA")

    overlay = Image.new("RGBA", size, (0, 0, 0, 0))
    d = ImageDraw.Draw(overlay, "RGBA")
    for box, color in [
        ((130, 110, w - 80, h - 250), (255, 189, 130, 22)),
        ((250, 430, w - 210, h - 80), (142, 43, 86, 26)),
    ]:
        d.ellipse(box, fill=color)
    overlay = overlay.filter(ImageFilter.GaussianBlur(90))
    bg = Image.alpha_composite(bg, overlay)

    vignette = Image.new("L", size, 0)
    vd = ImageDraw.Draw(vignette)
    vd.ellipse((-180, -120, w + 170, h + 30), fill=235)
    vignette = vignette.filter(ImageFilter.GaussianBlur(85))
    dark = Image.new("RGBA", size, (0, 0, 0, 116))
    return Image.composite(bg, dark, vignette).convert("RGBA")


def row_shape_mask(size: tuple[int, int]) -> tuple[Image.Image, Image.Image, Image.Image, Image.Image]:
    w, h = size
    shell = Image.new("L", size, 0)
    body = Image.new("L", size, 0)
    handle = Image.new("L", size, 0)

    sa = np.zeros((h, w), dtype=np.uint8)
    ba = np.zeros((h, w), dtype=np.uint8)
    ha = np.zeros((h, w), dtype=np.uint8)

    for y in range(305, 815):
        c = float(center_x(y))
        if y < 393:
            t = (y - 305) / 88
            half = 18 + 76 * math.sin(max(0, min(1, t)) * math.pi / 2)
        elif y > 760:
            t = (815 - y) / 55
            half = 78 * max(0.52, min(1, t))
        else:
            half = 82
        x1 = max(0, int(round(c - half)))
        x2 = min(w - 1, int(round(c + half)))
        sa[y, x1 : x2 + 1] = 255

    for y in range(748, 1044):
        c = float(center_x(y))
        if y < 795:
            t = (y - 748) / 47
            half = 80 + 18 * t
        elif y > 994:
            t = (1044 - y) / 50
            half = 72 + 26 * max(0, min(1, t))
        else:
            half = 98
        x1 = max(0, int(round(c - half)))
        x2 = min(w - 1, int(round(c + half)))
        ba[y, x1 : x2 + 1] = 255

    for y in range(990, 1428):
        c = float(center_x(y))
        if y < 1040:
            t = (y - 990) / 50
            half = 54 + 12 * t
        elif y > 1348:
            t = (1428 - y) / 80
            half = 42 + 22 * max(0, min(1, t))
        else:
            half = 66
        x1 = max(0, int(round(c - half)))
        x2 = min(w - 1, int(round(c + half)))
        ha[y, x1 : x2 + 1] = 255

    shell = Image.fromarray(sa, "L").filter(ImageFilter.GaussianBlur(1.15))
    body = Image.fromarray(ba, "L").filter(ImageFilter.GaussianBlur(1.1))
    handle = Image.fromarray(ha, "L").filter(ImageFilter.GaussianBlur(1.0))
    silhouette = Image.composite(Image.new("L", size, 255), Image.new("L", size, 0), shell)
    silhouette = ImageChops_lighter(silhouette, body)
    silhouette = ImageChops_lighter(silhouette, handle)
    return shell, body, handle, silhouette


def ImageChops_lighter(a: Image.Image, b: Image.Image) -> Image.Image:
    return Image.fromarray(np.maximum(np.asarray(a), np.asarray(b)).astype(np.uint8), "L")


def visible_product_mask(src: Image.Image, silhouette: Image.Image) -> Image.Image:
    arr = np.asarray(src).astype(np.int16)
    r, g, b = arr[..., 0], arr[..., 1], arr[..., 2]
    h, w = r.shape
    yy, xx = np.mgrid[:h, :w]
    lum = (r + g + b) / 3

    skin = (r > 102) & (g > 48) & (b > 32) & (r > g + 10) & (r > b + 22) & (g > b + 4)
    purple = (b > 78) & (r > 42) & (b > g + 12) & (yy < 1040)
    lavender = (r > 116) & (g > 96) & (b > 128) & (b > g + 10) & (yy > 720) & (yy < 1048)
    white = (
        (lum > 145)
        & (np.abs(r - g) < 55)
        & (np.abs(g - b) < 58)
        & (yy > 940)
        & (yy < 1450)
    )
    roi = (xx > 280) & (xx < 645) & (yy > 280) & (yy < 1450)
    keep = roi & ~skin & (purple | lavender | white) & (np.asarray(silhouette) > 30)
    keep &= ~((yy > 1180) & (xx < 342))

    mask = Image.fromarray((keep.astype(np.uint8) * 255), "L")
    mask = mask.filter(ImageFilter.MaxFilter(3))
    mask = mask.filter(ImageFilter.MinFilter(3))
    return mask.filter(ImageFilter.GaussianBlur(0.65))


def mirrored_details(src: Image.Image, mask: Image.Image) -> tuple[Image.Image, Image.Image]:
    src_arr = np.asarray(src.convert("RGBA"))
    mask_arr = np.asarray(mask)
    h, w = mask_arr.shape
    out = np.zeros((h, w, 4), dtype=np.uint8)
    out_mask = np.zeros((h, w), dtype=np.uint8)

    xs = np.arange(w)
    for y in range(h):
        c = float(center_x(y))
        sx = np.rint(2 * c - xs).astype(np.int32)
        valid = (sx >= 0) & (sx < w)
        row_mask = np.zeros(w, dtype=np.uint8)
        row_pixels = np.zeros((w, 4), dtype=np.uint8)
        row_mask[valid] = mask_arr[y, sx[valid]]
        row_pixels[valid] = src_arr[y, sx[valid]]
        out[y] = row_pixels
        out_mask[y] = row_mask

    out_mask_img = Image.fromarray(out_mask, "L").filter(ImageFilter.GaussianBlur(0.75))
    return Image.fromarray(out, "RGBA"), out_mask_img


def tinted_base(size: tuple[int, int], shell: Image.Image, body: Image.Image, handle: Image.Image) -> Image.Image:
    w, h = size
    yy, xx = np.mgrid[:h, :w]
    c = center_x(yy)
    rel = np.clip((xx - c) / 115.0, -1, 1)

    base = np.zeros((h, w, 4), dtype=np.uint8)

    shell_a = np.asarray(shell).astype(np.float32) / 255
    body_a = np.asarray(body).astype(np.float32) / 255
    handle_a = np.asarray(handle).astype(np.float32) / 255

    shell_rgb = np.stack(
        [
            86 + 36 * (1 - np.abs(rel)),
            42 + 18 * (1 - np.abs(rel)),
            142 + 46 * (1 - np.abs(rel)),
        ],
        axis=-1,
    )
    body_rgb = np.stack(
        [
            192 + 28 * (1 - np.abs(rel)),
            169 + 20 * (1 - np.abs(rel)),
            225 + 18 * (1 - np.abs(rel)),
        ],
        axis=-1,
    )
    handle_rgb = np.stack(
        [
            229 + 12 * (1 - np.abs(rel)),
            238 + 8 * (1 - np.abs(rel)),
            235 + 4 * (1 - np.abs(rel)),
        ],
        axis=-1,
    )

    alpha = np.maximum.reduce([shell_a * 130, body_a * 215, handle_a * 238])
    rgb = shell_rgb * shell_a[..., None] + body_rgb * body_a[..., None] + handle_rgb * handle_a[..., None]
    denom = np.maximum(shell_a + body_a + handle_a, 0.001)
    rgb = rgb / denom[..., None]
    base[..., :3] = np.clip(rgb, 0, 255).astype(np.uint8)
    base[..., 3] = np.clip(alpha, 0, 255).astype(np.uint8)

    img = Image.fromarray(base, "RGBA")
    d = ImageDraw.Draw(img, "RGBA")
    # Subtle product highlights, much softer than the first version.
    for off, color, width in [(-50, (255, 241, 255, 46), 4), (54, (38, 8, 64, 36), 5)]:
        pts = [(float(center_x(y)) + off, y) for y in range(345, 1328, 18)]
        d.line(pts, fill=color, width=width)
    d.arc((414, 328, 571, 508), 198, 342, fill=(255, 238, 255, 66), width=4)
    d.line((382, 792, 560, 790), fill=(255, 232, 255, 78), width=4)
    d.line((385, 1020, 530, 1020), fill=(204, 214, 211, 80), width=3)
    return img


def paste_with_mask(base: Image.Image, layer: Image.Image, mask: Image.Image) -> Image.Image:
    clean = Image.new("RGBA", base.size, (0, 0, 0, 0))
    clean.paste(layer, (0, 0), mask)
    return Image.alpha_composite(base, clean)


def main() -> None:
    src_path = latest_source()
    src = ImageOps.exif_transpose(Image.open(src_path)).convert("RGB")
    size = src.size

    shell, body, handle, silhouette = row_shape_mask(size)
    visible_mask = visible_product_mask(src, silhouette)
    mirror, mirror_mask = mirrored_details(src, visible_mask)

    bg = make_background(size)

    shadow = Image.new("RGBA", size, (0, 0, 0, 0))
    sd = ImageDraw.Draw(shadow, "RGBA")
    sd.ellipse((260, 1340, 610, 1460), fill=(0, 0, 0, 74))
    shadow = shadow.filter(ImageFilter.GaussianBlur(28))
    result = Image.alpha_composite(bg, shadow)

    product = tinted_base(size, shell, body, handle)
    source_rgba = src.convert("RGBA")

    product = paste_with_mask(product, mirror, mirror_mask)
    product = paste_with_mask(product, source_rgba, visible_mask)

    product_alpha = ImageChops_lighter(silhouette.filter(ImageFilter.GaussianBlur(0.4)), product.getchannel("A"))
    product.putalpha(product_alpha)

    halo = Image.new("RGBA", size, (0, 0, 0, 0))
    hd = ImageDraw.Draw(halo, "RGBA")
    hd.rectangle((310, 280, 630, 1450), fill=(191, 65, 180, 18))
    halo.putalpha(silhouette.filter(ImageFilter.GaussianBlur(18)))
    result = Image.alpha_composite(result, halo)
    result = Image.alpha_composite(result, product)

    result.convert("RGB").save(OUT, "JPEG", quality=94, subsampling=1, optimize=True)
    print(f"source={src_path}")
    print(f"output={OUT}")


if __name__ == "__main__":
    main()
