from __future__ import annotations

from datetime import datetime
from pathlib import Path
import csv
import json
import shutil
import unicodedata
import re

from PIL import Image, ImageOps


ROOT = Path(__file__).resolve().parents[1]
REVIEW_DIR = ROOT / "reports" / "product-image-review-correct-folder-new"
CODE_DRAFT = REVIEW_DIR / "whatsapp-code-association-draft.csv"
INVENTORY = REVIEW_DIR / "new-files-inventory.json"
BLING_JSON = ROOT / "backend" / "data" / "produtos-bling.json"
UPLOADS = ROOT / "backend" / "public" / "uploads" / "products"
BACKEND_MAPPING = ROOT / "backend" / "data" / "mapeamento-imagens-produtos.json"
ROOT_MAPPING = ROOT / "mapeamento-imagens-produtos.json"
IMAGE_FILES = ROOT / "backend" / "data" / "bling-image-files.json"
CONTENT_OVERRIDES = ROOT / "backend" / "data" / "product-content-overrides.json"
BACKUP_DIR = REVIEW_DIR / "backup-before-whatsapp-code-apply"


def read_json(path: Path):
    return json.loads(path.read_text(encoding="utf-8-sig").lstrip("\ufeff"))


def write_json(path: Path, data) -> None:
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def read_csv(path: Path) -> list[dict]:
    with path.open("r", encoding="utf-8-sig", newline="") as f:
        return list(csv.DictReader(f, delimiter=";"))


def write_csv(path: Path, rows: list[dict], fields: list[str]) -> None:
    with path.open("w", encoding="utf-8-sig", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fields, delimiter=";", extrasaction="ignore")
        writer.writeheader()
        writer.writerows(rows)


def slugify(value: str) -> str:
    text = unicodedata.normalize("NFD", value)
    text = "".join(ch for ch in text if unicodedata.category(ch) != "Mn").lower()
    text = re.sub(r"[^a-z0-9]+", "-", text).strip("-")
    return re.sub(r"-+", "-", text)


def normalize_name(value: str) -> str:
    return " ".join(str(value or "").strip().split()).title()


def file_name_for(row: dict, product: dict) -> str:
    base_name = row.get("produto_visual") or product.get("nome") or f"produto-{row['codigo_lido']}"
    return f"{slugify(base_name)}-{row['codigo_lido']}.jpg"


def save_image_as(source: Path, destination: Path) -> None:
    image = ImageOps.exif_transpose(Image.open(source))
    destination.parent.mkdir(parents=True, exist_ok=True)
    if image.mode in {"RGBA", "LA"}:
        rgba = image.convert("RGBA")
        background = Image.new("RGB", rgba.size, (255, 255, 255))
        background.paste(rgba, mask=rgba.getchannel("A"))
        image = background
    else:
        image = image.convert("RGB")
    image.save(destination, "JPEG", quality=94, subsampling=1, optimize=True)


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


def upsert_mapping(path: Path, applied: list[dict]) -> int:
    mapping = read_json(path) if path.exists() else []
    applied_skus = {str(row["sku"]) for row in applied if row.get("sku")}
    applied_ids = {str(row["blingId"]) for row in applied if row.get("blingId")}
    kept = []
    for item in mapping:
        item_sku = str(item.get("sku") or "").strip()
        item_id = str(item.get("id") or "").strip()
        if item_sku and item_sku in applied_skus:
            continue
        if item_id and item_id in applied_ids:
            continue
        kept.append(item)
    for row in applied:
        kept.append(
            {
                "src": row["sourceFilename"],
                "nome": row["finalFileName"],
                "id": row["blingId"],
                "sku": row["sku"],
                "obs": f"Associado por codigo visivel na foto em 2026-07-01; origem {row['imageId']}",
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
        key = file_name.lower()
        if not file_name or key in seen:
            continue
        seen.add(key)
        result.append(file_name)
    write_json(IMAGE_FILES, result)
    return len(result)


def product_kind(name: str) -> str:
    value = slugify(name)
    if "duelo" in value or "jogo" in value or "roleta" in value:
        return "game"
    if "coracao" in value:
        return "plug_premium"
    return "plug"


def content_for(row: dict) -> dict:
    kind = product_kind(row["displayName"])
    is_game = kind == "game"
    category_name = "Linha Adulto"
    subcategory = "Jogos Adultos" if is_game else "Acessórios Adultos"
    description = (
        f"{row['displayName']} é um jogo adulto para casais, pensado para criar momentos descontraídos com desafios e interação a dois."
        if is_game
        else f"{row['displayName']} é um acessório adulto em metal com acabamento cromado e cristal, com apresentação sofisticada para uso íntimo adulto."
    )
    how_to_use = (
        "Use em ambiente reservado, sempre com consentimento e respeito aos limites de cada pessoa. Leia as instruções do jogo antes de começar."
        if is_game
        else "Antes do uso, higienize o produto conforme a embalagem. Use lubrificante adequado, introduza com cuidado e interrompa em caso de desconforto. O uso deve ser adulto, consensual e sem compartilhamento sem proteção/higienização."
    )
    care = (
        "Produto destinado a maiores de 18 anos. Guarde em local seco, longe do alcance de crianças, e interrompa qualquer dinâmica que gere desconforto."
        if is_game
        else "Higienize antes e depois do uso, seque bem e guarde em local limpo e seco. Não utilize se houver dano, borda solta, rachadura ou irritação na pele. Mantenha fora do alcance de crianças."
    )
    return {
        "blingId": row["blingId"],
        "sku": row["sku"],
        "name": row["productName"],
        "displayName": row["displayName"],
        "isAdult": True,
        "categoryName": category_name,
        "subcategoryName": subcategory,
        "price": row["price"],
        "stock": row["stock"],
        "imageFile": row["finalFileName"],
        "platformUrl": row["platformUrl"],
        "researchStatus": "associado_por_codigo_da_foto",
        "researchSources": [
            "https://www.nhs.uk/live-well/sexual-health/sex-activities-and-risk/",
            "https://www.cdc.gov/condom-use/index.html",
        ],
        "composition": None,
        "packageContents": "1 unidade.",
        "seoTitle": f"{row['displayName']} | KA Bijoux",
        "seoSlug": slugify(row["displayName"]),
        "shortDescription": description,
        "longDescription": description + " A KA Bijoux recomenda uso responsável, linguagem discreta e atenção às orientações da embalagem.",
        "details": [
            "Marca: KA Bijoux",
            f"SKU: {row['sku']}",
            f"Categoria: {category_name}",
            f"Tipo: {subcategory}",
            "Uso adulto: Sim",
        ],
        "benefits": "Produto com imagem premium, informação clara e apresentação discreta para compra adulta.",
        "howToUse": how_to_use,
        "careInstructions": care,
        "seoDescription": description[:155],
        "seoKeywords": [row["displayName"], category_name, subcategory, "KA Bijoux"],
    }


def upsert_content(applied: list[dict]) -> int:
    content = read_json(CONTENT_OVERRIDES) if CONTENT_OVERRIDES.exists() else []
    applied_skus = {str(row["sku"]) for row in applied if row.get("sku")}
    applied_ids = {str(row["blingId"]) for row in applied if row.get("blingId")}
    kept = []
    for item in content:
        item_sku = str(item.get("sku") or "").strip()
        item_id = str(item.get("blingId") or "").strip()
        if item_sku and item_sku in applied_skus:
            continue
        if item_id and item_id in applied_ids:
            continue
        kept.append(item)
    kept.extend(content_for(row) for row in applied)
    write_json(CONTENT_OVERRIDES, kept)
    return len(kept)


def main() -> None:
    inventory = {item["newId"]: item for item in read_json(INVENTORY)}
    products = {str(item.get("codigo") or "").strip(): item for item in read_json(BLING_JSON)}
    rows = read_csv(CODE_DRAFT)

    applied = []
    pending = []
    for row in rows:
        sku = str(row.get("codigo_lido") or "").strip()
        image_id = str(row.get("imagem_pendente_provavel") or "").strip()
        product = products.get(sku)
        image_info = inventory.get(image_id)
        if not product:
            pending.append({**row, "status_aplicacao": "SKU_NAO_ENCONTRADO_NO_EXPORT_LOCAL"})
            continue
        if not image_info:
            pending.append({**row, "status_aplicacao": "IMAGEM_NAO_ENCONTRADA_NO_INVENTARIO"})
            continue

        display_name = normalize_name(row.get("produto_visual") or product.get("nome") or "")
        final_name = file_name_for(row, product)
        source = Path(image_info["sourcePath"])
        destination = UPLOADS / final_name
        backup = backup_existing(destination)
        save_image_as(source, destination)
        applied.append(
            {
                "imageId": image_id,
                "sourceFilename": image_info["name"],
                "sourcePath": image_info["sourcePath"],
                "finalFileName": final_name,
                "platformUrl": f"/uploads/products/{final_name}",
                "blingId": str(product.get("id") or ""),
                "sku": sku,
                "productName": str(product.get("nome") or display_name),
                "displayName": display_name,
                "price": str(product.get("preco") or ""),
                "stock": str(product.get("estoque") or ""),
                "backup": backup,
                "action": "APLICADO_PLATAFORMA_LOCAL",
            }
        )

    mapping_count = upsert_mapping(BACKEND_MAPPING, applied) if applied else None
    root_mapping_count = upsert_mapping(ROOT_MAPPING, applied) if applied and ROOT_MAPPING.exists() else None
    image_files_count = update_image_files(applied) if applied else None
    content_count = upsert_content(applied) if applied else None

    write_csv(
        REVIEW_DIR / "whatsapp-code-applied-platform-images.csv",
        applied,
        [
            "imageId",
            "sourceFilename",
            "sourcePath",
            "finalFileName",
            "platformUrl",
            "blingId",
            "sku",
            "productName",
            "displayName",
            "price",
            "stock",
            "backup",
            "action",
        ],
    )
    write_csv(
        REVIEW_DIR / "whatsapp-code-not-applied.csv",
        pending,
        ["codigo_lido", "produto_visual", "imagem_pendente_provavel", "confianca", "status_local", "observacao", "status_aplicacao"],
    )

    summary = {
        "appliedAt": datetime.now().isoformat(timespec="seconds"),
        "rowsInDraft": len(rows),
        "platformApplied": len(applied),
        "notApplied": len(pending),
        "backendMappingEntries": mapping_count,
        "rootMappingEntries": root_mapping_count,
        "blingImageFilesEntries": image_files_count,
        "contentOverrideEntries": content_count,
        "blingOnlineApplied": 0,
        "blingOnlineStatus": "NAO_ATUALIZADO",
        "deploy": "NAO_REALIZADO",
    }
    write_json(REVIEW_DIR / "whatsapp-code-apply-summary.json", summary)

    lines = [
        "# Aplicação por código das fotos do WhatsApp",
        "",
        f"- Linhas analisadas: {summary['rowsInDraft']}",
        f"- Aplicadas localmente: {summary['platformApplied']}",
        f"- Não aplicadas: {summary['notApplied']}",
        "- Bling online: não atualizado",
        "- Deploy: não realizado",
        "",
        "## Motivo quando não aplicado",
        "",
        "O SKU precisa existir no export local `backend/data/produtos-bling.json`. Se ele não existir, o script não inventa preço, estoque nem produto.",
        "",
    ]
    (REVIEW_DIR / "whatsapp-code-apply-report.md").write_text("\n".join(lines), encoding="utf-8")

    public_dir = ROOT / "generated-product-images" / "VER-TESTES-AQUI" / "pasta-correta-novos" / "pendentes-18"
    public_dir.mkdir(parents=True, exist_ok=True)
    for file_name in [
        "whatsapp-code-association-draft.csv",
        "whatsapp-code-applied-platform-images.csv",
        "whatsapp-code-not-applied.csv",
        "whatsapp-code-apply-summary.json",
        "whatsapp-code-apply-report.md",
    ]:
        src = REVIEW_DIR / file_name
        if src.exists():
            shutil.copy2(src, public_dir / file_name)

    print(json.dumps(summary, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
