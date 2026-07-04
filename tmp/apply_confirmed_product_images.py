from __future__ import annotations

from pathlib import Path
import csv
import json
import shutil
from datetime import datetime

from PIL import Image, ImageOps


ROOT = Path(__file__).resolve().parents[1]
REVIEW_DIR = ROOT / "reports" / "product-image-review"
INVENTORY = REVIEW_DIR / "downloads-image-inventory.json"
QUEUE = ROOT / "reports" / "image-generation-queue.json"
UPLOADS = ROOT / "backend" / "public" / "uploads" / "products"
BACKEND_MAPPING = ROOT / "backend" / "data" / "mapeamento-imagens-produtos.json"
ROOT_MAPPING = ROOT / "mapeamento-imagens-produtos.json"
IMAGE_FILES = ROOT / "backend" / "data" / "bling-image-files.json"
BACKUP_DIR = REVIEW_DIR / "backup-before-apply"
APPLY_LIMIT = 69


def read_json(path: Path):
    return json.loads(path.read_text(encoding="utf-8").lstrip("\ufeff"))


def write_json(path: Path, data) -> None:
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def csv_escape(value) -> str:
    text = str(value or "")
    if any(ch in text for ch in ['"', ";", "\n"]):
        return '"' + text.replace('"', '""') + '"'
    return text


def write_csv(path: Path, rows: list[dict], fields: list[str]) -> None:
    with path.open("w", encoding="utf-8-sig", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fields, delimiter=";")
        writer.writeheader()
        writer.writerows(rows)


def save_image_as(source: Path, destination: Path) -> None:
    image = ImageOps.exif_transpose(Image.open(source))
    suffix = destination.suffix.lower()
    destination.parent.mkdir(parents=True, exist_ok=True)

    if suffix in {".jpg", ".jpeg"}:
        if image.mode in {"RGBA", "LA"}:
            background = Image.new("RGB", image.size, (255, 255, 255))
            alpha = image.getchannel("A") if image.mode == "RGBA" else image.getchannel("A")
            background.paste(image.convert("RGBA"), mask=alpha)
            image = background
        else:
            image = image.convert("RGB")
        image.save(destination, "JPEG", quality=94, subsampling=1, optimize=True)
        return

    if suffix == ".webp":
        image.save(destination, "WEBP", quality=94, method=6)
        return

    image.save(destination)


def backup_existing(path: Path) -> str:
    if not path.exists():
        return ""
    BACKUP_DIR.mkdir(parents=True, exist_ok=True)
    backup = BACKUP_DIR / path.name
    if backup.exists():
        stamp = datetime.now().strftime("%Y%m%d%H%M%S")
        backup = BACKUP_DIR / f"{path.stem}-{stamp}{path.suffix}"
    shutil.copy2(path, backup)
    return str(backup)


def normalize_id(value) -> str:
    return str(value or "").strip()


def upsert_mapping(path: Path, applied: list[dict]) -> int:
    mapping = read_json(path) if path.exists() else []
    kept = []
    applied_ids = {normalize_id(row["blingId"]) for row in applied if normalize_id(row["blingId"])}
    applied_skus = {normalize_id(row["sku"]) for row in applied if normalize_id(row["sku"])}

    for item in mapping:
        item_id = normalize_id(item.get("id"))
        item_sku = normalize_id(item.get("sku"))
        if item_id and item_id in applied_ids:
            continue
        if item_sku and item_sku in applied_skus:
            continue
        kept.append(item)

    for row in applied:
        kept.append(
            {
                "src": row["sourceFilename"],
                "nome": row["finalFileName"],
                "id": row["blingId"] or None,
                "sku": row["sku"] or None,
                "obs": f"Imagem premium aprovada em 2026-07-01; origem {row['imageId']}",
            }
        )

    write_json(path, kept)
    return len(kept)


def update_image_files(applied: list[dict]) -> int:
    files = read_json(IMAGE_FILES) if IMAGE_FILES.exists() else []
    seen = set()
    result = []
    for file_name in [*files, *[row["finalFileName"] for row in applied]]:
        file_name = str(file_name).strip()
        if not file_name or file_name.lower() in seen:
            continue
        seen.add(file_name.lower())
        result.append(file_name)
    write_json(IMAGE_FILES, result)
    return len(result)


def main() -> None:
    images = read_json(INVENTORY)
    queue = read_json(QUEUE)
    selected = images[:APPLY_LIMIT]
    applied: list[dict] = []
    skipped: list[dict] = []

    for index, image_info in enumerate(selected):
        product = queue[index] if index < len(queue) else None
        if not product or not product.get("desiredFileName") or not product.get("productId"):
            skipped.append(
                {
                    "imageId": image_info.get("id"),
                    "sourceFilename": image_info.get("name"),
                    "reason": "sem produto correspondente na fila",
                }
            )
            continue

        source = Path(image_info["sourcePath"])
        final_name = str(product["desiredFileName"])
        destination = UPLOADS / final_name
        backup = backup_existing(destination)
        save_image_as(source, destination)

        applied.append(
            {
                "imageId": image_info["id"],
                "sourceFilename": image_info["name"],
                "sourcePath": image_info["sourcePath"],
                "finalFileName": final_name,
                "platformUrl": f"/uploads/products/{final_name}",
                "blingId": str(product.get("productId") or ""),
                "sku": str(product.get("sku") or ""),
                "productName": str(product.get("productName") or ""),
                "category": str(product.get("categoryName") or product.get("category") or ""),
                "subcategory": str(product.get("subcategoryName") or product.get("subcategory") or ""),
                "color": str(product.get("color") or ""),
                "flavor": str(product.get("flavor") or ""),
                "price": product.get("price", ""),
                "stock": product.get("stock", ""),
                "backup": backup,
                "action": "APLICADO_PLATAFORMA_LOCAL",
            }
        )

    backend_mapping_count = upsert_mapping(BACKEND_MAPPING, applied)
    root_mapping_count = upsert_mapping(ROOT_MAPPING, applied) if ROOT_MAPPING.exists() else 0
    image_files_count = update_image_files(applied)

    fields = [
        "imageId",
        "sourceFilename",
        "sourcePath",
        "finalFileName",
        "platformUrl",
        "blingId",
        "sku",
        "productName",
        "category",
        "subcategory",
        "color",
        "flavor",
        "price",
        "stock",
        "backup",
        "action",
    ]
    write_csv(REVIEW_DIR / "applied-platform-images.csv", applied, fields)

    bling_rows = [
        {
            **row,
            "blingAction": "PENDENTE_CREDENCIAL_API_BLING",
        }
        for row in applied
    ]
    write_csv(REVIEW_DIR / "bling-upload-pending.csv", bling_rows, [*fields, "blingAction"])

    summary = {
        "appliedAt": datetime.now().isoformat(timespec="seconds"),
        "requestedLimit": APPLY_LIMIT,
        "platformApplied": len(applied),
        "skipped": len(skipped),
        "backendMappingEntries": backend_mapping_count,
        "rootMappingEntries": root_mapping_count,
        "blingImageFilesEntries": image_files_count,
        "uploadsDir": str(UPLOADS),
        "blingOnlineApplied": 0,
        "blingOnlineStatus": "PENDENTE_CREDENCIAL_API_BLING",
        "skippedItems": skipped,
    }
    write_json(REVIEW_DIR / "apply-summary.json", summary)

    report = f"""# KA Bijoux - aplicação de imagens aprovadas

## Resultado

- Imagens aplicadas na plataforma local: **{len(applied)}**
- Arquivos copiados/convertidos para: `backend/public/uploads/products`
- Mapeamento atualizado: `backend/data/mapeamento-imagens-produtos.json`
- Lista de arquivos atualizada: `backend/data/bling-image-files.json`
- Mapeamento raiz também sincronizado: `{ROOT_MAPPING.name if ROOT_MAPPING.exists() else 'nao existente'}`

## Bling online

Nenhuma imagem foi enviada ao Bling online nesta execução porque as credenciais/API OAuth do Bling não estão configuradas no ambiente.

Arquivo preparado para envio/revisão:

- `bling-upload-pending.csv`

## Arquivos de auditoria

- `applied-platform-images.csv`
- `apply-summary.json`
- `bling-upload-pending.csv`

## Observação

Não foi feito deploy.
"""
    (REVIEW_DIR / "apply-report.md").write_text(report, encoding="utf-8")

    print(json.dumps(summary, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
