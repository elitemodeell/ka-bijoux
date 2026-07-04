from __future__ import annotations

from pathlib import Path
import csv
import json
from datetime import datetime


ROOT = Path(__file__).resolve().parents[1]
APPLIED = ROOT / "reports" / "product-image-review" / "applied-platform-images.csv"
OUT = ROOT / "backend" / "data" / "product-content-overrides.json"
REPORT = ROOT / "reports" / "product-image-review" / "content-overrides-report.json"


ADULT_WORDS = [
    "bullet",
    "vibrador",
    "anel peniano",
    "dedeira",
    "algema",
    "gel chines",
    "pau erguido",
    "gel sensual",
    "bumbum gel",
    "nabucet",
    "masturbador",
    "dessensibilizante",
    "multifuncoes sexy",
    "feminino sexy",
]


def read_applied() -> list[dict]:
    with APPLIED.open("r", encoding="utf-8-sig", newline="") as f:
        return list(csv.DictReader(f, delimiter=";"))


def title_case(name: str) -> str:
    keep_upper = {"ip", "brasil", "miamake"}
    words = []
    for word in name.lower().replace("cor:", "cor ").split():
        if word in keep_upper:
            words.append(word.upper() if word != "miamake" else "Miamake")
        elif word in {"de", "do", "da", "dos", "das", "com", "para", "e"}:
            words.append(word)
        else:
            words.append(word.capitalize())
    return " ".join(words)


def normalize(value: str) -> str:
    import unicodedata

    return "".join(
        ch for ch in unicodedata.normalize("NFD", value.lower()) if unicodedata.category(ch) != "Mn"
    )


def is_adult(row: dict) -> bool:
    text = normalize(f"{row['productName']} {row['category']} {row['subcategory']}")
    if "linha adulto" in text:
        return True
    return any(word in text for word in ADULT_WORDS)


def color_from(row: dict) -> str:
    if row.get("color"):
        return row["color"].strip()
    text = normalize(row["productName"])
    colors = [
        ("branco", "Branco"),
        ("branca", "Branco"),
        ("rosa", "Rosa"),
        ("vermelho", "Vermelho"),
        ("vermelha", "Vermelho"),
        ("preto", "Preto"),
        ("preta", "Preto"),
        ("roxo", "Roxo"),
        ("prata", "Prata"),
        ("onca", "Onça"),
        ("verde", "Verde"),
    ]
    for token, label in colors:
        if token in text:
            return label
    return ""


def volume_from(name: str) -> str:
    text = normalize(name)
    import re

    match = re.search(r"(\d+)\s*(ml|g)\b", text)
    if match:
        return f"{match.group(1)} {match.group(2)}"
    return ""


def category_label(row: dict) -> str:
    if row["subcategory"]:
        return row["subcategory"]
    if row["category"]:
        return row["category"]
    return "KA Bijoux"


def adult_content(row: dict, display_name: str, color: str) -> dict:
    text = normalize(row["productName"])
    details = ["Produto de uso adulto (+18)", "Venda e uso destinados a maiores de 18 anos"]
    if color:
        details.append(f"Cor/modelo: {color}")
    if row.get("price"):
        details.append(f"Preço cadastrado: R$ {str(row['price']).replace('.', ',')}")
    if row.get("stock"):
        details.append(f"Estoque atual: {row['stock']} unidade(s)")

    care = (
        "Guarde em local limpo, seco e protegido de calor excessivo. Produtos de uso íntimo não devem ser compartilhados. "
        "Interrompa o uso em caso de desconforto, irritação ou reação inesperada."
    )

    if "algema" in text:
        return {
            "shortDescription": f"{display_name} é um acessório adulto para compor momentos a dois com discrição e cuidado.",
            "longDescription": (
                f"{display_name} faz parte da Linha Adulto KA Bijoux e foi selecionada para quem busca um acessório de fantasia "
                "com apresentação discreta e acabamento visual atraente. É uma opção para brincadeiras consensuais entre adultos, "
                "sempre respeitando limites, conforto e segurança durante o uso."
            ),
            "details": details + ["Tipo: acessório de fantasia adulto", "Uso consensual entre adultos"],
            "benefits": "Visual marcante, proposta discreta e fácil de incluir em momentos especiais entre adultos.",
            "howToUse": (
                "Use somente em brincadeiras consensuais entre adultos. Ajuste sem apertar demais e evite prender por longos períodos. "
                "Não utilize em caso de desconforto, dor, irritação na pele ou restrição de movimento."
            ),
            "composition": "Material não informado pelo cadastro. Consulte a embalagem do fabricante antes do uso.",
            "careInstructions": care,
            "packageContents": "1 unidade, conforme cadastro do produto.",
        }

    if "anel peniano" in text or "dedeira" in text:
        return {
            "shortDescription": f"{display_name} é um acessório íntimo adulto para complementar momentos a dois com discrição.",
            "longDescription": (
                f"{display_name} é indicado para adultos que desejam explorar novas sensações de forma prática e reservada. "
                "O formato facilita o uso conforme a proposta do produto e o modelo deve ser escolhido de acordo com preferência, conforto e cor desejada."
            ),
            "details": details + ["Tipo: acessório íntimo adulto", "Higienização recomendada antes e após o uso"],
            "benefits": "Compacto, discreto e fácil de guardar, com proposta de uso adulto e reservado.",
            "howToUse": (
                "Higienize antes e depois do uso. Utilize conforme a orientação da embalagem, sempre com conforto e sem forçar. "
                "Quando aplicável, use lubrificante compatível e interrompa em caso de desconforto."
            ),
            "composition": "Material não informado pelo cadastro. Confira a embalagem antes do uso.",
            "careInstructions": care,
            "packageContents": "1 unidade, conforme cadastro do produto.",
        }

    if any(word in text for word in ["vibrador", "bullet", "masturbador"]):
        return {
            "shortDescription": f"{display_name} é um produto adulto discreto para exploração de sensações com praticidade.",
            "longDescription": (
                f"{display_name} integra a Linha Adulto KA Bijoux e foi escolhido para oferecer uma experiência reservada, prática e fácil de armazenar. "
                "Seu formato compacto ajuda no manuseio e permite uso conforme as orientações do fabricante, sempre com cuidado, higiene e conforto."
            ),
            "details": details + ["Tipo: acessório adulto", "Higienização recomendada antes e após o uso"],
            "benefits": "Formato prático, proposta discreta e experiência voltada ao bem-estar adulto.",
            "howToUse": (
                "Leia a embalagem antes do primeiro uso. Higienize antes e após utilizar. Comece de forma gradual e, quando aplicável, "
                "use lubrificante compatível. Não mergulhe componentes elétricos e interrompa o uso em caso de desconforto."
            ),
            "composition": "Material e alimentação não informados pelo cadastro. Consulte a embalagem do fabricante.",
            "careInstructions": care,
            "packageContents": "1 unidade, conforme cadastro do produto.",
        }

    if any(word in text for word in ["gel", "creme", "dessensibilizante"]):
        vol = volume_from(row["productName"])
        if vol:
            details.append(f"Conteúdo aproximado: {vol}")
        return {
            "shortDescription": f"{display_name} é uma opção de cuidado adulto para uso conforme as orientações da embalagem.",
            "longDescription": (
                f"{display_name} faz parte da curadoria adulta da KA Bijoux e foi selecionado para quem procura uma opção discreta para momentos de cuidado, "
                "bem-estar e intimidade. Use sempre conforme o rótulo e evite promessas ou aplicações diferentes das indicadas pelo fabricante."
            ),
            "details": details + ["Tipo: gel/creme adulto", "Aplicação conforme rótulo do fabricante"],
            "benefits": "Embalagem prática, proposta discreta e uso adulto com orientação do fabricante.",
            "howToUse": (
                "Leia o rótulo antes de aplicar. Use pequena quantidade apenas na região indicada pela embalagem. "
                "Evite contato com olhos, não utilize sobre pele irritada e suspenda o uso em caso de desconforto."
            ),
            "composition": "Composição não informada no cadastro. Consulte o rótulo físico do produto antes do uso.",
            "careInstructions": care,
            "packageContents": "1 unidade, conforme cadastro do produto.",
        }

    return {
        "shortDescription": f"{display_name} é um produto adulto selecionado pela KA Bijoux para uso discreto e responsável.",
        "longDescription": (
            f"{display_name} integra a Linha Adulto KA Bijoux, com proposta reservada e voltada para maiores de 18 anos. "
            "Utilize conforme a embalagem e respeite as orientações de higiene, conforto e segurança."
        ),
        "details": details,
        "benefits": "Produto adulto com compra discreta e curadoria KA Bijoux.",
        "howToUse": "Leia a embalagem antes de usar e siga as orientações do fabricante. Interrompa em caso de desconforto.",
        "composition": "Informação não disponível no cadastro. Consulte a embalagem do fabricante.",
        "careInstructions": care,
        "packageContents": "1 unidade, conforme cadastro do produto.",
    }


def regular_content(row: dict, display_name: str, color: str) -> dict:
    text = normalize(row["productName"])
    cat = category_label(row)
    details = [f"Categoria: {cat}"]
    if color:
        details.append(f"Cor/modelo: {color}")
    if row.get("price"):
        details.append(f"Preço cadastrado: R$ {str(row['price']).replace('.', ',')}")
    if row.get("stock"):
        details.append(f"Estoque atual: {row['stock']} unidade(s)")

    if "cachecol" in text:
        kind = "cachecol premium" if "premium" in text else "cachecol"
        return {
            "shortDescription": f"{display_name} é um {kind} confortável para compor looks de inverno com charme.",
            "longDescription": (
                f"{display_name} foi escolhido para trazer aconchego e estilo aos dias mais frios. "
                "É uma peça versátil para usar no dia a dia, combinar com casacos e criar composições elegantes sem esforço."
            ),
            "details": details + ["Indicado para dias frios", "Uso casual e urbano"],
            "benefits": "Ajuda a proteger do frio e adiciona acabamento estiloso ao visual.",
            "howToUse": "Use ao redor do pescoço, ajustando conforme conforto e estilo desejado.",
            "composition": "Composição não informada no cadastro. Confira a etiqueta do produto.",
            "careInstructions": "Lave conforme a etiqueta. Evite alvejante e seque à sombra para preservar a peça.",
            "packageContents": "1 cachecol.",
        }

    if "case ip" in text:
        return {
            "shortDescription": f"{display_name} é uma capa para celular com visual clean e proteção para o dia a dia.",
            "longDescription": (
                f"{display_name} ajuda a proteger o aparelho contra riscos leves e marcas de uso, mantendo o visual alinhado com a cor escolhida. "
                "É uma opção prática para renovar o celular e combinar com diferentes estilos."
            ),
            "details": details + ["Compatibilidade: modelo IP 16E conforme cadastro", "Proteção contra riscos leves"],
            "benefits": "Protege, renova o visual do aparelho e é fácil de encaixar.",
            "howToUse": "Encaixe o celular cuidadosamente na capa, alinhando botões e câmera. Remova com cuidado para evitar danos ao aparelho.",
            "composition": "Material não informado no cadastro.",
            "careInstructions": "Limpe com pano macio levemente umedecido. Evite produtos abrasivos.",
            "packageContents": "1 capa para celular.",
        }

    if any(word in text for word in ["colar", "brinco", "broche", "bracelete", "pulseira", "faixa", "adesivo", "laco"]):
        return {
            "shortDescription": f"{display_name} é um acessório de moda para dar destaque ao visual.",
            "longDescription": (
                f"{display_name} foi selecionado para complementar produções com praticidade e personalidade. "
                "É uma peça versátil para uso em datas especiais, composições temáticas ou no dia a dia, conforme o estilo desejado."
            ),
            "details": details + ["Uso fashion e decorativo", "Peça individual conforme cadastro"],
            "benefits": "Fácil de combinar, leve e ideal para completar o look.",
            "howToUse": "Use como acessório decorativo, combinando com roupas e outros itens de sua preferência.",
            "composition": "Material não informado no cadastro.",
            "careInstructions": "Evite contato com água, perfume e produtos químicos. Guarde separado para preservar o acabamento.",
            "packageContents": "1 unidade, conforme cadastro do produto.",
        }

    if "vale presente" in text:
        value = row["productName"].replace("VALE PRESENTE", "").strip()
        return {
            "shortDescription": f"{display_name} é uma opção prática para presentear com liberdade de escolha.",
            "longDescription": (
                f"{display_name} permite presentear alguém especial deixando a escolha final por conta da pessoa. "
                "É ideal para aniversários, datas comemorativas ou quando você quer acertar no presente com praticidade."
            ),
            "details": details + [f"Valor do vale: R$ {value}" if value else "Vale-presente KA Bijoux"],
            "benefits": "Presente flexível, prático e fácil de usar na loja.",
            "howToUse": "Após a compra, siga as instruções de utilização informadas pela loja. O vale deve ser usado conforme regras vigentes da KA Bijoux.",
            "composition": "Produto digital/comercial, sem composição física aplicável.",
            "careInstructions": "Guarde o comprovante e as informações do vale até a utilização.",
            "packageContents": "1 vale-presente.",
        }

    if "calcinha" in text:
        return {
            "shortDescription": f"{display_name} combina conforto e modelagem para uso íntimo adulto.",
            "longDescription": (
                f"{display_name} foi selecionada para quem busca uma peça íntima com ajuste confortável e proposta funcional. "
                "É uma opção para uso pessoal, sempre respeitando numeração, conforto e cuidados de lavagem."
            ),
            "details": details + ["Produto íntimo", "Escolha conforme tamanho e conforto"],
            "benefits": "Peça prática para a rotina, com proposta de sustentação e conforto.",
            "howToUse": "Use como roupa íntima, respeitando o tamanho adequado ao corpo.",
            "composition": "Composição não informada no cadastro. Confira a etiqueta da peça.",
            "careInstructions": "Lave antes do primeiro uso. Higienize separadamente, de preferência com sabão neutro, e seque à sombra.",
            "packageContents": "1 peça íntima.",
        }

    if any(word in text for word in ["creme facial", "oleo hidratante", "blush", "algodao", "progressiva", "carimbo de francesinha"]):
        return {
            "shortDescription": f"{display_name} é um item de beleza e cuidado pessoal para complementar sua rotina.",
            "longDescription": (
                f"{display_name} integra a seleção de beleza da KA Bijoux e foi escolhido para facilitar cuidados diários, acabamento ou preparação pessoal. "
                "Use conforme a finalidade do produto e leia sempre as orientações do fabricante antes do uso."
            ),
            "details": details + ["Uso cosmético/cuidados pessoais", "Aplicação conforme embalagem"],
            "benefits": "Prático para a rotina de beleza e fácil de guardar.",
            "howToUse": "Aplique ou utilize conforme as instruções do rótulo. Faça teste em pequena área quando aplicável.",
            "composition": "Composição não informada no cadastro. Consulte o rótulo antes de usar.",
            "careInstructions": "Mantenha fechado, longe de calor excessivo e fora do alcance de crianças.",
            "packageContents": "1 unidade, conforme cadastro do produto.",
        }

    if any(word in text for word in ["escova", "pente"]):
        return {
            "shortDescription": f"{display_name} é um acessório prático para cuidado pessoal e rotina diária.",
            "longDescription": (
                f"{display_name} ajuda a deixar o cuidado diário mais simples, seja para pentear, desembaraçar ou finalizar. "
                "É uma opção útil para manter em casa, na bolsa ou no nécessaire."
            ),
            "details": details + ["Uso pessoal", "Indicado para rotina de cuidado"],
            "benefits": "Prático, leve e fácil de usar no dia a dia.",
            "howToUse": "Utilize nos cabelos ou conforme a finalidade indicada, com movimentos suaves para evitar danos aos fios.",
            "composition": "Material não informado no cadastro.",
            "careInstructions": "Remova resíduos após o uso e limpe com pano seco ou levemente umedecido.",
            "packageContents": "1 unidade.",
        }

    if any(word in text for word in ["tapete", "vaso", "cesta"]):
        return {
            "shortDescription": f"{display_name} é um item decorativo ou utilitário para compor ambientes com praticidade.",
            "longDescription": (
                f"{display_name} foi escolhido para trazer funcionalidade e charme à decoração. "
                "É uma opção para presentear, organizar ou deixar o ambiente mais acolhedor."
            ),
            "details": details + ["Uso decorativo/utilitário", "Produto conforme cadastro"],
            "benefits": "Ajuda a compor ambientes e valorizar pequenos detalhes da decoração.",
            "howToUse": "Posicione no local desejado e utilize conforme a finalidade do produto.",
            "composition": "Material não informado no cadastro.",
            "careInstructions": "Limpe com pano macio e evite quedas, umidade excessiva ou produtos abrasivos.",
            "packageContents": "1 unidade, conforme cadastro do produto.",
        }

    if "bota de chuva" in text:
        return {
            "shortDescription": f"{display_name} ajuda a proteger o calçado em dias úmidos ou chuvosos.",
            "longDescription": (
                f"{display_name} é uma opção prática para manter o tênis mais protegido contra respingos e sujeiras em dias de chuva. "
                "Leve e fácil de guardar, é útil para deixar na bolsa, mochila ou no carro."
            ),
            "details": details + ["Proteção para calçado", "Uso em dias de chuva ou umidade"],
            "benefits": "Ajuda a preservar o calçado e facilita deslocamentos em dias chuvosos.",
            "howToUse": "Vista sobre o tênis ou calçado compatível, ajustando com cuidado antes de caminhar.",
            "composition": "Material não informado no cadastro.",
            "careInstructions": "Após o uso, limpe e deixe secar completamente antes de guardar.",
            "packageContents": "1 par, quando aplicável conforme embalagem.",
        }

    if "chinelo" in text:
        return {
            "shortDescription": f"{display_name} é uma opção confortável e casual para o dia a dia.",
            "longDescription": (
                f"{display_name} combina praticidade e estilo para momentos de lazer, rotina ou uso em casa. "
                "A escolha ideal para quem procura um calçado fácil de usar e de visual descontraído."
            ),
            "details": details + ["Calçado casual", "Uso diário"],
            "benefits": "Leve, prático e fácil de calçar.",
            "howToUse": "Use como calçado casual, escolhendo o tamanho adequado para maior conforto.",
            "composition": "Material não informado no cadastro.",
            "careInstructions": "Limpe com água e sabão neutro quando necessário e seque à sombra.",
            "packageContents": "1 par.",
        }

    return {
        "shortDescription": f"{display_name} foi selecionado para a vitrine KA Bijoux por sua proposta prática e versátil.",
        "longDescription": (
            f"{display_name} faz parte da curadoria KA Bijoux e foi escolhido para complementar sua rotina com praticidade, estilo e bom acabamento visual. "
            "É uma opção de compra simples, com preço e estoque sincronizados ao cadastro da loja."
        ),
        "details": details + ["Produto individual conforme cadastro"],
        "benefits": "Produto prático, fácil de usar e selecionado pela curadoria KA Bijoux.",
        "howToUse": "Utilize conforme a finalidade do produto e as orientações da embalagem, quando houver.",
        "composition": "Informação não disponível no cadastro. Consulte a embalagem quando aplicável.",
        "careInstructions": "Conserve em local seco, limpo e protegido. Evite calor excessivo e produtos químicos.",
        "packageContents": "1 unidade, conforme cadastro do produto.",
    }


def make_override(row: dict) -> dict:
    display_name = title_case(row["productName"])
    color = color_from(row)
    adult = is_adult(row)
    content = adult_content(row, display_name, color) if adult else regular_content(row, display_name, color)
    return {
        "blingId": row["blingId"],
        "sku": row["sku"] or None,
        "name": row["productName"],
        "displayName": display_name,
        "isAdult": adult,
        "categoryName": "Linha Adulto" if adult else row["category"],
        "subcategoryName": row["subcategory"],
        "price": row["price"],
        "stock": row["stock"],
        "researchStatus": "safe_local_enrichment",
        "researchNotes": (
            "Conteúdo criado a partir do nome, categoria, variação/cor, imagem aprovada e dados locais do Bling. "
            "Campos técnicos não confirmados foram mantidos como não informados para evitar invenção."
        ),
        **content,
    }


def main() -> None:
    rows = read_applied()
    overrides = [make_override(row) for row in rows]
    OUT.write_text(json.dumps(overrides, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    summary = {
        "generatedAt": datetime.now().isoformat(timespec="seconds"),
        "total": len(overrides),
        "adult": sum(1 for item in overrides if item["isAdult"]),
        "regular": sum(1 for item in overrides if not item["isAdult"]),
        "output": str(OUT),
        "notes": "Conteúdo seguro/local; sem alegações técnicas não confirmadas.",
    }
    REPORT.write_text(json.dumps(summary, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(summary, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
