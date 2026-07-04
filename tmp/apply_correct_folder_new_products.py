from __future__ import annotations

from datetime import datetime
from pathlib import Path
import csv
import json
import shutil

from PIL import Image, ImageOps


ROOT = Path(__file__).resolve().parents[1]
REVIEW_DIR = ROOT / "reports" / "product-image-review-correct-folder-new"
INVENTORY = REVIEW_DIR / "new-files-inventory.json"
UPLOADS = ROOT / "backend" / "public" / "uploads" / "products"
BACKEND_MAPPING = ROOT / "backend" / "data" / "mapeamento-imagens-produtos.json"
ROOT_MAPPING = ROOT / "mapeamento-imagens-produtos.json"
IMAGE_FILES = ROOT / "backend" / "data" / "bling-image-files.json"
CONTENT_OVERRIDES = ROOT / "backend" / "data" / "product-content-overrides.json"
BACKUP_DIR = REVIEW_DIR / "backup-before-apply"

SAFETY_SOURCES = [
    "https://www.nhs.uk/live-well/sexual-health/sex-activities-and-risk/",
    "https://www.nhs.uk/live-well/sexual-health/sexual-health-for-lesbian-and-bisexual-women/",
    "https://www.cdc.gov/condom-use/index.html",
]

APPLY_ITEMS = [
    {
        "imageId": "NEW-IMG001",
        "visualName": "Roleta Kamasutra Sexy",
        "blingId": "16543909026",
        "sku": "3104000001682",
        "productName": "ROLETA SEXY",
        "displayName": "Roleta Kamasutra Sexy",
        "finalFileName": "roleta-sexy-3104000001682.jpg",
        "price": "24",
        "stock": "10",
        "kind": "game",
        "matchReason": "Nome do produto visivel na arte corresponde ao SKU ROLETA SEXY.",
    },
    {
        "imageId": "NEW-IMG004",
        "visualName": "Jogo Duelo do Prazer Sexy",
        "blingId": "16653024561",
        "sku": "3104000004391",
        "productName": "JOGO DUELO DO PRAZER SEXY",
        "displayName": "Jogo Duelo do Prazer Sexy",
        "finalFileName": "jogo-duelo-do-prazer-sexy-3104000004391.jpg",
        "price": "12",
        "stock": "36",
        "kind": "game",
        "matchReason": "Nome do produto visivel na arte corresponde ao SKU JOGO DUELO DO PRAZER SEXY.",
    },
    {
        "imageId": "NEW-IMG009",
        "visualName": "Plug metálico com cristal transparente",
        "blingId": "16516507925",
        "sku": "3104000000804",
        "productName": "PLUG METAL SEXY",
        "displayName": "Plug Metálico com Cristal Transparente",
        "finalFileName": "plug-metal-sexy-3104000000804.jpg",
        "price": "24",
        "stock": "15",
        "kind": "plug_basic",
        "matchReason": "Arte genérica de plug metálico simples com cristal transparente; SKU cadastrado como PLUG METAL SEXY.",
    },
    {
        "imageId": "NEW-IMG018",
        "visualName": "Plug metálico premium com cristal coração transparente",
        "blingId": "16527796028",
        "sku": "3104000001499",
        "productName": "PLUG METAL PREMIUM SEXY",
        "displayName": "Plug Metálico Premium com Cristal Coração Transparente",
        "finalFileName": "plug-metal-premium-sexy-3104000001499.jpg",
        "price": "48",
        "stock": "47",
        "kind": "plug_premium",
        "matchReason": "Arte de plug metálico com cristal em coração e acabamento premium; SKU cadastrado como PLUG METAL PREMIUM SEXY.",
    },
]

PENDING_NOTES = {
    "NEW-IMG002": "Arte extra do mesmo Jogo Duelo do Prazer; o SKU único já recebeu a imagem principal NEW-IMG004.",
    "NEW-IMG003": "Mostra Duelo de Casal, mas não existe SKU local com esse nome exato.",
    "NEW-IMG005": "Variação de plug com cristal furta-cor sem SKU individual de cor/formato.",
    "NEW-IMG006": "Variação de plug com cristal furta-cor sem SKU individual de cor/formato.",
    "NEW-IMG007": "Variação de plug com cristal azul sem SKU individual de cor/formato.",
    "NEW-IMG008": "Variação de plug com cristal violeta sem SKU individual de cor/formato.",
    "NEW-IMG010": "Variação de plug com cristal lilás sem SKU individual de cor/formato.",
    "NEW-IMG011": "Variação de plug com cristal rosa sem SKU individual de cor/formato.",
    "NEW-IMG012": "Variação de plug com cristal coração rosa sem SKU individual de cor/formato.",
    "NEW-IMG013": "Variação de plug com cristal coração roxo sem SKU individual de cor/formato.",
    "NEW-IMG014": "Variação de plug com cristal coração roxo sem SKU individual de cor/formato.",
    "NEW-IMG015": "Variação de plug com cristal coração azul sem SKU individual de cor/formato.",
    "NEW-IMG016": "Variação de plug com cristal vermelho sem SKU individual de cor/formato.",
    "NEW-IMG017": "Variação de plug com cristal coração azul sem SKU individual de cor/formato.",
    "NEW-IMG019": "Variação de plug com cristal coração rosa sem SKU individual de cor/formato.",
    "NEW-IMG020": "Variação de plug com cristal rosa sem SKU individual de cor/formato.",
    "NEW-IMG021": "Variação de plug com cristal rosé lilás sem SKU individual de cor/formato.",
    "NEW-IMG022": "Variação de plug com cristal lilás sem SKU individual de cor/formato.",
}


def read_json(path: Path):
    return json.loads(path.read_text(encoding="utf-8-sig").lstrip("\ufeff"))


def write_json(path: Path, data) -> None:
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def write_csv(path: Path, rows: list[dict], fields: list[str]) -> None:
    with path.open("w", encoding="utf-8-sig", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fields, delimiter=";", extrasaction="ignore")
        writer.writeheader()
        writer.writerows(rows)


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
    applied_ids = {str(row["blingId"]) for row in applied if row.get("blingId")}
    applied_skus = {str(row["sku"]) for row in applied if row.get("sku")}
    kept = []
    for item in mapping:
        item_id = str(item.get("id") or "").strip()
        item_sku = str(item.get("sku") or "").strip()
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
                "id": row["blingId"],
                "sku": row["sku"],
                "obs": f"Pasta correta produtos atualizados; aplicado localmente em 2026-07-01; origem {row['imageId']}",
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


def upsert_content(applied: list[dict]) -> int:
    content = read_json(CONTENT_OVERRIDES) if CONTENT_OVERRIDES.exists() else []
    applied_ids = {str(row["blingId"]) for row in applied if row.get("blingId")}
    applied_skus = {str(row["sku"]) for row in applied if row.get("sku")}
    kept = []
    for item in content:
        item_id = str(item.get("blingId") or "").strip()
        item_sku = str(item.get("sku") or "").strip()
        if item_id and item_id in applied_ids:
            continue
        if item_sku and item_sku in applied_skus:
            continue
        kept.append(item)
    kept.extend(content_for(row) for row in applied)
    write_json(CONTENT_OVERRIDES, kept)
    return len(kept)


def content_for(item: dict) -> dict:
    common = {
        "blingId": item["blingId"],
        "sku": item["sku"],
        "name": item["productName"],
        "displayName": item["displayName"],
        "isAdult": True,
        "categoryName": "Linha Adulto",
        "subcategoryName": "Jogos Adultos" if item["kind"] == "game" else "Acessórios Adultos",
        "price": item["price"],
        "stock": item["stock"],
        "imageFile": item["finalFileName"],
        "platformUrl": f"/uploads/products/{item['finalFileName']}",
        "researchStatus": "pasta_correta_aplicado_localmente",
        "researchSources": SAFETY_SOURCES,
        "composition": None,
        "seoTitle": f"{item['displayName']} | KA Bijoux",
        "seoSlug": slugify(item["displayName"]),
    }
    if item["kind"] == "game":
        package = f"1 {item['displayName'].lower()}."
        description = (
            f"{item['displayName']} é um jogo adulto para casais, pensado para criar momentos descontraídos "
            "com desafios, ideias e interação a dois."
        )
        return finish(
            common,
            package,
            description,
            "Use em ambiente reservado, sempre com consentimento e respeito aos limites de cada pessoa. Leia as instruções do jogo antes de começar.",
            "Produto destinado a maiores de 18 anos. Guarde em local seco, longe do alcance de crianças, e interrompa qualquer dinâmica que gere desconforto.",
            ["Material: papel/cartão conforme embalagem", "Conteúdo: 1 jogo adulto", "Uso adulto: Sim"],
        )

    crystal = "coração transparente" if item["kind"] == "plug_premium" else "transparente"
    package = "1 plug metálico com cristal."
    description = (
        f"{item['displayName']} é um acessório adulto em metal com acabamento cromado e cristal {crystal}, "
        "com apresentação sofisticada para uso íntimo adulto."
    )
    return finish(
        common,
        package,
        description,
        "Antes do uso, higienize o produto conforme a embalagem. Use lubrificante adequado, introduza com cuidado e interrompa em caso de desconforto. O uso deve ser adulto, consensual e sem compartilhamento sem proteção/higienização.",
        "Higienize antes e depois do uso, seque bem e guarde em local limpo e seco. Não utilize se houver dano, borda solta, rachadura ou irritação na pele. Mantenha fora do alcance de crianças.",
        [
            "Material: metal com acabamento cromado",
            f"Cristal: {crystal}",
            "Conteúdo: 1 unidade",
            "Uso adulto: Sim",
        ],
    )


def finish(common: dict, package: str, description: str, usage: str, care: str, extra_details: list[str]) -> dict:
    return {
        **common,
        "packageContents": package,
        "shortDescription": description,
        "longDescription": description + " A KA Bijoux recomenda uso responsável, linguagem discreta e atenção às orientações da embalagem.",
        "details": [
            "Marca: KA Bijoux",
            f"Categoria: {common['categoryName']}",
            *extra_details,
        ],
        "benefits": "Produto com imagem premium, informação clara e apresentação discreta para compra adulta.",
        "howToUse": usage,
        "careInstructions": care,
        "seoDescription": description[:155],
        "seoKeywords": [common["displayName"], common["categoryName"], common["subcategoryName"], "KA Bijoux"],
    }


def slugify(value: str) -> str:
    import re
    import unicodedata

    text = unicodedata.normalize("NFD", value)
    text = "".join(ch for ch in text if unicodedata.category(ch) != "Mn").lower()
    text = re.sub(r"[^a-z0-9]+", "-", text).strip("-")
    return re.sub(r"-+", "-", text)


def main() -> None:
    inventory = {item["newId"]: item for item in read_json(INVENTORY)}
    applied = []
    for item in APPLY_ITEMS:
        image_info = inventory[item["imageId"]]
        source = Path(image_info["sourcePath"])
        destination = UPLOADS / item["finalFileName"]
        backup = backup_existing(destination)
        save_image_as(source, destination)
        applied.append(
            {
                **item,
                "sourceFilename": image_info["name"],
                "sourcePath": image_info["sourcePath"],
                "platformUrl": f"/uploads/products/{item['finalFileName']}",
                "backup": backup,
                "action": "APLICADO_PLATAFORMA_LOCAL",
            }
        )

    mapping_count = upsert_mapping(BACKEND_MAPPING, applied)
    root_mapping_count = upsert_mapping(ROOT_MAPPING, applied) if ROOT_MAPPING.exists() else 0
    image_files_count = update_image_files(applied)
    content_count = upsert_content(applied)

    applied_ids = {item["imageId"] for item in APPLY_ITEMS}
    pending = []
    for image_info in read_json(INVENTORY):
        image_id = image_info["newId"]
        if image_id in applied_ids:
            continue
        pending.append(
            {
                "imageId": image_id,
                "sourceFilename": image_info["name"],
                "sourcePath": image_info["sourcePath"],
                "status": "PENDENTE_REVISAO",
                "reason": PENDING_NOTES.get(image_id, "Sem correspondencia segura com SKU local."),
            }
        )

    applied_fields = [
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
        "matchReason",
        "backup",
        "action",
    ]
    write_csv(REVIEW_DIR / "correct-folder-applied-platform-images.csv", applied, applied_fields)
    write_csv(REVIEW_DIR / "correct-folder-pending-after-apply.csv", pending, ["imageId", "sourceFilename", "sourcePath", "status", "reason"])

    summary = {
        "appliedAt": datetime.now().isoformat(timespec="seconds"),
        "folder": str(Path.home() / "Downloads" / "produtos atualizados"),
        "newImagesInFolder": len(inventory),
        "platformApplied": len(applied),
        "pending": len(pending),
        "backendMappingEntries": mapping_count,
        "rootMappingEntries": root_mapping_count,
        "blingImageFilesEntries": image_files_count,
        "contentOverrideEntries": content_count,
        "blingOnlineApplied": 0,
        "blingOnlineStatus": "NAO_ATUALIZADO",
        "deploy": "NAO_REALIZADO",
    }
    write_json(REVIEW_DIR / "correct-folder-apply-summary.json", summary)
    write_report(summary, applied, pending)

    public_dir = ROOT / "generated-product-images" / "VER-TESTES-AQUI" / "pasta-correta-novos"
    public_dir.mkdir(parents=True, exist_ok=True)
    for file_name in [
        "contact-sheet-01.jpg",
        "contact-sheet-02.jpg",
        "preflight-report.md",
        "correct-folder-applied-platform-images.csv",
        "correct-folder-pending-after-apply.csv",
        "correct-folder-apply-summary.json",
        "correct-folder-apply-report.md",
    ]:
        source = REVIEW_DIR / file_name
        if source.exists():
            shutil.copy2(source, public_dir / file_name)

    print(json.dumps(summary, ensure_ascii=False, indent=2))


def write_report(summary: dict, applied: list[dict], pending: list[dict]) -> None:
    lines = [
        "# Pasta correta - novas imagens aplicadas localmente",
        "",
        "Status: aplicado somente na plataforma local. Não houve deploy e não houve atualização online no Bling.",
        "",
        "## Resumo",
        "",
        f"- Novas imagens detectadas na pasta correta: {summary['newImagesInFolder']}",
        f"- Produtos atualizados localmente: {summary['platformApplied']}",
        f"- Imagens pendentes por dúvida/SKU ausente: {summary['pending']}",
        "- Deploy: não realizado",
        "- Bling online: não atualizado",
        "",
        "## Aplicadas",
        "",
        "| Imagem | Produto | SKU | Preco | Arquivo |",
        "| --- | --- | --- | --- | --- |",
    ]
    for row in applied:
        lines.append(f"| {row['imageId']} | {row['displayName']} | {row['sku']} | R$ {row['price']} | {row['finalFileName']} |")

    lines.extend(
        [
            "",
            "## Pendentes",
            "",
            "| Imagem | Arquivo | Motivo |",
            "| --- | --- | --- |",
        ]
    )
    for row in pending:
        lines.append(f"| {row['imageId']} | {row['sourceFilename']} | {row['reason']} |")

    lines.extend(
        [
            "",
            "## Links locais para conferir",
            "",
            "- http://localhost:3000/produto/roleta-sexy",
            "- http://localhost:3000/produto/jogo-duelo-do-prazer-sexy",
            "- http://localhost:3000/produto/plug-metal-sexy",
            "- http://localhost:3000/produto/plug-metal-premium-sexy",
        ]
    )
    (REVIEW_DIR / "correct-folder-apply-report.md").write_text("\n".join(lines) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
