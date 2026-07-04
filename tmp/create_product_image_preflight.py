from __future__ import annotations

from pathlib import Path
import csv
import json
import shutil

from PIL import Image, ImageOps


ROOT = Path(__file__).resolve().parents[1]
REVIEW_DIR = ROOT / "reports" / "product-image-review"
INVENTORY = REVIEW_DIR / "downloads-image-inventory.json"
QUEUE = ROOT / "reports" / "image-generation-queue.json"
AUDIT = ROOT / "reports" / "product-image-audit.json"
UPLOADS = ROOT / "backend" / "public" / "uploads" / "products"
MAPPING = ROOT / "backend" / "data" / "mapeamento-imagens-produtos.json"
BLING_JSON = ROOT / "backend" / "data" / "produtos-bling.json"
BLING_IMAGE_FILES = ROOT / "backend" / "data" / "bling-image-files.json"


def read_json(path: Path):
    return json.loads(path.read_text(encoding="utf-8").lstrip("\ufeff"))


def write_csv(path: Path, rows: list[dict], fields: list[str]) -> None:
    with path.open("w", newline="", encoding="utf-8-sig") as f:
        writer = csv.DictWriter(f, fieldnames=fields)
        writer.writeheader()
        writer.writerows(rows)


def make_thumbnails(images: list[dict]) -> None:
    thumbs = REVIEW_DIR / "thumbs"
    thumbs.mkdir(parents=True, exist_ok=True)
    for item in images:
        src = Path(item["sourcePath"])
        out = thumbs / f"{item['id']}.jpg"
        if out.exists():
            continue
        img = ImageOps.exif_transpose(Image.open(src)).convert("RGB")
        img.thumbnail((360, 360), Image.Resampling.LANCZOS)
        canvas = Image.new("RGB", (380, 420), (247, 244, 241))
        canvas.paste(img, ((380 - img.width) // 2, 12))
        canvas.save(out, "JPEG", quality=90, optimize=True)


def create_review_html(images: list[dict], candidates: list[dict]) -> None:
    by_id = {row["imageId"]: row for row in candidates}
    rows = []
    for item in images:
        cand = by_id.get(item["id"], {})
        rows.append(
            f"""
            <tr>
              <td><strong>{item['id']}</strong><br><small>{item['name']}</small></td>
              <td><img src="thumbs/{item['id']}.jpg" alt="{item['id']}"></td>
              <td>{cand.get('candidateProductName', '')}<br><small>{cand.get('candidateSku', '')} / {cand.get('candidateProductId', '')}</small></td>
              <td>{cand.get('candidateDesiredFileName', '')}</td>
              <td class="warn">{cand.get('status', 'PENDENTE_REVISAO_VISUAL')}</td>
            </tr>
            """
        )
    html = f"""<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <title>KA Bijoux - revisão de imagens prontas</title>
  <style>
    body {{ font-family: Arial, sans-serif; margin: 24px; color: #262026; background: #faf7f4; }}
    table {{ width: 100%; border-collapse: collapse; background: white; }}
    th, td {{ border: 1px solid #ddd4cf; padding: 10px; vertical-align: top; }}
    th {{ background: #4d1630; color: white; text-align: left; position: sticky; top: 0; }}
    img {{ width: 180px; height: auto; display: block; }}
    small {{ color: #665960; }}
    .warn {{ color: #8a4b00; font-weight: 700; }}
  </style>
</head>
<body>
  <h1>KA Bijoux - revisão de imagens prontas</h1>
  <p>Total: {len(images)} imagens. As candidatas por ordem estão marcadas como dúvida e não devem ser importadas sem confirmação visual.</p>
  <table>
    <thead>
      <tr><th>Imagem</th><th>Prévia</th><th>Candidato por ordem</th><th>Nome final sugerido</th><th>Status</th></tr>
    </thead>
    <tbody>
      {''.join(rows)}
    </tbody>
  </table>
</body>
</html>
"""
    (REVIEW_DIR / "review.html").write_text(html, encoding="utf-8")


def main() -> None:
    REVIEW_DIR.mkdir(parents=True, exist_ok=True)
    images = read_json(INVENTORY)
    queue = read_json(QUEUE) if QUEUE.exists() else []
    audit = read_json(AUDIT) if AUDIT.exists() else {}
    mapping = read_json(MAPPING) if MAPPING.exists() else []
    bling_rows = read_json(BLING_JSON) if BLING_JSON.exists() else []
    bling_image_files = read_json(BLING_IMAGE_FILES) if BLING_IMAGE_FILES.exists() else []

    make_thumbnails(images)

    manual_rows = []
    for item in images:
        sheet_no = (int(item["id"].replace("IMG", "")) - 1) // 16 + 1
        manual_rows.append(
            {
                "imageId": item["id"],
                "contactSheet": f"contact-sheet-{sheet_no:02d}.jpg",
                "sourceFilename": item["name"],
                "sourcePath": item["sourcePath"],
                "productId": "",
                "sku": "",
                "productName": "",
                "desiredFileName": "",
                "status": "PENDENTE_REVISAO_VISUAL",
                "notes": "",
            }
        )
    write_csv(
        REVIEW_DIR / "manual-match-template.csv",
        manual_rows,
        [
            "imageId",
            "contactSheet",
            "sourceFilename",
            "sourcePath",
            "productId",
            "sku",
            "productName",
            "desiredFileName",
            "status",
            "notes",
        ],
    )

    candidates = []
    for idx, item in enumerate(images):
        q = queue[idx] if idx < len(queue) else {}
        candidates.append(
            {
                "imageId": item["id"],
                "sourceFilename": item["name"],
                "candidateProductId": q.get("productId", ""),
                "candidateSku": q.get("sku", ""),
                "candidateProductName": q.get("productName", ""),
                "candidateCategory": q.get("categoryName") or q.get("category", ""),
                "candidateSubcategory": q.get("subcategoryName") or q.get("subcategory", ""),
                "candidateColor": q.get("color", ""),
                "candidateFlavor": q.get("flavor", ""),
                "candidateDesiredFileName": q.get("desiredFileName", ""),
                "queueStatus": q.get("status", ""),
                "status": "DUVIDA_ORDEM_NAO_CONFIRMADA",
                "action": "NAO_APLICAR_SEM_CONFIRMACAO_VISUAL",
            }
        )
    write_csv(
        REVIEW_DIR / "order-based-candidates.csv",
        candidates,
        [
            "imageId",
            "sourceFilename",
            "candidateProductId",
            "candidateSku",
            "candidateProductName",
            "candidateCategory",
            "candidateSubcategory",
            "candidateColor",
            "candidateFlavor",
            "candidateDesiredFileName",
            "queueStatus",
            "status",
            "action",
        ],
    )

    test_rows = candidates[:5]
    write_csv(REVIEW_DIR / "test-5-candidates.csv", test_rows, list(test_rows[0].keys()) if test_rows else [])
    create_review_html(images, candidates)

    uploads_count = len([p for p in UPLOADS.glob("*") if p.is_file()]) if UPLOADS.exists() else 0
    report = f"""# KA Bijoux - preflight de imagens prontas

## Resumo

- Pasta origem: `{images[0]['sourcePath'].rsplit('\\\\', 1)[0] if images else ''}`
- Imagens prontas encontradas: **{len(images)}**
- Produtos no catálogo Bling local: **{len(bling_rows)}**
- Itens na fila de imagens: **{len(queue)}**
- Produtos na auditoria de imagem: **{len(audit.get('products', [])) if isinstance(audit, dict) else 0}**
- Arquivos atuais em `backend/public/uploads/products`: **{uploads_count}**
- Entradas atuais em `backend/data/mapeamento-imagens-produtos.json`: **{len(mapping)}**
- Entradas atuais em `backend/data/bling-image-files.json`: **{len(bling_image_files)}**

## Status de segurança

Nenhuma imagem foi anexada ao Bling.
Nenhuma imagem foi aplicada no banco/plataforma.
Nenhuma descrição foi alterada.
Nenhum deploy foi feito.

## Observação crítica

As 69 imagens têm nomes genéricos do ChatGPT e não possuem metadados com nome do produto. Como não há OCR/modelo visual local disponível, não é seguro associar automaticamente cada imagem a um produto apenas pelo arquivo.

Por isso foram criados dois arquivos:

- `manual-match-template.csv`: planilha segura para preencher/confirmar SKU, ID Bling e produto de cada `IMG###`.
- `order-based-candidates.csv`: hipótese por ordem cronológica versus fila de geração. Todos os itens estão marcados como `DUVIDA_ORDEM_NAO_CONFIRMADA`.

## Teste com 5 produtos

O arquivo `test-5-candidates.csv` contém os 5 primeiros candidatos **somente para revisão**. Eles só devem ser aplicados se houver confirmação visual ou se for confirmado que as imagens foram geradas exatamente na mesma ordem da fila.

## Artefatos de revisão

- `review.html`: revisão visual com miniaturas e candidato por ordem.
- `contact-sheet-01.jpg` a `contact-sheet-05.jpg`: folhas numeradas para conferência.
- `downloads-image-inventory.json`: inventário técnico das imagens de origem.
- `manual-match-template.csv`: planilha de correspondência manual segura.
- `order-based-candidates.csv`: candidatos por ordem, não aprovados.
- `test-5-candidates.csv`: primeiro bloco de teste, não aplicado.

## Como a plataforma usa a imagem

Para produtos do catálogo Bling local, a imagem principal aparece nas listagens e detalhes quando:

1. O arquivo existe em `backend/public/uploads/products`.
2. O produto está mapeado por `blingId` ou `sku` em `backend/data/mapeamento-imagens-produtos.json`.
3. O nome do arquivo também está refletido em `backend/data/bling-image-files.json` ou resolvido pelo mapeamento.

Depois da confirmação dos 5 produtos, o próximo passo seguro é copiar/renomear esses 5 arquivos para `uploads/products`, atualizar o mapeamento local e rodar validação. Para Bling online, ainda falta credencial OAuth/API configurada.
"""
    (REVIEW_DIR / "preflight-report.md").write_text(report, encoding="utf-8")
    print(f"reviewDir={REVIEW_DIR}")
    print("created=preflight-report.md, review.html, manual-match-template.csv, order-based-candidates.csv, test-5-candidates.csv")


if __name__ == "__main__":
    main()
