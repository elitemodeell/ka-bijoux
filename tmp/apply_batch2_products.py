from __future__ import annotations

from pathlib import Path
import csv
import json
import shutil
from datetime import datetime

from PIL import Image, ImageOps


ROOT = Path(__file__).resolve().parents[1]
REVIEW_DIR = ROOT / "reports" / "product-image-review-batch-2"
UPLOADS = ROOT / "backend" / "public" / "uploads" / "products"
BACKEND_MAPPING = ROOT / "backend" / "data" / "mapeamento-imagens-produtos.json"
ROOT_MAPPING = ROOT / "mapeamento-imagens-produtos.json"
IMAGE_FILES = ROOT / "backend" / "data" / "bling-image-files.json"
CONTENT_OVERRIDES = ROOT / "backend" / "data" / "product-content-overrides.json"
BACKUP_DIR = REVIEW_DIR / "backup-before-apply"

SOURCES = [
    "https://www.plannedparenthood.org/learn/sex-pleasure-and-sexual-dysfunction/sex-and-pleasure/sex-toys",
    "https://www.nhs.uk/live-well/sexual-health/sexual-health-for-lesbian-and-bisexual-women/",
    "https://www.cdc.gov/condom-use/index.html",
    "https://www.farmaciasnissei.com.br/lenco-umedecido-prudence-intima-20-unidades",
    "https://www.drogal.com.br/lencos-umedecidos-prudence-para-higiene-intima-20-unidades/p",
    "https://www.erosmania.com.br/roleta-kama-sutra-jogo-erotico-para-casais/3207/320053A/",
    "https://www.bellebras.com.br/produtos/adesivo-tapa-mamilo-com-brilho-coracao/",
]

APPLY_ITEMS = [
    {
        "imageId": "B2-IMG001",
        "displayName": "Roleta Kamasutra Sexy",
        "blingId": "16543909026",
        "sku": "3104000001682",
        "productName": "ROLETA SEXY",
        "finalFileName": "roleta-sexy-3104000001682.jpg",
        "price": "24",
        "stock": "10",
        "kind": "game",
    },
    {
        "imageId": "B2-IMG004",
        "displayName": "Jogo Duelo do Prazer Sexy",
        "blingId": "16653024561",
        "sku": "3104000004391",
        "productName": "JOGO DUELO DO PRAZER SEXY",
        "finalFileName": "jogo-duelo-do-prazer-sexy-3104000004391.jpg",
        "price": "12",
        "stock": "36",
        "kind": "game",
    },
    {
        "imageId": "B2-IMG006",
        "displayName": "Black Ice Gel Corporal 30ml",
        "blingId": "16666181276",
        "sku": "3104000004719",
        "productName": "HOT ICE GEL",
        "finalFileName": "hot-ice-gel-3104000004719.jpg",
        "price": "12",
        "stock": "3",
        "kind": "gel",
    },
    {
        "imageId": "B2-IMG008",
        "displayName": "Lenços Umedecidos Prudence Íntima",
        "blingId": "16652979695",
        "sku": "3104000004386",
        "productName": "LENÇO UMEDECIDO INTIMO",
        "finalFileName": "lenco-umedecido-intimo-3104000004386.jpg",
        "price": "17",
        "stock": "10",
        "kind": "wipes",
    },
    {
        "imageId": "B2-IMG011",
        "displayName": "Algema Metálica Clássica Prata",
        "blingId": "16666340000",
        "sku": "3104000004740",
        "productName": "ALGEMA PRATA TRADICIONAL",
        "finalFileName": "algema-prata-tradicional-3104000004740.jpg",
        "price": "12",
        "stock": "0",
        "kind": "handcuff",
    },
    {
        "imageId": "B2-IMG012",
        "displayName": "Algema de Pelúcia Vermelha",
        "blingId": "16666339520",
        "sku": "3104000004738",
        "productName": "ALGEMA VERMELHA VELUDO",
        "finalFileName": "algema-vermelha-veludo-3104000004738.jpg",
        "price": "17",
        "stock": "5",
        "kind": "handcuff",
    },
    {
        "imageId": "B2-IMG013",
        "displayName": "Algema de Pelúcia Animal Print",
        "blingId": "16666338734",
        "sku": "3104000004735",
        "productName": "ALGEMA ONÇA VELUDO",
        "finalFileName": "algema-onca-veludo-3104000004735.jpg",
        "price": "17",
        "stock": "10",
        "kind": "handcuff",
    },
    {
        "imageId": "B2-IMG014",
        "displayName": "Algema de Pelúcia Branca",
        "blingId": "16666339307",
        "sku": "3104000004737",
        "productName": "ALGEMA BRANCA VELUDO",
        "finalFileName": "algema-branca-veludo-3104000004737.jpg",
        "price": "17",
        "stock": "2",
        "kind": "handcuff",
    },
    {
        "imageId": "B2-IMG015",
        "displayName": "Algema de Pelúcia Rosa",
        "blingId": "16666339092",
        "sku": "3104000004736",
        "productName": "ALGEMA ROSA VELUDO",
        "finalFileName": "algema-rosa-veludo-3104000004736.jpg",
        "price": "17",
        "stock": "3",
        "kind": "handcuff",
    },
    {
        "imageId": "B2-IMG016",
        "displayName": "Algema de Pelúcia Preta",
        "blingId": "16666339674",
        "sku": "3104000004739",
        "productName": "ALGEMA PRETA VELUDO",
        "finalFileName": "algema-preta-veludo-3104000004739.jpg",
        "price": "17",
        "stock": "5",
        "kind": "handcuff",
    },
    {
        "imageId": "B2-IMG017",
        "displayName": "Caneta Comestível Sensuale",
        "blingId": "16516510904",
        "sku": "3104000000812",
        "productName": "CANETA COMESTIVEL SEXY",
        "finalFileName": "caneta-comestivel-sexy-3104000000812.jpg",
        "price": "12",
        "stock": "7",
        "kind": "edible_pen",
    },
    {
        "imageId": "B2-IMG018",
        "displayName": "Jogo da Sedução Sexy",
        "blingId": "16543533646",
        "sku": "3104000001671",
        "productName": "JOGO DE SEDUCÃO SEXY",
        "finalFileName": "jogo-de-seducao-sexy-3104000001671.jpg",
        "price": "36",
        "stock": "10",
        "kind": "game",
    },
    {
        "imageId": "B2-IMG020",
        "displayName": "Tapa-Seios em X Preto com Glitter",
        "blingId": "16653274018",
        "sku": "3104000004402",
        "productName": "TAPA MAMILO PREMIUM SEXY",
        "finalFileName": "tapa-mamilo-premium-sexy-3104000004402.jpg",
        "price": "24",
        "stock": "4",
        "kind": "pasties",
    },
    {
        "imageId": "B2-IMG024",
        "displayName": "Tapa-Seios Coração Preto",
        "blingId": "16543926929",
        "sku": "3104000001688",
        "productName": "TAPA MAMILO SEXY",
        "finalFileName": "tapa-mamilo-sexy-3104000001688.jpg",
        "price": "12",
        "stock": "21",
        "kind": "pasties",
    },
    {
        "imageId": "B2-IMG026",
        "displayName": "Tapa-Seios Coração com Glitter Vermelho",
        "blingId": "16440935729",
        "sku": "3104000000080",
        "productName": "KIT TAPA MAMILO DESCARTAVEL",
        "finalFileName": "kit-tapa-mamilo-descartavel-3104000000080.jpg",
        "price": "12",
        "stock": "143",
        "kind": "pasties",
    },
]


def read_json(path: Path):
    return json.loads(path.read_text(encoding="utf-8").lstrip("\ufeff"))


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
        background = Image.new("RGB", image.size, (255, 255, 255))
        background.paste(image.convert("RGBA"), mask=image.convert("RGBA").getchannel("A"))
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
                "obs": f"Lote 2 aplicado localmente em 2026-07-01; origem {row['imageId']}",
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


def content_for(item: dict) -> dict:
    common = {
        "blingId": item["blingId"],
        "sku": item["sku"],
        "name": item["productName"],
        "displayName": item["displayName"],
        "isAdult": True,
        "categoryName": "Linha Adulto",
        "subcategoryName": subcategory_for(item["kind"]),
        "price": item["price"],
        "stock": item["stock"],
        "imageFile": item["finalFileName"],
        "platformUrl": f"/uploads/products/{item['finalFileName']}",
        "researchStatus": "lote_2_aplicado_localmente",
        "researchSources": SOURCES,
        "composition": None,
        "packageContents": package_for(item["kind"], item["displayName"]),
        "seoTitle": f"{item['displayName']} | KA Bijoux",
        "seoSlug": slugify(item["displayName"]),
    }
    kind = item["kind"]
    if kind == "game":
        text = f"{item['displayName']} é um jogo adulto para casais, pensado para criar momentos descontraídos com desafios, ideias e interação a dois."
        return finish(common, text, "Use em ambiente reservado, com consentimento e respeito aos limites de cada pessoa. Leia as instruções do jogo antes de começar.", "Produto destinado a maiores de 18 anos. Guarde em local seco, longe do alcance de crianças, e interrompa qualquer dinâmica que gere desconforto.")
    if kind == "gel":
        text = f"{item['displayName']} é um gel corporal adulto com proposta sensorial para massagem e momentos especiais, em embalagem prática de 30ml."
        return finish(common, text, "Leia o rótulo antes do uso. Aplique pequena quantidade somente na região indicada pelo fabricante. Evite olhos, mucosas, pele irritada ou lesionada e não ingira.", "Produto destinado a maiores de 18 anos. Mantenha fora do alcance de crianças, em local fresco e seco. Suspenda o uso em caso de irritação ou desconforto.")
    if kind == "wipes":
        text = f"{item['displayName']} são lenços umedecidos para higiene íntima adulta, em embalagem prática para levar na bolsa ou necessaire."
        return finish(common, text, "Use externamente na região íntima conforme necessidade e descarte o lenço após o uso. Não reutilize.", "Uso externo. Não aplicar em pele irritada ou lesionada. Suspenda em caso de irritação. Não descartar no vaso sanitário, salvo se a embalagem indicar essa possibilidade.")
    if kind == "handcuff":
        text = f"{item['displayName']} é um acessório adulto para compor momentos consensuais com visual marcante e uso discreto."
        return finish(common, text, "Use apenas com consentimento. Ajuste sem apertar demais e mantenha a chave ou trava de abertura ao alcance durante todo o uso.", "Produto destinado a maiores de 18 anos. Não utilize para imobilização forte, suspensão ou qualquer prática que possa causar lesão. Limpe e guarde em local seco.")
    if kind == "edible_pen":
        text = f"{item['displayName']} é uma caneta sensual de uso adulto, criada para brincadeiras íntimas com aplicação precisa e proposta divertida."
        return finish(common, text, "Leia o rótulo antes do uso. Aplique somente conforme a indicação da embalagem e evite olhos, mucosas sensíveis, pele irritada ou lesionada.", "Produto destinado a maiores de 18 anos. Não use se houver alergia a algum componente. Mantenha fechado, em local fresco e fora do alcance de crianças.")
    if kind == "pasties":
        text = f"{item['displayName']} é um tapa-seios adesivo de uso adulto, ideal para composições sensuais, fantasias e produções especiais."
        return finish(common, text, "Aplique sobre a pele limpa e seca, sem creme, óleo ou perfume na região. Remova o papel protetor e cole suavemente sobre a área desejada.", "Produto destinado a maiores de 18 anos. Não aplique sobre pele irritada ou lesionada. Remova com cuidado e suspenda o uso em caso de vermelhidão, alergia ou desconforto.")
    return finish(common, f"{item['displayName']} faz parte da Linha Adulto KA Bijoux.", "Use conforme a embalagem.", "Produto destinado a maiores de 18 anos.")


def finish(common: dict, description: str, usage: str, care: str) -> dict:
    return {
        **common,
        "shortDescription": description,
        "longDescription": description + " A KA Bijoux recomenda uso responsável, linguagem discreta e atenção às orientações da embalagem.",
        "details": [
            "Marca: KA Bijoux",
            f"Categoria: {common['categoryName']}",
            f"Conteúdo: {common['packageContents'].rstrip('.')}",
            "Uso adulto: Sim",
        ],
        "benefits": "Produto com apresentação discreta, pronto para a vitrine e pensado para compra adulta com informação clara.",
        "howToUse": usage,
        "careInstructions": care,
        "seoDescription": description[:155],
        "seoKeywords": [common["displayName"], common["categoryName"], common["subcategoryName"], "KA Bijoux"],
    }


def subcategory_for(kind: str) -> str:
    return {
        "game": "Jogos Adultos",
        "gel": "Géis & Cremes",
        "wipes": "Cuidados Íntimos",
        "handcuff": "Acessórios Adultos",
        "edible_pen": "Géis & Cremes",
        "pasties": "Acessórios Adultos",
    }.get(kind, "Linha Adulto")


def package_for(kind: str, name: str) -> str:
    if kind == "wipes":
        return "1 embalagem de lenços umedecidos íntimos."
    if kind == "pasties":
        return "1 par de tapa-seios."
    return f"1 {name.lower()}."


def slugify(value: str) -> str:
    import unicodedata
    import re

    text = unicodedata.normalize("NFD", value)
    text = "".join(ch for ch in text if unicodedata.category(ch) != "Mn").lower()
    text = re.sub(r"[^a-z0-9]+", "-", text).strip("-")
    return re.sub(r"-+", "-", text)


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


def main() -> None:
    inventory = {item["id"]: item for item in read_json(REVIEW_DIR / "downloads-image-inventory.json")}
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

    pending_ids = {item["imageId"] for item in APPLY_ITEMS}
    pending = []
    for row in read_candidates():
        if row["imageId"] not in pending_ids:
            pending.append({**row, "pendingReason": row.get("notes", "")})

    fields = [
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
    ]
    write_csv(REVIEW_DIR / "batch2-applied-platform-images.csv", applied, fields)
    write_csv(REVIEW_DIR / "batch2-pending-after-apply.csv", pending, list(pending[0].keys()) if pending else ["imageId"])

    summary = {
        "appliedAt": datetime.now().isoformat(timespec="seconds"),
        "folder": str(Path.home() / "Downloads" / "produtodos atualizados 2"),
        "imagesInFolder": len(inventory),
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
    write_json(REVIEW_DIR / "batch2-apply-summary.json", summary)
    write_report(summary, applied, pending)

    public_dir = ROOT / "generated-product-images" / "VER-TESTES-AQUI" / "lote-2"
    public_dir.mkdir(parents=True, exist_ok=True)
    for file_name in [
        "batch2-applied-platform-images.csv",
        "batch2-pending-after-apply.csv",
        "batch2-apply-summary.json",
        "batch2-apply-report.md",
    ]:
        shutil.copy2(REVIEW_DIR / file_name, public_dir / file_name)

    print(json.dumps(summary, ensure_ascii=False, indent=2))


def read_candidates() -> list[dict]:
    path = REVIEW_DIR / "batch2-association-candidates.csv"
    with path.open("r", encoding="utf-8-sig", newline="") as f:
        return list(csv.DictReader(f, delimiter=";"))


def write_report(summary: dict, applied: list[dict], pending: list[dict]) -> None:
    lines = [
        "# Lote 2 - aplicação local",
        "",
        "Status: aplicado somente na plataforma local. Não houve deploy e não houve atualização online no Bling.",
        "",
        "## Resumo",
        "",
        f"- Imagens na pasta: {summary['imagesInFolder']}",
        f"- Imagens aplicadas localmente: {summary['platformApplied']}",
        f"- Imagens pendentes: {summary['pending']}",
        "- Deploy: não realizado",
        "- Bling online: não atualizado",
        "",
        "## Aplicadas",
        "",
        "| Imagem | Produto | SKU | Arquivo |",
        "| --- | --- | --- | --- |",
    ]
    for row in applied:
        lines.append(f"| {row['imageId']} | {row['displayName']} | {row['sku']} | {row['finalFileName']} |")
    lines.extend(["", "## Pendentes", "", "| Imagem | Produto visual | Motivo |", "| --- | --- | --- |"])
    for row in pending:
        lines.append(f"| {row.get('imageId', '')} | {row.get('visualName', '')} | {row.get('pendingReason', '')} |")
    (REVIEW_DIR / "batch2-apply-report.md").write_text("\n".join(lines) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
