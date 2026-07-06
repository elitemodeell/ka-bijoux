/**
 * enriquecer-produtos.js
 *
 * Atualiza descrições, benefícios e howToUse de:
 *  - 49 produtos no banco Prisma (PostgreSQL)
 *  - 13 entradas no arquivo product-content-overrides.json
 *
 * Rodar com:
 *   NODE_PATH=backend/node_modules node scripts/enriquecer-produtos.js
 */

const path = require('path');
const fs   = require('fs');

const BACKEND_DIR = path.resolve(__dirname, '..', 'backend');
require('dotenv').config({ path: path.join(BACKEND_DIR, '.env') });

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// ─── Dados dos 49 produtos do banco ──────────────────────────────────────────

const DB_PRODUCTS = [
  // ── BIJUTERIAS / ACESSÓRIOS ──
  {
    name: 'BRACELETE AÇO INOX CARTIER C/ STRASS PRATA',
    description: 'Bracelete feminino em aço inox no estilo Cartier com pedras strass na cor prata. Design elegante e refinado que combina com looks casuais e sociais. Material resistente à oxidação, mantém o brilho por muito mais tempo.',
    benefits: '• Aço inox de alta qualidade — não oxida e não escurece a pele\n• Pedras strass brilhantes com acabamento espelhado\n• Estilo Cartier: visual sofisticado e atemporal\n• Fácil de usar — fecho seguro e confortável\n• Versátil: combina com looks do dia a dia e eventos especiais',
    howToUse: 'Encaixe pelo fecho e ajuste ao pulso. Use sozinho ou combine com outras pulseiras para o look layering.',
    packageContents: '1 bracelete aço inox Cartier com strass prata',
    searchTags: ['bracelete', 'pulseira', 'aco inox', 'cartier', 'strass', 'prata', 'bijuteria'],
  },
  {
    name: 'PULSEIRA DE AÇO',
    description: 'Pulseira feminina em aço inox com acabamento polido e brilhante. Peça resistente e durável, ideal para o uso diário sem perder o visual elegante.',
    benefits: '• Aço inox: não oxida, não mancha e não machuca a pele\n• Acabamento polido com brilho duradouro\n• Design minimalista e versátil\n• Resistente à água e ao suor',
    howToUse: 'Use no pulso com o fecho ajustado ao seu tamanho. Combina com outras pulseiras e relógios.',
    packageContents: '1 pulseira em aço inox',
    searchTags: ['pulseira', 'aco inox', 'pulseira feminina', 'bijuteria', 'acessorio'],
  },
  {
    name: 'PULSEIRA',
    description: 'Pulseira delicada para compor o look com estilo e personalidade. Peça versátil que acompanha looks casuais, românticos e festivos.',
    benefits: '• Design delicado e feminino\n• Peça versátil para qualquer ocasião\n• Ótima para presentear',
    howToUse: 'Encaixe no pulso pelo fecho e ajuste conforme necessário.',
    packageContents: '1 pulseira',
    searchTags: ['pulseira', 'bijuteria', 'acessorio feminino'],
  },
  {
    name: 'PULSEIRA PEDRA TURQUESA DOURADA REDONDA',
    description: 'Pulseira feminina com pedras de turquesa natural em formato redondo com cravação dourada. A turquesa é símbolo de proteção e equilíbrio, trazendo energia positiva e um toque de cor ao visual.',
    benefits: '• Pedras de turquesa natural — cor viva e duradoura\n• Detalhes em dourado que valorizam as pedras\n• Turquesa: símbolo de proteção e paz\n• Visual boho-chic, tendência nas bijuterias',
    howToUse: 'Encaixe no pulso e combine com anéis e outros acessórios para criar um look layering.',
    packageContents: '1 pulseira com pedras de turquesa dourada redonda',
    searchTags: ['pulseira', 'turquesa', 'pedra natural', 'dourada', 'boho', 'bijuteria'],
  },
  {
    name: 'PULSEIRA PEDRA TURQUESA PRATA OVAL',
    description: 'Pulseira com pedras de turquesa oval em cravação prata. O contraste entre a pedra azul-esverdeada e o metal prateado cria uma peça elegante com toque natural.',
    benefits: '• Pedras turquesa em corte oval — formato sofisticado\n• Cravação em prata para contraste elegante\n• Combinação de natureza e elegância\n• Visual único e diferenciado',
    howToUse: 'Use no pulso. Combina muito bem com looks de branco, preto e tons terrosos.',
    packageContents: '1 pulseira com pedras de turquesa oval prata',
    searchTags: ['pulseira', 'turquesa', 'pedra natural', 'prata', 'oval', 'bijuteria'],
  },
  {
    name: 'PULSEIRA PEDRA TURQUESA PRATA REDONDA',
    description: 'Pulseira com pedras de turquesa redonda em cravação prata. Peça clássica que traz cor e personalidade ao visual com o charme das pedras naturais.',
    benefits: '• Pedras turquesa em formato redondo clássico\n• Cravação prata refinada\n• Cor vibrante da turquesa — tendência perene na moda\n• Peça leve e confortável',
    howToUse: 'Encaixe no pulso e combine com outras pulseiras ou use sozinha como destaque.',
    packageContents: '1 pulseira com pedras de turquesa redonda prata',
    searchTags: ['pulseira', 'turquesa', 'pedra natural', 'prata', 'redonda', 'bijuteria'],
  },
  {
    name: 'COLAR',
    description: 'Colar delicado para valorizar o decote e adicionar elegância ao look. Peça versátil que complementa desde looks simples do dia a dia até produções mais elaboradas.',
    benefits: '• Design delicado e feminino\n• Versátil para qualquer look e ocasião\n• Comprimento ideal para o decote',
    howToUse: 'Encaixe pelo fecho e ajuste o comprimento da corrente conforme desejado.',
    packageContents: '1 colar',
    searchTags: ['colar', 'bijuteria', 'acessorio feminino', 'colar delicado'],
  },
  {
    name: 'COLAR ARO',
    description: 'Colar em formato de aro (choker/torque rígido), peça que abraça o pescoço com presença e modernidade. Tendência que nunca sai de moda, versátil e marcante.',
    benefits: '• Design estruturado e moderno\n• Fica perfeitamente posicionado no pescoço\n• Tendência atemporal no universo da moda\n• Destaca o decote e o pescoço',
    howToUse: 'Encaixe levemente no pescoço. Use com decotes em V, U ou tomara-que-caia para realçar o efeito.',
    packageContents: '1 colar aro',
    searchTags: ['colar', 'aro', 'torque', 'choker rigido', 'bijuteria'],
  },
  {
    name: 'COLAR PREMIUM',
    description: 'Colar premium com design refinado e acabamento de alta qualidade. Peça que entrega sofisticação real, perfeita para presentear ou para se presentear.',
    benefits: '• Acabamento premium com atenção aos detalhes\n• Visual elegante e sofisticado\n• Material de qualidade superior — maior durabilidade e brilho\n• Ótimo para presentear em datas especiais',
    howToUse: 'Encaixe pelo fecho e ajuste no pescoço. Combina com decotes clássicos e looks sociais.',
    packageContents: '1 colar premium',
    searchTags: ['colar', 'colar premium', 'bijuteria', 'presente', 'sofisticado'],
  },
  {
    name: 'COLAR RIVIERA PRATA M',
    description: 'Colar Riviera em prata tamanho médio, com pedras ou detalhes enfileirados que criam o efeito cascata característico desse estilo. Peça clássica da joalheria moderna, elegante e marcante.',
    benefits: '• Estilo Riviera: sofisticação e modernidade\n• Pedras/detalhes enfileirados em degradê\n• Tamanho médio — ideal para decotes variados\n• Visual glamouroso, perfeito para eventos',
    howToUse: 'Posicione o colar no centro do decote e prenda pelo fecho. Ideal com decotes em V ou coração.',
    packageContents: '1 colar Riviera prata médio',
    searchTags: ['colar', 'riviera', 'prata', 'bijuteria', 'sofisticado', 'elegante'],
  },
  {
    name: 'CHOKER PREMIUM',
    description: 'Choker premium com design moderno e acabamento refinado. O choker abraça o pescoço com precisão, criando um visual marcante e na tendência. Peça essencial para quem quer se destacar.',
    benefits: '• Ajuste preciso ao pescoço — confortável e elegante\n• Acabamento premium com brilho duradouro\n• Tendência que nunca sai de moda\n• Destaca o pescoço e o decote\n• Ótimo para looks modernos e festivos',
    howToUse: 'Posicione o choker na base do pescoço e prenda pelo fecho. Combine com decotes tomara-que-caia ou ombro a ombro.',
    packageContents: '1 choker premium',
    searchTags: ['choker', 'colar', 'bijuteria', 'tendencia', 'premium'],
  },
  {
    name: 'RELICARIO CORAÇÃO FECHADO DOURADO',
    description: 'Relicário em formato de coração, em acabamento dourado, para guardar fotos ou memórias especiais. Uma joia carregada de significado emocional, perfeita para presentear quem você ama.',
    benefits: '• Compartimento interno para foto ou lembrança\n• Formato coração — símbolo de amor e afeto\n• Acabamento dourado elegante e brilhante\n• Presente carregado de sentimento\n• Peça atemporal, tendência que nunca sai de moda',
    howToUse: 'Abra o relicário, insira uma foto 2x2cm ou pequena lembrança, feche e use no colar incluso.',
    packageContents: '1 relicário coração dourado com corrente',
    searchTags: ['relicario', 'coracao', 'dourado', 'presente', 'bijuteria', 'foto', 'lembranca'],
  },
  {
    name: 'RELICARIO CORAÇÃO TRIANGULO PRATA',
    description: 'Relicário em formato triangular com detalhe de coração, em acabamento prata. Design moderno que une o clássico relicário com uma geometria contemporânea, perfeito para quem busca algo único e cheio de significado.',
    benefits: '• Design moderno: triângulo com coração — exclusivo e diferenciado\n• Compartimento para guardar memória especial\n• Acabamento prata elegante\n• Visual geométrico e contemporâneo\n• Ótimo presente para datas especiais',
    howToUse: 'Abra pelo mecanismo lateral, insira a foto ou lembrança e feche com cuidado.',
    packageContents: '1 relicário triângulo coração prata com corrente',
    searchTags: ['relicario', 'coracao', 'triangulo', 'prata', 'bijuteria', 'presente'],
  },
  {
    name: 'ANEL DE CABELO G DOURADO',
    description: 'Anel de cabelo tamanho grande, em acabamento dourado. Acessório versátil que transforma rabo de cavalo, tranças e coquinhos em looks elaborados e na moda. Tendência que domina as redes sociais.',
    benefits: '• Acabamento dourado brilhante e elegante\n• Tamanho G — ideal para mechas grossas ou vários fios\n• Eleva qualquer penteado simples ao próximo nível\n• Tendência forte nas redes sociais e passarelas\n• Fácil de usar e retirar',
    howToUse: 'Separe uma mecha ou coloque sobre um prendedor/elástico e encaixe o anel de cabelo. Pode ser usado em rabo de cavalo, trança ou half-up.',
    packageContents: '1 anel de cabelo G dourado',
    searchTags: ['anel de cabelo', 'acessorio cabelo', 'dourado', 'tendencia', 'penteado'],
  },

  // ── TECNOLOGIA / ELETRÔNICOS ──
  {
    name: 'FONTE USB',
    description: 'Fonte USB compacta para carregar seus dispositivos em qualquer tomada. Compatível com smartphones, tablets e fones de ouvido. Prática, leve e essencial para o dia a dia.',
    benefits: '• Compatível com todos os dispositivos USB\n• Design compacto — cabe em qualquer tomada\n• Carregamento estável e seguro\n• Ideal para usar em casa, no trabalho e em viagens',
    howToUse: 'Encaixe na tomada e conecte o cabo USB ao seu dispositivo para iniciar o carregamento.',
    packageContents: '1 fonte USB',
    searchTags: ['fonte', 'carregador', 'usb', 'tomada', 'celular', 'eletronico'],
  },
  {
    name: 'FONTE + CABO TIPO-C 2 ENTRADAS',
    description: 'Kit fonte carregadora + cabo Tipo-C com 2 entradas USB, para carregar 2 dispositivos ao mesmo tempo. Perfeito para quem tem vários aparelhos e quer praticidade sem abrir mão de velocidade.',
    benefits: '• 2 entradas USB — carrega 2 aparelhos simultaneamente\n• Inclui cabo Tipo-C\n• Design compacto e prático\n• Compatible com celulares, fones e tablets modernos',
    howToUse: 'Encaixe a fonte na tomada, conecte o cabo Tipo-C ao aparelho e a outra entrada para um segundo dispositivo.',
    packageContents: '1 fonte carregadora + 1 cabo Tipo-C',
    searchTags: ['fonte', 'carregador', 'tipo c', 'usb c', 'cabo', '2 entradas'],
  },
  {
    name: 'FONTE + CABO TIPO-C 3 ENTRADAS',
    description: 'Kit fonte carregadora + cabo Tipo-C com 3 entradas USB, para carregar múltiplos dispositivos ao mesmo tempo. Solução completa para famílias ou quem tem muitos gadgets.',
    benefits: '• 3 entradas USB — carrega 3 aparelhos ao mesmo tempo\n• Inclui cabo Tipo-C\n• Elimina a necessidade de várias fontes\n• Compacta e econômica',
    howToUse: 'Conecte a fonte à tomada e distribua os cabos pelos aparelhos nas 3 entradas disponíveis.',
    packageContents: '1 fonte carregadora + 1 cabo Tipo-C',
    searchTags: ['fonte', 'carregador', 'tipo c', '3 entradas', 'multiplas saidas', 'cabo'],
  },
  {
    name: 'FONTE + CABO V8-MICRO 3ENTRADAS',
    description: 'Kit fonte carregadora + cabo V8 Micro USB com 3 entradas, ideal para celulares e dispositivos com entrada Micro USB. Carregue 3 aparelhos simultaneamente com praticidade.',
    benefits: '• 3 entradas USB para carga simultânea\n• Cabo V8 Micro USB incluso\n• Compatível com a maioria dos celulares Android\n• Prático e econômico',
    howToUse: 'Encaixe na tomada e distribua os aparelhos nas 3 entradas. Use o cabo V8 incluído para o aparelho principal.',
    packageContents: '1 fonte + 1 cabo V8 Micro USB',
    searchTags: ['fonte', 'carregador', 'micro usb', 'v8', '3 entradas', 'android'],
  },
  {
    name: 'LUMINARIA LED P/ESCREVER',
    description: 'Luminária LED de mesa para estudos e trabalho, com luz suave e sem flicker que protege a visão. Design prático com braço flexível para direcionar a luz exatamente onde você precisa.',
    benefits: '• Luz LED suave — protege a visão durante longas horas de uso\n• Braço ajustável para direcionar a luz\n• Baixo consumo de energia\n• Ideal para estudos, leitura e home office\n• Luz uniforme sem sombras',
    howToUse: 'Posicione a luminária na mesa e direcione o braço/cabeçote para a área de leitura ou trabalho. Conecte na tomada ou USB conforme o modelo.',
    packageContents: '1 luminária LED de mesa',
    searchTags: ['luminaria', 'led', 'mesa', 'estudo', 'leitura', 'home office'],
  },
  {
    name: 'LUMINARIA LED P/ESCREVER QUADRADO',
    description: 'Luminária LED de mesa modelo quadrado, com design moderno e iluminação ampla para estudos e trabalho. Luz uniforme que cobre uma área maior e reduz o cansaço visual.',
    benefits: '• Formato quadrado — iluminação ampla e uniforme\n• Luz LED que protege os olhos\n• Design moderno que combina com qualquer ambiente\n• Baixo consumo energético\n• Ideal para home office e estudo',
    howToUse: 'Posicione sobre a mesa apontando para a área de trabalho e conecte na fonte de energia.',
    packageContents: '1 luminária LED de mesa quadrada',
    searchTags: ['luminaria', 'led', 'quadrado', 'mesa', 'estudo', 'home office'],
  },
  {
    name: 'LAMPADA LED COM CONTROLE',
    description: 'Lâmpada LED colorida com controle remoto para criar ambientes personalizados em qualquer cômodo. Mude as cores, ajuste o brilho e transforme o clima do ambiente sem sair do lugar.',
    benefits: '• Controle remoto incluso — troca de cor sem levantar da cama\n• Múltiplas cores RGB para personalizar o ambiente\n• Ajuste de brilho e temperatura de cor\n• Baixo consumo de energia\n• Perfeita para quarto, sala e festas',
    howToUse: 'Encaixe na lâmpada na rosca E27 padrão, ligue e use o controle remoto para selecionar cores e brilho desejados.',
    packageContents: '1 lâmpada LED RGB + 1 controle remoto',
    searchTags: ['lampada', 'led', 'rgb', 'controle remoto', 'colorida', 'decoracao'],
  },
  {
    name: 'MICROFONE C/BLUETOOTH PRATA',
    description: 'Microfone sem fio com conexão Bluetooth na cor prata, ideal para karaokê em casa, apresentações e live. Som nítido, alcance sem fio e design sofisticado.',
    benefits: '• Conexão Bluetooth — sem fio e sem enrolação\n• Som nítido e claro\n• Design prata elegante\n• Compatível com smartphones, TVs e caixas de som Bluetooth\n• Ideal para karaokê, live e eventos',
    howToUse: 'Ligue o microfone, ative o Bluetooth e conecte ao seu dispositivo. Use o volume do microfone e do aparelho para ajustar o som.',
    packageContents: '1 microfone Bluetooth prata',
    searchTags: ['microfone', 'bluetooth', 'sem fio', 'karaoke', 'live', 'prata'],
  },
  {
    name: 'CAIXA DE SOM + MICROFONE',
    description: 'Kit caixa de som com microfone incluso, perfeito para karaokê em casa, festas e momentos de diversão em família. Som potente, portátil e pronto para animar qualquer ambiente.',
    benefits: '• Caixa de som potente com microfone incluso\n• Perfeita para karaokê, festas e reuniões\n• Portátil — leve para qualquer ambiente\n• Conexão fácil com smartphones e TV\n• Diversão garantida para toda a família',
    howToUse: 'Conecte a caixa de som via Bluetooth ou P2, encaixe o microfone e ajuste o volume. Cante e divirta-se!',
    packageContents: '1 caixa de som + 1 microfone',
    searchTags: ['caixa de som', 'microfone', 'karaoke', 'festa', 'bluetooth', 'som'],
  },
  {
    name: 'CAIXA DE SOM + MICROFONE ROSA',
    description: 'Kit caixa de som rosa com microfone incluso, para karaokê e festas com muito estilo. Design feminino e divertido com som potente para animar qualquer comemoração.',
    benefits: '• Cor rosa — design feminino e fofo\n• Som potente com microfone incluso\n• Portátil e fácil de conectar\n• Perfeita para aniversários, festas e reuniões\n• Ótima ideia de presente',
    howToUse: 'Conecte via Bluetooth ou P2, encaixe o microfone e divirta-se cantando suas músicas favoritas.',
    packageContents: '1 caixa de som rosa + 1 microfone',
    searchTags: ['caixa de som', 'microfone', 'rosa', 'karaoke', 'festa', 'presente'],
  },
  {
    name: 'ORGANIZADOR MULTIUSO SIMPLES',
    description: 'Organizador multiuso simples para manter gavetas, armários e bancadas sempre arrumados. Divisórias práticas que organizam talheres, cosméticos, papelaria e muito mais.',
    benefits: '• Organiza gavetas, armários e bancadas\n• Divisórias internas para separar itens\n• Material resistente e fácil de limpar\n• Solução rápida para eliminar a bagunça\n• Versátil: funciona em cozinha, banheiro e escritório',
    howToUse: 'Posicione o organizador em gavetas ou armários e distribua os itens nas divisórias conforme a necessidade.',
    packageContents: '1 organizador multiuso',
    searchTags: ['organizador', 'multiuso', 'gaveta', 'armario', 'organizar', 'casa'],
  },
  {
    name: 'SPRAY GLITTER',
    description: 'Spray de glitter para cabelo, corpo e roupas, perfeito para festas, carnaval, shows e produções especiais. Fácil de aplicar e com efeito cintilante que brilha em qualquer luz.',
    benefits: '• Efeito glitter intenso e brilhante\n• Fácil aplicação em spray\n• Funciona em cabelo, pele e roupas\n• Ideal para festas, carnaval e eventos\n• Remove facilmente com água e sabão',
    howToUse: 'Agite bem antes de usar. Borrife a distância de 15-20cm sobre cabelo, corpo ou roupa. Retire com água e shampoo.',
    packageContents: '1 spray glitter',
    searchTags: ['spray', 'glitter', 'brilho', 'cabelo', 'festa', 'carnaval'],
  },

  // ── PET ──
  {
    name: 'ESCOVA SILICONE PET',
    description: 'Escova de silicone para pets com cerdas macias que removem pelos soltos e fazem uma massagem relaxante ao mesmo tempo. Ideal para cães e gatos de pelo curto, médio ou longo.',
    benefits: '• Cerdas de silicone suaves — sem machucar a pele do pet\n• Remove pelos soltos com eficiência\n• Faz massagem enquanto escova — o pet adora!\n• Fácil de limpar: basta apertar para soltar os pelos\n• Indicada para cães e gatos',
    howToUse: 'Passe a escova no pelo do pet em movimentos suaves no sentido do crescimento do pelo. Pressione o botão central para soltar os pelos acumulados.',
    packageContents: '1 escova de silicone para pets',
    searchTags: ['escova pet', 'silicone', 'cachorro', 'gato', 'pelos', 'banho pet'],
  },
  {
    name: 'BRINQUEDO ABACATE COM CATNIP PARA PET',
    description: 'Brinquedo para gatos em formato de abacate recheado com catnip (erva-dos-gatos). O catnip estimula naturalmente o instinto de caça e brincadeira, deixando o gatinho animado e feliz por horas.',
    benefits: '• Catnip natural — atrai gatos irresistivelmente\n• Formato fofo de abacate — divertido e original\n• Estimula o instinto natural de caça\n• Reduz o estresse e a ansiedade do gato\n• Material seguro e resistente à brincadeira',
    howToUse: 'Apresente o brinquedo ao gato deixando-o farejar o catnip. Ele vai morder, abraçar e brincar naturalmente.',
    packageContents: '1 brinquedo abacate com catnip',
    searchTags: ['brinquedo gato', 'catnip', 'abacate', 'pet', 'gato', 'erva dos gatos'],
  },
  {
    name: 'PROTETOR DE SILICONE PLANTA DO PE',
    description: 'Protetor de silicone para a planta do pé, que reduz o impacto e alivia a pressão durante a caminhada. Indicado para quem passa horas em pé, usa salto alto ou tem dores na planta dos pés.',
    benefits: '• Silicone macio que absorve impacto\n• Alivia dor na planta do pé e no calcanhar\n• Reduz a fadiga em quem fica horas em pé\n• Se adapta ao formato do pé\n• Discreto dentro do sapato',
    howToUse: 'Posicione o protetor na planta do pé dentro do sapato, na região de maior pressão. Use meias para maior conforto.',
    packageContents: '1 par protetor de silicone planta do pé',
    searchTags: ['protetor', 'silicone', 'planta do pe', 'salto', 'conforto', 'dor no pe'],
  },

  // ── SEX SHOP ──
  {
    name: 'FORSEXY HOT LEITE CONDENSADO 30ML',
    description: 'Gel comestível com efeito aquecimento sabor Leite Condensado da ForSexy, perfeito para massagens sensuais e beijos quentes. Fórmula comestível, aroma delicioso e toque que aquece suavemente na pele.',
    benefits: '• Efeito quente ao toque — aquece suavemente a pele\n• Sabor comestível de leite condensado irresistível\n• Ideal para massagens e beijos sensuais\n• Fórmula segura e testada\n• Embalagem prática de 30ml',
    howToUse: 'Aplique uma pequena quantidade nos dedos e massageie suavemente na região desejada. O calor do sopro intensifica o efeito aquecimento.',
    packageContents: '1 gel ForSexy HOT leite condensado 30ml',
    searchTags: ['gel comestivel', 'forsexy', 'aquecimento', 'leite condensado', 'massagem sensual'],
    brand: 'ForSexy',
  },
  {
    name: 'TATTOO TEMPORARIA SEXY',
    description: 'Tatuagem temporária sexy para uso sensual e festivo. Designs exclusivos que aderem facilmente à pele, duran alguns dias e arrancam comentários. Perfeita para festas, fantasias e momentos especiais.',
    benefits: '• Adesão fácil — aplica em segundos\n• Dura alguns dias na pele\n• Designs sensuais e exclusivos\n• Remove facilmente com álcool ou óleo\n• Ótima para festas, carnaval e ensaios',
    howToUse: 'Recorte a tattoo, retire o plástico protetor, posicione sobre a pele seca e pressione com pano úmido por 30 segundos. Remova o papel com cuidado.',
    packageContents: '1 tattoo temporária sexy',
    searchTags: ['tattoo temporaria', 'tatuagem', 'sexy', 'festa', 'fantasia'],
  },
  {
    name: 'SEXY BALLS OLHO DE TANDERA',
    description: 'Sexy Balls Olho de Tandera, bolinhas estimuladoras com textura especial para intensificar o prazer. Produto de qualidade para quem busca novas experiências e mais intensidade nos momentos íntimos.',
    benefits: '• Textura especial para estimulação intensa\n• Material seguro e de qualidade\n• Intensifica o prazer e a sensação\n• Fácil de usar e higienizar\n• Embalagem discreta',
    howToUse: 'Use lubrificante à base de água para facilitar o uso. Higienize com água e sabão neutro antes e após cada uso.',
    packageContents: '1 sexy balls Olho de Tandera',
    searchTags: ['sexy balls', 'estimulador', 'brinquedo adulto', 'sex shop', 'prazer'],
  },
  {
    name: 'SEXY BALLS LOOPING FORSEXY',
    description: 'Sexy Balls Looping ForSexy com design especial para estimulação e prazer. Produto desenvolvido pela marca ForSexy com material de qualidade e fórmula pensada para máxima sensação.',
    benefits: '• Design Looping — estimulação diferenciada\n• Marca ForSexy — referência em cosméticos íntimos\n• Material seguro e testado\n• Intensidade de prazer elevada\n• Fácil de higienizar',
    howToUse: 'Use com lubrificante à base de água. Limpe com água e sabão neutro antes e após o uso.',
    packageContents: '1 sexy balls Looping ForSexy',
    searchTags: ['sexy balls', 'forsexy', 'estimulador', 'brinquedo adulto', 'sex shop'],
    brand: 'ForSexy',
  },
  {
    name: 'BOLINHA TAILANDESA SEXY',
    description: 'Bolinhas tailandesas (também chamadas de bolas de gueixa ou bolas de Kegel) para fortalecimento do assoalho pélvico e estimulação íntima. A microvibração interna aumenta a sensibilidade e melhora a vida sexual.',
    benefits: '• Fortalece o assoalho pélvico com uso regular\n• Microvibração interna para estimulação suave\n• Melhora o controle e a intensidade nas relações\n• Pode ser usada discretamente no dia a dia\n• Material seguro e fácil de higienizar',
    howToUse: 'Aplique lubrificante à base de água, introduza suavemente e contraia os músculos para mantê-las no lugar. Use por até 20 minutos no início. Higienize com água e sabão neutro.',
    packageContents: '1 bolinha tailandesa',
    searchTags: ['bolinha tailandesa', 'kegel', 'assoalho pelvico', 'sex shop', 'estimulador'],
  },
  {
    name: 'SEXY BALLS 100 DOR 6X1',
    description: 'Sexy Balls 100 Dor 6x1, kit completo de bolinhas estimuladoras com 6 funções em um único produto. Experiência intensa e versátil para quem busca mais variedade e prazer.',
    benefits: '• 6 funções em 1 — múltiplas possibilidades de prazer\n• Material seguro e de qualidade\n• Kit completo e versátil\n• Intensidade configurável\n• Embalagem discreta',
    howToUse: 'Use lubrificante à base de água. Experimente as diferentes funções do kit. Higienize com água e sabão neutro.',
    packageContents: 'Kit Sexy Balls 100 Dor 6x1',
    searchTags: ['sexy balls', '6 em 1', 'estimulador', 'kit', 'sex shop', 'adulto'],
  },
  {
    name: 'FORSEXY ICE CEREJA 15ML',
    description: 'Gel Ice comestível sabor Cereja da ForSexy com efeito gelado que refresca e estimula. Ideal para beijos e massagens sensuais, com aroma delicioso e sensação gelada que arrepia.',
    benefits: '• Efeito gelado intenso — refrescante e estimulante\n• Sabor cereja comestível e irresistível\n• Ideal para beijos e massagens\n• Fórmula segura da marca ForSexy\n• Embalagem prática 15ml',
    howToUse: 'Aplique uma pequena quantidade na região desejada. O sopro ou toque intensifica o efeito gelado.',
    packageContents: '1 gel ForSexy ICE cereja 15ml',
    searchTags: ['gel ice', 'forsexy', 'cereja', 'gelado', 'comestivel', 'massagem sensual'],
    brand: 'ForSexy',
  },
  {
    name: 'FORSEXY ICE MENTA 15ML',
    description: 'Gel Ice comestível sabor Menta da ForSexy com efeito gelado refrescante. O frescor da menta combinado com o efeito ice cria uma sensação única durante as massagens e beijos sensuais.',
    benefits: '• Efeito gelado com frescor de menta\n• Sabor comestível — gostoso e refrescante\n• Estimula e refresca ao mesmo tempo\n• Fórmula ForSexy de qualidade\n• Embalagem compacta de 15ml',
    howToUse: 'Aplique uma pequena quantidade na área desejada. O sopro potencializa o efeito gelado da menta.',
    packageContents: '1 gel ForSexy ICE menta 15ml',
    searchTags: ['gel ice', 'forsexy', 'menta', 'gelado', 'comestivel', 'sensual'],
    brand: 'ForSexy',
  },
  {
    name: 'PERFUME DE CUECA SEXY',
    description: 'Perfume íntimo masculino para cueca com aroma sedutor e duradouro. Fragrância pensada para o cuidado íntimo masculino, deixando o homem com cheiro fresco e irresistível durante todo o dia.',
    benefits: '• Aroma sedutor e masculino de longa duração\n• Desenvolvido especialmente para a região íntima\n• Mantém a frescura ao longo do dia\n• Embalagem discreta e prática\n• Fórmula delicada compatível com a pele sensível',
    howToUse: 'Aplique diretamente na cueca ou na região íntima externa. Deixe secar antes de vestir.',
    packageContents: '1 perfume de cueca sexy',
    searchTags: ['perfume cueca', 'intimo masculino', 'sex shop', 'aroma', 'cuidado intimo'],
  },
  {
    name: 'QUERO MAIS GEL SEGRED LOVE 20ML',
    description: 'Gel estimulante Quero Mais da marca Secret Love em embalagem de 20ml. Gel íntimo com efeito estimulador para intensificar as sensações e aumentar o desejo. Fórmula de absorção rápida.',
    benefits: '• Efeito estimulante que aumenta a sensibilidade\n• Absorção rápida pela pele\n• Fórmula segura da marca Secret Love\n• Intensifica o desejo e o prazer\n• Embalagem discreta e prática',
    howToUse: 'Aplique uma pequena quantidade na região íntima e massageie suavemente. Use conforme necessário.',
    packageContents: '1 gel Quero Mais Secret Love 20ml',
    searchTags: ['gel estimulante', 'secret love', 'quero mais', 'intimo', 'sex shop'],
    brand: 'Secret Love',
  },
  {
    name: 'MEIA ARRASTAO ADULTO',
    description: 'Meia arrastão adulto com design sensual para looks lingerie e produções especiais. Textura rendada que combina com body, lingerie e fantasias, adicionando sensualidade e charme ao visual.',
    benefits: '• Design sensual com textura arrastão\n• Combina com body, lingerie e fantasias\n• Visual sofisticado e sedutor\n• Elástico confortável na cintura\n• Perfeita para momentos especiais e ensaios',
    howToUse: 'Vista como uma meia convencional, puxando suavemente. Use com lingerie, body ou short para composições sensuais.',
    packageContents: '1 meia arrastão adulto',
    searchTags: ['meia arrastao', 'lingerie', 'sensual', 'sex shop', 'fantasia'],
  },
  {
    name: 'MASCARA SENSUAL PRETA',
    description: 'Máscara sensual preta para jogos de sedução e roleplay. Vendada com design elegante que aguça os sentidos, aumenta a excitação e torna os momentos íntimos ainda mais intensos e inesquecíveis.',
    benefits: '• Priva a visão para intensificar os outros sentidos\n• Design elegante em preto\n• Aumenta a excitação e a antecipação\n• Material macio e confortável\n• Elástico ajustável para diferentes cabeças',
    howToUse: 'Coloque sobre os olhos e ajuste o elástico para um encaixe confortável. Use em jogos de sedução com o parceiro.',
    packageContents: '1 máscara sensual preta',
    searchTags: ['mascara', 'vendada', 'sensual', 'sex shop', 'roleplay', 'sedução'],
  },
  {
    name: 'PERFUME DE CALCINHA SEXY',
    description: 'Perfume íntimo feminino para calcinha, com fragrância suave e sedutora para o cuidado íntimo diário. Mantém a frescura e o aroma delicado ao longo de todo o dia com leveza e discrição.',
    benefits: '• Fragrância suave e sedutora de longa duração\n• Desenvolvido para a região íntima feminina\n• Mantém a frescura e o bem-estar ao longo do dia\n• Fórmula delicada e compatível com a pele sensível\n• Embalagem prática e discreta',
    howToUse: 'Borrife diretamente na calcinha ou na região íntima externa. Deixe secar antes de vestir.',
    packageContents: '1 perfume de calcinha sexy',
    searchTags: ['perfume calcinha', 'intimo feminino', 'sex shop', 'higiene intima', 'fragrancia'],
  },
  {
    name: 'DESODORANTE INTIMO BABASOUL',
    description: 'Desodorante íntimo Babasoul com aroma cheirinho de chiclete, fórmula suave e pH balanceado para a região íntima. Oferece frescor, proteção e bem-estar durante todo o dia sem agredir a pele sensível.',
    benefits: '• Aroma irresistível de chiclete — marca registrada Babasoul\n• pH balanceado para a região íntima\n• Frescor duradouro ao longo do dia\n• Fórmula suave com extratos naturais\n• Não agride a pele sensível\n• Uso feminino e masculino',
    howToUse: 'Aplique o desodorante na região íntima externa após o banho. Deixe secar naturalmente. Não usar internamente.',
    packageContents: '1 desodorante íntimo Babasoul',
    searchTags: ['desodorante intimo', 'babasoul', 'higiene intima', 'sex shop', 'frescor'],
    brand: 'Babasoul',
  },
  {
    name: 'CHICOTE SEXY',
    description: 'Chicote sensual vermelho para jogos de sedução e BDSM leve. Feito com cerdas macias que produzem estimulação tátil suave, ideal para casais que querem explorar novas sensações com segurança.',
    benefits: '• Cerdas macias — estimulação suave sem machucar\n• Ideal para BDSM leve e jogos de sedução\n• Design sensual na cor vermelha\n• Cabo firme e confortável\n• Estimulação tátil que aguça os sentidos',
    howToUse: 'Use suavemente nas costas, pernas e outras regiões do corpo. Sempre com consentimento e comunicação com o parceiro.',
    packageContents: '1 chicote sensual',
    searchTags: ['chicote', 'sensual', 'bdsm', 'sex shop', 'sedução', 'roleplay'],
  },
  {
    name: 'PLUG M CORACAO CRISTAL',
    description: 'Plug anal metálico médio com pedra de cristal em formato de coração, para iniciantes e experientes. A pedra de cristal no cabo facilita a manipulação e adiciona um visual luxuoso e sofisticado.',
    benefits: '• Metal de alta qualidade — seguro e fácil de higienizar\n• Pedra cristal em formato de coração — visual luxuoso\n• Tamanho médio — confortável para quem já tem experiência inicial\n• Superfície lisa para máximo conforto\n• Compatível com todos os tipos de lubrificantes',
    howToUse: 'Use abundante lubrificante à base de água ou silicone. Insira com calma e movimentos suaves. Higienize com água quente e sabão antes e após cada uso.',
    packageContents: '1 plug metálico M coração cristal',
    searchTags: ['plug anal', 'metal', 'cristal', 'sex shop', 'brinquedo adulto'],
  },
  {
    name: 'PLUG M CORACAO ROXO',
    description: 'Plug anal metálico médio com pedra roxa em formato de coração. Design luxuoso com a elegância do roxo — cor associada ao mistério e à sensualidade. Perfeito para quem busca beleza e funcionalidade.',
    benefits: '• Metal de alta qualidade e fácil higienização\n• Pedra roxa em formato de coração — visual exclusivo\n• Tamanho médio confortável\n• Superfície polida para inserção segura\n• Durável e resistente',
    howToUse: 'Use com lubrificante adequado. Insira suavemente. Higienize com água quente e sabão após cada uso.',
    packageContents: '1 plug metálico M coração roxo',
    searchTags: ['plug anal', 'metal', 'roxo', 'sex shop', 'brinquedo adulto'],
  },
  {
    name: 'MYDICK PROTESE COM ESCROTO',
    description: 'Prótese realística MYDICK com escroto, fabricada em material macio e flexível que simula fielmente a textura da pele. Ventosa de fixação para uso sem as mãos. Produto exclusivo para fantasias e prazer adulto.',
    benefits: '• Material macio tipo silicone — textura realística\n• Ventosa de fixação para uso prático\n• Design anatômico com escroto para maior realismo\n• Fácil de higienizar\n• Tamanho e espessura ideais',
    howToUse: 'Use lubrificante à base de água. Fixe pela ventosa em superfícies lisas se desejar. Higienize com água e sabão neutro após o uso.',
    packageContents: '1 prótese MYDICK com escroto',
    searchTags: ['protese', 'adulto', 'sex shop', 'silicone', 'realistica'],
  },
  {
    name: 'PROTESE P SEXY NUDE',
    description: 'Prótese realística tamanho P na cor nude (pele), feita em material macio e flexível para máximo conforto. Design discreto com ventosa de fixação. Ideal para iniciantes.',
    benefits: '• Tamanho P — ideal para iniciantes\n• Cor nude discreta e realística\n• Material macio e flexível\n• Ventosa de fixação inclusa\n• Fácil de higienizar e armazenar',
    howToUse: 'Use com lubrificante à base de água para maior conforto. Higienize completamente antes e após cada uso.',
    packageContents: '1 prótese P sexy nude',
    searchTags: ['protese', 'nude', 'tamanho p', 'sex shop', 'adulto'],
  },
  {
    name: 'PROTESE PP COM ESCROTO',
    description: 'Prótese realística tamanho PP com escroto em material ultra macio e flexível. Tamanho mais compacto para quem prefere algo discreto, com toda a qualidade e realismo da linha premium.',
    benefits: '• Tamanho PP — compacto e discreto\n• Material ultra macio tipo silicone\n• Inclui escroto para maior realismo\n• Ventosa de fixação\n• Fácil de higienizar',
    howToUse: 'Use com lubrificante à base de água. Fixe pela ventosa se desejar. Lave com água e sabão neutro após o uso.',
    packageContents: '1 prótese PP com escroto',
    searchTags: ['protese', 'tamanho pp', 'sex shop', 'adulto', 'silicone'],
  },
];

// ─── Dados dos 13 itens do JSON ───────────────────────────────────────────────

// Chave = índice no array (0-based)
const JSON_OVERRIDES = {
  407: {
    shortDescription: 'Sabonete íntimo de higiene delicada com pH balanceado e aroma agradável.',
    longDescription: 'Sabonete íntimo de uso externo, formulado com pH balanceado especialmente para a região íntima. A fórmula suave limpa sem agredir, mantendo o equilíbrio natural da flora e proporcionando frescor durante todo o dia.',
    benefits: 'pH balanceado para a região íntima. Fórmula suave que não agride. Frescor e limpeza de longa duração. Aroma agradável e discreto.',
    howToUse: 'Aplique uma pequena quantidade na região íntima externa umedecida, espalhe suavemente e enxágue com água em abundância. Uso diário externo.',
  },
  412: {
    shortDescription: 'Fone Bluetooth P47 dobrável com som potente, graves encorpados e bateria de longa duração.',
    longDescription: 'O Fone Bluetooth P47 oferece som de alta qualidade com graves potentes e agudos nítidos em um design moderno e dobrável. Conexão Bluetooth sem fio de até 10m, bateria de longa duração e almofadas auriculares confortáveis para horas de uso.',
    benefits: 'Conexão Bluetooth sem fio até 10m. Graves potentes e som imersivo. Design dobrável para fácil transporte. Bateria de longa duração. Compatível com todos os smartphones. Microfone integrado para chamadas.',
    howToUse: 'Ligue o fone e ative o Bluetooth. Pareie com o smartphone e ajuste o volume. Dobre após o uso para guardar.',
  },
  418: {
    shortDescription: 'Perfume de ambiente com aroma sofisticado para renovar qualquer espaço.',
    longDescription: 'Perfume de ambiente com fragrância pensada para transformar a atmosfera do seu lar. Aroma sofisticado e duradouro que perfuma quartos, salas e escritórios, criando sensações de aconchego e bem-estar.',
    benefits: 'Aroma sofisticado e duradouro. Perfuma rapidamente ambientes fechados. Cria atmosfera de bem-estar e aconchego. Fácil de usar — spray ou difusor. Não agride superfícies.',
    howToUse: 'Borrife no centro do ambiente a uma altura de 1,5m, com o frasco a 30cm de distância. Evite aplicar diretamente sobre tecidos delicados.',
  },
  419: {
    shortDescription: 'Odorizador para tecidos e ambientes com frescor de longa duração.',
    longDescription: 'Odorizador multiuso para tecidos e ambientes, que elimina odores indesejados e deixa um aroma fresco e agradável por horas. Ideal para roupas, sofá, cortinas, cama e ambientes em geral.',
    benefits: 'Elimina odores indesejados rapidamente. Funciona em tecidos e ambientes. Frescor de longa duração. Não mancha tecidos. Aroma suave e agradável.',
    howToUse: 'Borrife sobre tecidos ou no ambiente a distância de 20-30cm. Para roupas, aplique do avesso e deixe secar antes de vestir.',
  },
  420: {
    shortDescription: 'Protetor de calcanhar em silicone que reduz o atrito e previne bolhas em sapatos novos.',
    longDescription: 'O Protetor de Calcanhar em Silicone é a solução para quem sofre com bolhas e irritações causadas por sapatos novos ou fechados. O silicone macio e autoadesivo cobre o calcanhar, reduzindo o atrito e proporcionando conforto imediato em qualquer calçado.',
    benefits: 'Elimina o atrito que causa bolhas e feridas. Silicone macio e autoadesivo. Invisível dentro do sapato. Funciona em qualquer tipo de calçado. Lavável e reutilizável. Kit com 2 unidades.',
    howToUse: 'Limpe e seque bem o calcanhar. Retire o papel adesivo e cole o protetor no interior do sapato na região do calcanhar. Reutilizável: lave e reaproveite.',
  },
  429: {
    shortDescription: 'Dispenser elétrico para galão de água, sem esforço e sem bagunça.',
    longDescription: 'O Dispenser de Água Elétrico facilita o uso de galões de 20L com bomba elétrica de bateria recarregável. Basta posicionar no galão e apertar o botão para servir água sem precisar inclinar o galão ou fazer força. Prático, higiênico e essencial para o dia a dia.',
    benefits: 'Elimina o esforço de inclinar o galão. Bomba elétrica recarregável via USB. Serve água com apenas um toque. Compatível com galões de 5, 10 e 20 litros. Prático, higiênico e silencioso.',
    howToUse: 'Recarregue via USB antes do primeiro uso. Encaixe o dispenser na abertura do galão, ligue e pressione o botão para servir água. Recarregue quando a bateria acabar.',
  },
  442: {
    shortDescription: 'Papel de parede adesivo 45cmx5m para renovar paredes e móveis sem reforma.',
    longDescription: 'Papel de parede adesivo em rolo de 45cm x 5m para transformar paredes, móveis, prateleiras e gavetas sem precisar de cola ou reforma. Fácil aplicação e remoção sem danificar a superfície. Disponível em vários padrões e cores.',
    benefits: 'Transforma o ambiente sem reforma. Fácil de aplicar e remover. Não danifica a parede. Rolo de 45x500cm — cobre grandes áreas. Lavável e resistente à umidade. Funciona em paredes, móveis e prateleiras.',
    howToUse: 'Limpe e seque a superfície. Retire o adesivo aos poucos enquanto cola o papel, eliminando bolhas de ar com uma espátula ou cartão. Para remover, puxe devagar em ângulo de 45°.',
  },
  448: {
    shortDescription: 'Mini robô aspirador automático recarregável para limpeza leve do dia a dia.',
    longDescription: 'O Mini Robô Aspirador Branco facilita a limpeza leve do dia a dia com aspiração automática e sensor anticolisão. Recarregável via USB, silencioso e compacto, perfeito para aspirar poeira, pelos de animais e migalhas em pisos lisos e carpetes finos. Acompanha escovinha de limpeza.',
    benefits: 'Aspiração automática sem esforço. Sensor anticolisão — não bate nos móveis. Recarregável via cabo USB incluso. Silencioso e compacto. Ideal para pelos de pets, poeira e migalhas. Acompanha acessórios de limpeza.',
    howToUse: 'Carregue completamente antes do primeiro uso. Ligue o robô na superfície desejada e ele aspirará automaticamente. Para limpeza do filtro, remova e bata levemente para soltar a poeira acumulada.',
  },
  454: {
    shortDescription: 'Pulseira para smartwatch em silicone com ajuste fácil e conforto para o dia a dia.',
    longDescription: 'Pulseira de reposição para smartwatch em silicone macio e resistente. Design simples e funcional que se encaixa perfeitamente nos smartwatches mais populares do mercado. Fácil de trocar, lavar e usar no dia a dia com conforto e estilo.',
    benefits: 'Silicone macio e hipoalergênico. Ajuste fácil com fivela padrão. Compatível com os principais modelos de smartwatch. Resistente à água e ao suor. Lavável — mantém a higiene. Disponível em várias cores.',
    howToUse: 'Remova a pulseira original do smartwatch pressionando o botão de liberação. Encaixe a nova pulseira no conector até travar. Ajuste a fivela no pulso.',
  },
  456: {
    shortDescription: 'Pulseira para smartwatch em couro sintético com acabamento clássico e elegante.',
    longDescription: 'A Pulseira para Smartwatch Estilo Couro entrega um visual sofisticado ao seu relógio inteligente com material tipo couro de alta qualidade e costura reforçada. Ajuste fácil, fecho com fivela metálica e acabamento que combina com looks casuais e sociais.',
    benefits: 'Visual elegante e clássico que eleva o smartwatch. Couro sintético de qualidade com costura reforçada. Fecho metálico ajustável. Compatível com os principais modelos de smartwatch. Confortável para uso prolongado.',
    howToUse: 'Encaixe a pulseira no smartwatch pressionando os conectores laterais. Ajuste a fivela ao tamanho do pulso desejado.',
  },
  475: {
    shortDescription: 'Mini prancha alisadora portátil rosa para retoques rápidos em qualquer lugar.',
    longDescription: 'A Mini Prancha Alisadora Portátil Rosa é a aliada perfeita para quem precisa manter os fios impecáveis ao longo do dia. Compacta, leve e de aquecimento rápido, ela é ideal para levar na bolsa e fazer retoques em viagens, no trabalho e no dia a dia.',
    benefits: 'Aquecimento rápido em segundos. Tamanho compacto — cabe na bolsa. Ideal para retoques sem montar toda a produção. Placas cerâmicas que protegem os fios. Bivolt — funciona em qualquer tomada.',
    howToUse: 'Ligue e aguarde o aquecimento (aprox. 30 segundos). Separe mechas finas, passe pela prancha em movimentos de cima para baixo. Para cachos, enrole a mecha pela prancha.',
  },
  487: {
    shortDescription: 'Spray tinta temporária para cabelo, ideal para festas, eventos e produções criativas.',
    longDescription: 'O Spray Tinta para Cabelo é a solução mais prática para transformar o visual em festas, carnaval, shows e eventos temáticos. Cor vibrante, aplicação em segundos e remoção fácil com shampoo — sem compromisso e sem dano ao cabelo.',
    benefits: 'Cor intensa e vibrante instantânea. Aplicação em spray — fácil e uniforme. Remove com shampoo — sem comprometer a coloração natural. Não danifica os fios. Perfeito para festas, carnaval e eventos. Disponível em várias cores.',
    howToUse: 'Agite bem antes de usar. Mantenha o cabelo seco. Borrife a 20-30cm dos fios em seções. Deixe secar e finalize com laquê se desejar. Remova com shampoo normalmente.',
  },
  488: {
    shortDescription: 'Cordão/alça para celular, estiloso e seguro para usar no pescoço ou pulso.',
    longDescription: 'A Corda para Celular é o acessório prático e estiloso para carregar o smartphone sempre por perto, sem risco de queda. Encaixa na maioria das capinhas e permite usar o celular pendurado no pescoço ou pulso, liberando as mãos.',
    benefits: 'Deixa as mãos livres durante o uso do celular. Reduz o risco de quedas. Estiloso — agrega ao visual com a capinha. Compatível com a maioria das capinhas com orifício. Ajuste de comprimento disponível.',
    howToUse: 'Encaixe a cordinha no orifício lateral da capinha do celular. Ajuste o comprimento e passe pelo pescoço ou pulso conforme preferir.',
  },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function normalize(str) {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim();
}

// ─── Atualização do banco Prisma ──────────────────────────────────────────────

async function updateDbProducts() {
  console.log('\n=== ATUALIZANDO PRODUTOS NO BANCO (DB) ===\n');

  let updated = 0;
  let notFound = 0;
  let errors = 0;

  for (const data of DB_PRODUCTS) {
    try {
      const product = await prisma.product.findFirst({
        where: {
          name: {
            contains: data.name,
            mode: 'insensitive',
          },
        },
        select: { id: true, name: true },
      });

      if (!product) {
        console.warn(`  [NAO ENCONTRADO] "${data.name}"`);
        notFound++;
        continue;
      }

      const updatePayload = {
        description:       data.description,
        benefits:          data.benefits,
        howToUse:          data.howToUse,
        packageContents:   data.packageContents,
        searchTags:        data.searchTags,
        enrichmentStatus:  'ENRICHED',
        publicationStatus: 'PUBLISHED',
      };

      if (data.brand) {
        updatePayload.brand = data.brand;
      }

      await prisma.product.update({
        where: { id: product.id },
        data:  updatePayload,
      });

      console.log(`  [OK] "${product.name}"`);
      updated++;
    } catch (err) {
      console.error(`  [ERRO] "${data.name}": ${err.message}`);
      errors++;
    }
  }

  console.log(`\nResumo DB: ${updated} atualizados | ${notFound} nao encontrados | ${errors} erros`);
  return { updated, notFound, errors };
}

// ─── Atualização do arquivo JSON ──────────────────────────────────────────────

async function updateJsonFile() {
  console.log('\n=== ATUALIZANDO ARQUIVO JSON ===\n');

  const JSON_PATH = path.join(BACKEND_DIR, 'data', 'product-content-overrides.json');

  let data;
  try {
    data = JSON.parse(fs.readFileSync(JSON_PATH, 'utf8'));
  } catch (err) {
    console.error(`Erro ao ler o arquivo JSON: ${err.message}`);
    return { updated: 0, errors: 1 };
  }

  let updated = 0;
  let errors   = 0;

  for (const [indexStr, overrides] of Object.entries(JSON_OVERRIDES)) {
    const index = parseInt(indexStr, 10);

    try {
      if (index < 0 || index >= data.length) {
        console.warn(`  [FORA DO RANGE] indice ${index} (total: ${data.length})`);
        errors++;
        continue;
      }

      const entry = data[index];

      entry.shortDescription = overrides.shortDescription;
      entry.longDescription  = overrides.longDescription;
      entry.benefits         = overrides.benefits;
      entry.howToUse         = overrides.howToUse;
      entry.researchStatus   = 'enriched';

      console.log(`  [OK] indice ${index} — "${entry.name}"`);
      updated++;
    } catch (err) {
      console.error(`  [ERRO] indice ${index}: ${err.message}`);
      errors++;
    }
  }

  try {
    fs.writeFileSync(JSON_PATH, JSON.stringify(data, null, 2), 'utf8');
    console.log(`\nArquivo JSON salvo: ${JSON_PATH}`);
  } catch (err) {
    console.error(`Erro ao salvar o arquivo JSON: ${err.message}`);
    errors++;
  }

  console.log(`\nResumo JSON: ${updated} atualizados | ${errors} erros`);
  return { updated, errors };
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('Iniciando enriquecimento de produtos...\n');

  const dbResult   = await updateDbProducts();
  const jsonResult = await updateJsonFile();

  console.log('\n=== RESUMO FINAL ===');
  console.log(`DB    — Atualizados: ${dbResult.updated} | Nao encontrados: ${dbResult.notFound} | Erros: ${dbResult.errors}`);
  console.log(`JSON  — Atualizados: ${jsonResult.updated} | Erros: ${jsonResult.errors}`);
  console.log('\nEnriquecimento concluido!');
}

main()
  .catch((err) => {
    console.error('Erro fatal:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
