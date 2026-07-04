const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const REPORT_DIR = path.join(ROOT, "reports", "product-lote-1");
const UPLOAD_DIR = path.join(ROOT, "backend", "public", "uploads", "products");
const OVERRIDES_PATH = path.join(ROOT, "backend", "data", "product-content-overrides.json");
const IMAGE_FILES_PATH = path.join(ROOT, "backend", "data", "bling-image-files.json");
const BLING_PATH = path.join(ROOT, "backend", "data", "produtos-bling.json");
const INVENTORY_PATH = path.join(REPORT_DIR, "inventory.json");
const PENDING_PATH = path.join(REPORT_DIR, "lote1-pending-review.csv");

const PHASE = "fase2_variacoes_produto_principal";

const groups = {
  p47: {
    sku: "3104000004296",
    displayName: "Fone Bluetooth P47 com Opcoes de Cores",
    categoryName: "Eletronicos",
    subcategoryName: "Fones e Acessorios",
    shortDescription: "Fone Bluetooth dobravel, leve e pratico para ouvir musicas, assistir conteudos e usar no dia a dia.",
    longDescription:
      "O Fone Bluetooth P47 combina visual moderno, estrutura dobravel e uso pratico para rotina, estudos, viagens e lazer. Esta organizado na Kabijoos como produto principal com opcoes de cores para facilitar a escolha do cliente.",
    details: [
      "Produto principal com opcoes de cor na plataforma.",
      "Modelo dobravel e facil de guardar.",
      "Conexao sem fio para uso diario.",
      "Ideal para musica, videos e chamadas conforme compatibilidade do aparelho.",
    ],
    howToUse: "Carregue o fone antes do primeiro uso, ligue o Bluetooth do aparelho e faca o pareamento. Ajuste o volume de forma confortavel.",
    careInstructions: "Evite quedas, umidade excessiva e calor intenso. Limpe com pano seco e guarde em local protegido.",
    packageContents: "1 fone Bluetooth P47.",
    seoKeywords: ["fone bluetooth", "fone p47", "fone dobravel", "fone colorido"],
  },
  miniPrancha: {
    sku: "3104000005670",
    displayName: "Mini Prancha Portatil com Opcoes de Cores",
    categoryName: "Beleza e Acessorios",
    subcategoryName: "Cabelos",
    shortDescription: "Mini prancha compacta para retoques rapidos e finalizacao dos fios com praticidade.",
    longDescription:
      "A Mini Prancha Portatil e uma opcao pratica para levar na bolsa, organizar a rotina de beleza e fazer pequenos retoques nos fios. As cores e modelos foram agrupados na Kabijoos para o cliente escolher a opcao desejada com mais facilidade.",
    details: [
      "Formato compacto para uso pratico.",
      "Opcoes de cor organizadas como variacoes.",
      "Indicada para retoques e finalizacao.",
      "Produto eletrico para uso em cabelos secos.",
    ],
    howToUse: "Use em cabelos secos e desembaracados. Aguarde aquecer, passe suavemente nas mechas e desligue apos o uso.",
    careInstructions: "Nao use perto de agua. Aguarde esfriar antes de guardar e mantenha fora do alcance de criancas.",
    packageContents: "1 mini prancha portatil.",
    seoKeywords: ["mini prancha", "chapinha pequena", "prancha portatil", "beleza"],
  },
  comedouroPet: {
    sku: "3104000003277",
    displayName: "Comedouro Retratil Pet",
    categoryName: "Pet",
    subcategoryName: "Alimentacao Pet",
    shortDescription: "Comedouro retratil para pets, pratico para passeios, viagens e rotina fora de casa.",
    longDescription:
      "O Comedouro Retratil Pet facilita a alimentacao e hidratacao do animal em passeios, viagens e momentos fora de casa. O formato dobravel ajuda a ocupar menos espaco na bolsa ou mochila.",
    details: [
      "Formato retratil e compacto.",
      "Indicado para agua ou alimento seco.",
      "Facil de transportar.",
      "Ideal para caes e gatos.",
    ],
    howToUse: "Abra o comedouro, coloque agua ou alimento e ofereca ao pet. Apos o uso, lave e seque antes de guardar.",
    careInstructions: "Higienize com agua e sabao neutro. Nao use produtos abrasivos.",
    packageContents: "1 comedouro retratil pet.",
    seoKeywords: ["comedouro retratil", "pet", "passeio pet"],
  },
  meiaSilicone: {
    sku: "3104000003351",
    displayName: "Meia de Silicone para Spa dos Pes",
    categoryName: "Beleza e Acessorios",
    subcategoryName: "Cuidados com os Pes",
    shortDescription: "Meia de silicone para cuidado dos pes, conforto e apoio na rotina de hidratacao.",
    longDescription:
      "A Meia de Silicone para Spa dos Pes ajuda a deixar a rotina de autocuidado mais pratica. Pode ser usada como apoio em momentos de hidratacao e cuidado, sempre seguindo a orientacao do produto cosmetico utilizado.",
    details: [
      "Material flexivel e confortavel.",
      "Auxilia na rotina de cuidados com os pes.",
      "Produto reutilizavel conforme conservacao.",
      "Uso pessoal.",
    ],
    howToUse: "Use nos pes limpos. Se aplicar creme, siga as orientacoes do cosmetico e higienize a meia apos o uso.",
    careInstructions: "Lave com agua e sabao neutro, seque bem e guarde em local arejado.",
    packageContents: "1 par de meias de silicone.",
    seoKeywords: ["meia de silicone", "spa dos pes", "cuidados com os pes"],
  },
  perfumeAmbiente: {
    sku: "3104000004072",
    displayName: "Perfume de Ambiente com Opcoes de Aroma",
    categoryName: "Casa e Aromas",
    subcategoryName: "Aromatizadores",
    shortDescription: "Perfume de ambiente para deixar os espacos mais agradaveis, com opcoes de aroma na Kabijoos.",
    longDescription:
      "O Perfume de Ambiente e uma escolha pratica para renovar a sensacao dos espacos e criar uma atmosfera mais agradavel. As artes de aromas foram agrupadas no produto principal para o cliente escolher o aroma desejado.",
    details: [
      "Produto principal com variacoes de aroma.",
      "Indicado para ambientes internos.",
      "Fragrancias organizadas para selecao na plataforma.",
      "Uso domestico e decorativo.",
    ],
    howToUse: "Borrife no ambiente, mantendo distancia de superficies delicadas. Evite contato com olhos, pele sensivel, alimentos e animais.",
    careInstructions: "Mantenha fechado, longe do calor e fora do alcance de criancas e pets.",
    packageContents: "1 perfume de ambiente.",
    seoKeywords: ["perfume de ambiente", "aromatizador", "fragrancia para casa"],
  },
  odorizador: {
    sku: "3104000000106",
    displayName: "Odorizador de Tecido e Ambiente com Opcoes de Aroma",
    categoryName: "Casa e Aromas",
    subcategoryName: "Aromatizadores",
    shortDescription: "Odorizador para tecidos e ambientes, com aromas organizados para escolha na Kabijoos.",
    longDescription:
      "O Odorizador de Tecido e Ambiente ajuda a renovar a sensacao de roupas, cortinas, sofas e espacos da casa. As opcoes de aroma foram agrupadas como variacoes do produto principal.",
    details: [
      "Produto principal com variacoes de aroma.",
      "Pode ser usado em tecidos e ambientes conforme teste previo.",
      "Fragrancias organizadas para escolha do cliente.",
      "Pratico para casa, quarto, sala e rotina diaria.",
    ],
    howToUse: "Borrife a uma distancia segura. Em tecidos, teste antes em pequena area escondida para evitar manchas.",
    careInstructions: "Nao ingerir. Evite contato com olhos e mantenha fora do alcance de criancas e pets.",
    packageContents: "1 odorizador de tecido e ambiente.",
    seoKeywords: ["odorizador", "home spray", "aroma para tecido", "aroma ambiente"],
  },
  protetorCalcanhar: {
    sku: "3104000001146",
    displayName: "Protetor de Calcanhar em Silicone",
    categoryName: "Beleza e Acessorios",
    subcategoryName: "Cuidados com os Pes",
    shortDescription: "Protetor de calcanhar em silicone para mais conforto no uso de calcados.",
    longDescription:
      "O Protetor de Calcanhar em Silicone ajuda a reduzir atrito e aumentar o conforto em sapatos do dia a dia. As imagens extras foram organizadas como galeria do produto principal.",
    details: [
      "Material flexivel tipo silicone.",
      "Auxilia no conforto do calcanhar.",
      "Uso discreto dentro do calcado.",
      "Produto de cuidado pessoal.",
    ],
    howToUse: "Posicione no calcanhar ou no calcado limpo e seco, ajustando para ficar confortavel.",
    careInstructions: "Lave com agua e sabao neutro, seque bem e evite calor excessivo.",
    packageContents: "1 par de protetores de calcanhar.",
    seoKeywords: ["protetor de calcanhar", "silicone", "conforto para pes"],
  },
  dispenserAgua: {
    sku: "3104000000016",
    displayName: "Dispenser de Agua Eletrico",
    categoryName: "Utilidades Domesticas",
    subcategoryName: "Cozinha e Organizacao",
    shortDescription: "Dispenser eletrico para galão, pratico para servir agua com mais facilidade.",
    longDescription:
      "O Dispenser de Agua Eletrico facilita o uso de galoes e deixa a rotina mais pratica. As imagens extras foram adicionadas como galeria do produto principal.",
    details: [
      "Acionamento eletrico.",
      "Indicado para uso em galao compativel.",
      "Pratico para casa, escritorio e pequenos ambientes.",
      "Design compacto.",
    ],
    howToUse: "Carregue conforme orientacao do produto, encaixe no galao compativel e acione para servir a agua.",
    careInstructions: "Nao mergulhe a parte eletrica em agua. Higienize as partes de contato regularmente.",
    packageContents: "1 dispenser de agua eletrico.",
    seoKeywords: ["dispenser de agua", "bomba de galao", "utilidade domestica"],
  },
  portaJoias: {
    sku: "3104000000240",
    displayName: "Porta-Joias Premium",
    categoryName: "Acessorios",
    subcategoryName: "Organizacao",
    shortDescription: "Porta-joias para guardar bijuterias e acessorios com organizacao e acabamento elegante.",
    longDescription:
      "O Porta-Joias Premium ajuda a manter aneis, brincos, colares e pequenos acessorios organizados. Modelos e imagens semelhantes foram agrupados no produto principal, sem criar cadastro separado sem necessidade.",
    details: [
      "Ideal para bijuterias e pequenos acessorios.",
      "Ajuda a proteger e organizar as pecas.",
      "Imagem principal e galeria organizadas por modelo visual.",
      "Acabamento com proposta presenteavel.",
    ],
    howToUse: "Use para armazenar pecas pequenas, mantendo cada item separado para evitar atrito e emaranhados.",
    careInstructions: "Limpe com pano seco e evite umidade, perfume ou produtos abrasivos.",
    packageContents: "1 porta-joias.",
    seoKeywords: ["porta joias", "organizador de bijuterias", "porta acessorios"],
  },
  papaBolinha: {
    sku: "3104000000633",
    displayName: "Papa Bolinha Recarregavel",
    categoryName: "Utilidades Domesticas",
    subcategoryName: "Cuidados com Roupas",
    shortDescription: "Papa bolinha para ajudar a renovar o visual de roupas e tecidos com praticidade.",
    longDescription:
      "O Papa Bolinha Recarregavel ajuda a remover pequenas bolinhas de roupas e tecidos, deixando as pecas com aparencia mais cuidada. As imagens extras foram associadas ao produto principal.",
    details: [
      "Indicado para pequenas bolinhas em tecidos.",
      "Uso pratico em roupas, mantas e pecas de tecido.",
      "Modelo recarregavel conforme cadastro principal.",
      "Ajuda na conservacao visual das pecas.",
    ],
    howToUse: "Passe suavemente sobre o tecido esticado, sem pressionar demais. Use apenas em tecidos compativeis.",
    careInstructions: "Limpe o reservatorio apos o uso e mantenha longe de agua.",
    packageContents: "1 papa bolinha.",
    seoKeywords: ["papa bolinha", "removedor de bolinhas", "cuidados com roupas"],
  },
  tintaCabelo: {
    sku: "3104000000823",
    displayName: "Spray Tinta para Cabelo com Opcoes de Cor",
    categoryName: "Beleza e Acessorios",
    subcategoryName: "Cabelo e Festa",
    shortDescription: "Spray de tinta temporaria para cabelo, ideal para festas, fantasias e producoes criativas.",
    longDescription:
      "O Spray Tinta para Cabelo e uma opcao pratica para transformar o visual em festas, eventos e producoes tematicas. As cores foram organizadas como variacoes do produto principal na Kabijoos.",
    details: [
      "Produto principal com variacoes de cor.",
      "Uso temporario e decorativo.",
      "Ideal para carnaval, festas e fantasia.",
      "Aplique com cuidado e evite contato com olhos.",
    ],
    howToUse: "Agite antes de usar e aplique a distancia, em pequenas borrifadas. Proteja roupas e rosto durante a aplicacao.",
    careInstructions: "Evite inalar diretamente. Nao aplique em pele irritada. Remova lavando os cabelos conforme necessidade.",
    packageContents: "1 spray tinta para cabelo.",
    seoKeywords: ["spray tinta cabelo", "tinta temporaria", "fantasia", "carnaval"],
  },
  papelParede: {
    sku: "3104000004403",
    displayName: "Papel de Parede Adesivo com Opcoes de Estampa",
    categoryName: "Casa e Decoracao",
    subcategoryName: "Decoracao",
    shortDescription: "Papel de parede adesivo para renovar ambientes com praticidade e varias estampas.",
    longDescription:
      "O Papel de Parede Adesivo e uma alternativa pratica para renovar paredes, moveis e detalhes decorativos. As estampas foram organizadas como opcoes do produto principal.",
    details: [
      "Produto principal com variacoes de estampa.",
      "Aplicacao adesiva em superficie lisa e limpa.",
      "Indicado para decoracao e renovacao de ambientes.",
      "Corte e ajuste conforme a area desejada.",
    ],
    howToUse: "Limpe e seque a superficie, meca a area, retire o liner aos poucos e aplique pressionando para evitar bolhas.",
    careInstructions: "Evite aplicar em superficie umida, irregular ou com poeira. Limpe delicadamente com pano seco ou levemente umido.",
    packageContents: "1 unidade de papel de parede adesivo.",
    seoKeywords: ["papel de parede adesivo", "decoracao", "adesivo parede"],
  },
  cordaCelular: {
    sku: "3104000001158",
    displayName: "Corda para Celular com Opcoes de Cor",
    categoryName: "Acessorios",
    subcategoryName: "Acessorios para Celular",
    shortDescription: "Corda para celular para usar o aparelho com mais praticidade e estilo no dia a dia.",
    longDescription:
      "A Corda para Celular e um acessorio pratico para manter o aparelho por perto, facilitando passeios, trabalho e rotina. As opcoes de cor foram organizadas como variacoes do produto principal.",
    details: [
      "Produto principal com variacoes de cor.",
      "Acessorio pratico para celular.",
      "Ajuda no transporte e manuseio do aparelho.",
      "Compatibilidade depende da capinha ou adaptador utilizado.",
    ],
    howToUse: "Encaixe na capinha compativel ou adaptador adequado antes de usar. Verifique se esta bem preso.",
    careInstructions: "Evite puxoes fortes, umidade excessiva e contato com produtos quimicos.",
    packageContents: "1 corda para celular.",
    seoKeywords: ["corda celular", "cordao celular", "acessorio celular"],
  },
  saboneteIntimo: {
    sku: "3104000000321",
    displayName: "Sabonete Intimo com Opcoes de Aroma",
    categoryName: "Cuidados Pessoais",
    subcategoryName: "Higiene Intima",
    shortDescription: "Sabonete intimo para cuidado diario, com aromas organizados para escolha na Kabijoos.",
    longDescription:
      "O Sabonete Intimo e indicado para a rotina de higiene externa, com proposta delicada e pratica. As imagens de aromas foram agrupadas no produto principal para facilitar a escolha do cliente.",
    details: [
      "Produto principal com opcoes de aroma.",
      "Uso externo na higiene intima.",
      "Escolha o aroma desejado na plataforma.",
      "Produto de cuidado pessoal.",
    ],
    howToUse: "Use externamente durante o banho, enxague bem e interrompa o uso em caso de desconforto ou irritacao.",
    careInstructions: "Nao ingerir. Evite contato com os olhos. Manter fora do alcance de criancas.",
    packageContents: "1 sabonete intimo.",
    seoKeywords: ["sabonete intimo", "higiene intima", "cuidados pessoais"],
  },
  pochete: {
    sku: "3104000001344",
    displayName: "Pochete Premium",
    categoryName: "Acessorios",
    subcategoryName: "Bolsas e Pochetes",
    shortDescription: "Pochete pratica para carregar pequenos itens com conforto em passeios, viagens e rotina.",
    longDescription:
      "A Pochete Premium ajuda a manter celular, chaves, documentos e pequenos objetos sempre a mao. E uma opcao pratica para passeios, viagens, eventos e uso diario.",
    details: [
      "Ideal para pequenos pertences.",
      "Uso pratico na cintura ou transpassado conforme modelo.",
      "Boa opcao para viagens e atividades externas.",
      "Cadastro agrupado como produto principal.",
    ],
    howToUse: "Ajuste ao corpo de forma confortavel e distribua os itens sem excesso de peso.",
    careInstructions: "Limpe com pano levemente umido e evite lavar em maquina.",
    packageContents: "1 pochete.",
    seoKeywords: ["pochete", "bolsa cintura", "acessorio pratico"],
  },
  roboAspirador: {
    sku: "3104000005812",
    displayName: "Mini Robo Aspirador",
    categoryName: "Utilidades Domesticas",
    subcategoryName: "Limpeza",
    shortDescription: "Mini robo aspirador para apoio na limpeza leve de pisos e pequenos ambientes.",
    longDescription:
      "O Mini Robo Aspirador e um item pratico para auxiliar na manutencao da limpeza leve do dia a dia. As imagens extras foram organizadas como galeria do produto principal.",
    details: [
      "Auxilia na limpeza leve de pisos.",
      "Design compacto.",
      "Indicado para pequenos ambientes.",
      "Imagem organizada no produto principal.",
    ],
    howToUse: "Carregue conforme orientacao, ligue o aparelho e use em superficie plana, livre de fios e obstaculos pequenos.",
    careInstructions: "Esvazie e limpe o compartimento regularmente. Evite contato com agua.",
    packageContents: "1 mini robo aspirador.",
    seoKeywords: ["mini robo aspirador", "limpeza", "utilidade domestica"],
  },
  processador: {
    sku: "3104000000465",
    displayName: "Triturador e Processador de Alimentos",
    categoryName: "Utilidades Domesticas",
    subcategoryName: "Cozinha",
    shortDescription: "Triturador/processador para facilitar preparos simples na cozinha.",
    longDescription:
      "O Triturador e Processador de Alimentos ajuda a agilizar pequenos preparos na cozinha, como picar e processar ingredientes compativeis com o aparelho.",
    details: [
      "Indicado para pequenos preparos.",
      "Ajuda a picar e processar alimentos compativeis.",
      "Produto pratico para rotina da cozinha.",
      "Use conforme limite e orientacao do equipamento.",
    ],
    howToUse: "Coloque pequenas porcoes, feche corretamente e acione em pulsos curtos conforme necessidade.",
    careInstructions: "Desligue antes de limpar. Nao mergulhe a parte eletrica em agua e evite ingredientes muito duros sem confirmacao de compatibilidade.",
    packageContents: "1 triturador/processador de alimentos.",
    seoKeywords: ["processador de alimentos", "triturador", "cozinha"],
  },
  balanca: {
    sku: "3104000004300",
    displayName: "Mini Balanca Digital de Cozinha",
    categoryName: "Utilidades Domesticas",
    subcategoryName: "Cozinha",
    shortDescription: "Mini balanca digital para pesar pequenas quantidades com mais praticidade.",
    longDescription:
      "A Mini Balanca Digital e uma aliada na cozinha e em pequenas medicoes do dia a dia. O cadastro foi associado ao produto principal encontrado na Bling.",
    details: [
      "Indicada para pequenas pesagens.",
      "Uso pratico em bancada.",
      "Display digital conforme modelo.",
      "Ideal para cozinha e organizacao domestica.",
    ],
    howToUse: "Posicione em superficie plana, ligue, zere a tara se necessario e coloque o item a ser pesado.",
    careInstructions: "Evite molhar, derrubar ou exceder a capacidade indicada pelo fabricante.",
    packageContents: "1 mini balanca digital.",
    seoKeywords: ["balanca digital", "mini balanca", "cozinha"],
  },
  pulseiraSmartBasico: {
    sku: "3104000000163",
    displayName: "Pulseira para Smartwatch com Opcoes de Cor",
    categoryName: "Acessorios",
    subcategoryName: "Smartwatch",
    shortDescription: "Pulseira para smartwatch, organizada por cores para o cliente escolher na Kabijoos.",
    longDescription:
      "A Pulseira para Smartwatch e uma opcao pratica para trocar o visual do relogio e combinar com diferentes estilos. As imagens com varias cores foram usadas como principal/galeria e as cores foram organizadas como variacoes.",
    details: [
      "Produto principal com opcoes de cor.",
      "Compatibilidade depende do tamanho/modelo do smartwatch.",
      "Ideal para renovar o visual do relogio.",
      "Cores organizadas para selecao na plataforma.",
    ],
    howToUse: "Confira a compatibilidade com o seu smartwatch, remova a pulseira antiga e encaixe a nova com cuidado.",
    careInstructions: "Evite contato prolongado com produtos quimicos, perfume e calor excessivo.",
    packageContents: "1 pulseira para smartwatch.",
    seoKeywords: ["pulseira smartwatch", "pulseira smart", "pulseira relogio inteligente"],
  },
  pulseiraSmartCouro: {
    sku: "3104000004504",
    displayName: "Pulseira Smartwatch Estilo Couro",
    categoryName: "Acessorios",
    subcategoryName: "Smartwatch",
    shortDescription: "Pulseira para smartwatch com visual estilo couro e opcoes de cor.",
    longDescription:
      "A Pulseira Smartwatch Estilo Couro entrega visual mais elegante para o relogio inteligente. As imagens foram agrupadas no produto principal da Bling e organizadas na Kabijoos.",
    details: [
      "Visual estilo couro.",
      "Compatibilidade depende do tamanho/modelo do smartwatch.",
      "Opcoes visuais organizadas como variacoes.",
      "Ideal para compor looks casuais ou sociais.",
    ],
    howToUse: "Confira o encaixe compativel antes de instalar. Ajuste no pulso de forma confortavel.",
    careInstructions: "Evite molhar e mantenha longe de perfume ou produtos quimicos.",
    packageContents: "1 pulseira para smartwatch.",
    seoKeywords: ["pulseira smartwatch couro", "pulseira smart couro"],
  },
};

const entries = [
  { item: 4, group: "miniPrancha", label: "Cores sortidas", color: "#f7a6c8" },
  { item: 12, group: "miniPrancha", label: "Rosa e roxa", color: "#b56ad9" },
  { item: 13, group: "miniPrancha", label: "Rosa", color: "#f3a0c3" },
  { item: 6, group: "p47", label: "Azul", color: "#2d61ff" },
  { item: 7, group: "p47", label: "Cores sortidas", color: "#5bd85b" },
  { item: 16, group: "comedouroPet", label: "Modelo retratil", color: "#2f8bff" },
  { item: 21, group: "perfumeAmbiente", label: "Essence", color: "#b48b6a" },
  { item: 27, group: "meiaSilicone", label: "Par silicone", color: "#f4d8c8" },
  { item: 36, group: "protetorCalcanhar", label: "Transparente", color: "#f2f2f2" },
  { item: 51, group: "protetorCalcanhar", label: "Conforto", color: "#f5dbc8" },
  { item: 52, group: "protetorCalcanhar", label: "Calcanhar", color: "#f5dbc8" },
  { item: 40, group: "odorizador", label: "Bamboo", color: "#72965a" },
  { item: 41, group: "odorizador", label: "Vanilla", color: "#f1d29b" },
  { item: 42, group: "odorizador", label: "Morango", color: "#d8484d" },
  { item: 43, group: "odorizador", label: "Vanilla Soft", color: "#ead2a1" },
  { item: 44, group: "odorizador", label: "Melancia", color: "#d34249" },
  { item: 45, group: "perfumeAmbiente", label: "Bambu", color: "#7aa45b" },
  { item: 46, group: "perfumeAmbiente", label: "Flor de Cerejeira", color: "#f6a6c6" },
  { item: 47, group: "perfumeAmbiente", label: "Melancia", color: "#e34555" },
  { item: 48, group: "perfumeAmbiente", label: "Orquidea Azul", color: "#5f7fe6" },
  { item: 49, group: "perfumeAmbiente", label: "Lavanda Inglesa", color: "#9d7bdd" },
  { item: 60, group: "dispenserAgua", label: "Branco", color: "#f3f3f3" },
  { item: 91, group: "dispenserAgua", label: "Modelo eletrico", color: "#f3f3f3" },
  { item: 61, group: "portaJoias", label: "Com visor", color: "#111111" },
  { item: 62, group: "portaJoias", label: "Aveludado claro", color: "#f4eee8" },
  { item: 92, group: "portaJoias", label: "Com visor premium", color: "#111111" },
  { item: 93, group: "portaJoias", label: "Organizador claro", color: "#f4eee8" },
  { item: 98, group: "portaJoias", label: "Organizador aveludado", color: "#f4eee8" },
  { item: 70, group: "papaBolinha", label: "Recarregavel", color: "#ffffff" },
  { item: 71, group: "papaBolinha", label: "Compacto", color: "#d9d9d9" },
  { item: 118, group: "tintaCabelo", label: "Laranja", color: "#f28c28" },
  { item: 119, group: "tintaCabelo", label: "Roxo", color: "#8f52c7" },
  { item: 120, group: "tintaCabelo", label: "Amarelo", color: "#f0d43b" },
  { item: 121, group: "tintaCabelo", label: "Preto", color: "#111111" },
  { item: 122, group: "tintaCabelo", label: "Vermelho", color: "#cf2f3b" },
  { item: 123, group: "tintaCabelo", label: "Azul", color: "#2d61ff" },
  { item: 124, group: "tintaCabelo", label: "Verde", color: "#45a85a" },
  { item: 125, group: "tintaCabelo", label: "Branco", color: "#f6f6f6" },
  { item: 126, group: "tintaCabelo", label: "Rosa", color: "#f05c9a" },
  { item: 127, group: "tintaCabelo", label: "Prata", color: "#cfcfd2" },
  { item: 144, group: "papelParede", label: "Estampa geométrica", color: "#d6d1c5" },
  { item: 146, group: "papelParede", label: "Estampa decorativa", color: "#c7b8a4" },
  { item: 147, group: "papelParede", label: "Estampa madeira", color: "#b88b61" },
  { item: 148, group: "papelParede", label: "Estampa clara", color: "#e6ded2" },
  { item: 150, group: "cordaCelular", label: "Roxo", color: "#8c56c7" },
  { item: 151, group: "cordaCelular", label: "Dourado", color: "#d6ad43" },
  { item: 152, group: "cordaCelular", label: "Prateado", color: "#c8c8c8" },
  { item: 156, group: "cordaCelular", label: "Preto", color: "#111111" },
  { item: 157, group: "cordaCelular", label: "Brilho", color: "#f0d56b" },
  { item: 161, group: "saboneteIntimo", label: "Aromas sortidos", color: "#f2a5c6" },
  { item: 162, group: "saboneteIntimo", label: "Barbatimao", color: "#c07b4f" },
  { item: 163, group: "saboneteIntimo", label: "Chocolate e Menta", color: "#6b4a35" },
  { item: 164, group: "saboneteIntimo", label: "Morango", color: "#e84a5f" },
  { item: 165, group: "saboneteIntimo", label: "Aroeira", color: "#b44e4f" },
  { item: 166, group: "saboneteIntimo", label: "Tutti Frutti", color: "#f38ab1" },
  { item: 167, group: "saboneteIntimo", label: "Amora Negra", color: "#6b345e" },
  { item: 169, group: "pochete", label: "Modelo esportivo", color: "#111111" },
  { item: 173, group: "roboAspirador", label: "Branco", color: "#f3f3f3" },
  { item: 174, group: "roboAspirador", label: "Modelo compacto", color: "#d8d8d8" },
  { item: 224, group: "processador", label: "Mini processador", color: "#f3f3f3" },
  { item: 232, group: "balanca", label: "Digital", color: "#eeeeee" },
  { item: 233, group: "pulseiraSmartBasico", label: "Cores sortidas", color: "#d9d9d9" },
  { item: 237, group: "pulseiraSmartBasico", label: "Esportiva", color: "#2e2e2e" },
  { item: 239, group: "pulseiraSmartBasico", label: "Silicone colorida", color: "#ef6aa5" },
  { item: 238, group: "pulseiraSmartCouro", label: "Estilo couro colorida", color: "#a56a43" },
];

function main() {
  fs.mkdirSync(REPORT_DIR, { recursive: true });
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });

  const inventory = JSON.parse(fs.readFileSync(INVENTORY_PATH, "utf8"));
  const inventoryByItem = new Map(inventory.map((item) => [Number(item.item), item]));
  const pendingRows = readCsv(PENDING_PATH);
  const pendingByItem = new Map(pendingRows.map((row) => [Number(row.item), row]));
  const blingRows = JSON.parse(fs.readFileSync(BLING_PATH, "utf8"));
  const productBySku = new Map(blingRows.map((product) => [String(product.codigo || "").trim(), product]));
  const overrides = JSON.parse(fs.readFileSync(OVERRIDES_PATH, "utf8"));
  const imageFiles = JSON.parse(fs.readFileSync(IMAGE_FILES_PATH, "utf8"));
  const imageFileSet = new Set(imageFiles.map(String));
  const overrideIndex = new Map();

  for (let index = 0; index < overrides.length; index += 1) {
    const item = overrides[index];
    if (item.sku) overrideIndex.set(String(item.sku).trim(), index);
    if (item.blingId) overrideIndex.set(`id:${String(item.blingId).trim()}`, index);
  }

  fs.copyFileSync(OVERRIDES_PATH, path.join(REPORT_DIR, `backup-product-content-overrides-${PHASE}.json`));
  fs.copyFileSync(IMAGE_FILES_PATH, path.join(REPORT_DIR, `backup-bling-image-files-${PHASE}.json`));

  const applied = [];
  const skipped = [];
  const bySku = new Map();

  for (const entry of entries) {
    const inventoryItem = inventoryByItem.get(entry.item);
    const pendingRow = pendingByItem.get(entry.item);
    const group = groups[entry.group];
    const product = productBySku.get(group.sku);

    if (!pendingRow) {
      skipped.push({ item: entry.item, group: entry.group, reason: "NAO_ESTAVA_PENDENTE_NA_FASE1" });
      continue;
    }
    if (!inventoryItem || !fs.existsSync(inventoryItem.path)) {
      skipped.push({ item: entry.item, group: entry.group, reason: "ARQUIVO_ORIGINAL_NAO_ENCONTRADO" });
      continue;
    }
    if (!product) {
      skipped.push({ item: entry.item, group: entry.group, reason: `SKU_${group.sku}_NAO_ENCONTRADO_NO_EXPORT_LOCAL` });
      continue;
    }

    const ext = path.extname(inventoryItem.arquivo || inventoryItem.path).toLowerCase() || ".png";
    const imageFile = uniqueUploadName(`${entry.item}-${slugify(group.displayName)}-${group.sku}-${slugify(entry.label)}${ext}`, imageFileSet);
    fs.copyFileSync(inventoryItem.path, path.join(UPLOAD_DIR, imageFile));
    imageFileSet.add(imageFile);

    const appliedEntry = {
      item: entry.item,
      sourceFile: inventoryItem.arquivo,
      imageFile,
      sku: group.sku,
      blingId: String(product.id || ""),
      blingName: product.nome || "",
      displayName: group.displayName,
      variationLabel: entry.label,
      status: "APLICADO_LOCAL_COM_VARIACAO",
    };
    applied.push(appliedEntry);

    if (!bySku.has(group.sku)) {
      bySku.set(group.sku, { group, product, images: [], variations: [] });
    }
    bySku.get(group.sku).images.push(imageFile);
    bySku.get(group.sku).variations.push({
      label: entry.label,
      slug: slugify(entry.label),
      color: entry.color,
      active: true,
      sku: group.sku,
      imageFile,
      images: [imageFile],
    });
  }

  for (const [sku, bundle] of bySku.entries()) {
    const { group, product, images, variations } = bundle;
    const override = getOrCreateOverride(overrides, overrideIndex, product, sku);
    const existingGallery = Array.isArray(override.galleryImages) ? override.galleryImages : [];
    const existingVariations = Array.isArray(override.variations ?? override.variants)
      ? (override.variations ?? override.variants)
      : [];

    Object.assign(override, {
      blingId: String(product.id || override.blingId || ""),
      sku,
      name: product.nome || override.name || group.displayName,
      displayName: group.displayName,
      isAdult: override.isAdult ?? false,
      categoryName: group.categoryName,
      subcategoryName: group.subcategoryName,
      shortDescription: group.shortDescription,
      longDescription: group.longDescription,
      details: group.details,
      benefits: group.benefits ?? override.benefits ?? null,
      howToUse: group.howToUse,
      composition: group.composition ?? override.composition ?? null,
      careInstructions: group.careInstructions,
      packageContents: group.packageContents,
      imageFile: override.imageFile || images[0],
      galleryImages: uniqueStrings([...existingGallery, ...images]),
      variations: mergeVariations(existingVariations, variations),
      seoKeywords: uniqueStrings([...(override.seoKeywords ?? []), ...(group.seoKeywords ?? [])]),
      researchStatus: PHASE,
      updatedBy: "codex_lote1_phase2",
    });
  }

  const appliedItems = new Set(applied.map((row) => Number(row.item)));
  const remainingPending = pendingRows.filter((row) => !appliedItems.has(Number(row.item)));

  fs.writeFileSync(OVERRIDES_PATH, `${JSON.stringify(overrides, null, 2)}\n`, "utf8");
  fs.writeFileSync(IMAGE_FILES_PATH, `${JSON.stringify(Array.from(imageFileSet).sort(), null, 2)}\n`, "utf8");

  writeCsv(path.join(REPORT_DIR, "lote1-phase2-applied-local.csv"), applied);
  writeCsv(path.join(REPORT_DIR, "lote1-phase2-skipped.csv"), skipped);
  writeCsv(path.join(REPORT_DIR, "lote1-phase2-pending-review.csv"), remainingPending);
  writeCsv(path.join(REPORT_DIR, "lote1-phase2-variant-groups.csv"), Array.from(bySku.entries()).map(([sku, bundle]) => ({
    sku,
    blingId: String(bundle.product.id || ""),
    blingName: bundle.product.nome || "",
    displayName: bundle.group.displayName,
    imagesAdded: bundle.images.length,
    variationsAdded: bundle.variations.length,
    labels: bundle.variations.map((item) => item.label).join(" | "),
  })));
  writeCsv(path.join(REPORT_DIR, "bling-principal-upload-queue-phase2.csv"), Array.from(bySku.entries()).map(([sku, bundle]) => ({
    action: "PREPARAR_BLING_SEM_EXECUTAR_ONLINE",
    sku,
    blingId: String(bundle.product.id || ""),
    blingName: bundle.product.nome || "",
    imageFile: bundle.images[0] || "",
    note: "Associar no Bling ao produto principal; variacoes ficam na Kabijoos.",
  })));

  const report = [
    "# Produto lote 1 - fase 2 (pendentes com produto principal + variacoes)",
    "",
    `Data: ${new Date().toISOString()}`,
    "",
    "## Resultado",
    "",
    `- Pendentes originais da fase 1: ${pendingRows.length}`,
    `- Imagens aplicadas nesta fase: ${applied.length}`,
    `- Produtos principais atualizados: ${bySku.size}`,
    `- Pendentes restantes para revisao manual: ${remainingPending.length}`,
    `- Itens ignorados por nao estarem pendentes/sem arquivo/SKU: ${skipped.length}`,
    "",
    "## Regra aplicada",
    "",
    "No Bling, a fila ficou por produto principal. Na Kabijoos, as imagens foram agrupadas em galeria e variacoes clicaveis quando havia cor, aroma, estampa ou modelo seguro.",
    "",
    "## Arquivos",
    "",
    "- `reports/product-lote-1/lote1-phase2-applied-local.csv`",
    "- `reports/product-lote-1/lote1-phase2-variant-groups.csv`",
    "- `reports/product-lote-1/lote1-phase2-pending-review.csv`",
    "- `reports/product-lote-1/bling-principal-upload-queue-phase2.csv`",
    "",
    "## Observacao",
    "",
    "Nenhuma atualizacao online foi enviada para o Bling nesta fase; foi gerada apenas a fila segura para revisao/subida posterior.",
    "",
  ].join("\n");
  fs.writeFileSync(path.join(REPORT_DIR, "lote1-phase2-report.md"), report, "utf8");

  console.log(JSON.stringify({
    pendingOriginal: pendingRows.length,
    appliedImages: applied.length,
    updatedProducts: bySku.size,
    remainingPending: remainingPending.length,
    skipped: skipped.length,
  }, null, 2));
}

function getOrCreateOverride(overrides, index, product, sku) {
  const idKey = product.id ? `id:${String(product.id).trim()}` : "";
  const existingIndex = index.has(sku) ? index.get(sku) : idKey && index.has(idKey) ? index.get(idKey) : -1;
  if (existingIndex >= 0) return overrides[existingIndex];

  const override = {
    blingId: String(product.id || ""),
    sku,
    name: product.nome || "",
  };
  overrides.push(override);
  const newIndex = overrides.length - 1;
  index.set(sku, newIndex);
  if (idKey) index.set(idKey, newIndex);
  return override;
}

function uniqueUploadName(fileName, used) {
  const ext = path.extname(fileName);
  const base = path.basename(fileName, ext);
  let candidate = fileName;
  let suffix = 2;
  while (used.has(candidate) || fs.existsSync(path.join(UPLOAD_DIR, candidate))) {
    candidate = `${base}-${suffix}${ext}`;
    suffix += 1;
  }
  return candidate;
}

function mergeVariations(existing, incoming) {
  const bySlug = new Map();
  for (const variation of existing) {
    if (!variation?.label) continue;
    bySlug.set(variation.slug || slugify(variation.label), variation);
  }
  for (const variation of incoming) {
    bySlug.set(variation.slug || slugify(variation.label), variation);
  }
  return Array.from(bySlug.values());
}

function uniqueStrings(values) {
  return Array.from(new Set(values.filter(Boolean).map(String)));
}

function slugify(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 90) || "item";
}

function readCsv(filePath) {
  const text = fs.readFileSync(filePath, "utf8").trim();
  if (!text) return [];
  const lines = text.split(/\r?\n/);
  const headers = splitCsvLine(lines.shift());
  return lines.filter(Boolean).map((line) => {
    const values = splitCsvLine(line);
    return Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""]));
  });
}

function splitCsvLine(line) {
  const values = [];
  let current = "";
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (char === '"') {
      if (quoted && line[index + 1] === '"') {
        current += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (char === ";" && !quoted) {
      values.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  values.push(current);
  return values;
}

function writeCsv(filePath, rows) {
  if (!rows.length) {
    fs.writeFileSync(filePath, "", "utf8");
    return;
  }
  const headers = Object.keys(rows[0]);
  const lines = [headers.join(";")];
  for (const row of rows) {
    lines.push(headers.map((header) => csvValue(row[header])).join(";"));
  }
  fs.writeFileSync(filePath, `${lines.join("\n")}\n`, "utf8");
}

function csvValue(value) {
  const text = value == null ? "" : String(value);
  return /[;"\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

main();
