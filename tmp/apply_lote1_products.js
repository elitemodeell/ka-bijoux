const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const sourceDir = 'C:\\Users\\bruno\\Downloads\\produto lote 1';
const reportDir = path.join(root, 'reports', 'product-lote-1');
const inventoryPath = path.join(reportDir, 'inventory.json');
const blingPath = path.join(root, 'backend', 'data', 'produtos-bling.json');
const overridesPath = path.join(root, 'backend', 'data', 'product-content-overrides.json');
const imageFilesPath = path.join(root, 'backend', 'data', 'bling-image-files.json');
const uploadsDir = path.join(root, 'backend', 'public', 'uploads', 'products');

const safeMappings = [
  {
    item: 2,
    sku: '3104000004296',
    displayName: 'Fone Bluetooth P47',
    categoryName: 'Eletronicos',
    subcategoryName: 'Fones e Acessorios',
    color: 'Preto',
    material: 'Plastico e componentes eletronicos',
  },
  {
    item: 10,
    sku: '3104000004209',
    displayName: 'Sutia Adesivo de Silicone',
    categoryName: 'Moda e Acessorios',
    subcategoryName: 'Moda Intima',
    color: 'Transparente',
    material: 'Silicone adesivo',
  },
  {
    item: 11,
    sku: '3104000000066',
    displayName: 'Boob Tape Fita Modeladora',
    categoryName: 'Moda e Acessorios',
    subcategoryName: 'Moda Intima',
    color: 'Conforme disponibilidade',
    material: 'Fita adesiva para uso corporal',
  },
  {
    item: 19,
    sku: '3104000004360',
    displayName: 'Escova Dental Dupla para Pets',
    categoryName: 'Pet',
    subcategoryName: 'Higiene Pet',
    color: 'Conforme disponibilidade',
    material: 'Plastico e cerdas macias',
  },
  {
    item: 20,
    sku: '3104000004071',
    displayName: 'Agua Perfumada Conforto',
    categoryName: 'Casa e Aromas',
    subcategoryName: 'Aromatizadores',
    color: 'Frasco conforme imagem',
    material: 'Produto liquido perfumado',
  },
  {
    item: 30,
    sku: '3104000000462',
    displayName: 'Espelho de Mesa Redondo',
    categoryName: 'Beleza e Acessorios',
    subcategoryName: 'Espelhos',
    color: 'Conforme disponibilidade',
    material: 'Espelho e estrutura plastica',
  },
  {
    item: 33,
    sku: '3104000004072',
    displayName: 'Perfume de Ambiente',
    categoryName: 'Casa e Aromas',
    subcategoryName: 'Aromatizadores',
    color: 'Frasco conforme imagem',
    material: 'Produto liquido perfumado',
  },
  {
    item: 34,
    sku: '3104000000106',
    displayName: 'Odorizador de Tecidos e Ambientes',
    categoryName: 'Casa e Aromas',
    subcategoryName: 'Aromatizadores',
    color: 'Frasco conforme imagem',
    material: 'Produto liquido perfumado',
  },
  {
    item: 35,
    sku: '3104000001146',
    displayName: 'Protetor de Calcanhar com 2 Unidades',
    categoryName: 'Cuidados Pessoais',
    subcategoryName: 'Conforto para os Pes',
    color: 'Conforme disponibilidade',
    material: 'Silicone macio',
  },
  {
    item: 57,
    sku: '3104000000603',
    displayName: 'Fone de Ouvido com Conector Lightning',
    categoryName: 'Eletronicos',
    subcategoryName: 'Fones e Acessorios',
    color: 'Branco',
    material: 'Plastico e componentes eletronicos',
  },
  {
    item: 58,
    sku: '3104000003047',
    displayName: 'Hub USB 4 Portas',
    categoryName: 'Eletronicos',
    subcategoryName: 'Adaptadores e Cabos',
    color: 'Branco',
    material: 'Plastico e componentes eletronicos',
  },
  {
    item: 59,
    sku: '3104000000957',
    displayName: 'Cabide Organizador Multiuso',
    categoryName: 'Casa e Organizacao',
    subcategoryName: 'Organizadores',
    color: 'Conforme disponibilidade',
    material: 'Plastico resistente',
  },
  {
    item: 65,
    sku: '3104000004340',
    displayName: 'Cabo USB-C para Lightning 30W',
    categoryName: 'Eletronicos',
    subcategoryName: 'Adaptadores e Cabos',
    color: 'Conforme imagem',
    material: 'Cabo revestido e conectores metalicos',
  },
  {
    item: 66,
    sku: '3104000004339',
    displayName: 'Cabo USB-C para USB-C 60W',
    categoryName: 'Eletronicos',
    subcategoryName: 'Adaptadores e Cabos',
    color: 'Conforme imagem',
    material: 'Cabo revestido e conectores metalicos',
  },
  {
    item: 82,
    sku: '3104000003348',
    displayName: 'Carregador Veicular com Cabo',
    categoryName: 'Eletronicos',
    subcategoryName: 'Carregadores',
    color: 'Conforme imagem',
    material: 'Plastico e componentes eletronicos',
  },
  {
    item: 88,
    sku: '3104000003778',
    displayName: 'Limpador Magnetico para Vidros',
    categoryName: 'Casa e Utilidades',
    subcategoryName: 'Limpeza',
    color: 'Conforme imagem',
    material: 'Plastico e ima magnetico',
  },
  {
    item: 89,
    sku: '3104000004427',
    displayName: 'Porta Comprimidos Premium',
    categoryName: 'Casa e Utilidades',
    subcategoryName: 'Organizadores',
    color: 'Conforme imagem',
    material: 'Plastico',
  },
  {
    item: 96,
    sku: '3104000000016',
    displayName: 'Dispenser Eletrico de Agua',
    categoryName: 'Casa e Utilidades',
    subcategoryName: 'Cozinha',
    color: 'Conforme imagem',
    material: 'Plastico e componentes eletronicos',
  },
  {
    item: 99,
    sku: '3104000003767',
    displayName: 'Perfume Lady Billion',
    categoryName: 'Perfumes',
    subcategoryName: 'Perfumes Femininos',
    color: 'Frasco conforme imagem',
    material: 'Deo colonia',
  },
  {
    item: 100,
    sku: '3104000003761',
    displayName: 'Perfume Lady Dior',
    categoryName: 'Perfumes',
    subcategoryName: 'Perfumes Femininos',
    color: 'Frasco conforme imagem',
    material: 'Deo colonia',
  },
  {
    item: 101,
    sku: '3104000003762',
    displayName: 'Perfume Eterny',
    categoryName: 'Perfumes',
    subcategoryName: 'Perfumes Femininos',
    color: 'Frasco conforme imagem',
    material: 'Deo colonia',
  },
  {
    item: 102,
    sku: '3104000003765',
    displayName: 'Perfume Cloe',
    categoryName: 'Perfumes',
    subcategoryName: 'Perfumes Femininos',
    color: 'Frasco conforme imagem',
    material: 'Deo colonia',
  },
  {
    item: 103,
    sku: '3104000003763',
    displayName: 'Perfume J Amore',
    categoryName: 'Perfumes',
    subcategoryName: 'Perfumes Femininos',
    color: 'Frasco conforme imagem',
    material: 'Deo colonia',
  },
  {
    item: 104,
    sku: '3104000003764',
    displayName: 'Perfume Isis Madam',
    categoryName: 'Perfumes',
    subcategoryName: 'Perfumes Femininos',
    color: 'Frasco conforme imagem',
    material: 'Deo colonia',
  },
  {
    item: 107,
    sku: '3104000003766',
    displayName: 'Perfume La Bella',
    categoryName: 'Perfumes',
    subcategoryName: 'Perfumes Femininos',
    color: 'Frasco conforme imagem',
    material: 'Deo colonia',
  },
  {
    item: 113,
    sku: '3104000004093',
    displayName: 'Aparador Higienico Recarregavel',
    categoryName: 'Beleza e Cuidados',
    subcategoryName: 'Aparadores',
    color: 'Conforme imagem',
    material: 'Plastico e componentes eletronicos',
  },
  {
    item: 134,
    sku: '3104000001154',
    displayName: 'Kit Limpa Prata e Ouro',
    categoryName: 'Bijuterias',
    subcategoryName: 'Cuidados com Acessorios',
    color: 'Conforme imagem',
    material: 'Produto de limpeza para acessorios',
  },
  {
    item: 135,
    sku: '3104000004899',
    displayName: 'Kit Frascos para Viagem',
    categoryName: 'Casa e Organizacao',
    subcategoryName: 'Viagem',
    color: 'Conforme imagem',
    material: 'Plastico',
  },
  {
    item: 136,
    sku: '3104000000635',
    displayName: 'Mini Mixer Eletrico',
    categoryName: 'Casa e Utilidades',
    subcategoryName: 'Cozinha',
    color: 'Conforme imagem',
    material: 'Plastico e haste metalica',
  },
  {
    item: 138,
    sku: '3104000000021',
    displayName: 'Aspirador e Soprador de Ar Portatil',
    categoryName: 'Eletronicos',
    subcategoryName: 'Utilidades',
    color: 'Conforme imagem',
    material: 'Plastico e componentes eletronicos',
  },
  {
    item: 142,
    sku: '3104000004403',
    displayName: 'Papel de Parede Adesivo 45cm x 5m',
    categoryName: 'Casa e Decoracao',
    subcategoryName: 'Papeis Adesivos',
    color: 'Conforme estampa',
    material: 'Papel adesivo decorativo',
  },
  {
    item: 145,
    sku: '3104000004420',
    displayName: 'Album de Fotos',
    categoryName: 'Presentes e Papelaria',
    subcategoryName: 'Albuns',
    color: 'Conforme imagem',
    material: 'Papel e capa decorativa',
  },
  {
    item: 149,
    sku: '3104000004664',
    displayName: 'Sabonete Intimo Morango',
    categoryName: 'Cuidados Pessoais',
    subcategoryName: 'Higiene Intima',
    color: 'Morango',
    material: 'Sabonete liquido intimo',
  },
  {
    item: 170,
    sku: '3104000004288',
    displayName: 'Body Modelador Fitness',
    categoryName: 'Moda e Acessorios',
    subcategoryName: 'Modeladores',
    color: 'Conforme disponibilidade',
    material: 'Tecido elastico modelador',
  },
  {
    item: 187,
    sku: '3104000005233',
    displayName: 'Relicario Coracao Flor Prata',
    categoryName: 'Bijuterias',
    subcategoryName: 'Colares',
    color: 'Prata',
    material: 'Metal bijuteria',
  },
  {
    item: 188,
    sku: '3104000005052',
    displayName: 'Relicario Redondo Flor Dourado',
    categoryName: 'Bijuterias',
    subcategoryName: 'Colares',
    color: 'Dourado',
    material: 'Metal bijuteria',
  },
  {
    item: 208,
    sku: '3104000005562',
    displayName: 'Anel de Cabelo Colorido',
    categoryName: 'Acessorios de Cabelo',
    subcategoryName: 'Aneis de Cabelo',
    color: 'Colorido',
    material: 'Metal bijuteria',
  },
  {
    item: 216,
    sku: '3104000005812',
    displayName: 'Mini Robo Aspirador Branco',
    categoryName: 'Casa e Eletronicos',
    subcategoryName: 'Limpeza',
    color: 'Branco',
    material: 'Plastico e componentes eletronicos',
  },
  {
    item: 218,
    sku: '3104000005811',
    displayName: 'Mini Robo Aspirador Preto',
    categoryName: 'Casa e Eletronicos',
    subcategoryName: 'Limpeza',
    color: 'Preto',
    material: 'Plastico e componentes eletronicos',
  },
  {
    item: 220,
    sku: '3104000005817',
    displayName: 'Luminaria LED Coracao 3D',
    categoryName: 'Casa e Decoracao',
    subcategoryName: 'Luminarias',
    color: 'Luz decorativa',
    material: 'Acrilico e base LED',
  },
  {
    item: 222,
    sku: '3104000005561',
    displayName: 'Anel de Cabelo Prateado',
    categoryName: 'Acessorios de Cabelo',
    subcategoryName: 'Aneis de Cabelo',
    color: 'Prata',
    material: 'Metal bijuteria',
  },
  {
    item: 226,
    sku: '3104000003063',
    displayName: 'Caixa de Som Portatil 3 Polegadas',
    categoryName: 'Eletronicos',
    subcategoryName: 'Caixas de Som',
    color: 'Conforme imagem',
    material: 'Plastico e componentes eletronicos',
  },
  {
    item: 231,
    sku: '3104000003064',
    displayName: 'Caneta Laser',
    categoryName: 'Eletronicos',
    subcategoryName: 'Acessorios',
    color: 'Conforme imagem',
    material: 'Metal e componentes eletronicos',
  },
  {
    item: 234,
    sku: '3104000000163',
    displayName: 'Pulseira Smart Basica',
    categoryName: 'Relogios e Acessorios',
    subcategoryName: 'Pulseiras Smart',
    color: 'Conforme disponibilidade',
    material: 'Silicone',
  },
  {
    item: 235,
    sku: '3104000001529',
    displayName: 'Pulseira Smart Metal',
    categoryName: 'Relogios e Acessorios',
    subcategoryName: 'Pulseiras Smart',
    color: 'Conforme disponibilidade',
    material: 'Metal',
  },
  {
    item: 236,
    sku: '3104000004504',
    displayName: 'Pulseira Smart Couro',
    categoryName: 'Relogios e Acessorios',
    subcategoryName: 'Pulseiras Smart',
    color: 'Conforme disponibilidade',
    material: 'Material sintetico estilo couro',
  },
  {
    item: 8,
    sku: '3104000003531',
    displayName: 'Escova Tira Pelos com Deposito',
    categoryName: 'Casa e Pet',
    subcategoryName: 'Removedores de Pelos',
    color: 'Conforme imagem',
    material: 'Plastico e superficie coletora',
  },
  {
    item: 25,
    sku: '3104000004250',
    displayName: 'Esfoliante para os Pes',
    categoryName: 'Cuidados Pessoais',
    subcategoryName: 'Cuidados para os Pes',
    color: 'Conforme imagem',
    material: 'Produto cosmetico para cuidados dos pes',
  },
  {
    item: 28,
    sku: '3104000004023',
    displayName: 'Hidratante Corporal Live Roses',
    categoryName: 'Beleza e Cuidados',
    subcategoryName: 'Hidratantes',
    color: 'Rosa',
    material: 'Locao hidratante corporal',
  },
  {
    item: 29,
    sku: '3104000003006',
    displayName: 'Mascara Facial Rosa Mosqueta Isis',
    categoryName: 'Beleza e Cuidados',
    subcategoryName: 'Cuidados Faciais',
    color: 'Rosa Mosqueta',
    material: 'Mascara facial cosmetica',
  },
  {
    item: 37,
    sku: '3104000000098',
    displayName: 'Protetor de Silicone para Planta do Pe',
    categoryName: 'Cuidados Pessoais',
    subcategoryName: 'Conforto para os Pes',
    color: 'Transparente',
    material: 'Silicone macio',
  },
  {
    item: 77,
    sku: '3104000000162',
    displayName: 'Cabo de Carregamento V8 Micro USB',
    categoryName: 'Eletronicos',
    subcategoryName: 'Adaptadores e Cabos',
    color: 'Preto',
    material: 'Cabo revestido e conectores metalicos',
  },
  {
    item: 80,
    sku: '3104000000160',
    displayName: 'Cabo Lightning para USB',
    categoryName: 'Eletronicos',
    subcategoryName: 'Adaptadores e Cabos',
    color: 'Branco',
    material: 'Cabo revestido e conectores metalicos',
  },
  {
    item: 83,
    sku: '3104000001381',
    displayName: 'Fonte com Cabo Tipo-C 35W',
    categoryName: 'Eletronicos',
    subcategoryName: 'Carregadores',
    color: 'Branco',
    material: 'Plastico e componentes eletronicos',
  },
  {
    item: 84,
    sku: '3104000004348',
    displayName: 'Fonte USB-C 20W',
    categoryName: 'Eletronicos',
    subcategoryName: 'Carregadores',
    color: 'Branco',
    material: 'Plastico e componentes eletronicos',
  },
  {
    item: 130,
    sku: '3104000000064',
    displayName: 'Tapa Mamilo de Silicone',
    categoryName: 'Moda e Acessorios',
    subcategoryName: 'Moda Intima',
    color: 'Nude',
    material: 'Silicone macio',
  },
  {
    item: 132,
    sku: '3104000000157',
    displayName: 'Kit Prendedores para Lencol',
    categoryName: 'Casa e Organizacao',
    subcategoryName: 'Organizadores',
    color: 'Branco',
    material: 'Plastico e elastico',
  },
  {
    item: 171,
    sku: '3104000003352',
    displayName: 'Pente Alisador Recarregavel',
    categoryName: 'Beleza e Cuidados',
    subcategoryName: 'Acessorios para Cabelo',
    color: 'Conforme imagem',
    material: 'Plastico e componentes eletronicos',
  },
  {
    item: 177,
    sku: '3104000005305',
    displayName: 'Bracelete Aco Inox Cartier com Strass',
    categoryName: 'Bijuterias',
    subcategoryName: 'Pulseiras',
    color: 'Dourado',
    material: 'Aco inox',
  },
  {
    item: 179,
    sku: '3104000005304',
    displayName: 'Bracelete Aco Inox Roma',
    categoryName: 'Bijuterias',
    subcategoryName: 'Pulseiras',
    color: 'Dourado',
    material: 'Aco inox',
  },
  {
    item: 181,
    sku: '3104000005307',
    displayName: 'Bracelete Aco Inox Liso',
    categoryName: 'Bijuterias',
    subcategoryName: 'Pulseiras',
    color: 'Dourado',
    material: 'Aco inox',
  },
  {
    item: 192,
    sku: '3104000005351',
    displayName: 'Mix de Colares Malha Fina Dourado',
    categoryName: 'Bijuterias',
    subcategoryName: 'Colares',
    color: 'Dourado',
    material: 'Metal bijuteria',
  },
  {
    item: 193,
    sku: '3104000005352',
    displayName: 'Mix de Colares Malha Fina Prata',
    categoryName: 'Bijuterias',
    subcategoryName: 'Colares',
    color: 'Prata',
    material: 'Metal bijuteria',
  },
  {
    item: 209,
    sku: '3104000000325',
    displayName: 'Mini Prancha Roxa',
    categoryName: 'Beleza e Cuidados',
    subcategoryName: 'Acessorios para Cabelo',
    color: 'Roxo',
    material: 'Plastico e placa aquecedora',
  },
  {
    item: 210,
    sku: '3104000005670',
    displayName: 'Mini Prancha Rosa',
    categoryName: 'Beleza e Cuidados',
    subcategoryName: 'Acessorios para Cabelo',
    color: 'Rosa',
    material: 'Plastico e placa aquecedora',
  },
  {
    item: 211,
    sku: '3104000000633',
    displayName: 'Papa Bolinha Recarregavel Branco',
    categoryName: 'Casa e Utilidades',
    subcategoryName: 'Cuidados com Roupas',
    color: 'Branco',
    material: 'Plastico e componentes eletronicos',
  },
  {
    item: 212,
    sku: '3104000005576',
    displayName: 'Papa Bolinha Recarregavel Verde',
    categoryName: 'Casa e Utilidades',
    subcategoryName: 'Cuidados com Roupas',
    color: 'Verde',
    material: 'Plastico e componentes eletronicos',
  },
  {
    item: 214,
    sku: '3104000005384',
    displayName: 'Pulseira Pedra Turquesa Dourada Oval',
    categoryName: 'Bijuterias',
    subcategoryName: 'Pulseiras',
    color: 'Dourado com azul turquesa',
    material: 'Metal bijuteria e pedra sintetica',
  },
  {
    item: 221,
    sku: '3104000005381',
    displayName: 'Bracelete Aco Inox Liso Prata',
    categoryName: 'Bijuterias',
    subcategoryName: 'Pulseiras',
    color: 'Prata',
    material: 'Aco inox',
  },
  {
    item: 223,
    sku: '3104000001048',
    displayName: 'Anel de Cabelo Dourado',
    categoryName: 'Acessorios de Cabelo',
    subcategoryName: 'Aneis de Cabelo',
    color: 'Dourado',
    material: 'Metal bijuteria',
  },
  {
    item: 227,
    sku: '3104000005815',
    displayName: 'Papa Bolinha a Pilha Rosa',
    categoryName: 'Casa e Utilidades',
    subcategoryName: 'Cuidados com Roupas',
    color: 'Rosa',
    material: 'Plastico e componentes eletronicos',
  },
  {
    item: 228,
    sku: '3104000005814',
    displayName: 'Papa Bolinha a Pilha Azul',
    categoryName: 'Casa e Utilidades',
    subcategoryName: 'Cuidados com Roupas',
    color: 'Azul',
    material: 'Plastico e componentes eletronicos',
  },
  {
    item: 229,
    sku: '3104000000015',
    displayName: 'Lampada Globo de Festa RGB',
    categoryName: 'Casa e Decoracao',
    subcategoryName: 'Iluminacao',
    color: 'RGB',
    material: 'Plastico e componentes eletronicos',
  },
];

const duplicateOrGallery = new Map([
  [36, 'Imagem extra do protetor de calcanhar; produto ja recebeu imagem principal no item 35.'],
  [40, 'Variacao de aroma do odorizador; SKU individual nao confirmado no Bling.'],
  [41, 'Variacao de aroma do odorizador; SKU individual nao confirmado no Bling.'],
  [42, 'Variacao de aroma do odorizador; SKU individual nao confirmado no Bling.'],
  [43, 'Variacao de aroma do odorizador; SKU individual nao confirmado no Bling.'],
  [44, 'Variacao de aroma do odorizador; SKU individual nao confirmado no Bling.'],
  [45, 'Variacao de perfume de ambiente; SKU individual nao confirmado no Bling.'],
  [46, 'Variacao de perfume de ambiente; SKU individual nao confirmado no Bling.'],
  [47, 'Variacao de perfume de ambiente; SKU individual nao confirmado no Bling.'],
  [48, 'Variacao de perfume de ambiente; SKU individual nao confirmado no Bling.'],
  [49, 'Variacao de perfume de ambiente; SKU individual nao confirmado no Bling.'],
  [50, 'Imagem alternativa do cabide organizador; produto ja recebeu imagem principal no item 59.'],
  [51, 'Imagem extra do protetor de calcanhar; produto ja recebeu imagem principal no item 35.'],
  [52, 'Imagem extra do protetor de calcanhar; produto ja recebeu imagem principal no item 35.'],
  [60, 'Imagem alternativa do dispenser; produto ja recebeu imagem principal no item 96.'],
  [63, 'Imagem alternativa do perfume La Bella; produto ja recebeu imagem principal no item 107.'],
  [69, 'Imagem alternativa de fonte USB-C 20W; produto ja recebeu imagem principal no item 84.'],
  [71, 'Imagem alternativa do papa bolinha branco; produto ja recebeu imagem principal no item 211.'],
  [78, 'Imagem alternativa do cabo USB-C; produto ja recebeu imagem principal no item 66.'],
  [79, 'Imagem alternativa do cabo V8/Micro USB; produto ja recebeu imagem principal no item 77.'],
  [91, 'Imagem alternativa do dispenser; produto ja recebeu imagem principal no item 96.'],
  [95, 'Imagem alternativa do perfume Lady Billion; produto ja recebeu imagem principal no item 99.'],
  [105, 'Imagem extra do protetor de calcanhar; produto ja recebeu imagem principal no item 35.'],
  [129, 'Imagem alternativa do tapa mamilo de silicone; produto ja recebeu imagem principal no item 130.'],
  [131, 'Imagem alternativa do kit frascos para viagem; produto ja recebeu imagem principal no item 135.'],
  [137, 'Imagem alternativa da luminaria coracao; produto ja recebeu imagem principal no item 220.'],
  [174, 'Imagem alternativa do mini robo aspirador branco; produto ja recebeu imagem principal no item 216.'],
  [207, 'Imagem alternativa de anel de cabelo dourado; produto ja recebeu imagem principal no item 223.'],
  [203, 'Imagem extra do relicario redondo dourado; produto ja recebeu imagem principal no item 188.'],
  [205, 'Imagem extra do relicario coracao prata; produto ja recebeu imagem principal no item 187.'],
  [215, 'Imagem alternativa da pulseira turquesa; produto ja recebeu imagem principal no item 214.'],
  [238, 'Imagem alternativa da pulseira smart couro; produto ja recebeu imagem principal no item 236.'],
]);

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function writeJson(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2) + '\n', 'utf8');
}

function slugify(value) {
  return String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 90);
}

function csvEscape(value) {
  const text = value == null ? '' : String(value);
  if (/[;"\r\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

function csvLine(fields) {
  return fields.map(csvEscape).join(';');
}

function descriptionFor(mapping, product) {
  const name = mapping.displayName;
  const category = mapping.categoryName;
  const sku = product.codigo || mapping.sku;
  const stock = product.estoque ?? product.saldo ?? '';
  const price = product.preco ?? product.valor ?? '';
  const lowerCategory = category.toLowerCase();
  let shortDescription = `${name} selecionado para a KA Bijoux, com apresentação caprichada e proposta prática para o dia a dia.`;
  let fullDescription = `O ${name} é uma opção prática e bonita para quem busca um produto funcional, fácil de usar e com visual bem apresentado. A imagem principal foi revisada para representar melhor o item e facilitar a escolha no site.`;
  let usage = 'Utilize conforme a finalidade do produto e siga sempre as orientacoes da embalagem. Em caso de duvida, teste primeiro em uma pequena area ou use de forma gradual.';
  let care = 'Mantenha em local seco e arejado, longe de calor excessivo. Evite quedas, umidade em excesso e contato com produtos abrasivos.';

  if (lowerCategory.includes('eletron')) {
    shortDescription = `${name} para facilitar a rotina com mais praticidade, organizacao e bom acabamento.`;
    fullDescription = `O ${name} e uma escolha pratica para uso diario, com visual moderno e facil de combinar com diferentes necessidades. Ideal para quem quer um acessorio funcional, simples de transportar e pronto para ajudar na rotina.`;
    usage = 'Conecte ou carregue conforme a indicacao do produto. Antes do primeiro uso, confira a compatibilidade com o aparelho e evite forcar conectores.';
    care = 'Evite contato com agua, quedas e calor excessivo. Guarde o produto em local seco e desconecte da energia quando nao estiver usando.';
  } else if (lowerCategory.includes('perfume') || lowerCategory.includes('aromas')) {
    shortDescription = `${name} para deixar o ambiente ou a rotina mais agradavel, com toque perfumado e apresentacao elegante.`;
    fullDescription = `O ${name} traz uma sensacao agradavel para o ambiente ou para o uso pessoal indicado, ajudando a deixar a experiencia mais acolhedora e bem cuidada. E uma opcao charmosa para quem gosta de produtos perfumados e faceis de usar.`;
    usage = 'Aplique conforme a indicacao do rotulo. Para ambientes e tecidos, borrife a distancia segura e teste antes em uma pequena area discreta.';
    care = 'Nao ingerir. Evite contato com olhos e mucosas. Mantenha fora do alcance de criancas e animais, em local fresco e protegido do sol.';
  } else if (lowerCategory.includes('bijuterias') || lowerCategory.includes('cabelo') || lowerCategory.includes('relogios')) {
    shortDescription = `${name} para completar o visual com um toque delicado, versatil e elegante.`;
    fullDescription = `O ${name} e um acessorio pensado para valorizar o visual em diferentes ocasioes. Combina praticidade, brilho na medida e acabamento bonito para deixar a producao mais especial.`;
    usage = 'Use para compor looks do dia a dia ou ocasioes especiais. Ajuste com cuidado e retire antes de dormir, tomar banho ou praticar atividades intensas.';
    care = 'Evite contato com agua, perfumes, cremes e produtos quimicos. Guarde separado de outras pecas para preservar o brilho e o acabamento.';
  } else if (lowerCategory.includes('moda')) {
    shortDescription = `${name} com proposta pratica para dar mais conforto, seguranca e acabamento ao visual.`;
    fullDescription = `O ${name} ajuda a compor looks com mais praticidade e conforto, oferecendo uma solucao discreta para diferentes producoes. E uma opcao util para quem busca acabamento bonito sem abrir mao da facilidade de uso.`;
    usage = 'Use sobre a pele limpa e seca, seguindo a orientacao da embalagem. Ajuste com cuidado para garantir conforto durante o uso.';
    care = 'Higienize conforme o material do produto e guarde em local limpo e seco. Suspenda o uso em caso de desconforto ou irritacao.';
  } else if (lowerCategory.includes('pet')) {
    shortDescription = `${name} para auxiliar nos cuidados do pet com mais praticidade e carinho.`;
    fullDescription = `O ${name} e indicado para facilitar a rotina de higiene e cuidado do pet, com formato pratico e uso simples. Ajuda a manter o cuidado em dia de forma mais organizada.`;
    usage = 'Use com delicadeza e supervisao, respeitando o comportamento do pet. Introduza o produto aos poucos para deixar a experiencia mais tranquila.';
    care = 'Lave e seque apos o uso quando aplicavel. Guarde em local limpo e evite compartilhar entre animais sem higienizacao.';
  } else if (lowerCategory.includes('casa')) {
    shortDescription = `${name} para deixar a rotina mais organizada, pratica e bonita.`;
    fullDescription = `O ${name} e uma solucao funcional para organizar, decorar ou facilitar tarefas do dia a dia. Tem proposta simples, visual bem apresentado e combina com diferentes ambientes.`;
    usage = 'Use conforme a finalidade do produto. Instale, encaixe ou posicione em superficie adequada, limpa e seca quando necessario.';
    care = 'Limpe com pano macio e seco ou levemente umedecido quando aplicavel. Evite produtos abrasivos, excesso de agua e exposicao prolongada ao sol.';
  }

  return {
    shortDescription,
    fullDescription,
    features: [
      `Produto: ${name}`,
      `Categoria: ${mapping.categoryName}`,
      `Material/Composicao visual: ${mapping.material}`,
      `Cor/Versao: ${mapping.color}`,
      'Conteudo da embalagem: 1 unidade, salvo indicacao diferente no cadastro',
      sku ? `Codigo/SKU: ${sku}` : null,
      price !== '' ? `Valor cadastrado: R$ ${String(price).replace('.', ',')}` : null,
      stock !== '' ? `Estoque cadastrado: ${stock}` : null,
    ].filter(Boolean),
    usage,
    care,
  };
}

function makeOverride(mapping, product, imageFile) {
  const content = descriptionFor(mapping, product);
  const slug = slugify(mapping.displayName);
  return {
    sku: mapping.sku,
    blingId: String(product.id || product.blingId || ''),
    displayName: mapping.displayName,
    seoSlug: slug,
    categoryName: mapping.categoryName,
    subcategoryName: mapping.subcategoryName,
    imageFile,
    shortDescription: content.shortDescription,
    fullDescription: content.fullDescription,
    features: content.features,
    usageInstructions: content.usage,
    careInstructions: content.care,
    isAdult: false,
    source: 'produto-lote-1',
    reviewedAt: new Date().toISOString(),
  };
}

function main() {
  fs.mkdirSync(reportDir, { recursive: true });
  fs.mkdirSync(uploadsDir, { recursive: true });

  const inventory = readJson(inventoryPath);
  const products = readJson(blingPath);
  const productBySku = new Map(products.map((p) => [String(p.codigo || p.sku || ''), p]));
  const inventoryByItem = new Map(inventory.map((row) => [Number(row.item), row]));

  const overrides = readJson(overridesPath);
  const overrideByKey = new Map();
  overrides.forEach((entry, index) => {
    if (entry.sku) overrideByKey.set(`sku:${entry.sku}`, index);
    if (entry.blingId) overrideByKey.set(`id:${entry.blingId}`, index);
  });

  let imageFiles = readJson(imageFilesPath);
  if (!Array.isArray(imageFiles)) imageFiles = [];
  const imageFileSet = new Set(imageFiles.map((entry) => (typeof entry === 'string' ? entry : entry.file || entry.imageFile || entry.filename)).filter(Boolean));

  const applied = [];
  const errors = [];
  const safeItems = new Set();

  for (const mapping of safeMappings) {
    safeItems.add(mapping.item);
    const inventoryRow = inventoryByItem.get(mapping.item);
    const product = productBySku.get(mapping.sku);
    if (!inventoryRow) {
      errors.push({ item: mapping.item, sku: mapping.sku, reason: 'Imagem nao encontrada no inventario local.' });
      continue;
    }
    if (!product) {
      errors.push({ item: mapping.item, sku: mapping.sku, reason: 'SKU nao encontrado no export local do Bling.' });
      continue;
    }

    const sourceFile = inventoryRow.filename || inventoryRow.arquivo;
    const ext = path.extname(sourceFile).toLowerCase() || '.png';
    const imageFile = `${slugify(mapping.displayName)}-${mapping.sku}${ext}`;
    const sourcePath = inventoryRow.path || path.join(sourceDir, sourceFile);
    const destPath = path.join(uploadsDir, imageFile);
    fs.copyFileSync(sourcePath, destPath);

    const nextOverride = makeOverride(mapping, product, imageFile);
    const key = nextOverride.sku ? `sku:${nextOverride.sku}` : `id:${nextOverride.blingId}`;
    const existingIndex = overrideByKey.get(key);
    if (typeof existingIndex === 'number') {
      overrides[existingIndex] = { ...overrides[existingIndex], ...nextOverride };
    } else {
      overrides.push(nextOverride);
      overrideByKey.set(key, overrides.length - 1);
    }

    imageFileSet.add(imageFile);
    applied.push({
      item: mapping.item,
      sourceFile,
      imageFile,
      sku: mapping.sku,
      blingId: product.id || '',
      blingName: product.nome || '',
      displayName: mapping.displayName,
      categoryName: mapping.categoryName,
      price: product.preco ?? '',
      stock: product.estoque ?? '',
      productUrl: `http://localhost:3000/produto/${nextOverride.seoSlug}`,
      status: 'APLICADO_LOCAL',
    });
  }

  writeJson(overridesPath, overrides);
  writeJson(imageFilesPath, Array.from(imageFileSet).sort());

  const pending = [];
  for (const row of inventory) {
    const item = Number(row.item);
    if (safeItems.has(item)) continue;
    const duplicateReason = duplicateOrGallery.get(item);
    pending.push({
      item,
      sourceFile: row.filename || row.arquivo,
      status: duplicateReason ? 'DUPLICADA_OU_VARIACAO_PENDENTE' : 'PENDENTE_REVISAO',
      reason: duplicateReason || 'Sem correspondencia segura com SKU unico no export local do Bling. Precisa revisar antes de associar.',
    });
  }

  const headers = ['item', 'sourceFile', 'imageFile', 'sku', 'blingId', 'blingName', 'displayName', 'categoryName', 'price', 'stock', 'productUrl', 'status'];
  fs.writeFileSync(
    path.join(reportDir, 'lote1-applied-local.csv'),
    [headers.join(';'), ...applied.map((row) => csvLine(headers.map((h) => row[h])))].join('\n') + '\n',
    'utf8',
  );

  const pendingHeaders = ['item', 'sourceFile', 'status', 'reason'];
  fs.writeFileSync(
    path.join(reportDir, 'lote1-pending-review.csv'),
    [pendingHeaders.join(';'), ...pending.map((row) => csvLine(pendingHeaders.map((h) => row[h])))].join('\n') + '\n',
    'utf8',
  );

  const queueHeaders = ['item', 'sourceFile', 'sku', 'blingId', 'blingName', 'displayName', 'imageFile', 'productUrl', 'blingOnlineStatus'];
  fs.writeFileSync(
    path.join(reportDir, 'bling-upload-safe-queue.csv'),
    [
      queueHeaders.join(';'),
      ...applied.map((row) =>
        csvLine(queueHeaders.map((h) => (h === 'blingOnlineStatus' ? 'AGUARDANDO_APROVACAO_E_URL_PUBLICA_DA_IMAGEM' : row[h]))),
      ),
    ].join('\n') + '\n',
    'utf8',
  );

  const summary = {
    sourceDir,
    totalImages: inventory.length,
    appliedLocal: applied.length,
    pendingReview: pending.length,
    errors: errors.length,
    blingOnlineUpdated: 0,
    blingOnlineStatus: 'Nao atualizado nesta etapa; fila segura criada para revisao antes de escrita online.',
    generatedAt: new Date().toISOString(),
  };
  writeJson(path.join(reportDir, 'lote1-summary.json'), summary);

  const md = [
    '# Produto Lote 1 - Aplicacao local',
    '',
    `- Pasta origem: \`${sourceDir}\``,
    `- Imagens no lote: ${inventory.length}`,
    `- Produtos atualizados na plataforma local: ${applied.length}`,
    `- Pendentes para revisao: ${pending.length}`,
    `- Erros: ${errors.length}`,
    '- Bling online: nao atualizado nesta etapa. Foi criada uma fila segura para upload depois de revisao/aprovacao.',
    '',
    '## Arquivos gerados',
    '',
    '- `reports/product-lote-1/lote1-applied-local.csv`',
    '- `reports/product-lote-1/lote1-pending-review.csv`',
    '- `reports/product-lote-1/bling-upload-safe-queue.csv`',
    '- `reports/product-lote-1/contact-sheet-01.jpg` ate `contact-sheet-10.jpg`',
    '',
    '## Produtos aplicados',
    '',
    ...applied.map((row) => `- ${String(row.item).padStart(3, '0')} | ${row.sku} | ${row.displayName} | ${row.productUrl} | ${row.imageFile}`),
    '',
    '## Pendentes',
    '',
    ...pending.slice(0, 80).map((row) => `- ${String(row.item).padStart(3, '0')} | ${row.status} | ${row.sourceFile} | ${row.reason}`),
    pending.length > 80 ? `- ... mais ${pending.length - 80} itens no CSV de pendencias.` : '',
  ].filter(Boolean).join('\n');
  fs.writeFileSync(path.join(reportDir, 'lote1-report.md'), md + '\n', 'utf8');

  console.log(JSON.stringify(summary, null, 2));
}

main();
