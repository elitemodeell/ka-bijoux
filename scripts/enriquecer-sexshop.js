/**
 * enriquecer-sexshop.js
 *
 * Atualiza descrições, benefícios, howToUse e searchTags de 117 produtos
 * sex shop no banco Prisma (PostgreSQL), setando enrichmentStatus = ENRICHED
 * e publicationStatus = PUBLISHED.
 *
 * Rodar com:
 *   NODE_PATH=backend/node_modules node scripts/enriquecer-sexshop.js
 */

const path = require('path');
const BACKEND_DIR = path.resolve(__dirname, '..', 'backend');
require('dotenv').config({ path: path.join(BACKEND_DIR, '.env') });
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// ─── Lista completa dos 117 produtos sex shop ────────────────────────────────

const PRODUTOS = [

  // ── GÉIS YUMMY (gel comestível, sabores variados) ──────────────────────────

  {
    name: 'GEL YUMMY CAIPIRINHA',
    description: 'Gel comestível Yummy sabor Caipirinha para beijos e massagens sensuais. Fórmula segura para uso íntimo com sabor irresistível que torna cada momento ainda mais gostoso. Efeito lubrificante suave e aroma refrescante de caipirinha.',
    benefits: '• Sabor autêntico de caipirinha — gostoso e refrescante\n• Comestível e seguro para beijos íntimos\n• Textura lubrificante e suave na pele\n• Aroma delicioso que estimula os sentidos\n• Embalagem discreta e prática',
    howToUse: 'Aplique uma pequena quantidade na região desejada ou nos lábios do parceiro. Pode ser ingerido — é comestível. Lave com água após o uso.',
    searchTags: ['gel comestivel', 'yummy', 'caipirinha', 'beijos', 'massagem sensual', 'lubrificante sabor'],
  },
  {
    name: 'GEL YUMMY CHICLETE',
    description: 'Gel comestível Yummy sabor Chiclete para beijos e carícias sensuais. Sabor adocicado e perfumado que transforma os momentos íntimos em uma experiência inesquecível. Textura leve e confortável na pele.',
    benefits: '• Sabor chiclete irresistível — doce e perfumado\n• Comestível e seguro para uso íntimo\n• Textura lubrificante que não gruda na pele\n• Aroma suave e estimulante\n• Embalagem prática e discreta',
    howToUse: 'Aplique na região desejada ou nos lábios e explore à vontade. É comestível, sem contraindicações para ingestão. Lave com água após o uso.',
    searchTags: ['gel comestivel', 'yummy', 'chiclete', 'beijos', 'sabor', 'lubrificante'],
  },
  {
    name: 'GEL YUMMY FRAMBOESA',
    description: 'Gel comestível Yummy sabor Framboesa, ideal para beijos íntimos e massagens sensuais. O sabor de framboesa traz um toque frutado e levemente ácido que desperta os sentidos. Fórmula suave e segura para uso íntimo.',
    benefits: '• Sabor framboesa — frutado, suave e levemente ácido\n• Comestível e aprovado para uso íntimo\n• Lubrificação leve que facilita as carícias\n• Aroma frutal irresistível\n• Embalagem compacta e discreta',
    howToUse: 'Aplique na pele ou use diretamente nos beijos. O produto é comestível. Lave a região com água após o uso.',
    searchTags: ['gel comestivel', 'yummy', 'framboesa', 'sabor frutal', 'beijos', 'lubrificante sensual'],
  },
  {
    name: 'GEL YUMMY ICE MENTA',
    description: 'Gel comestível Yummy sabor Ice Menta com efeito gelado e refrescante para beijos e carícias íntimas. A sensação de frescor da menta intensifica o prazer e aguça os sentidos. Fórmula segura e comestível.',
    benefits: '• Sabor menta com efeito gelado — frescor intenso\n• Comestível e seguro para regiões íntimas\n• Sensação refrescante que potencializa o prazer\n• Textura suave e não gordurosa\n• Aroma de hortelã delicioso',
    howToUse: 'Aplique diretamente na região desejada. O efeito gelado é imediato e dura alguns minutos. É comestível. Lave com água após o uso.',
    searchTags: ['gel comestivel', 'yummy', 'menta', 'ice', 'efeito gelado', 'frescor', 'beijos'],
  },
  {
    name: 'GEL YUMMY MORANGO',
    description: 'Gel comestível Yummy sabor Morango — um clássico irresistível para beijos e massagens sensuais. O sabor doce e perfumado de morango torna os momentos íntimos ainda mais apetitosos. Fórmula segura e agradável.',
    benefits: '• Sabor morango suave e adocicado — um clássico gostoso\n• Comestível e seguro para uso íntimo\n• Textura lubrificante e confortável\n• Aroma de morango que estimula o desejo\n• Embalagem discreta e fácil de usar',
    howToUse: 'Aplique na pele, nos lábios ou na região íntima. Pode ser ingerido. Lave com água após o uso.',
    searchTags: ['gel comestivel', 'yummy', 'morango', 'sabor', 'beijos', 'lubrificante'],
  },
  {
    name: 'GEL YUMMY VINHO TINTO',
    description: 'Gel comestível Yummy sabor Vinho Tinto para um clima mais sofisticado e sensual. O toque adocicado do vinho combina perfeitamente com os momentos de prazer a dois. Fórmula suave, segura e deliciosa.',
    benefits: '• Sabor vinho tinto — sofisticado e sedutor\n• Comestível e seguro para uso íntimo\n• Textura lubrificante e leve\n• Aroma marcante e estimulante\n• Ideal para momentos românticos e sensuais',
    howToUse: 'Aplique na região desejada para beijos e carícias. É comestível. Lave com água após o uso.',
    searchTags: ['gel comestivel', 'yummy', 'vinho', 'sabor', 'romantico', 'sensual', 'lubrificante'],
  },

  // ── GÉIS LAMB ──────────────────────────────────────────────────────────────

  {
    name: 'GEL LAMB HORTELÃ',
    description: 'Gel lubrificante Lamb sabor Hortelã com efeito refrescante e estimulante para os momentos íntimos. A textura cremosa e o sabor suave de hortelã proporcionam uma experiência sensorial única e prazerosa.',
    benefits: '• Sabor hortelã refrescante e agradável\n• Efeito lubrificante de longa duração\n• Textura cremosa e não gordurosa\n• Estimula os sentidos com frescor natural\n• Fórmula segura para uso íntimo',
    howToUse: 'Aplique a quantidade desejada na região íntima ou nos lábios. Lave com água após o uso.',
    searchTags: ['gel lubrificante', 'lamb', 'hortela', 'menta', 'sabor', 'lubrificante sensual'],
  },
  {
    name: 'GEL LAMB PÊSSEGO E CHANTILLY',
    description: 'Gel lubrificante Lamb com delicioso sabor de pêssego e chantilly — uma combinação irresistível para os beijos mais doces. Textura aveludada que suaviza a pele e prolonga o prazer.',
    benefits: '• Sabor pêssego com chantilly — doce e indulgente\n• Textura aveludada e suave na pele\n• Lubrificação confortável e prolongada\n• Aroma frutal e cremoso irresistível\n• Seguro para uso íntimo',
    howToUse: 'Aplique diretamente na pele ou nos lábios para beijos e carícias. Lave com água após o uso.',
    searchTags: ['gel lubrificante', 'lamb', 'pessego', 'chantilly', 'sabor', 'beijos', 'sensual'],
  },
  {
    name: 'GEL LAMB YOGURTE',
    description: 'Gel lubrificante Lamb sabor Iogurte com textura cremosa e suave, ideal para massagens e beijos íntimos. O sabor levemente ácido e delicado do iogurte torna os momentos a dois ainda mais saborosos.',
    benefits: '• Sabor iogurte suave e levemente ácido\n• Textura cremosa e confortável\n• Lubrificação eficiente para o prazer\n• Seguro para uso íntimo\n• Aroma suave e agradável',
    howToUse: 'Aplique na região desejada para beijos e massagens sensuais. Lave com água após o uso.',
    searchTags: ['gel lubrificante', 'lamb', 'iogurte', 'yogurte', 'sabor', 'cremoso', 'sensual'],
  },

  // ── GARGANTA PROFUNDA ──────────────────────────────────────────────────────

  {
    name: 'GARGANTA PROFUNDA MAÇA VERDE',
    description: 'Spray Garganta Profunda sabor Maçã Verde com efeito anestésico leve para relaxamento e mais conforto durante o ato. O sabor refrescante de maçã verde torna a experiência mais prazerosa e descontraída.',
    benefits: '• Efeito anestésico suave — mais conforto e prazer\n• Sabor maçã verde refrescante e delicioso\n• Fórmula segura e testada\n• Aplicação em spray — prática e higiênica\n• Ação rápida em segundos',
    howToUse: 'Borrife diretamente na garganta 2 a 3 vezes antes do ato. Aguarde 30 segundos para o efeito começar. Evite ingerir grandes quantidades.',
    searchTags: ['garganta profunda', 'spray', 'maca verde', 'anestesico', 'oral', 'sabor'],
  },
  {
    name: 'GARGANTA PROFUNDA MORANGO COM LICHIA',
    description: 'Spray Garganta Profunda sabor Morango com Lichia — combinação exótica e irresistível para tornar o sexo oral ainda mais prazeroso. Fórmula com efeito anestésico leve que proporciona mais conforto e confiança.',
    benefits: '• Sabor morango com lichia — exótico e delicioso\n• Efeito anestésico suave para mais conforto\n• Spray de aplicação precisa e higiênica\n• Ação rápida e eficiente\n• Fórmula testada e segura',
    howToUse: 'Aplique 2 a 3 jatos na garganta. Aguarde alguns segundos para o efeito agir. Não engolir grandes quantidades.',
    searchTags: ['garganta profunda', 'spray', 'morango', 'lichia', 'anestesico', 'oral'],
  },
  {
    name: 'GARGANTA PROFUNDA SEX ON THE BEACH',
    description: 'Spray Garganta Profunda sabor Sex on the Beach — o sabor do coquetel mais famoso transformado em prazer. Efeito anestésico suave que aumenta o conforto e a confiança durante o sexo oral.',
    benefits: '• Sabor Sex on the Beach — tropical e irresistível\n• Efeito anestésico suave para mais liberdade\n• Aplicação em spray prática e higiênica\n• Ação rápida\n• Fórmula segura e testada',
    howToUse: 'Borrife 2 a 3 vezes na garganta antes do ato. Aguarde o efeito se manifestar em cerca de 30 segundos.',
    searchTags: ['garganta profunda', 'spray', 'sex on the beach', 'anestesico', 'oral', 'sabor tropical'],
  },

  // ── BOLINHAS SEXY / POP ────────────────────────────────────────────────────

  {
    name: 'BOLINHAS SEXY ANAL LOVE',
    description: 'Bolinhas sexy com fórmula especial para estimulação anal, proporcionando sensações únicas de vibração e prazer. Produto desenvolvido para quem deseja explorar novos prazeres com segurança e conforto.',
    benefits: '• Fórmula especial para estimulação anal\n• Sensação efervescente e prazerosa\n• Produto seguro e testado\n• Embalagem discreta e prática\n• Ideal para casais adventureiros',
    howToUse: 'Dissolva as bolinhas conforme indicado na embalagem e aplique ou use conforme o tipo de produto. Lave bem após o uso.',
    searchTags: ['bolinhas sexy', 'anal', 'estimulante', 'prazer anal', 'sensacao'],
  },
  {
    name: 'BOLINHAS SEXY BABALUU MORANGO',
    description: 'Bolinhas Sexy Babaluu sabor Morango com efeito efervescente e estimulante para os beijos mais apimentados. A combinação do sabor de morango com a sensação das bolinhas cria um momento inesquecível.',
    benefits: '• Sabor irresistível de morango\n• Efeito efervescente e estimulante\n• Ótimo para beijos e carícias íntimas\n• Fórmula segura e comestível\n• Embalagem discreta',
    howToUse: 'Coloque a bolinha na boca antes dos beijos íntimos. Sinta a efervescência e aproveite a sensação diferente.',
    searchTags: ['bolinhas sexy', 'babaluu', 'morango', 'efervescente', 'beijos', 'estimulante'],
  },
  {
    name: 'BOLINHAS SEXY BABALUU TUTTI-FRUTTI',
    description: 'Bolinhas Sexy Babaluu sabor Tutti-Frutti com efeito efervescente para os melhores beijos da sua vida. O sabor de tutti-frutti é irresistível e a sensação das bolinhas faz cada toque ser ainda mais especial.',
    benefits: '• Sabor tutti-frutti delicioso e frutal\n• Efervescência que intensifica as sensações\n• Seguro para beijos íntimos\n• Fórmula comestível\n• Embalagem prática',
    howToUse: 'Coloque a bolinha na boca antes dos beijos íntimos e deixe derreter naturalmente enquanto curte as sensações.',
    searchTags: ['bolinhas sexy', 'babaluu', 'tutti frutti', 'efervescente', 'beijos', 'comestivel'],
  },
  {
    name: 'BOLINHAS SEXY LOVE LIVRE',
    description: 'Bolinhas Sexy Love Livre para momentos de prazer sem limites. Produto estimulante que proporciona novas sensações e intensifica o prazer durante os momentos íntimos a dois ou solo.',
    benefits: '• Estimulação intensa e prazerosa\n• Proporciona novas sensações\n• Fórmula especial para máximo prazer\n• Embalagem discreta\n• Produto seguro e testado',
    howToUse: 'Use conforme indicação da embalagem. Lave a região com água após o uso.',
    searchTags: ['bolinhas sexy', 'love livre', 'estimulante', 'prazer', 'sensacao'],
  },
  {
    name: 'BOLINHAS SEXY POP FRUTAS VERMELHAS',
    description: 'Bolinhas Sexy Pop sabor Frutas Vermelhas — a efervescência das bolinhas pop combinada com o sabor intenso das frutas vermelhas para beijos e carícias inesquecíveis. Produto comestível e seguro para uso íntimo.',
    benefits: '• Sabor frutas vermelhas intenso e delicioso\n• Efeito pop efervescente na boca\n• Comestível e seguro para uso íntimo\n• Cria experiências únicas durante os beijos\n• Embalagem prática e discreta',
    howToUse: 'Coloque uma bolinha na boca e use durante os beijos íntimos. Sinta o efeito pop e saboreie a experiência.',
    searchTags: ['bolinhas pop', 'frutas vermelhas', 'efervescente', 'comestivel', 'beijos', 'sabor'],
  },
  {
    name: 'BOLINHAS SEXY POP MORANGO',
    description: 'Bolinhas Sexy Pop sabor Morango com efeito pop efervescente para transformar os beijos em algo extraordinário. O sabor doce de morango e a sensação das bolinhas estourando criam uma experiência única.',
    benefits: '• Sabor morango doce e irresistível\n• Efeito pop que estoura na boca\n• Comestível e seguro para beijos íntimos\n• Sensação diferenciada e estimulante\n• Embalagem discreta',
    howToUse: 'Coloque uma bolinha pop na boca antes dos beijos íntimos. Sinta as bolinhas estourando com o sabor de morango.',
    searchTags: ['bolinhas pop', 'morango', 'efervescente', 'comestivel', 'beijos', 'sensacao'],
  },
  {
    name: 'BOLINHAS SEXY POP MORANGO C/ CHAMPANHE',
    description: 'Bolinhas Sexy Pop sabor Morango com Champanhe — uma combinação sofisticada e sensual que transforma os beijos em uma experiência premium. O efeito pop efervescente combinado com o toque borbulhante do champanhe é simplesmente irresistível.',
    benefits: '• Sabor morango com champanhe — sofisticado e sedutor\n• Efeito pop efervescente exclusivo\n• Comestível e seguro para uso íntimo\n• Experiência premium nos beijos\n• Embalagem elegante e discreta',
    howToUse: 'Coloque a bolinha na boca antes dos beijos. Aprecie o efeito borbulhante e o sabor incrível.',
    searchTags: ['bolinhas pop', 'morango', 'champanhe', 'efervescente', 'premium', 'beijos'],
  },
  {
    name: 'BOLINHAS SEXY POP SENSAÇÃO',
    description: 'Bolinhas Sexy Pop Sensação com efeito efervescente intenso para amplificar as sensações dos beijos íntimos. A fórmula especial de "sensação" proporciona um toque estimulante que vai além do sabor.',
    benefits: '• Efeito pop e sensação estimulante especial\n• Intensifica as sensações durante os beijos\n• Comestível e seguro para uso íntimo\n• Fórmula diferenciada de "sensação"\n• Embalagem discreta e prática',
    howToUse: 'Coloque na boca antes dos beijos íntimos e sinta a diferença das bolinhas estimulantes.',
    searchTags: ['bolinhas pop', 'sensacao', 'efervescente', 'estimulante', 'beijos', 'comestivel'],
  },
  {
    name: 'BOLINHAS SEXY POP UVA',
    description: 'Bolinhas Sexy Pop sabor Uva com efeito efervescente para beijos intensos e prazerosos. O sabor adocicado da uva combinado com o efeito pop cria momentos únicos e deliciosos.',
    benefits: '• Sabor uva adocicado e refrescante\n• Efeito pop efervescente que estoura na boca\n• Comestível e seguro para uso íntimo\n• Sensação diferenciada e estimulante\n• Embalagem prática e discreta',
    howToUse: 'Coloque uma bolinha na boca e use durante os beijos. Sinta o sabor de uva e o efeito efervescente especial.',
    searchTags: ['bolinhas pop', 'uva', 'efervescente', 'comestivel', 'beijos', 'sabor'],
  },
  {
    name: 'BOLINHAS SEXY VIBER MORANGO',
    description: 'Bolinhas Sexy Viber sabor Morango com efeito vibrador e estimulante para intensificar os beijos e carícias. A sensação vibrante das bolinhas combinada com o sabor de morango é simplesmente viciante.',
    benefits: '• Efeito vibrante e estimulante especial\n• Sabor morango irresistível\n• Comestível e seguro para uso íntimo\n• Amplifica as sensações durante os beijos\n• Embalagem discreta e conveniente',
    howToUse: 'Coloque a bolinha na boca e use durante os beijos íntimos para sentir o efeito vibrante.',
    searchTags: ['bolinhas viber', 'morango', 'vibrante', 'estimulante', 'beijos', 'sensacao'],
  },
  {
    name: 'Bolinhas Excitantes 50 Unidades',
    description: 'Kit com 50 bolinhas excitantes para momentos de prazer intenso e prolongado. Embalagem econômica ideal para quem quer sempre ter à mão uma forma prática e divertida de intensificar os momentos íntimos.',
    benefits: '• Kit econômico com 50 unidades\n• Efeito excitante e estimulante\n• Sabor agradável para os beijos\n• Comestíveis e seguros para uso íntimo\n• Embalagem discreta com fácil armazenamento',
    howToUse: 'Use as bolinhas durante os beijos e carícias íntimas. São comestíveis. Armazene em local fresco e seco após abrir.',
    searchTags: ['bolinhas excitantes', 'kit 50 unidades', 'estimulante', 'comestivel', 'beijos'],
  },
  {
    name: 'Hot Ball Plus Conforto',
    description: 'Hot Ball Plus Conforto — bolinha excitante com efeito de calor suave para intensificar as sensações durante o sexo oral e beijos íntimos. O efeito hot proporciona um toque de calor irresistível que eleva o prazer a outro nível.',
    benefits: '• Efeito hot — calor suave e estimulante\n• Intensifica o prazer durante o sexo oral\n• Fórmula conforto com sensação prolongada\n• Comestível e seguro para uso íntimo\n• Embalagem prática e discreta',
    howToUse: 'Coloque na boca antes dos beijos e sexo oral. Sinta o efeito de calor se intensificar. É comestível.',
    searchTags: ['hot ball', 'bolinha hot', 'efeito calor', 'estimulante', 'oral', 'beijos'],
  },

  // ── SATISFACTION CAPS ──────────────────────────────────────────────────────

  {
    name: 'Satisfaction Caps Babaluu Moranguinho',
    description: 'Cápsula Satisfaction sabor Moranguinho da linha Babaluu — produto estimulante em cápsula para uso íntimo que intensifica as sensações com efeito excitante e sabor irresistível. Prático, discreto e altamente eficaz.',
    benefits: '• Sabor moranguinho delicioso e irresistível\n• Efeito estimulante de ação rápida\n• Formato cápsula — prático e higiênico\n• Intensifica as sensações íntimas\n• Embalagem discreta',
    howToUse: 'Aplique conforme indicação da embalagem na região íntima. Lave com água após o uso.',
    searchTags: ['satisfaction caps', 'babaluu', 'moranguinho', 'capsula', 'estimulante', 'intimo'],
  },
  {
    name: 'Satisfaction Caps Caipirinha',
    description: 'Cápsula Satisfaction sabor Caipirinha — estimulante íntimo em cápsula com o sabor refrescante e marcante da caipirinha. Produto desenvolvido para intensificar o prazer e tornar os momentos íntimos ainda mais deliciosos.',
    benefits: '• Sabor autêntico de caipirinha\n• Estimulante de ação rápida\n• Formato cápsula — prático e higiênico\n• Intensifica as sensações\n• Embalagem discreta e conveniente',
    howToUse: 'Use conforme indicação da embalagem. Lave com água após o uso.',
    searchTags: ['satisfaction caps', 'caipirinha', 'capsula', 'estimulante', 'intimo'],
  },
  {
    name: 'Satisfaction Caps Hot Redbull',
    description: 'Cápsula Satisfaction sabor Hot Redbull — combinação energizante e excitante para quem quer mais energia e prazer nos momentos íntimos. Produto estimulante com o sabor característico de energético que desperta os sentidos.',
    benefits: '• Sabor energético Red Bull — estimulante e marcante\n• Efeito hot que aquece e intensifica as sensações\n• Formato cápsula higiênico e prático\n• Ação rápida\n• Embalagem discreta',
    howToUse: 'Use conforme indicado na embalagem. Lave a região com água após o uso.',
    searchTags: ['satisfaction caps', 'hot', 'redbull', 'energetico', 'estimulante', 'capsula'],
  },
  {
    name: 'Satisfaction Caps Smirnfuck',
    description: 'Cápsula Satisfaction sabor Smirnfuck — inspirada no clássico drink Smirnoff Ice, esta cápsula estimulante traz o sabor marcante e intenso para os seus momentos íntimos. Produto excitante de ação rápida.',
    benefits: '• Sabor Smirnoff Ice — marcante e intenso\n• Efeito estimulante de ação rápida\n• Formato cápsula prático e higiênico\n• Intensifica as sensações\n• Embalagem discreta',
    howToUse: 'Aplique conforme indicação da embalagem. Lave com água após o uso.',
    searchTags: ['satisfaction caps', 'smirnfuck', 'smirnoff', 'drink', 'capsula', 'estimulante'],
  },
  {
    name: 'Satisfaction Caps Tequila',
    description: 'Cápsula Satisfaction sabor Tequila para quem gosta de intensidade. O sabor característico da tequila transforma os momentos íntimos em uma experiência ousada e memorável. Produto estimulante de ação rápida.',
    benefits: '• Sabor tequila — intenso e marcante\n• Efeito estimulante de ação rápida\n• Formato cápsula higiênico e prático\n• Para quem gosta de intensidade\n• Embalagem discreta',
    howToUse: 'Use conforme indicação da embalagem. Lave com água após o uso.',
    searchTags: ['satisfaction caps', 'tequila', 'capsula', 'estimulante', 'intimo', 'intenso'],
  },
  {
    name: 'Satisfaction Caps Viber Chocolate Avela',
    description: 'Cápsula Satisfaction Viber sabor Chocolate Avelã — estimulante íntimo em cápsula com o sabor irresistível de chocolate com avelã. Efeito vibrante e excitante que torna os momentos a dois ainda mais deliciosos.',
    benefits: '• Sabor chocolate com avelã — irresistível e gostoso\n• Efeito vibrante e estimulante\n• Formato cápsula prático e higiênico\n• Amplifica as sensações durante as carícias\n• Embalagem discreta',
    howToUse: 'Aplique conforme indicação da embalagem. Lave com água após o uso.',
    searchTags: ['satisfaction caps', 'viber', 'chocolate', 'avela', 'capsula', 'estimulante'],
  },

  // ── MASTURBADORES EGG ──────────────────────────────────────────────────────

  {
    name: 'EGG Silky',
    description: 'Masturbador EGG Silky com textura macia e sedosa para estimulação intensa e prazer solo. Material elástico que se adapta a qualquer tamanho. Experiência sensorial única — discreto, de fácil uso e transporte.',
    benefits: '• Textura silky — suave e estimulante ao máximo\n• Material elástico que se expande\n• Discreto e de fácil transporte\n• Ideal para prazer solo ou a dois\n• Fácil de usar e higienizar',
    howToUse: 'Aplique lubrificante à base de água no interior do EGG. Introduza suavemente e use com movimentos rítmicos. Lave com água e sabão neutro após o uso.',
    searchTags: ['egg', 'masturbador', 'silky', 'estimulador masculino', 'prazer solo', 'elastico'],
  },
  {
    name: 'Masturbador EGG Stepper Rosa',
    description: 'Masturbador EGG Stepper na cor rosa com textura em degraus para estimulação progressiva e intensa. Material ultra-elástico que se adapta perfeitamente. Uma experiência de prazer solo incomparável.',
    benefits: '• Textura stepper em degraus — estimulação progressiva\n• Material ultra-elástico e adaptável\n• Cor rosa vibrante e diferenciada\n• Prazer intenso e controlado\n• Discreto e de fácil transporte',
    howToUse: 'Aplique lubrificante à base de água no interior. Introduza e use com movimentos de vai e vem. Lave com água e sabão neutro após o uso.',
    searchTags: ['egg', 'masturbador', 'stepper', 'rosa', 'estimulacao progressiva', 'prazer solo'],
  },
  {
    name: 'Masturbador EGG Twister Laranja',
    description: 'Masturbador EGG Twister na cor laranja com canais internos em espiral para uma estimulação rotativa e intensa. Material elástico de alta qualidade para uma experiência única de prazer.',
    benefits: '• Textura twister em espiral — sensação rotativa intensa\n• Material elástico de alta qualidade\n• Cor laranja vibrante\n• Estimulação diferenciada e intensa\n• Discreto e prático',
    howToUse: 'Aplique lubrificante à base de água. Introduza com cuidado e realize movimentos de rotação para aproveitar ao máximo a textura twister. Lave após o uso.',
    searchTags: ['egg', 'masturbador', 'twister', 'laranja', 'espiral', 'rotativo', 'prazer solo'],
  },
  {
    name: 'Masturbador EGG Wavy Roxo',
    description: 'Masturbador EGG Wavy na cor roxa com textura ondulada para uma experiência de estimulação suave e prazerosa. Material super-elástico que se molda com precisão para o máximo prazer.',
    benefits: '• Textura wavy ondulada — suave e prazerosa\n• Material super-elástico e confortável\n• Cor roxa marcante e diferenciada\n• Estimulação consistente e prazerosa\n• Discreto e fácil de transportar',
    howToUse: 'Aplique lubrificante à base de água no interior do EGG. Introduza e aproveite a textura ondulada com movimentos rítmicos. Lave com água e sabão após o uso.',
    searchTags: ['egg', 'masturbador', 'wavy', 'roxo', 'ondulado', 'prazer solo'],
  },
  {
    name: 'UMIDIFICADOR EGG',
    description: 'Umidificador EGG — produto específico para manter seu masturbador EGG hidratado e na textura ideal entre os usos. Prolonga a vida útil do EGG e garante sempre a melhor experiência.',
    benefits: '• Mantém o EGG hidratado e na textura perfeita\n• Prolonga a vida útil do masturbador\n• Fácil de usar\n• Produto essencial para cuidar do seu EGG\n• Embalagem prática',
    howToUse: 'Aplique o umidificador na superfície interna e externa do EGG após lavar e secar. Deixe agir antes do próximo uso.',
    searchTags: ['umidificador', 'egg', 'masturbador', 'cuidados', 'manutencao', 'higienizacao'],
  },

  // ── MAGICAL KISS CAPSULE ───────────────────────────────────────────────────

  {
    name: 'Magical Kiss Capsule Silky',
    description: 'Magical Kiss Capsule Silky — cápsula estimulante com textura silky para beijos e carícias extraordinárias. Fórmula especial que transforma cada contato em uma experiência suave, sedosa e repleta de prazer.',
    benefits: '• Efeito silky — sensação suave e sedosa\n• Estimula os sentidos durante os beijos\n• Fórmula especial de ação rápida\n• Prático e higiênico\n• Embalagem discreta',
    howToUse: 'Aplique conforme indicação na embalagem. Use antes dos beijos íntimos para intensificar as sensações.',
    searchTags: ['magical kiss', 'capsule', 'silky', 'estimulante', 'beijos', 'sensacao'],
  },
  {
    name: 'Magical Kiss Capsule Spider',
    description: 'Magical Kiss Capsule Spider — cápsula estimulante com efeito teia de aranha que cria uma sensação única e envolvente durante os beijos e carícias. Produto especial para quem busca experiências sensuais diferenciadas.',
    benefits: '• Efeito spider — sensação envolvente e única\n• Estimulação diferenciada durante os beijos\n• Fórmula especial de ação rápida\n• Prático e higiênico\n• Embalagem discreta',
    howToUse: 'Aplique conforme indicação na embalagem para potencializar os beijos íntimos.',
    searchTags: ['magical kiss', 'capsule', 'spider', 'estimulante', 'beijos', 'sensacao especial'],
  },
  {
    name: 'Magical Kiss Capsule Stepper',
    description: 'Magical Kiss Capsule Stepper — cápsula estimulante com efeito progressivo para beijos e carícias que se intensificam a cada momento. Fórmula de ação crescente para o prazer que não para.',
    benefits: '• Efeito stepper — prazer progressivo e crescente\n• Intensificação gradual das sensações\n• Fórmula de ação rápida\n• Prático e higiênico\n• Embalagem discreta',
    howToUse: 'Aplique conforme indicação da embalagem. Sinta as sensações aumentando progressivamente.',
    searchTags: ['magical kiss', 'capsule', 'stepper', 'progressivo', 'estimulante', 'beijos'],
  },
  {
    name: 'Magical Kiss Capsule Twister',
    description: 'Magical Kiss Capsule Twister — cápsula estimulante com efeito rotativo e envolvente para beijos que giram de prazer. A sensação twister cria um efeito único e irresistível durante as carícias íntimas.',
    benefits: '• Efeito twister rotativo — sensação envolvente\n• Estimulação diferenciada e intensa\n• Fórmula de ação rápida\n• Prático e higiênico\n• Embalagem discreta',
    howToUse: 'Aplique conforme indicação da embalagem para sentir o efeito twister durante os beijos.',
    searchTags: ['magical kiss', 'capsule', 'twister', 'rotativo', 'estimulante', 'beijos'],
  },
  {
    name: 'Magical Kiss Capsule Wavy',
    description: 'Magical Kiss Capsule Wavy — cápsula estimulante com efeito ondulado para beijos e carícias suaves e prazerosas. A sensação wavy proporciona um toque suave e estimulante que eleva cada momento a outro patamar.',
    benefits: '• Efeito wavy ondulado — suave e estimulante\n• Sensação prazerosa e diferenciada\n• Fórmula de ação rápida\n• Prático e higiênico\n• Embalagem discreta',
    howToUse: 'Aplique conforme indicação da embalagem. Use antes dos beijos para sentir o efeito ondulado.',
    searchTags: ['magical kiss', 'capsule', 'wavy', 'ondulado', 'suave', 'estimulante', 'beijos'],
  },

  // ── ANÉIS PENIANOS ─────────────────────────────────────────────────────────

  {
    name: 'Anel Peniano Rosa de Orelha',
    description: 'Anel peniano com design de orelha na cor rosa para estimulação dupla do casal durante a penetração. O detalhe da orelha posicionado acima estimula simultaneamente o clitóris, intensificando o prazer dos dois. Material macio e elástico.',
    benefits: '• Estimulação dupla — prazer simultâneo para os dois\n• Design de orelha para estimulação clitoriana\n• Material macio e elástico — confortável\n• Aumenta a firmeza e retarda a ejaculação\n• Fácil de usar e higienizar',
    howToUse: 'Aplique lubrificante à base de água. Encaixe no pênis ereto. Posicione a orelha para cima durante a penetração para estimular o clitóris. Lave com água e sabão após o uso.',
    searchTags: ['anel peniano', 'orelha', 'rosa', 'estimulacao dupla', 'clitoris', 'casal'],
  },
  {
    name: 'Anel Peniano Roxo de Orelha',
    description: 'Anel peniano com design de orelha na cor roxa para prazer a dois durante a penetração. O formato especial da orelha estimula o clitóris enquanto o anel mantém a firmeza e intensidade da penetração.',
    benefits: '• Estimulação dupla com design de orelha\n• Material macio e elástico na cor roxa\n• Estimula o clitóris durante a penetração\n• Melhora a performance e o prazer\n• Fácil de usar e higienizar',
    howToUse: 'Encaixe no pênis ereto com o detalhe de orelha voltado para cima. Use lubrificante à base de água. Lave após o uso.',
    searchTags: ['anel peniano', 'orelha', 'roxo', 'estimulacao dupla', 'clitoris', 'casal'],
  },
  {
    name: 'Anel Peniano Sexy Bolinha Preto',
    description: 'Anel peniano com texturas de bolinhas na cor preta para estimulação extra durante a penetração. As bolinhas ao redor do anel criam friccões deliciosas que intensificam o prazer dos dois. Material flexível e resistente.',
    benefits: '• Textura de bolinhas para estimulação extra\n• Cor preta elegante e sensual\n• Material flexível e confortável\n• Intensifica o prazer durante a penetração\n• Melhora a firmeza e a performance',
    howToUse: 'Encaixe no pênis ereto com lubrificante à base de água. As bolinhas ficam posicionadas para estimular durante a penetração. Lave após o uso.',
    searchTags: ['anel peniano', 'bolinha', 'preto', 'textura', 'estimulacao', 'casal'],
  },
  {
    name: 'Anel Peniano Sexy Bolinha Rosa',
    description: 'Anel peniano com texturas de bolinhas na cor rosa para mais prazer e estimulação durante a penetração. Design delicado e eficiente que proporciona sensações extras tanto para quem usa quanto para o parceiro.',
    benefits: '• Textura de bolinhas estimulantes\n• Cor rosa delicada e atraente\n• Material macio, elástico e confortável\n• Estimulação adicional durante a penetração\n• Fácil de colocar e retirar',
    howToUse: 'Aplique lubrificante à base de água e encaixe no pênis ereto. As bolinhas proporcionam estimulação durante o uso. Higienize com água e sabão após.',
    searchTags: ['anel peniano', 'bolinha', 'rosa', 'textura', 'estimulacao', 'casal'],
  },
  {
    name: 'Anel Peniano Sexy Bolinha Transparente',
    description: 'Anel peniano com texturas de bolinhas transparente — discreto, elegante e altamente eficaz para estimulação durante a penetração. A cor transparente é neutra e o efeito das bolinhas é o destaque.',
    benefits: '• Textura de bolinhas para estimulação intensa\n• Cor transparente discreta e neutra\n• Material elástico de alta qualidade\n• Aumenta o prazer durante a penetração\n• Versátil e confortável',
    howToUse: 'Encaixe no pênis ereto com lubrificante à base de água. Posicione as bolinhas para estimulação máxima. Higienize após o uso.',
    searchTags: ['anel peniano', 'bolinha', 'transparente', 'textura', 'estimulacao', 'casal'],
  },
  {
    name: 'Anel Peniano Sexy Ursinho Preto',
    description: 'Anel peniano com design divertido e sensual de ursinho na cor preta. O formato do ursinho foi planejado para estimular o clitóris durante a penetração, tornando o momento ainda mais prazeroso para os dois.',
    benefits: '• Design ursinho — divertido e estimulante\n• Estimulação clitoriana durante a penetração\n• Cor preta elegante e sensual\n• Material macio e confortável\n• Prazer duplo para o casal',
    howToUse: 'Aplique lubrificante à base de água. Encaixe no pênis ereto com o ursinho posicionado para cima. Higienize após o uso.',
    searchTags: ['anel peniano', 'ursinho', 'preto', 'estimulacao clitoris', 'casal', 'design'],
  },
  {
    name: 'Anel Peniano Sexy Ursinho Transp.',
    description: 'Anel peniano com design de ursinho transparente — o charme do ursinho com a discrição da cor neutra. Estimula o clitóris durante a penetração para um prazer compartilhado mais intenso.',
    benefits: '• Design ursinho divertido e estimulante\n• Cor transparente discreta\n• Estimulação clitoriana durante a penetração\n• Material macio e elástico\n• Prazer a dois de verdade',
    howToUse: 'Encaixe no pênis ereto com lubrificante à base de água. Posicione o ursinho para cima durante o uso. Higienize após o uso.',
    searchTags: ['anel peniano', 'ursinho', 'transparente', 'estimulacao clitoris', 'casal'],
  },
  {
    name: 'Lone Anel Gel',
    description: 'Anel peniano Lone Gel — anel em gel macio e flexível para uso confortável e prolongado. Material de gel de alta qualidade que se adapta com facilidade e proporciona estimulação tanto para quem usa quanto para o parceiro.',
    benefits: '• Material gel ultra-macio e flexível\n• Alta adaptabilidade a diferentes tamanhos\n• Estimulação durante a penetração\n• Confortável para uso prolongado\n• Fácil higienização',
    howToUse: 'Aplique lubrificante à base de água. Encaixe no pênis ereto com cuidado. Higienize com água e sabão neutro após cada uso.',
    searchTags: ['anel peniano', 'gel', 'lone', 'macio', 'estimulacao', 'elastico'],
  },

  // ── MINI BULLET / VIBRADOR ─────────────────────────────────────────────────

  {
    name: 'Mini Bullet Duplo Linguinha Roxo',
    description: 'Mini Bullet Duplo com ponteira em formato de linguinha na cor roxa para estimulação precisa do clitóris e pontos erógenos. Dupla função: dois motores de vibração para prazer intensificado. Design compacto e discreto.',
    benefits: '• Formato linguinha para estimulação precisa\n• Dupla vibração — dois motores simultâneos\n• Cor roxa elegante e sensual\n• Compacto, discreto e silencioso\n• Múltiplas velocidades para personalizar o prazer',
    howToUse: 'Use com lubrificante à base de água. Ligue e selecione a intensidade desejada. Aplique nas regiões erógenas. Lave com água e sabão após o uso.',
    searchTags: ['bullet', 'mini bullet', 'linguinha', 'roxo', 'clitoris', 'vibrador', 'estimulador'],
  },
  {
    name: 'Mini Bullet Duplo Rosa Ponta Fina',
    description: 'Mini Bullet Duplo com ponta fina na cor rosa para estimulação precisa e intensa. O design de ponta fina permite alcançar exatamente os pontos certos para o máximo prazer. Dois motores para vibração dupla.',
    benefits: '• Ponta fina para estimulação pontual e precisa\n• Dupla vibração simultânea\n• Cor rosa delicada e atraente\n• Compacto, silencioso e discreto\n• Velocidades ajustáveis',
    howToUse: 'Aplique lubrificante à base de água. Ligue e direcione a ponta fina para as regiões desejadas. Higienize com água e sabão após o uso.',
    searchTags: ['bullet', 'mini bullet', 'ponta fina', 'rosa', 'vibrador', 'estimulador', 'clitoris'],
  },
  {
    name: 'Mini Bullet Duplo Vibrador Rosa',
    description: 'Mini Bullet Duplo Vibrador rosa com dois pontos de vibração para estimulação múltipla e intensa. Design ergonômico que se adapta ao corpo e proporciona prazer preciso e satisfatório.',
    benefits: '• Duplo vibrador — dois pontos de estimulação\n• Design ergonômico e confortável\n• Cor rosa vibrante e delicada\n• Compacto e fácil de usar\n• Vibração intensa e silenciosa',
    howToUse: 'Use com lubrificante à base de água. Ligue, selecione a velocidade e aplique nas regiões erógenas. Higienize após o uso.',
    searchTags: ['bullet', 'mini bullet', 'duplo', 'rosa', 'vibrador', 'estimulador'],
  },
  {
    name: 'Vibrador Golfinho Rosa',
    description: 'Vibrador em formato de golfinho com estimulação dupla para clitóris e penetração simultânea. Design adorável e funcional com múltiplas velocidades para personalizar o prazer. Material macio e fácil de higienizar.',
    benefits: '• Estimulação dupla — penetração e clitóris ao mesmo tempo\n• Design de golfinho — divertido e ergonômico\n• Múltiplas velocidades ajustáveis\n• Material macio e corporal\n• Silencioso para uso discreto',
    howToUse: 'Use com lubrificante à base de água. Ligue e selecione a velocidade. Posicione o nariz do golfinho no clitóris durante a penetração para estimulação dupla. Higienize após o uso.',
    searchTags: ['vibrador', 'golfinho', 'rosa', 'estimulacao dupla', 'clitoris', 'penetracao'],
  },
  {
    name: 'VIBRADOR SEXY',
    description: 'Vibrador Sexy para estimulação clitoriana e penetração, com múltiplas velocidades e design compacto e ergonômico. Produto de qualidade para quem busca prazer intenso e confiável.',
    benefits: '• Múltiplas velocidades de vibração\n• Design ergonômico e confortável\n• Material macio e de fácil higienização\n• Versátil para estimulação clitoriana e penetração\n• Silencioso e discreto',
    howToUse: 'Use com lubrificante à base de água. Selecione a velocidade desejada. Higienize com água e sabão neutro antes e após cada uso.',
    searchTags: ['vibrador', 'sexy', 'estimulacao', 'clitoris', 'multiplas velocidades'],
  },
  {
    name: 'Vibrador Sexy com Controle Rosa',
    description: 'Vibrador Sexy com controle remoto na cor rosa — liberdade e prazer com a praticidade do controle. Ideal para momentos a dois ou solo, com o parceiro controlando as intensidades à distância.',
    benefits: '• Controle remoto para prazer sem limites\n• Múltiplas velocidades e padrões de vibração\n• Cor rosa elegante e feminina\n• Ideal para brincadeiras a dois\n• Design ergonômico e confortável',
    howToUse: 'Conecte o vibrador ao controle e use com lubrificante à base de água. O parceiro pode controlar a distância. Higienize após o uso.',
    searchTags: ['vibrador', 'controle remoto', 'rosa', 'casal', 'prazer', 'estimulador'],
  },

  // ── DESODORANTES ÍNTIMOS ───────────────────────────────────────────────────

  {
    name: 'Desodorante Íntimo Doce Paixão',
    description: 'Desodorante íntimo Doce Paixão com fragrância suave e sedutora para a região íntima. Proporciona frescor, higiene e um aroma irresistível que aumenta a confiança nos momentos mais especiais.',
    benefits: '• Fragrância Doce Paixão — suave e sedutora\n• Frescor prolongado na região íntima\n• Higiene e confiança para os momentos especiais\n• Fórmula delicada para pele sensível\n• Embalagem prática para uso diário',
    howToUse: 'Aplique diretamente na região íntima limpa e seca. Use diariamente ou antes dos momentos especiais.',
    searchTags: ['desodorante intimo', 'doce paixao', 'higiene intima', 'frescor', 'feminino'],
  },
  {
    name: 'Desodorante Íntimo Morango',
    description: 'Desodorante íntimo sabor/fragrância Morango para frescor e leveza na região íntima. O aroma adocicado de morango proporciona uma sensação deliciosa de limpeza e confiança para os momentos especiais.',
    benefits: '• Fragrância morango — doce e irresistível\n• Frescor duradouro\n• Higiene íntima de qualidade\n• Fórmula suave para pele sensível\n• Embalagem prática e discreta',
    howToUse: 'Aplique na região íntima limpa e seca. Ideal para uso diário e antes dos momentos íntimos.',
    searchTags: ['desodorante intimo', 'morango', 'higiene intima', 'frescor', 'sabor', 'feminino'],
  },
  {
    name: 'Desodorante Íntimo Tutti Frutti',
    description: 'Desodorante íntimo fragrância Tutti Frutti — o aroma frutal e alegre que deixa a região íntima com frescor, leveza e uma fragrância irresistível. Produto essencial para quem cuida da higiene íntima com estilo.',
    benefits: '• Fragrância tutti frutti — frutal e alegre\n• Frescor e higiene duradouros\n• Fórmula suave para pele sensível\n• Aumenta a confiança nos momentos íntimos\n• Embalagem prática para uso diário',
    howToUse: 'Aplique na região íntima limpa e seca. Use diariamente para frescor prolongado.',
    searchTags: ['desodorante intimo', 'tutti frutti', 'higiene intima', 'frescor', 'frutal', 'feminino'],
  },

  // ── GÉIS ESPECIAIS E ESTIMULANTES ─────────────────────────────────────────

  {
    name: 'Anis Sex Gel',
    description: 'Gel estimulante Anis Sex com aroma e propriedades do anis para uma experiência íntima diferenciada. Fórmula especial que intensifica as sensações durante os momentos a dois com um toque único e marcante.',
    benefits: '• Efeito estimulante com aroma de anis\n• Intensifica as sensações íntimas\n• Fórmula segura e testada\n• Embalagem discreta e prática\n• Ação rápida',
    howToUse: 'Aplique uma pequena quantidade na região íntima e massageie suavemente. Lave com água após o uso.',
    searchTags: ['gel estimulante', 'anis', 'sex gel', 'intimo', 'sensacao'],
  },
  {
    name: 'Anosex Gel',
    description: 'Gel Anosex especialmente formulado para estimulação anal, com efeito relaxante e lubrificante para uma experiência mais confortável e prazerosa. Fórmula desenvolvida para facilitar e intensificar o prazer anal.',
    benefits: '• Fórmula especial para estimulação anal\n• Efeito relaxante e lubrificante\n• Aumenta o conforto durante o ato\n• Textura adequada para uso anal\n• Embalagem discreta e prática',
    howToUse: 'Aplique generosamente na região anal antes do ato. Para maior conforto, aguarde alguns minutos para o efeito relaxante agir. Higienize após o uso.',
    searchTags: ['gel anal', 'anosex', 'lubrificante anal', 'relaxante', 'conforto'],
  },
  {
    name: 'Beijo Adormecida Loka Sensacao',
    description: 'Gel Beijo Adormecida Loka Sensação com efeito anestésico leve para beijos e sexo oral mais confortáveis e prazerosos. A sensação única de adormecer levemente amplia o prazer e proporciona experiências inesquecíveis.',
    benefits: '• Efeito anestésico leve — beijos mais longos e prazerosos\n• Sensação única de leve adormecimento\n• Perfeito para sexo oral\n• Fórmula segura e testada\n• Embalagem discreta',
    howToUse: 'Aplique na região dos lábios ou boca antes do sexo oral. Aguarde o efeito se manifestar. Não ingerir em grandes quantidades.',
    searchTags: ['gel beijo', 'adormecida', 'anestesico', 'oral', 'sensacao', 'estimulante'],
  },
  {
    name: 'BEIJO FRESH',
    description: 'Gel Beijo Fresh com efeito refrescante e gelado para beijos e sexo oral. O frescor intenso do gel transforma cada beijo em uma experiência inesquecível, estimulando os sentidos e intensificando o prazer.',
    benefits: '• Efeito fresh — frescor intenso e imediato\n• Perfeito para beijos e sexo oral\n• Sensação gelada que estimula os sentidos\n• Fórmula segura e testada\n• Embalagem discreta e prática',
    howToUse: 'Aplique uma pequena quantidade nos lábios ou na boca antes dos beijos. Sinta o efeito refrescante imediato.',
    searchTags: ['gel beijo', 'fresh', 'gelado', 'refrescante', 'oral', 'estimulante'],
  },
  {
    name: 'BEIJO FRESH UVA',
    description: 'Gel Beijo Fresh sabor Uva com efeito refrescante e gelado para beijos deliciosos. O sabor suave de uva combinado com o frescor do gel cria uma experiência única e irresistível para os momentos íntimos.',
    benefits: '• Sabor uva suave e refrescante\n• Efeito gelado intenso durante os beijos\n• Comestível e seguro para uso íntimo\n• Sensação diferenciada e estimulante\n• Embalagem prática',
    howToUse: 'Aplique nos lábios ou na boca antes dos beijos e sexo oral. Sinta o frescor e o sabor de uva.',
    searchTags: ['gel beijo', 'fresh', 'uva', 'gelado', 'comestivel', 'beijos'],
  },
  {
    name: 'Beijo Grego Gel',
    description: 'Gel Beijo Grego especialmente formulado para estimulação anal oral. Produto desenvolvido para tornar o beijo grego mais prazeroso e confortável, com aroma e sabor agradáveis para ambos os parceiros.',
    benefits: '• Fórmula especial para beijo grego\n• Aroma e sabor agradáveis\n• Aumenta o conforto e o prazer\n• Produto seguro e testado\n• Embalagem discreta',
    howToUse: 'Aplique generosamente na região anal antes do beijo grego. O produto é seguro para uso oral.',
    searchTags: ['beijo grego', 'gel anal', 'oral', 'estimulante', 'conforto'],
  },
  {
    name: 'Bg Hot Baba Loob Bala Gel',
    description: 'Gel Bg Hot Baba Loob Bala com efeito de calor e estimulação intensa para os momentos mais ousados. Fórmula hot que aquece a região íntima e amplifica cada toque, tornando o prazer impossível de ignorar.',
    benefits: '• Efeito hot — calor estimulante imediato\n• Intensifica as sensações íntimas\n• Fórmula especial de ação rápida\n• Embalagem discreta\n• Seguro e testado',
    howToUse: 'Aplique uma pequena quantidade na região íntima e massageie suavemente. Sinta o calor se intensificar. Lave com água após o uso.',
    searchTags: ['gel hot', 'baba loob', 'bala gel', 'calor', 'estimulante', 'intimo'],
  },
  {
    name: 'Creme Adstringente Sexy — Close Love 15g',
    description: 'Creme adstringente Sexy Close Love 15g para sensação de firmeza e aperto durante os momentos íntimos. Fórmula especial que proporciona uma sensação de virgindade renovada, intensificando o prazer para ambos os parceiros.',
    benefits: '• Efeito adstringente — sensação de aperto e firmeza\n• Renova a sensação de virgindade\n• Intensifica o prazer para os dois\n• Fórmula de 15g de ação eficaz\n• Embalagem discreta e prática',
    howToUse: 'Aplique uma pequena quantidade na região íntima e massageie delicadamente antes do ato. Higienize após o uso.',
    searchTags: ['creme adstringente', 'close love', 'virgindade', 'firmeza', 'aperto', 'estimulante'],
  },
  {
    name: 'Dando uma Gostoso Gel',
    description: 'Gel Dando uma Gostoso com efeito excitante e estimulante para o mais puro prazer íntimo. O nome diz tudo — fórmula desenvolvida para fazer cada momento valer a pena, com ação rápida e sensações marcantes.',
    benefits: '• Efeito excitante de ação rápida\n• Intensifica as sensações íntimas\n• Fórmula especial para máximo prazer\n• Embalagem discreta\n• Seguro e testado',
    howToUse: 'Aplique na região íntima e massageie suavemente. Sinta o efeito se intensificar com o uso. Lave com água após o uso.',
    searchTags: ['gel estimulante', 'dando uma gostoso', 'excitante', 'intimo', 'prazer'],
  },
  {
    name: 'Excita Femme Cream Lub',
    description: 'Excita Femme Cream Lub — creme lubrificante excitante especialmente desenvolvido para a mulher. Fórmula que aumenta a lubrificação natural, amplifica a sensibilidade e torna cada toque ainda mais delicioso.',
    benefits: '• Fórmula feminina — desenvolvida especialmente para elas\n• Aumenta a lubrificação natural\n• Amplifica a sensibilidade durante o ato\n• Textura creme confortável e prazerosa\n• Embalagem discreta',
    howToUse: 'Aplique o creme lubrificante na região íntima feminina e massageie suavemente. Higienize após o uso.',
    searchTags: ['creme excitante', 'excita femme', 'lubrificante feminino', 'sensibilidade', 'feminino'],
  },
  {
    name: 'Fofatoba Gel',
    description: 'Gel estimulante Fofatoba com efeito excitante de ação rápida para intensificar as sensações íntimas. Fórmula especial desenvolvida para ampliar o prazer e tornar cada momento inesquecível.',
    benefits: '• Efeito estimulante de ação rápida\n• Fórmula especial para máxima sensação\n• Aumenta a sensibilidade e o prazer\n• Embalagem discreta\n• Fácil aplicação',
    howToUse: 'Aplique uma pequena quantidade na região íntima e massageie suavemente. Lave com água após o uso.',
    searchTags: ['gel estimulante', 'fofatoba', 'excitante', 'intimo', 'sensacao'],
  },
  {
    name: 'GEL BABBALLO FEMININO',
    description: 'Gel Babballo Feminino especialmente desenvolvido para estimular e excitar a mulher. Fórmula com efeito excitante que aumenta a sensibilidade clitoriana e vaginal, potencializando o prazer feminino de forma segura.',
    benefits: '• Fórmula exclusiva para o prazer feminino\n• Aumenta a sensibilidade clitoriana\n• Efeito excitante de ação rápida\n• Seguro e dermatologicamente testado\n• Embalagem discreta e prática',
    howToUse: 'Aplique uma pequena quantidade no clitóris e região vaginal. Massageie suavemente e aguarde o efeito. Lave com água após o uso.',
    searchTags: ['gel feminino', 'babballo', 'excitante', 'clitoris', 'sensibilidade feminina'],
  },
  {
    name: 'GEL KU LOKO SEXY',
    description: 'Gel Ku Loko Sexy com efeito estimulante e excitante para os mais ousados. Fórmula de ação rápida que deixa o clima cada vez mais intenso, tornando cada toque impossível de resistir.',
    benefits: '• Efeito estimulante intenso de ação rápida\n• Fórmula especial para o prazer máximo\n• Aumenta a excitação\n• Embalagem discreta\n• Seguro para uso íntimo',
    howToUse: 'Aplique na região íntima e massageie suavemente para ativar o efeito. Lave com água após o uso.',
    searchTags: ['gel estimulante', 'ku loko', 'sexy', 'excitante', 'intimo'],
  },
  {
    name: 'GEL MASSAGEM SEMPRE VIRGEM',
    description: 'Gel de Massagem Sempre Virgem com efeito adstringente para a sensação de firmeza e renovação íntima. Produto para massagem sensual que ao mesmo tempo proporciona a sensação de renovação e prazer durante os momentos íntimos.',
    benefits: '• Efeito adstringente e renovador\n• Sensação de firmeza e aperto\n• Ideal para massagem sensual íntima\n• Fórmula suave e eficaz\n• Embalagem discreta',
    howToUse: 'Aplique e massageie suavemente na região íntima antes do ato. Higienize após o uso.',
    searchTags: ['gel massagem', 'sempre virgem', 'adstringente', 'firmeza', 'virgindade', 'intimo'],
  },
  {
    name: 'GEL NAPEPEX SEXY',
    description: 'Gel Napepex Sexy com efeito excitante de ação rápida para intensificar as sensações íntimas masculinas. Fórmula desenvolvida para aumentar a performance e o prazer durante os momentos especiais.',
    benefits: '• Efeito excitante focado na performance masculina\n• Ação rápida e eficaz\n• Fórmula especial para máximo prazer\n• Embalagem discreta\n• Seguro para uso íntimo',
    howToUse: 'Aplique uma pequena quantidade na região íntima masculina e massageie. Aguarde o efeito e aproveite.',
    searchTags: ['gel estimulante', 'napepex', 'sexy', 'masculino', 'performance', 'excitante'],
  },
  {
    name: 'GEL XANA LOKA SEXY',
    description: 'Gel Xana Loka Sexy com efeito excitante para a mulher enlouquecer de prazer. Fórmula feminina especial que intensifica cada sensação e deixa os momentos íntimos inesquecíveis.',
    benefits: '• Fórmula especial para o prazer feminino intenso\n• Efeito excitante que enlouquece de prazer\n• Ação rápida e eficaz\n• Embalagem discreta\n• Seguro para uso íntimo',
    howToUse: 'Aplique na região íntima feminina e massageie suavemente. O efeito se intensifica com o tempo. Lave com água após o uso.',
    searchTags: ['gel feminino', 'xana loka', 'sexy', 'excitante', 'prazer feminino', 'intimo'],
  },
  {
    name: 'HIDRATANTE CORPORAL MORANGO NORDESTE',
    description: 'Hidratante corporal sensual sabor/fragrância Morango da linha Nordeste. Creme hidratante com aroma irresistível de morango que nutre a pele e a deixa macia, perfumada e pronta para ser saboreada.',
    benefits: '• Hidratação profunda e duradoura\n• Aroma de morango irresistível\n• Pele macia, suave e perfumada\n• Ideal para massagens sensuais\n• Fórmula que nutre e cuida da pele',
    howToUse: 'Aplique o hidratante pelo corpo, massageie até absorção. Pode ser usado como base para massagens sensuais.',
    searchTags: ['hidratante', 'corporal', 'morango', 'massagem', 'sensual', 'pele'],
  },
  {
    name: 'Hot Ice Gel',
    description: 'Gel Hot Ice com duplo efeito — calor e frio simultâneos para uma experiência íntima sem igual. A sensação que aquece e refresca ao mesmo tempo estimula os nervos e intensifica o prazer de forma única.',
    benefits: '• Efeito duplo hot e ice — calor e frio simultâneos\n• Estimulação sensorial única e intensa\n• Ação rápida e eficaz\n• Fórmula segura e testada\n• Embalagem discreta',
    howToUse: 'Aplique uma pequena quantidade na região íntima e massageie suavemente. Sinta o efeito duplo de calor e frio. Lave com água após o uso.',
    searchTags: ['gel hot ice', 'calor e frio', 'duplo efeito', 'estimulante', 'sensacao'],
  },
  {
    name: 'In Dolor Gel',
    description: 'Gel In Dolor com efeito anestésico leve para reduzir o desconforto e proporcionar mais conforto durante relações anais ou primeiras experiências. Fórmula suave que facilita o ato com segurança e prazer.',
    benefits: '• Efeito anestésico leve para mais conforto\n• Ideal para reduzir desconforto anal\n• Fórmula suave e segura\n• Facilita primeiras experiências\n• Embalagem discreta e prática',
    howToUse: 'Aplique generosamente na região anal antes do ato. Aguarde alguns minutos para o efeito anestésico atuar. Higienize após o uso.',
    searchTags: ['gel anestesico', 'in dolor', 'anal', 'conforto', 'anestesia', 'relaxante'],
  },
  {
    name: 'Intt Lis In Sete Gel Anal',
    description: 'Gel Anal Intt Lis In Sete para máximo conforto e prazer durante o sexo anal. Fórmula especialmente desenvolvida com propriedades lubrificantes e relaxantes para tornar a experiência anal mais prazerosa e segura.',
    benefits: '• Fórmula especial para sexo anal\n• Efeito lubrificante e relaxante\n• Aumenta o conforto durante o ato\n• Textura ideal para uso anal\n• Embalagem discreta e prática',
    howToUse: 'Aplique generosamente na região anal e no objeto que será usado. Para melhor resultado, aguarde o efeito relaxante se manifestar antes do ato. Higienize após o uso.',
    searchTags: ['gel anal', 'intt', 'lubrificante anal', 'relaxante', 'conforto', 'sexo anal'],
  },
  {
    name: 'Intt Ooh Delicia Tutti Frutti',
    description: 'Gel sensorial Intt Ooh Delicia sabor Tutti Frutti para massagens e beijos íntimos deliciosos. A fórmula da Intt com o sabor frutal de tutti-frutti transforma cada toque em uma experiência cheia de sabor e prazer.',
    benefits: '• Sabor tutti-frutti delicioso e irresistível\n• Ideal para massagens sensuais e beijos\n• Comestível e seguro para uso íntimo\n• Textura agradável e não gordurosa\n• Embalagem discreta',
    howToUse: 'Aplique na pele para massagem ou use durante os beijos íntimos. É comestível. Lave com água após o uso.',
    searchTags: ['gel comestivel', 'intt', 'tutti frutti', 'massagem', 'beijos', 'sabor'],
  },
  {
    name: 'Jonumete Gel',
    description: 'Gel estimulante Jonumete com efeito excitante de ação rápida para intensificar as sensações íntimas. Fórmula especial desenvolvida para ampliar o prazer e tornar cada momento mais intenso e satisfatório.',
    benefits: '• Efeito estimulante de ação rápida\n• Fórmula especial para máxima sensação\n• Aumenta a sensibilidade e o prazer\n• Embalagem discreta\n• Fácil aplicação',
    howToUse: 'Aplique uma pequena quantidade na região íntima e massageie suavemente. Lave com água após o uso.',
    searchTags: ['gel estimulante', 'jonumete', 'excitante', 'intimo', 'sensacao'],
  },
  {
    name: 'K-Med Gel Íntimo',
    description: 'K-Med Gel Íntimo — lubrificante íntimo clínico de alta qualidade para hidratação e conforto durante as relações íntimas. Fórmula dermatologicamente testada, pH compatível com a região íntima feminina.',
    benefits: '• Lubrificação eficaz e durável\n• pH compatível com a vagina — saudável e seguro\n• Fórmula dermatologicamente testada\n• Hidrata e alivia o ressecamento íntimo\n• Ideal para mulheres com ressecamento vaginal',
    howToUse: 'Aplique na região íntima ou no parceiro antes do ato. Pode ser usado diariamente para hidratação. Compatível com preservativos de látex.',
    searchTags: ['lubrificante', 'k-med', 'gel intimo', 'hidratante intimo', 'ressecamento', 'clinico'],
  },
  {
    name: 'Kama Sutra Gel',
    description: 'Gel Kama Sutra para momentos de prazer inspirados na arte milenar da sensualidade. Fórmula estimulante que proporciona novas sensações e intensifica o prazer durante as posições mais ousadas do Kama Sutra.',
    benefits: '• Inspirado nas técnicas milenares do Kama Sutra\n• Efeito estimulante para novas sensações\n• Intensifica o prazer em diferentes posições\n• Fórmula segura e prazerosa\n• Embalagem com design sensual',
    howToUse: 'Aplique na região íntima antes ou durante o ato. Pode ser usado para massagem sensual prévia. Lave com água após o uso.',
    searchTags: ['gel kama sutra', 'estimulante', 'sensual', 'massagem', 'prazer'],
  },
  {
    name: 'Love Lub Lubrificante Hot',
    description: 'Love Lub Lubrificante Hot com efeito de calor para uma lubrificação que aquece e excita. O efeito hot combinado com a excelente lubrificação torna o ato mais prazeroso e intenso para ambos.',
    benefits: '• Lubrificação eficaz e duradoura\n• Efeito hot — calor que estimula e excita\n• Perfeito para aumentar o prazer mútuo\n• Fórmula segura e compatível com preservativos\n• Embalagem discreta e prática',
    howToUse: 'Aplique na região íntima ou no preservativo antes do ato. O efeito de calor é ativado com a fricção. Higienize após o uso.',
    searchTags: ['lubrificante', 'love lub', 'hot', 'calor', 'estimulante', 'intimo'],
  },
  {
    name: 'LUB-PLUS GEL15ML',
    description: 'Lub-Plus Gel 15ml — lubrificante íntimo de alta performance em embalagem prática de 15ml. Ideal para manter sempre à mão, com fórmula que proporciona lubrificação eficaz e confortável para qualquer momento.',
    benefits: '• Lubrificação eficaz e duradoura\n• Embalagem compacta de 15ml — leve em qualquer bolsa\n• Fórmula segura para uso íntimo regular\n• Compatível com preservativos de látex\n• Sem cheiro e sem cor — invisível no uso',
    howToUse: 'Aplique a quantidade desejada na região íntima ou no preservativo. Compatível com todos os tipos de preservativo. Higienize após o uso.',
    searchTags: ['lubrificante', 'lub plus', 'gel', '15ml', 'intimo', 'preservativo'],
  },
  {
    name: 'Max Men Intense',
    description: 'Max Men Intense — gel estimulante masculino de alta performance para potencializar a ereção e o prazer. Fórmula desenvolvida especialmente para homens que buscam mais intensidade, firmeza e duração nos momentos íntimos.',
    benefits: '• Fórmula masculina — potencializa a ereção\n• Aumenta a sensibilidade durante o ato\n• Efeito intenso e de ação rápida\n• Prolonga a duração\n• Embalagem discreta e prática',
    howToUse: 'Aplique uma pequena quantidade no pênis e massageie até absorção antes do ato. Lave com água após o uso.',
    searchTags: ['gel masculino', 'max men', 'ereção', 'performance', 'masculino', 'intense'],
  },
  {
    name: 'Melzinho Arabe Chillies',
    description: 'Melzinho Árabe Chillies — gel excitante com a potência do pimenta árabe para uma estimulação intensa e ardente. A fórmula especial com chillies cria uma sensação de calor e formigamento que intensifica o prazer ao máximo.',
    benefits: '• Efeito calor e formigamento com chillies\n• Estimulação intensa e ardente\n• Inspirado nos segredos árabes do prazer\n• Ação rápida e eficaz\n• Embalagem discreta',
    howToUse: 'Aplique uma pequena quantidade na região íntima. A sensação de calor aumenta com a fricção. Lave com água se a sensação for intensa demais.',
    searchTags: ['melzinho arabe', 'chillies', 'pimenta', 'calor', 'estimulante', 'ardente'],
  },
  {
    name: 'Mete Ficha Gel',
    description: 'Gel Mete Ficha com efeito estimulante de ação rápida para os momentos mais intensos. Fórmula especial que potencializa a excitação e intensifica cada sensação, tornando a experiência íntima inesquecível.',
    benefits: '• Efeito estimulante de ação rápida\n• Potencializa a excitação\n• Fórmula especial para máximo prazer\n• Embalagem discreta\n• Fácil aplicação',
    howToUse: 'Aplique uma pequena quantidade na região íntima e massageie suavemente. Lave com água após o uso.',
    searchTags: ['gel estimulante', 'mete ficha', 'excitante', 'intimo', 'prazer'],
  },
  {
    name: 'Metioulate Gel',
    description: 'Gel estimulante Metioulate com efeito excitante de ação rápida para intensificar as sensações íntimas. Fórmula especial desenvolvida para ampliar o prazer e tornar cada momento mais intenso.',
    benefits: '• Efeito estimulante de ação rápida\n• Fórmula especial para máxima sensação\n• Aumenta a sensibilidade e o prazer\n• Embalagem discreta\n• Fácil aplicação',
    howToUse: 'Aplique uma pequena quantidade na região íntima e massageie suavemente. Lave com água após o uso.',
    searchTags: ['gel estimulante', 'metioulate', 'excitante', 'intimo', 'sensacao'],
  },
  {
    name: 'Nabucetim Sex 18ml',
    description: 'Nabucetim Sex 18ml — gel excitante especialmente formulado para estimulação feminina intensa. A fórmula de 18ml com efeito excitante direto no clitóris e região vaginal proporciona uma experiência de prazer incomparável.',
    benefits: '• Efeito excitante direto na região feminina\n• 18ml de produto de alta qualidade\n• Estimulação clitoriana intensa\n• Ação rápida e eficaz\n• Embalagem discreta',
    howToUse: 'Aplique na região clitoriana e vaginal. Massageie suavemente. O efeito estimulante se intensifica com a excitação. Lave com água após o uso.',
    searchTags: ['gel feminino', 'nabucetim', 'excitante', 'clitoris', 'estimulacao feminina'],
  },
  {
    name: 'Nocucedim Sex 18ml',
    description: 'Nocucedim Sex 18ml — gel estimulante de ação rápida para intensificar o prazer íntimo. Embalagem de 18ml com fórmula especial desenvolvida para ampliar as sensações e tornar cada momento inesquecível.',
    benefits: '• Efeito estimulante de ação rápida\n• 18ml de produto de qualidade\n• Fórmula especial para máximo prazer\n• Embalagem discreta\n• Fácil aplicação',
    howToUse: 'Aplique uma pequena quantidade na região íntima e massageie suavemente. Lave com água após o uso.',
    searchTags: ['gel estimulante', 'nocucedim', 'excitante', 'intimo', 'sensacao'],
  },
  {
    name: 'ÓLEO PARA MASSAGEM MORANGO SEXY',
    description: 'Óleo para massagem sensual sabor/fragrância Morango Sexy — perfeito para esquentar o clima com uma massagem corporal irresistível. A textura sedosa do óleo desliza suavemente na pele deixando-a hidratada, perfumada e pronta para mais.',
    benefits: '• Textura sedosa que desliza na pele\n• Fragrância morango doce e sedutora\n• Hidrata e perfuma a pele durante a massagem\n• Ideal para massagens sensuais como prelúdio\n• Embalagem prática com dosador',
    howToUse: 'Aqueça uma pequena quantidade entre as mãos e aplique no corpo do parceiro com movimentos suaves e circulares. Lave com água após a massagem.',
    searchTags: ['oleo massagem', 'morango', 'sensual', 'sexy', 'massagem corporal', 'hidratante'],
  },
  {
    name: 'Paracetaduro Sexy Gel',
    description: 'Gel Paracetaduro Sexy com efeito estimulante e anestésico suave para prolongar o prazer e reduzir a sensibilidade excessiva. Ideal para quem quer mais duração e controle durante os momentos íntimos.',
    benefits: '• Efeito anestésico suave para maior duração\n• Reduz a sensibilidade excessiva\n• Prolonga o prazer\n• Ação rápida\n• Embalagem discreta e prática',
    howToUse: 'Aplique uma pequena quantidade na glande e massageie. Aguarde alguns minutos para o efeito se manifestar. Lave antes da penetração para não anestesiar o parceiro.',
    searchTags: ['gel retardante', 'paracetaduro', 'anestesico', 'duracao', 'prazer prolongado'],
  },
  {
    name: 'PAU DE CAVALO GEL 40ML SEXY',
    description: 'Gel Pau de Cavalo Sexy 40ml — gel estimulante masculino de alta performance para quem busca mais volume, firmeza e prazer. A fórmula especial em embalagem de 40ml proporciona uma experiência mais intensa e satisfatória.',
    benefits: '• Fórmula de alta performance masculina\n• 40ml de produto de qualidade superior\n• Estimula a firmeza e a sensação de volume\n• Efeito rápido e duradouro\n• Embalagem discreta e prática',
    howToUse: 'Aplique o gel no pênis e massageie até absorção. Use regularmente antes do ato para melhor resultado.',
    searchTags: ['gel masculino', 'pau de cavalo', 'firmeza', 'volume', 'performance masculina'],
  },
  {
    name: 'PAU DE CAVALO SPRAY 40ML SEXY',
    description: 'Spray Pau de Cavalo Sexy 40ml — estimulante masculino em formato spray para uma aplicação mais prática e eficaz. A fórmula potente em spray proporciona mais firmeza, performance e prazer durante os momentos íntimos.',
    benefits: '• Aplicação em spray — prática e eficaz\n• 40ml de produto de alta performance\n• Estimula firmeza e sensação de volume\n• Efeito rápido\n• Embalagem discreta',
    howToUse: 'Borrife diretamente no pênis e massageie levemente até absorção. Use antes do ato para melhor resultado.',
    searchTags: ['spray masculino', 'pau de cavalo', 'spray', 'firmeza', 'performance masculina'],
  },
  {
    name: 'Pepper Ball Beijavel Morango',
    description: 'Pepper Ball Beijável sabor Morango — bolinha com o picante do apimentado em sabor de morango para beijos que esquentam o clima. O efeito pimenta combinado com o sabor doce de morango cria uma experiência única e irresistível.',
    benefits: '• Sabor morango com efeito pimenta — único e excitante\n• Comestível e seguro para beijos íntimos\n• Sensação de calor que intensifica o prazer\n• Experiência diferenciada e ousada\n• Embalagem discreta',
    howToUse: 'Coloque na boca antes dos beijos e sexo oral. Sinta o efeito pimenta se intensificar durante as carícias.',
    searchTags: ['pepper ball', 'beijavel', 'morango', 'pimenta', 'hot', 'beijos'],
  },
  {
    name: 'Pererecard Gel',
    description: 'Gel estimulante Pererecard com efeito excitante de ação rápida para intensificar as sensações íntimas. Fórmula especial desenvolvida para ampliar o prazer e tornar cada momento mais intenso e satisfatório.',
    benefits: '• Efeito estimulante de ação rápida\n• Fórmula especial para máxima sensação\n• Aumenta a sensibilidade e o prazer\n• Embalagem discreta\n• Fácil aplicação',
    howToUse: 'Aplique uma pequena quantidade na região íntima e massageie suavemente. Lave com água após o uso.',
    searchTags: ['gel estimulante', 'pererecard', 'excitante', 'intimo', 'sensacao'],
  },
  {
    name: 'Pirocadura Gel',
    description: 'Gel Pirocadura com efeito estimulante masculino de ação rápida para intensificar a ereção e o prazer. Fórmula desenvolvida para potencializar a performance e a firmeza durante os momentos íntimos.',
    benefits: '• Efeito estimulante masculino de ação rápida\n• Potencializa a firmeza e a ereção\n• Aumenta a sensibilidade durante o ato\n• Fórmula especial para performance masculina\n• Embalagem discreta',
    howToUse: 'Aplique no pênis e massageie suavemente até absorção. Aguarde o efeito e aproveite.',
    searchTags: ['gel masculino', 'pirocadura', 'erecao', 'performance', 'firmeza', 'estimulante'],
  },
  {
    name: 'Pirocaxona Gel',
    description: 'Gel Pirocaxona com efeito estimulante para a performance masculina. Fórmula de ação rápida que potencializa a ereção e amplifica as sensações durante o ato íntimo para um prazer mais intenso e duradouro.',
    benefits: '• Estimulante masculino de ação rápida\n• Potencializa a ereção e a firmeza\n• Amplifica as sensações durante o ato\n• Fórmula eficaz e segura\n• Embalagem discreta',
    howToUse: 'Aplique no pênis e massageie até absorção antes do ato. Lave com água após o uso.',
    searchTags: ['gel masculino', 'pirocaxona', 'erecao', 'estimulante', 'performance'],
  },
  {
    name: 'Pocao Do Amor',
    description: 'Poção do Amor — gel estimulante com fórmula mágica para intensificar a paixão e o desejo. Produto pensado para despertar os sentidos e criar uma atmosfera de excitação e atração irresistível entre os parceiros.',
    benefits: '• Fórmula especial para intensificar o desejo\n• Estimula a atração e a paixão\n• Efeito excitante de ação rápida\n• Embalagem temática e divertida\n• Seguro para uso íntimo',
    howToUse: 'Aplique na região íntima conforme indicação. Lave com água após o uso.',
    searchTags: ['pocao do amor', 'gel estimulante', 'desejo', 'excitante', 'paixao'],
  },
  {
    name: 'Prazer Ste Pico Pulse Gel',
    description: 'Gel Prazer Ste Pico Pulse com efeito pulsante e estimulante para intensificar as sensações íntimas ao máximo. A fórmula pulse cria micro-sensações que se intensificam com o calor do corpo, gerando um prazer pulsante e irresistível.',
    benefits: '• Efeito pulsante único e estimulante\n• Sensações que se intensificam com o calor\n• Fórmula especial para máximo prazer\n• Ação rápida e eficaz\n• Embalagem discreta',
    howToUse: 'Aplique na região íntima e massageie suavemente. Sinta o efeito pulsante se manifestar. Lave com água após o uso.',
    searchTags: ['gel estimulante', 'pulse', 'pulsante', 'intimo', 'sensacao', 'prazer'],
  },
  {
    name: 'Rala Loka Mel',
    description: 'Rala Loka Mel — gel excitante feminino com mel para enlouquecer de prazer. A fórmula especial com mel aquece e estimula a região íntima feminina, criando uma sensação de calor irresistível que faz qualquer um perder a cabeça.',
    benefits: '• Fórmula com mel — excitante e estimulante\n• Efeito de calor que enlouquece\n• Especial para o prazer feminino\n• Ação rápida e intensa\n• Embalagem discreta',
    howToUse: 'Aplique na região íntima feminina e massageie suavemente. O efeito de calor se intensifica com a excitação. Lave com água após o uso.',
    searchTags: ['gel feminino', 'rala loka', 'mel', 'excitante', 'calor', 'prazer feminino'],
  },
  {
    name: 'Rivosex Gel',
    description: 'Gel estimulante Rivosex com efeito excitante de ação rápida para intensificar as sensações íntimas. Fórmula especial desenvolvida para ampliar o prazer e tornar cada momento mais intenso e inesquecível.',
    benefits: '• Efeito estimulante de ação rápida\n• Fórmula especial para máxima sensação\n• Aumenta a sensibilidade e o prazer\n• Embalagem discreta\n• Fácil aplicação',
    howToUse: 'Aplique uma pequena quantidade na região íntima e massageie suavemente. Lave com água após o uso.',
    searchTags: ['gel estimulante', 'rivosex', 'excitante', 'intimo', 'sensacao'],
  },
  {
    name: 'Sempre Virgem Gel',
    description: 'Gel Sempre Virgem com efeito adstringente para renovar a sensação de firmeza e aperto durante as relações íntimas. Produto que proporciona a sensação de contração e estreitamento para um prazer mais intenso.',
    benefits: '• Efeito adstringente — sensação de aperto renovada\n• Proporciona firmeza e estreitamento\n• Intensifica o prazer para ambos os parceiros\n• Fórmula de ação rápida\n• Embalagem discreta',
    howToUse: 'Aplique uma pequena quantidade na região vaginal antes do ato. Massageie suavemente e aguarde o efeito se manifestar. Higienize após o uso.',
    searchTags: ['gel adstringente', 'sempre virgem', 'aperto', 'firmeza', 'virgindade', 'intimo'],
  },
  {
    name: 'SEXY DRINK',
    description: 'Sexy Drink — bebida excitante formulada para potencializar o desejo e a energia durante os momentos íntimos. Produto estimulante em formato bebida para consumo antes dos momentos especiais a dois.',
    benefits: '• Estimulante em formato bebida — prático e gostoso\n• Potencializa o desejo e a energia\n• Sabor agradável para consumo\n• Efeito energizante e excitante\n• Embalagem conveniente',
    howToUse: 'Consuma conforme indicação na embalagem. Indicado para adultos. Não exceda a dose recomendada.',
    searchTags: ['sexy drink', 'bebida excitante', 'estimulante', 'desejo', 'energia'],
  },
  {
    name: 'TESAO DE EGUA 10ML SEX',
    description: 'Tesão de Égua 10ml Sexy — gel excitante de alta potência para estimulação íntima intensa. A fórmula poderosa em 10ml proporciona um efeito estimulante rápido e marcante, deixando cada momento mais intenso e memorável.',
    benefits: '• Alta potência estimulante\n• 10ml de produto eficaz e concentrado\n• Efeito excitante de ação rápida\n• Fórmula especial para máximo prazer\n• Embalagem discreta e prática',
    howToUse: 'Aplique uma pequena quantidade na região íntima. Um pouquinho já basta — o produto é concentrado. Lave com água após o uso.',
    searchTags: ['tesao de egua', 'gel excitante', 'estimulante', 'potente', 'intimo'],
  },
  {
    name: 'TESAO DE JEGUE 10ML SEX',
    description: 'Tesão de Jegue 10ml Sexy — gel estimulante de alta potência para intensificar ao máximo as sensações íntimas. Produto concentrado em 10ml com efeito excitante poderoso para quem não tem medo de sentir mais.',
    benefits: '• Alta potência estimulante\n• 10ml concentrado e eficaz\n• Efeito excitante rápido e intenso\n• Para quem quer sentir mais\n• Embalagem discreta',
    howToUse: 'Aplique uma pequena quantidade na região íntima e massageie. O efeito é intenso — comece com pouco. Lave com água após o uso.',
    searchTags: ['tesao de jegue', 'gel excitante', 'estimulante', 'potente', 'intimo'],
  },
  {
    name: 'TESAO DE TOURO 20ML SEX',
    description: 'Tesão de Touro 20ml Sexy — gel excitante masculino de força máxima para uma performance extraordinária. A fórmula de 20ml foi desenvolvida para quem quer mais firmeza, mais duração e mais prazer.',
    benefits: '• Força máxima masculina\n• 20ml de produto de alta performance\n• Potencializa a firmeza e a ereção\n• Estimulação intensa e duradoura\n• Embalagem discreta e prática',
    howToUse: 'Aplique no pênis e massageie até absorção. Use antes do ato para melhor resultado. Lave com água após o uso.',
    searchTags: ['tesao de touro', 'gel masculino', 'performance', 'firmeza', 'potente'],
  },
  {
    name: 'TESAO DE VACA 10ML SEX',
    description: 'Tesão de Vaca 10ml Sexy — gel excitante feminino de alta potência para o prazer mais intenso da mulher. A fórmula concentrada de 10ml proporciona um efeito estimulante rápido e irresistível na região íntima feminina.',
    benefits: '• Fórmula feminina de alta potência\n• 10ml concentrado de efeito rápido\n• Estimulação clitoriana e vaginal intensa\n• Para a mulher que quer sentir mais\n• Embalagem discreta',
    howToUse: 'Aplique uma pequena quantidade no clitóris e região vaginal. Massageie suavemente. O efeito é intenso. Lave com água após o uso.',
    searchTags: ['tesao de vaca', 'gel feminino', 'excitante', 'clitoris', 'potente', 'estimulante'],
  },
  {
    name: 'Tesao Sexy Energy',
    description: 'Tesão Sexy Energy — gel estimulante com energia extra para os momentos mais intensos. A fórmula energy foi desenvolvida para quem quer mais disposição, mais excitação e mais prazer sem abrir mão da segurança.',
    benefits: '• Efeito energy — mais energia e disposição\n• Estimulante de ação rápida\n• Amplifica a excitação e o desejo\n• Fórmula segura e eficaz\n• Embalagem discreta',
    howToUse: 'Aplique na região íntima e massageie suavemente. Sinta a energia e a excitação se intensificarem. Lave com água após o uso.',
    searchTags: ['gel estimulante', 'tesao', 'energy', 'energia', 'excitante', 'intimo'],
  },
  {
    name: 'Vamos Ser Feliz Gel',
    description: 'Gel Vamos Ser Feliz com efeito estimulante e prazeroso para momentos a dois cheios de alegria e satisfação. Fórmula desenvolvida para amplificar o prazer e criar memórias felizes de momentos íntimos.',
    benefits: '• Efeito estimulante para mais prazer\n• Fórmula que amplifica as sensações\n• Perfeito para momentos a dois\n• Embalagem divertida e discreta\n• Seguro para uso íntimo',
    howToUse: 'Aplique na região íntima e massageie suavemente. Aproveite o momento e o efeito do gel. Lave com água após.',
    searchTags: ['gel estimulante', 'vamos ser feliz', 'excitante', 'intimo', 'prazer'],
  },
  {
    name: 'Virginite Gel',
    description: 'Gel Virginite com efeito adstringente e contrativo para renovar a sensação de aperto e firmeza na região vaginal. Produto especial que proporciona uma sensação de rejuvenescimento íntimo para mais prazer nos dois.',
    benefits: '• Efeito adstringente potente\n• Renova a sensação de aperto e firmeza\n• Intensifica o prazer durante a penetração\n• Fórmula segura e eficaz\n• Embalagem discreta',
    howToUse: 'Aplique uma pequena quantidade na região vaginal antes do ato. Massageie e aguarde o efeito. Higienize após o uso.',
    searchTags: ['gel adstringente', 'virginite', 'aperto', 'firmeza', 'contrativo', 'intimo'],
  },
  {
    name: 'Exotic Honey Mel Feminino',
    description: 'Exotic Honey Mel Feminino — mel excitante especialmente formulado para a mulher com propriedades estimulantes que despertam o desejo e intensificam a sensibilidade. Produto natural à base de mel para o prazer feminino.',
    benefits: '• Mel excitante especial para a mulher\n• Desperta o desejo e a sensibilidade\n• Propriedades estimulantes naturais\n• Sabor mel irresistível\n• Embalagem discreta e prática',
    howToUse: 'Aplique o mel na região íntima feminina ou use para massagens sensuais. O mel é comestível. Higienize após o uso.',
    searchTags: ['exotic honey', 'mel', 'feminino', 'excitante', 'natural', 'sensibilidade'],
  },
  {
    name: 'Exotic Honey Mel Masculino',
    description: 'Exotic Honey Mel Masculino — mel excitante especialmente formulado para o homem com propriedades estimulantes que potencializam a ereção e o desejo. Produto natural à base de mel para performance masculina.',
    benefits: '• Mel excitante especial para o homem\n• Potencializa a ereção e o desejo\n• Propriedades estimulantes naturais\n• Sabor mel irresistível\n• Embalagem discreta',
    howToUse: 'Aplique o mel na região íntima masculina ou consuma conforme indicação. O mel é comestível. Higienize após o uso.',
    searchTags: ['exotic honey', 'mel', 'masculino', 'excitante', 'natural', 'erecao'],
  },
  {
    name: 'Xana Eletrica Vibrador Liquido',
    description: 'Xana Elétrica Vibrador Líquido — gel estimulante feminino com efeito vibrador que cria micro-sensações de vibração na região íntima sem precisar de nenhum aparelho. A fórmula líquida especial proporciona uma excitação intensa e indiscreta.',
    benefits: '• Efeito vibrador líquido — sem aparelho necessário\n• Micro-sensações estimulantes na região íntima\n• Excitação feminina intensa\n• Fórmula de ação rápida\n• Embalagem discreta',
    howToUse: 'Aplique no clitóris e região íntima feminina. Massageie suavemente e sinta o efeito vibrador se intensificar. Lave com água após o uso.',
    searchTags: ['vibrador liquido', 'xana eletrica', 'gel feminino', 'excitante', 'micro vibracoes'],
  },

  // ── DEDEIRAS SENSUAIS ──────────────────────────────────────────────────────

  {
    name: 'Dedeira com Textura Sexy Rosa',
    description: 'Dedeira com textura rosa para estimulação manual prazerosa e precisa. O material texturizado potencializa as carícias com o dedo, proporcionando sensações únicas em regiões erógenas. Higiênica, discreta e fácil de usar.',
    benefits: '• Textura especial que intensifica as carícias\n• Estimulação precisa e prazerosa\n• Material higiênico e fácil de higienizar\n• Discreta e confortável no dedo\n• Ideal para uso solo ou a dois',
    howToUse: 'Encaixe no dedo. Use com lubrificante à base de água para intensificar a estimulação. Lave com água e sabão após o uso.',
    searchTags: ['dedeira', 'textura', 'rosa', 'estimulacao manual', 'carícias', 'sexy'],
  },
  {
    name: 'Dedeira com Textura Sexy Roxo',
    description: 'Dedeira com textura roxa para carícias manuais intensas e prazerosas. Design ergonômico que se adapta ao dedo e proporciona estimulação precisa nas regiões erógenas. Higiênica, prática e extremamente eficaz.',
    benefits: '• Textura roxa diferenciada e estimulante\n• Estimulação manual precisa e intensa\n• Material higiênico e lavável\n• Confortável e de fácil uso\n• Ideal para diversão solo ou a dois',
    howToUse: 'Encaixe no dedo e use com lubrificante à base de água. Explore as regiões erógenas para máximo prazer. Lave com água e sabão após o uso.',
    searchTags: ['dedeira', 'textura', 'roxo', 'estimulacao manual', 'carícias', 'sexy'],
  },

  // ── KITS ───────────────────────────────────────────────────────────────────

  {
    name: 'Kit Completo 45 Itens',
    description: 'Kit Completo Adulto com 45 itens cuidadosamente selecionados para tornar a vida íntima ainda mais emocionante. O kit perfeito para presentear ou para explorar novas experiências com o parceiro. Variedade de produtos excitantes, lubrificantes e acessórios sensuais.',
    benefits: '• Kit completo com 45 itens variados\n• Custo-benefício excelente — tudo em um só kit\n• Ideal para presentear em datas especiais\n• Variedade de categorias: géis, bolinhas, acessórios\n• Embalagem discreta para entrega',
    howToUse: 'Use cada item conforme as instruções individuais de cada produto. Armazene em local fresco, seco e longe do alcance de crianças.',
    searchTags: ['kit adulto', 'kit completo', '45 itens', 'presente', 'sex shop', 'variedade'],
  },
  {
    name: 'Kit Lubrificantes Intimos 10 Sabores',
    description: 'Kit de Lubrificantes Íntimos com 10 sabores diferentes para explorar ao máximo os momentos a dois. Uma coleção completa para descobrir seus sabores favoritos com qualidade e praticidade. Perfeito para quem gosta de variedade.',
    benefits: '• 10 sabores diferentes para explorar\n• Lubrificantes de qualidade em embalagens individuais\n• Perfeito para descobrir novos favoritos\n• Ideal para uso em beijos e carícias íntimas\n• Custo-benefício excelente',
    howToUse: 'Use cada lubrificante conforme necessário nos beijos e momentos íntimos. São comestíveis. Lave com água após o uso. Armazene em local fresco e seco.',
    searchTags: ['kit lubrificantes', '10 sabores', 'lubrificante comestivel', 'variedade', 'beijos', 'intimo'],
  },
];

// ─── Função principal ─────────────────────────────────────────────────────────

async function main() {
  console.log(`\n=== ENRIQUECIMENTO SEXSHOP — ${PRODUTOS.length} produtos ===\n`);

  let ok = 0;
  let skipped = 0;

  for (const prod of PRODUTOS) {
    const found = await prisma.product.findFirst({
      where: {
        name: {
          contains: prod.name,
          mode: 'insensitive',
        },
      },
      select: { id: true, name: true },
    });

    if (!found) {
      console.log(`NAO ENCONTRADO  → "${prod.name}"`);
      skipped++;
      continue;
    }

    await prisma.product.update({
      where: { id: found.id },
      data: {
        description:       prod.description,
        benefits:          prod.benefits,
        howToUse:          prod.howToUse,
        searchTags:        prod.searchTags,
        enrichmentStatus:  'ENRICHED',
        publicationStatus: 'PUBLISHED',
      },
    });

    console.log(`OK              → "${found.name}"`);
    ok++;
  }

  console.log(`\n=== RESUMO ===`);
  console.log(`Atualizados : ${ok}`);
  console.log(`Não achados : ${skipped}`);
  console.log(`Total       : ${PRODUTOS.length}`);

  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect();
  process.exit(1);
});
