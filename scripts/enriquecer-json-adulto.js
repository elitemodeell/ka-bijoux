const path = require('path');
const fs = require('fs');

const BACKEND_DIR = path.resolve(__dirname, '..', 'backend');
const JSON_PATH = path.join(BACKEND_DIR, 'data', 'product-content-overrides.json');

function extractColor(n) {
  const colors = {
    'azul': 'azul',
    'rosa': 'rosa',
    'roxo': 'roxo',
    'preto': 'preto',
    'vermelho': 'vermelho',
    'prata': 'prata',
    'cristal': 'cristal',
    'lilas': 'lilás',
    'pink': 'pink',
    'branco': 'branco',
    'dourado': 'dourado',
    'amarelo': 'amarelo',
    'verde': 'verde',
    'laranja': 'laranja',
    'marrom': 'marrom',
    'bege': 'bege',
    'nude': 'nude',
    'gold': 'dourado'
  };
  for (const [key, val] of Object.entries(colors)) {
    if (n.includes(key)) return val;
  }
  return '';
}

function extractFlavor(n) {
  const flavors = {
    'morango': 'morango',
    'caipirinha': 'caipirinha',
    'chiclete': 'chiclete',
    'menta': 'menta',
    'vinho tinto': 'vinho tinto',
    'framboesa': 'framboesa',
    'uva': 'uva',
    'cereja': 'cereja',
    'banana caramelizada': 'banana caramelizada',
    'creme condensado': 'creme condensado',
    'leite condensado': 'leite condensado',
    'doce de leite': 'doce de leite',
    'coca-cola': 'coca-cola',
    'guaraná': 'guaraná',
    'melancia': 'melancia',
    'baunilha': 'baunilha',
    'caramelo': 'caramelo',
    'tutti.frutti': 'tutti-frutti',
    'tutti-frutti': 'tutti-frutti',
    'pêssego': 'pêssego',
    'yogurte': 'iogurte',
    'iogurte': 'iogurte',
    'redbull': 'energy drink',
    'tequila': 'tequila',
    'smirnfuck': 'vodka',
    'champanhe': 'champanhe',
    'maça verde': 'maçã verde',
    'maca verde': 'maçã verde',
    'cherry bomb': 'cereja',
    'black ice': 'ice preto',
    'hortelã': 'hortelã',
    'chillies': 'pimenta',
    'chocolate': 'chocolate avela'
  };
  for (const [key, val] of Object.entries(flavors)) {
    if (n.includes(key)) return val;
  }
  return '';
}

function generateContent(name) {
  const n = name.toLowerCase();

  // PLUG METÁLICO (P, G, GG, M + CORACAO / REDONDO + cor)
  if (n.includes('plug') && !n.includes('silicone') && (n.includes('coracao') || n.includes('coração') || n.includes('redondo') || n.includes('gold') || n.includes('metal') || n.includes('premium'))) {
    const size = n.includes(' gg ') ? 'GG' : n.includes(' g ') ? 'G' : n.includes(' m ') ? 'M' : n.includes(' p ') ? 'P' : '';
    const color = extractColor(n);
    return {
      shortDescription: `Plug anal metálico tamanho ${size} com acabamento brilhante${color ? ' ' + color : ''}. Superfície ultra lisa para inserção confortável e segura. Peça de alta qualidade que une estética e prazer.`,
      longDescription: `Plug anal em metal polido tamanho ${size} com cabo decorativo${color ? ' ' + color : ''}. A superfície espelhada e lisa facilita o uso com segurança e conforto. Material inox de alta qualidade — higiênico, durável e fácil de limpar. Compatível com todos os tipos de lubrificante.`,
      benefits: `Material metálico polido — higiênico e durável\nSuperfície ultra lisa para inserção confortável\nCabo decorativo ${color || 'elegante'} com visual sofisticado\nCompatível com lubrificante à base de água, óleo e silicone\nFácil de limpar — basta água quente e sabão`,
      howToUse: 'Use abundante lubrificante à base de água ou silicone. Insira com calma e movimentos suaves. Higienize com água quente e sabão neutro antes e após cada uso.'
    };
  }

  // PLUG SILICONE
  if (n.includes('plug') && n.includes('silicone')) {
    const color = extractColor(n);
    const style = n.includes('cobrinha') ? 'em formato cobra' : n.includes('ancora') ? 'em formato âncora' : n.includes('textura') ? 'com textura estimulante' : '';
    return {
      shortDescription: `Plug anal em silicone macio ${style}${color ? ', ' + color : ''}. Material flexível e seguro para uso íntimo. Cabo com acabamento prático para fácil manuseio.`,
      longDescription: `Plug anal em silicone de alta qualidade ${style}${color ? ' na cor ' + color : ''}. O silicone macio adapta-se ao corpo com conforto superior ao metal, sendo ideal para iniciantes e experientes. Superfície lisa e segura, fácil de higienizar.`,
      benefits: `Silicone macio — conforto superior para iniciantes\nFlexível e adaptável ao corpo\nCabo ergonômico para fácil manuseio\nMaterial hipoalergênico e sem BPA\nFácil de higienizar — água e sabão neutro`,
      howToUse: 'Use com lubrificante à base de água. Insira suavemente com movimentos circulares. Higienize completamente com água e sabão após o uso.'
    };
  }

  // TAPA MAMILO
  if (n.includes('tapa mamilo')) {
    const style = n.includes('fosco') ? 'fosco' : n.includes('lantejoula') ? 'com lantejoulas' : n.includes('brilho') ? 'com brilho' : n.includes('coração') || n.includes('coracao') ? 'em formato coração' : n.includes('premium') ? 'premium' : n.includes('descartavel') ? 'descartável' : '';
    const color = extractColor(n);
    return {
      shortDescription: `Tapa mamilo ${style}${color ? ' ' + color : ''} para usar com decotes ousados, fantasias e looks sensuais. Adesivo discreto que cobre e protege com elegância.`,
      longDescription: `Tapa mamilo adesivo ${style}${color ? ' na cor ' + color : ''}, perfeito para decotes profundos, costas abertas e roupas sem alça. Adesivo seguro que não aparece sob tecidos finos. Leve, confortável e de fácil aplicação e remoção sem deixar marcas.`,
      benefits: `Discreto sob qualquer roupa — invisível\nAdesivo seguro que não irrita a pele\nIdeal para decotes ousados e roupas sem alça\nLeve e confortável para uso prolongado\nFácil de aplicar e remover`,
      howToUse: 'Limpe e seque bem a região. Retire o papel protetor e cole o tapa mamilo centralizando. Pressione por alguns segundos para fixar. Remova suavemente após o uso.'
    };
  }

  // CHICOTE
  if (n.includes('chicote')) {
    const color = extractColor(n);
    const style = n.includes('grosso') ? 'grosso' : n.includes('fino') ? 'fino' : '';
    return {
      shortDescription: `Chicote sensual ${style}${color ? ' ' + color : ''} para jogos de sedução e estimulação tátil. Cerdas macias que proporcionam estímulo suave e controlado.`,
      longDescription: `Chicote ${style}${color ? ' ' + color : ''} para exploração sensual e BDSM leve. As cerdas macias criam estimulação tátil sem machucar, despertando os sentidos e aumentando a excitação. Cabo firme e ergonômico para controle preciso durante os jogos.`,
      benefits: `Cerdas macias — estimulação suave e prazerosa\nCabo ergonômico para controle preciso\nIdeal para BDSM leve e exploração sensorial\nMaterial resistente e durável\nFácil de limpar e guardar`,
      howToUse: 'Use com leveza nas costas, coxas e outras regiões. Ajuste a intensidade conforme o conforto do parceiro. Sempre com comunicação e consentimento mútuo.'
    };
  }

  // ALGEMA
  if (n.includes('algema')) {
    const material = n.includes('veludo') ? 'veludo macio' : n.includes('couro') ? 'couro sintético' : n.includes('metal') ? 'metal com veludo' : 'veludo';
    const color = extractColor(n);
    return {
      shortDescription: `Algema sensual em ${material}${color ? ' ' + color : ''} para jogos de dominação leve. Confortável, seguro e com fecho de liberação rápida.`,
      longDescription: `Algema para roleplay e dominação leve em ${material}${color ? ' ' + color : ''}. O forro macio protege os pulsos durante os jogos, sem deixar marcas. Fecho de liberação rápida para segurança. Perfeita para casais que querem explorar fantasias com segurança e diversão.`,
      benefits: `Forro ${material} — não marca os pulsos\nFecho de liberação rápida para segurança\nIdeal para jogos de dominação leve\nAjustável para diferentes tamanhos de pulso\nFácil de guardar e higienizar`,
      howToUse: 'Ajuste ao pulso com espaço para dois dedos. Use o fecho de liberação de emergência se necessário. Sempre com comunicação e consentimento do parceiro.'
    };
  }

  // VIBRADOR
  if (n.includes('vibrador') || n.includes('vibrado')) {
    const color = extractColor(n);
    const premium = n.includes('premium') ? 'premium ' : '';
    const num = n.match(/\d+/)?.[0];
    const gold = n.includes('gold') ? ' dourado' : '';
    return {
      shortDescription: `Vibrador ${premium}${color || ''}${gold} com múltiplas velocidades para estimulação íntima intensa. Design ergonômico em material macio e seguro para a pele.`,
      longDescription: `Vibrador ${premium}${color || ''}${gold}${num ? ' modelo ' + num : ''} com múltiplos modos de vibração para personalizar o prazer. Material silicone macio e hipoalergênico, seguro para a pele. Design ergonômico que se encaixa naturalmente ao corpo. Fácil de usar e higienizar.`,
      benefits: `Múltiplos modos de vibração — personalize o prazer\nMaterial silicone macio e hipoalergênico\nDesign ergonômico para encaixe natural\nSilencioso para uso discreto\nFácil de higienizar — água e sabão`,
      howToUse: 'Use com lubrificante à base de água. Selecione a intensidade desejada e explore. Higienize completamente com água e sabão neutro antes e após cada uso.'
    };
  }

  // CALCINHA
  if (n.includes('calcinha')) {
    const style = n.includes('fio') ? 'fio dental' : n.includes('renda') ? 'de renda' : n.includes('cinta') ? 'com cinta' : '';
    const extra = n.includes('strass') ? ' com strass' : n.includes('borboleta') ? ' borboleta' : n.includes('coração') || n.includes('coracao') ? ' com coração' : '';
    return {
      shortDescription: `Calcinha ${style}${extra} sexy para looks sensuais e momentos especiais. Design delicado que valoriza as curvas com elegância e sedução.`,
      longDescription: `Calcinha ${style}${extra} com design sensual que combina charme e ousadia. Tecido delicado e confortável que valoriza as curvas. Elástico macio sem pressionar. Perfeita para momentos íntimos, ensaios e datas especiais.`,
      benefits: `Design ${style || 'sensual'} que valoriza as curvas\nTecido delicado e confortável\nElástico macio sem apertar\nPerfeita para momentos especiais\nÓtima combinação com outros itens da linha`,
      howToUse: 'Vista como uma calcinha convencional. Combine com outros itens da linha para o visual completo.'
    };
  }

  // CONJUNTO (calcinha + sutiã, body, etc.)
  if (n.includes('conjunto sexy') || n.includes('calcinha + sutia') || n.includes('body') || n.includes('macaquinho') || n.includes('pijama')) {
    const type = n.includes('body') ? 'body' : n.includes('macaquinho') ? 'macaquinho' : n.includes('pijama') ? 'pijama' : 'conjunto';
    return {
      shortDescription: `${type.charAt(0).toUpperCase() + type.slice(1)} sexy em renda e tecido leve para looks sensuais irresistíveis. Design que valoriza as curvas com muito charme.`,
      longDescription: `${type.charAt(0).toUpperCase() + type.slice(1)} sensual em tecido delicado e renda, criado para destacar as curvas com elegância e ousadia. Confortável o suficiente para usar à noite e marcante para os momentos mais especiais.`,
      benefits: `Design sensual que valoriza as curvas\nTecido leve e confortável\nRenda delicada com acabamento refinado\nPerfeito para datas especiais e noites quentes\nÓtimo para presentear`,
      howToUse: 'Vista normalmente. Ideal para momentos especiais a dois ou produções fotográficas sensuais.'
    };
  }

  // ANEL PENIANO
  if (n.includes('anel peniano')) {
    const style = n.includes('ursinho') ? 'ursinho' : n.includes('bolinha') ? 'bolinha' : n.includes('orelha') ? 'orelha' : '';
    const color = extractColor(n);
    return {
      shortDescription: `Anel peniano ${style ? 'formato ' + style + ' ' : ''}${color || ''} para estimulação dupla do casal. Aumenta a performance e intensifica o prazer de ambos durante a penetração.`,
      longDescription: `Anel peniano ${style ? 'no formato ' + style + ' ' : ''}${color || ''} em material macio e elástico. Encaixa com conforto e estimula o casal simultaneamente durante a relação — ele sente maior firmeza, ela recebe estimulação extra. Material seguro e fácil de higienizar.`,
      benefits: `Estimulação dupla — prazer intensificado para os dois\nMaterial macio e elástico — confortável de usar\n${style ? 'Design ' + style + ' — visualmente atraente\n' : ''}Aumenta a firmeza e prolonga o prazer\nFácil de higienizar com água e sabão`,
      howToUse: 'Use com lubrificante à base de água. Encaixe no pênis ereto. Lave com água e sabão neutro após o uso.'
    };
  }

  // DEDEIRA
  if (n.includes('dedeira')) {
    const color = extractColor(n);
    return {
      shortDescription: `Dedeira com textura estimulante${color ? ' ' + color : ''} para carícias intensificadas. Material macio que potencializa cada toque durante os momentos íntimos.`,
      longDescription: `Dedeira com textura${color ? ' ' + color : ''} para aumentar a sensibilidade e o prazer nas carícias manuais. Encaixa no dedo com conforto e segurança. Material macio e hipoalergênico.`,
      benefits: `Textura que intensifica as carícias manuais\nEncaixe confortável e seguro no dedo\nMaterial macio e hipoalergênico\nFácil de higienizar\nDiscreto e prático de usar`,
      howToUse: 'Encaixe no dedo indicador ou médio. Use com lubrificante para intensificar as sensações. Lave com água e sabão após o uso.'
    };
  }

  // JOGOS (dados, baralho, duelo, roleta, raspadinha)
  if (n.includes('dados') || n.includes('baralho') || n.includes('duelo') || n.includes('jogo') || n.includes('roleta') || n.includes('raspadinha')) {
    const type = n.includes('dados') ? 'dados' : n.includes('baralho') ? 'baralho' : n.includes('roleta') ? 'roleta' : n.includes('raspadinha') ? 'raspadinha' : 'jogo';
    const theme = n.includes('namoro') ? 'com desafios de namoro' : n.includes('fetiches') ? 'com temática de fetiches' : n.includes('posicoes') || n.includes('posições') ? 'com 36 posições' : n.includes('drinks') ? 'de drinks' : n.includes('kama sutra') ? 'Kama Sutra' : n.includes('erotico') || n.includes('erótico') ? 'erótico' : 'sensual';
    return {
      shortDescription: `${type.charAt(0).toUpperCase() + type.slice(1)} sensual ${theme} para casais que querem sair da rotina e criar momentos únicos. Divertido, ousado e cheio de surpresas.`,
      longDescription: `${type.charAt(0).toUpperCase() + type.slice(1)} ${theme} para casais que querem adicionar diversão e novidade nos momentos íntimos. Proposta lúdica que estimula a criatividade, a comunicação e a intimidade entre os parceiros. Cada rodada é uma nova aventura!`,
      benefits: `Sai da rotina de forma divertida e criativa\nEstimula a comunicação e a intimidade do casal\nDesafios ${theme} para noites inesquecíveis\nFácil de jogar — sem regras complicadas\nEmbalagem discreta e elegante`,
      howToUse: 'Escolha um momento a dois, misture as cartas/dados e sigam os desafios propostos. Adaptem conforme o conforto dos dois. Diversão garantida!'
    };
  }

  // BOLINHAS SEXY (estimulantes, pop, etc.)
  if (n.includes('bolinha') && (n.includes('sexy') || n.includes('pop') || n.includes('anal') || n.includes('tailandesa') || n.includes('mini'))) {
    const flavor = extractFlavor(n);
    const type = n.includes('tailandesa') || n.includes('kegel') ? 'tailandesas (Kegel)' : n.includes('anal') ? 'anais' : n.includes('pop') ? 'Pop' : n.includes('mini') ? 'mini' : 'estimulantes';
    return {
      shortDescription: `Bolinhas ${type}${flavor ? ' sabor ' + flavor : ''} para estimulação e fortalecimento do assoalho pélvico. ${n.includes('pop') ? 'O efeito Pop surpreende e intensifica a estimulação oral.' : 'Sensação única que intensifica o prazer.'}`,
      longDescription: `Bolinhas ${type}${flavor ? ' com aroma/sabor de ' + flavor : ''} para ${n.includes('tailandesa') || n.includes('kegel') ? 'fortalecimento do assoalho pélvico e estimulação íntima. A microvibração interna aumenta a sensibilidade.' : n.includes('pop') ? 'estimulação oral com efeito Pop explosivo na boca — sensação surpreendente e irresistível.' : 'estimulação interna e externa com sensações únicas.'}`,
      benefits: `${n.includes('pop') ? 'Efeito Pop explosivo na boca\nComestíveis e seguros\n' : n.includes('tailandesa') ? 'Fortalece o assoalho pélvico\nMicrovibração interna suave\n' : 'Estimulação intensa e diferenciada\n'}${flavor ? 'Sabor ' + flavor + ' irresistível\n' : ''}Material seguro e hipoalergênico\nFácil de higienizar`,
      howToUse: n.includes('pop') ? 'Coloque algumas bolinhas na boca antes da estimulação oral. São comestíveis.' : n.includes('tailandesa') ? 'Aplique lubrificante, insira suavemente e contraia os músculos. Use por até 20 minutos. Lave com água e sabão.' : 'Use com lubrificante à base de água. Higienize com água e sabão antes e após o uso.'
    };
  }

  // GEL (lubrificante, estimulante, comestível, etc.)
  if (n.includes('gel') || n.includes('lubrificante') || n.includes('lub') || n.includes('kgel') || n.includes('lub-plus')) {
    const flavor = extractFlavor(n);
    const effect = n.includes('ice') || n.includes('gelado') ? 'gelado refrescante' : n.includes('hot') || n.includes('quente') ? 'aquecimento' : n.includes('anest') || n.includes('indolor') || n.includes('dessens') ? 'anestésico suave' : n.includes('estimul') || n.includes('excit') ? 'estimulante' : n.includes('massagem') ? 'para massagem' : 'lubrificante';
    return {
      shortDescription: `Gel ${effect}${flavor ? ' sabor ' + flavor : ''} para beijos e momentos íntimos mais intensos. Fórmula segura, de absorção rápida e aroma irresistível.`,
      longDescription: `Gel ${effect}${flavor ? ' com sabor de ' + flavor : ''} para uso íntimo e em beijos sensuais. ${n.includes('comestivel') || n.includes('beijavel') || n.includes('bala') || n.includes('caneta') ? 'Comestível e seguro para ingestão.' : 'Fórmula segura à base de água.'} Absorção rápida, não deixa resíduo pegajoso e o aroma ${flavor ? 'de ' + flavor + ' é ' : 'é '}delicioso.`,
      benefits: `Efeito ${effect} imediato\n${flavor ? 'Sabor ' + flavor + ' comestível\n' : ''}Fórmula segura à base de água\nNão deixa resíduo pegajoso\nEmbalagem discreta e prática`,
      howToUse: 'Aplique uma pequena quantidade na região desejada ou nos lábios. Pode ser ingerido se comestível. Lave com água após o uso.'
    };
  }

  // CANETA COMESTÍVEL
  if (n.includes('caneta comestivel')) {
    const flavor = extractFlavor(n);
    return {
      shortDescription: `Caneta comestível${flavor ? ' sabor ' + flavor : ''} para escrever, desenhar e lamber pelo corpo do parceiro. Diversão e prazer em um só produto.`,
      longDescription: `Caneta comestível${flavor ? ' com sabor de ' + flavor : ''} para escrever mensagens sensuais e designs no corpo do parceiro. A tinta é 100% comestível e segura para a pele. Uma forma criativa e deliciosa de explorar o corpo a dois.`,
      benefits: `Tinta 100% comestível e segura\n${flavor ? 'Sabor ' + flavor + ' irresistível\n' : ''}Escrita suave na pele\nIdeal para jogos e exploração criativa\nFácil de remover com água`,
      howToUse: 'Escreva ou desenhe no corpo do parceiro. A tinta é comestível — pode lamber à vontade. Lave com água após o uso.'
    };
  }

  // COLAR PÉROLA / SEXY
  if (n.includes('colar')) {
    const color = extractColor(n);
    return {
      shortDescription: `Colar sensual${color ? ' ' + color : ''} com pérolas para composição de looks íntimos e produções especiais. Visual elegante e sedutor.`,
      longDescription: `Colar sensual com pérolas${color ? ' na cor ' + color : ''} para criar um visual sofisticado e irresistível em momentos especiais. Versátil para usar com lingerie, body ou sozinho para uma composição ousada.`,
      benefits: `Visual elegante e sedutor\nCombina com lingerie e body\nPeso leve e confortável no pescoço\nPerfeito para ensaios e momentos especiais\nApadrinhamento sensual ao visual`,
      howToUse: 'Coloque pelo pescoço e ajuste o fecho. Combine com outros acessórios para criar o visual desejado.'
    };
  }

  // MEIA (arrastão, fio, anti derrapante, peluciada)
  if (n.includes('meia')) {
    const style = n.includes('arrastao') || n.includes('arrastão') ? 'arrastão' : n.includes('fio') ? 'fio 15' : n.includes('anti derrapante') ? 'antiderrapante' : n.includes('peluciada') ? 'peluciada' : '';
    const color = extractColor(n);
    return {
      shortDescription: `Meia ${style}${color ? ' ' + color : ''} sensual para compor looks íntimos ousados. Textura delicada que valoriza as pernas com elegância e sedução.`,
      longDescription: `Meia ${style}${color ? ' ' + color : ''} para composições sensuais com lingerie e fantasias. A textura ${style} valoriza as pernas criando um visual irresistível. Elástico confortável na cintura ou coxa.`,
      benefits: `Visual sensual que valoriza as pernas\nTextura ${style || 'delicada'} e elegante\nElástico confortável sem apertar\nCombina com lingerie, body e fantasias\nPerfeita para momentos especiais`,
      howToUse: 'Vista como uma meia convencional, puxando suavemente para não rasgar a trama. Combine com outros itens da linha.'
    };
  }

  // PERFUME ÍNTIMO (calcinha, cueca)
  if (n.includes('perfume') && (n.includes('calcinha') || n.includes('cueca') || n.includes('intimo') || n.includes('perfumezin'))) {
    const brand = n.match(/apinil|garji|bg hot/i)?.[0] || '';
    const flavor = extractFlavor(n);
    return {
      shortDescription: `Perfume íntimo${flavor ? ' sabor/aroma ' + flavor : ''}${brand ? ' ' + brand : ''} para frescor duradouro na região íntima. Fragrância suave e sedutora para o dia todo.`,
      longDescription: `Perfume íntimo${flavor ? ' com aroma de ' + flavor : ''}${brand ? ' da linha ' + brand : ''} de aplicação direta na calcinha ou cueca. pH compatível com a pele sensível da região íntima. Frescor duradouro e aroma delicado que dura o dia todo.`,
      benefits: `Frescor duradouro ao longo do dia\n${flavor ? 'Aroma ' + flavor + ' delicioso\n' : ''}pH compatível com a pele íntima\nAplicação simples e prática\nFórmula suave sem agressivos`,
      howToUse: 'Borrife diretamente na calcinha ou cueca antes de vestir. Também pode ser aplicado externamente na região íntima. Não usar internamente.'
    };
  }

  // PRÓTESE / MYDICK
  if (n.includes('protese') || n.includes('prótese') || n.includes('mydick')) {
    const size = n.includes(' pp ') || n.includes(' pp') ? 'PP (extra pequeno)' : n.includes(' p ') || n.includes(' p\b') ? 'P (pequeno)' : n.includes(' m ') ? 'M (médio)' : n.includes(' g ') ? 'G (grande)' : n.includes(' gg ') ? 'GG (extra grande)' : '';
    const material = n.includes('metal') ? 'metal' : n.includes('gold') ? 'dourado premium' : 'silicone';
    const escroto = n.includes('escroto') ? 'com escroto realístico' : '';
    return {
      shortDescription: `Prótese realística em ${material} tamanho ${size} ${escroto} com ventosa de fixação. Textura e aparência naturais para máxima realidade.`,
      longDescription: `Prótese em ${material} tamanho ${size} ${escroto}. Textura ultra macia que simula fielmente a pele, com design anatômico e realístico. Ventosa de fixação para uso sem as mãos em superfícies lisas. Material seguro, fácil de higienizar e durável.`,
      benefits: `${size ? 'Tamanho ' + size + ' — opção certa para cada preferência\n' : ''}Material ultra macio com textura realística\nVentosa de fixação para uso sem as mãos\n${escroto ? 'Design ' + escroto + ' para maior realismo\n' : ''}Fácil de higienizar com água e sabão`,
      howToUse: 'Use abundante lubrificante à base de água. Fixe pela ventosa em superfície lisa se desejar uso sem as mãos. Higienize completamente antes e após cada uso.'
    };
  }

  // FANTASIA / SAIA / PIJAMA ADULTO / ROPA
  if (n.includes('fantasia') || n.includes('saia') || n.includes('body') || n.includes('riacho') || n.includes('fio dental') || n.includes('conjunto') || n.includes('pijama') || n.includes('macaquinho') || n.includes('chinelo') || n.includes('pantufa') || n.includes('meia peluciada') || n.includes('turbante') || n.includes('laço adulto') || n.includes('escova de dente adulto') || n.includes('viseira') || n.includes('guarda chuva') || n.includes('varal')) {
    return {
      shortDescription: `${name} para compor produções sensuais e looks adultos especiais. Design ousado e confortável para os momentos mais marcantes.`,
      longDescription: `${name} para criar looks ousados e sensuais em momentos especiais. Material confortável e design que valoriza o visual com muito charme e personalidade.`,
      benefits: `Design ousado e atraente\nMaterial confortável para uso prolongado\nIdeal para fantasias e momentos especiais\nComponha o visual completo combinando com outros itens\nÓtimo para presentear`,
      howToUse: 'Vista normalmente. Combine com outros itens da linha adulto para um look completo e irresistível.'
    };
  }

  // CREME / ÓLEO
  if (n.includes('creme') || (n.includes('oleo') && n.includes('sexy'))) {
    const type = n.includes('adstringente') ? 'adstringente' : n.includes('masculino') ? 'masculino' : n.includes('feminino') ? 'feminino' : n.includes('multifunções') ? 'multifunções' : n.includes('dessensibilizante') ? 'dessensibilizante' : n.includes('massagem') ? 'de massagem' : '';
    const flavor = extractFlavor(n);
    return {
      shortDescription: `Creme ${type}${flavor ? ' sabor/aroma ' + flavor : ''} para cuidado íntimo e maior conforto nos momentos a dois. Fórmula de ação rápida e absorção eficiente.`,
      longDescription: `Creme ${type}${flavor ? ' com aroma de ' + flavor : ''} para uso íntimo com ação específica para ${type}. Fórmula segura, de absorção rápida que não deixa resíduo. Resultado imediato e duradouro.`,
      benefits: `Ação ${type || 'eficiente'} comprovada\n${flavor ? 'Aroma ' + flavor + ' agradável\n' : ''}Absorção rápida sem resíduo\nFórmula segura para uso íntimo\nEmbalagem prática e discreta`,
      howToUse: 'Aplique uma pequena quantidade na região desejada e massageie suavemente até absorver. Use conforme a necessidade.'
    };
  }

  // ENERGÉTICO / DRINK
  if (n.includes('energetico') || n.includes('sexy drink') || n.includes('mel honey') || n.includes('mel arabe') || n.includes('gummy do amor') || n.includes('bala liquida') || n.includes('capsule') || n.includes('lâminas') || n.includes('papermint') || n.includes('aromatizante')) {
    const type = n.includes('energetico') ? 'energético' : n.includes('mel') ? 'mel' : n.includes('gummy') ? 'bala' : n.includes('bala') ? 'bala líquida' : n.includes('lâminas') || n.includes('papermint') ? 'lâminas refrescantes' : n.includes('aromatizante') ? 'aromatizante bucal' : n.includes('capsule') ? 'cápsula' : 'bebida';
    const flavor = extractFlavor(n);
    return {
      shortDescription: `${type.charAt(0).toUpperCase() + type.slice(1)} sensual${flavor ? ' sabor ' + flavor : ''} para intensificar a energia e o prazer nos momentos íntimos. Fórmula discreta e de efeito rápido.`,
      longDescription: `${type.charAt(0).toUpperCase() + type.slice(1)} para uso íntimo${flavor ? ' com sabor de ' + flavor : ''}. Fórmula especial que estimula a energia e intensifica as sensações. Prático e discreto — leva na bolsa e usa quando precisar.`,
      benefits: `Efeito estimulante de ação rápida\n${flavor ? 'Sabor/aroma ' + flavor + ' agradável\n' : ''}Prático — leva na bolsa\nEmbalagem discreta\nFórmula segura`,
      howToUse: 'Use conforme as instruções da embalagem. Geralmente aplicado ou ingerido alguns minutos antes do momento desejado.'
    };
  }

  // CINTO DE CASTIDADE / ACESSÓRIO ESPECIAL
  if (n.includes('cinto de castidade') || n.includes('cinta couro') || n.includes('grampo') || n.includes('funil') || n.includes('chuca') || n.includes('sugador')) {
    return {
      shortDescription: `${name} para exploração de fantasias e BDSM. Produto adulto de uso específico para experiências íntimas ousadas e consensuais.`,
      longDescription: `${name} para uso em fantasias e jogos adultos consensuais. Material seguro e de qualidade, pensado para quem quer explorar novas experiências com segurança e prazer.`,
      benefits: `Material seguro e de qualidade\nIdeal para exploração de fantasias\nDesign funcional e eficiente\nFácil de usar e higienizar\nPara uso adulto consensual`,
      howToUse: 'Use conforme as instruções da embalagem. Sempre com comunicação e consentimento total entre os participantes.'
    };
  }

  // DEFAULT para qualquer outro produto adulto
  return {
    shortDescription: `${name} — item adulto para momentos íntimos especiais. Qualidade garantida e embalagem discreta.`,
    longDescription: `${name} para uso adulto em momentos íntimos. Produto de qualidade com material seguro, desenvolvido para proporcionar prazer e novas experiências. Embalagem discreta para envio e armazenamento.`,
    benefits: `Qualidade superior do produto\nMaterial seguro e testado\nEmbalagem discreta para envio\nFácil de usar e higienizar\nÓtimo custo-benefício`,
    howToUse: 'Use conforme as instruções da embalagem. Higienize antes e após cada uso. Guarde em local limpo e seco.'
  };
}

// ─── MAIN ───────────────────────────────────────────────────────────────────

const data = JSON.parse(fs.readFileSync(JSON_PATH, 'utf8'));

let updated = 0;
for (let i = 0; i < data.length; i++) {
  const e = data[i];
  const l = e.longDescription || '';
  const s = e.shortDescription || '';
  const isBad =
    l.includes('Linha Adulto KA Bijoux') ||
    l.includes('integra a seleção adulta') ||
    s.includes('acessório adulto de uso íntimo') ||
    s.includes('acessório adulto escolhido para momentos reservados') ||
    s.includes('escolhido para momentos reservados');

  if (!isBad) continue;

  const name = e.name || e.displayName || '';
  if (!name) continue;

  const content = generateContent(name);
  e.shortDescription = content.shortDescription;
  e.longDescription = content.longDescription;
  e.benefits = content.benefits;
  e.howToUse = content.howToUse;
  e.researchStatus = 'enriched';
  updated++;
}

fs.writeFileSync(JSON_PATH, JSON.stringify(data, null, 2), 'utf8');
console.log('Atualizados: ' + updated + ' entradas');
