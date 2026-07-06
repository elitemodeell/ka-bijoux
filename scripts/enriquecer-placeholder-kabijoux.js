/**
 * enriquecer-placeholder-kabijoux.js
 *
 * Corrige os 47 produtos no banco que ainda têm a descrição placeholder
 * "produto de qualidade KA Bijoux. Consulte detalhes..."
 */
const path = require('path');
const BACKEND_DIR = path.resolve(__dirname, '..', 'backend');
require('dotenv').config({ path: path.join(BACKEND_DIR, '.env') });
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const UPDATES = [
  {
    id: 'cmr6i214z00a4rhf8e9h96zle',
    description: 'Adesivo protetor de silicone autoadesivo para proteger calcanhares, dedos e pontos de atrito nos sapatos. Elimina bolhas e feridas causadas pelo atrito dos calçados novos ou fechados.',
    benefits: '• Silicone macio que absorve o atrito\n• Autoadesivo — gruda firme e não sai durante o uso\n• Previne bolhas e calos\n• Transparente e invisível no sapato\n• Reutilizável: lave e reaproveite',
    howToUse: 'Limpe e seque o interior do sapato. Cole o adesivo protetor na região de maior atrito. Pode ser reutilizado após lavagem.',
    searchTags: ['adesivo', 'protetor silicone', 'calcanhar', 'bolha', 'sapato', 'conforto'],
  },
  {
    id: 'cmr6i1qd0001srhf8pu6ckfdu',
    description: 'Água perfumada para tecidos e ambientes com fragrância suave e duradoura. Perfuma roupas, cama, sofás e cortinas deixando um aroma fresco e agradável por horas. Não mancha tecidos.',
    benefits: '• Fragrância suave e duradoura nos tecidos\n• Ideal para roupas, cama, cortinas e sofás\n• Não mancha — fórmula segura para tecidos delicados\n• Elimina odores e refresca o ambiente\n• Spray prático de fácil aplicação',
    howToUse: 'Borrife sobre tecidos ou no ambiente a 20-30cm de distância. Para roupas, aplique pelo avesso e deixe secar antes de vestir.',
    searchTags: ['agua perfumada', 'tecidos', 'aroma', 'odorizador', 'spray', 'frescor'],
  },
  {
    id: 'cmr6i1raw002jrhf8pungde9r',
    description: 'Kit de anéis de cabelo coloridos para tranças, dreads e penteados criativos. Cores vibrantes que transformam qualquer penteado em uma produção única e cheia de estilo. Tendência forte entre looks afro e boho.',
    benefits: '• Cores vibrantes e variadas — look exclusivo\n• Fácil de aplicar em tranças e mechas\n• Ideal para penteados criativos e looks afro\n• Material leve e confortável\n• Não danifica o cabelo',
    howToUse: 'Separe uma mecha ou trança e deslize o anel até a posição desejada. Aperte levemente para fixar. Remova puxando suavemente.',
    searchTags: ['anel de cabelo', 'colorido', 'tranca', 'acessorio cabelo', 'dread', 'penteado criativo'],
  },
  {
    id: 'cmr6i1rf1002mrhf8sfz3cj0m',
    description: 'Kit de anéis de cabelo dourados para tranças, dreads e penteados com toque glamouroso. O dourado adiciona sofisticação e brilho ao visual, ideal para looks festivos e do dia a dia.',
    benefits: '• Acabamento dourado brilhante e elegante\n• Fácil de aplicar em tranças e mechas\n• Eleva qualquer penteado ao próximo nível\n• Material leve e resistente\n• Não danifica o cabelo',
    howToUse: 'Deslize o anel pela trança ou mecha até a posição desejada e aperte levemente para fixar.',
    searchTags: ['anel de cabelo', 'dourado', 'tranca', 'acessorio cabelo', 'glamour', 'penteado'],
  },
  {
    id: 'cmr6i1riq002prhf8zfvtrn72',
    description: 'Kit de anéis de cabelo prateados para tranças, dreads e penteados com toque clássico e elegante. O prata combina com qualquer cor de cabelo e look, do casual ao social.',
    benefits: '• Acabamento prateado clássico e versátil\n• Fácil de aplicar em tranças e mechas\n• Combina com qualquer look\n• Material leve e duradouro\n• Não danifica o cabelo',
    howToUse: 'Deslize o anel pela trança ou mecha até a posição desejada e aperte levemente para fixar.',
    searchTags: ['anel de cabelo', 'prata', 'tranca', 'acessorio cabelo', 'penteado', 'elegante'],
  },
  {
    id: 'cmr6i1rme002srhf8pr554060',
    description: 'Aparador higiênico recarregável para pelos do corpo — nariz, orelha, sobrancelha e contorno. Motor silencioso, lâmina de precisão e carregamento via USB. Acabamento profissional em casa.',
    benefits: '• Lâmina de precisão para acabamento perfeito\n• Motor silencioso e potente\n• Bateria recarregável via USB — sem pilhas\n• Seguro para usar em qualquer região do corpo\n• Acompanha 4 pentes guia e escovinha',
    howToUse: 'Carregue via USB antes do primeiro uso. Escolha o pente guia desejado, ligue o aparador e use em movimentos suaves contra o crescimento dos pelos.',
    searchTags: ['aparador', 'pelos', 'higiênico', 'recarregavel', 'trimmer', 'nariz', 'orelha'],
  },
  {
    id: 'cmr6i1s870037rhf8kqlsglve',
    description: 'Capa protetora impermeável para tênis em dias de chuva. Encaixe rápido sobre o calçado, mantendo os pés secos e o tênis limpo sem precisar trocar de sapato.',
    benefits: '• Proteção impermeável contra chuva e poças\n• Encaixe rápido e fácil sobre o tênis\n• Material resistente e antiderrapante\n• Leve e compacta — cabe na bolsa\n• Conserva o tênis limpo e seco',
    howToUse: 'Encaixe a bota de chuva sobre o tênis calçado, ajustando bem nas laterais. Remova após o uso e guarde dobrada.',
    searchTags: ['bota chuva', 'tenis', 'impermeavel', 'protetor calçado', 'chuva'],
  },
  {
    id: 'cmr6i1sbz003arhf8ugwwuv0p',
    description: 'Bracelete feminino em aço inox estilo Cartier com pedras strass brilhantes. Design sofisticado que combina com looks casuais e sociais. Material resistente que não oxida e não escurece a pele.',
    benefits: '• Aço inox de alta qualidade — não oxida\n• Pedras strass brilhantes estilo joalheria\n• Design Cartier atemporal e elegante\n• Fecho seguro e confortável\n• Versátil para o dia a dia e eventos',
    howToUse: 'Encaixe pelo fecho e ajuste ao pulso. Combine com outras pulseiras para o look layering.',
    searchTags: ['bracelete', 'aco inox', 'cartier', 'strass', 'bijuteria', 'elegante'],
  },
  {
    id: 'cmr6i1sfk003drhf8jjdkm15b',
    description: 'Bracelete em aço inox liso com acabamento polido e brilhante. Design minimalista e versátil, perfeito para quem prefere um visual clean e moderno. Material durável que resiste à oxidação.',
    benefits: '• Aço inox liso — acabamento polido e brilhante\n• Design minimalista e moderno\n• Resistente à oxidação e ao suor\n• Versátil para qualquer look\n• Confortável e leve',
    howToUse: 'Encaixe no pulso pelo fecho. Use sozinho ou em conjunto com outros braceletes.',
    searchTags: ['bracelete', 'aco inox', 'liso', 'minimalista', 'bijuteria'],
  },
  {
    id: 'cmr6i1smy003jrhf8uznhtnv4',
    description: 'Bracelete em aço inox estilo Roma com detalhes gravados inspirados na arquitetura clássica. Peça robusta e marcante com acabamento premium que combina com looks masculinos e femininos.',
    benefits: '• Design romano clássico com gravações detalhadas\n• Aço inox resistente e durável\n• Acabamento premium com brilho duradouro\n• Visual marcante e diferenciado\n• Não oxida e não mancha a pele',
    howToUse: 'Encaixe pelo fecho e ajuste ao pulso. A peça combina com relógios e outros acessórios.',
    searchTags: ['bracelete', 'aco inox', 'roma', 'gravado', 'bijuteria', 'classico'],
  },
  {
    id: 'cmr6i1sqr003mrhf8tlky6sx3',
    description: 'Bracelete temático do Brasil com as cores da bandeira para mostrar o orgulho nacional. Perfeito para Copa do Mundo, olimpíadas, eventos esportivos e o dia a dia de quem ama o Brasil.',
    benefits: '• Cores autênticas do Brasil — verde, amarelo e azul\n• Perfeito para eventos esportivos e Copa\n• Design patriótico e animado\n• Leve e confortável no pulso\n• Ótimo presente para torcedores',
    howToUse: 'Encaixe no pulso e combine com outros itens Brasil (faixa, broche) para o visual completo.',
    searchTags: ['bracelete', 'brasil', 'copa', 'verde amarelo', 'patriota', 'torcedor'],
  },
  {
    id: 'cmr6i1suk003prhf89n8nk76r',
    description: 'Broche do Brasil com as cores nacionais para compor looks patrióticos com estilo. Acessório versátil que pode ser fixado em bolsas, jaquetas, camisas e bonés. Ideal para eventos esportivos e festas nacionais.',
    benefits: '• Cores do Brasil vibrantes e autênticas\n• Fácil de fixar em qualquer tecido\n• Leve e discreto — não pesa a roupa\n• Ideal para Copa, olimpíadas e datas nacionais\n• Ótimo souvenir e presente',
    howToUse: 'Abra o fecho do broche e prenda no tecido desejado. Feche bem para fixar com segurança.',
    searchTags: ['broche', 'brasil', 'verde amarelo', 'patriota', 'copa', 'acessorio'],
  },
  {
    id: 'cmr6i1t5r003yrhf871xf5jhg',
    description: 'Cabo USB Lightning de alta velocidade para carregar e sincronizar iPhone, iPad e iPod. Revestimento reforçado que resiste a dobras e puxões, garantindo maior durabilidade no uso diário.',
    benefits: '• Compatível com todos os dispositivos Apple Lightning\n• Revestimento reforçado — maior durabilidade\n• Carregamento rápido e estável\n• Transferência de dados de alta velocidade\n• Comprimento ideal para uso confortável',
    howToUse: 'Conecte a ponta Lightning ao iPhone e a outra extremidade a uma fonte USB ou tomada. Carregamento começa automaticamente.',
    searchTags: ['cabo', 'lightning', 'iphone', 'apple', 'carregador', 'usb'],
  },
  {
    id: 'cmr6i1t21003vrhf8ba72x3q2',
    description: 'Cabo USB V8 Micro 60W de carregamento rápido para smartphones Android, fones e outros dispositivos Micro USB. Revestimento reforçado para maior durabilidade no dia a dia.',
    benefits: '• Potência de 60W — carregamento rápido\n• Compatível com a maioria dos Android (Micro USB)\n• Revestimento reforçado anti-quebra\n• Transferência de dados incluída\n• Comprimento confortável',
    howToUse: 'Conecte a ponta Micro USB ao aparelho e a outra extremidade a uma fonte USB ou tomada com saída adequada.',
    searchTags: ['cabo', 'v8', 'micro usb', 'android', 'carregador rapido', '60w'],
  },
  {
    id: 'cmr6i1td30044rhf8ec6y94h4',
    description: 'Cabo USB-C Tipo-C 60W para carregamento rápido de smartphones modernos, notebooks e tablets. Material reforçado com proteção contra dobramento excessivo nas pontas.',
    benefits: '• 60W de potência — carregamento rápido\n• Compatível com USB-C (Android moderno, MacBook, etc)\n• Pontas reforçadas anti-quebra\n• Transferência de dados de alta velocidade\n• Durável e flexível',
    howToUse: 'Conecte a ponta USB-C ao aparelho e a outra extremidade a uma fonte compatível. A carga começa automaticamente.',
    searchTags: ['cabo', 'usb c', 'tipo c', 'carregador rapido', '60w', 'android', 'notebook'],
  },
  {
    id: 'cmr6i1tvx004jrhf8gydmq4nb',
    description: 'Caixa de som portátil com conexão Bluetooth para ouvir música e receber chamadas em qualquer lugar. Som claro e potente em design compacto que cabe na mochila.',
    benefits: '• Bluetooth sem fio para smartphone e tablet\n• Som claro e potente para o tamanho\n• Design compacto e portátil\n• Microfone integrado para chamadas\n• Bateria recarregável de longa duração',
    howToUse: 'Ligue a caixa de som e ative o Bluetooth. Pareie com o smartphone e ajuste o volume no aparelho e na caixa.',
    searchTags: ['caixa de som', 'bluetooth', 'portatil', 'musica', 'wireless', 'speaker'],
  },
  {
    id: 'cmr6i1tzm004mrhf8v4hsd8uk',
    description: 'Calcinha com cinta-liga sexy em renda com elástico decorativo. Peça que une a praticidade da calcinha com o charme da cinta, criando um visual sensual completo sem precisar de peças separadas.',
    benefits: '• Visual sensual completo em uma só peça\n• Renda delicada e confortável\n• Cinta-liga integrada — praticidade total\n• Design que valoriza as curvas\n• Perfeita para momentos especiais',
    howToUse: 'Vista normalmente. Ajuste a cinta-liga ao comprimento desejado. Use com meia-calça fina para o visual completo.',
    searchTags: ['calcinha', 'cinta liga', 'sexy', 'renda', 'lingerie', 'sensual'],
  },
  {
    id: 'cmr6i1u77004srhf8gb24eien',
    description: 'Carimbo para francesinha (unhas) que permite criar a borda branca perfeita sem esforço. Resultado de salão em casa com praticidade e precisão. Compatível com todos os tamanhos de unhas.',
    benefits: '• Cria a francesinha perfeita em segundos\n• Resultado profissional em casa\n• Compatível com todos os tamanhos de unhas\n• Fácil de usar — sem precisar de esparadrapo\n• Reutilizável e durável',
    howToUse: 'Aplique o esmalte base. Pressione o carimbo na ponta da unha para criar a borda e aplique o esmalte branco. Remova e finalize com top coat.',
    searchTags: ['carimbo', 'francesinha', 'unhas', 'nail art', 'esmalte', 'manicure'],
  },
  {
    id: 'cmr6i1uaz004vrhf8w75y3y4k',
    description: 'Carregador veicular com cabo incluso para carregar o celular no carro de forma rápida e prática. Encaixa no acendedor de cigarros e oferece saída USB para qualquer dispositivo.',
    benefits: '• Carrega no carro via entrada do acendedor\n• Cabo incluso — pronto para usar\n• Compatível com todos os smartphones via USB\n• Carregamento rápido e estável\n• Design compacto que não obstrui visão',
    howToUse: 'Encaixe o carregador no acendedor do carro, conecte o cabo ao smartphone e o carregamento começa automaticamente.',
    searchTags: ['carregador veicular', 'carro', 'cabo', 'usb', 'celular', 'carregamento rapido'],
  },
  {
    id: 'cmr6i1uer004yrhf84uhuz7bs',
    description: 'Cesta decorativa para montar um presente especial no Dia dos Namorados ou em qualquer data importante. Cesta vazia ou pré-montada com produtos selecionados para surpreender quem você ama.',
    benefits: '• Apresentação elegante — presente pronto para entregar\n• Pode ser personalizada com produtos à escolha\n• Ideal para Dia dos Namorados, aniversário e datas especiais\n• Tamanho generoso para compor um lindo kit\n• Presenteie com amor e cuidado',
    howToUse: 'Preencha a cesta com os itens desejados, finalize com papel celofane e laço para um presente perfeito.',
    searchTags: ['cesta', 'presente', 'namorados', 'kit presente', 'decorativa'],
  },
  {
    id: 'cmr6i1uig0051rhf8axluj75o',
    description: 'Chinelo do seu time do coração para torcer com estilo e conforto. Palmilha macia e solado antiderrapante para uso em casa, na rua e na arquibancada. Presente perfeito para torcedores fanáticos.',
    benefits: '• Estampa oficial do time — torcida com estilo\n• Palmilha macia para conforto prolongado\n• Solado antiderrapante e durável\n• Ótimo presente para torcedores\n• Disponível em vários times',
    howToUse: 'Vista normalmente. Ideal para uso em casa e lazer.',
    searchTags: ['chinelo', 'time', 'futebol', 'torcedor', 'presente', 'conforto'],
  },
  {
    id: 'cmr6i1okk000drhf8dcyu413r',
    description: 'Comedouro retrátil portátil para pets, ideal para viagens e passeios. Quando recolhido ocupa pouco espaço na mochila. Expande rapidamente para servir água ou ração ao seu pet onde estiver.',
    benefits: '• Retrátil e compacto — cabe em qualquer bolsa\n• Expande em segundos para alimentar o pet\n• Material seguro e atóxico\n• Fácil de lavar e higienizar\n• Ideal para passeios, viagens e treinamentos',
    howToUse: 'Expanda o comedouro puxando as bordas, encha com água ou ração e ofereça ao pet. Após o uso, lave e recolha.',
    searchTags: ['comedouro', 'retratil', 'pet', 'cachorro', 'gato', 'viagem', 'portatil'],
  },
  {
    id: 'cmr6i1uua005arhf8ygcrfmzu',
    description: 'Conjunto colar e brinco temático do Brasil com as cores nacionais para looks patrióticos e eventos esportivos. Peças combinadas que completam o visual verde e amarelo com charme e identidade.',
    benefits: '• Conjunto combinado colar + brinco\n• Cores autênticas do Brasil\n• Perfeito para Copa, olimpíadas e festas nacionais\n• Visual completo em um único kit\n• Ótimo presente para torcedores',
    howToUse: 'Use o colar pelo pescoço e os brincos nas orelhas. Combine com faixa e bracelete Brasil para o look completo.',
    searchTags: ['colar', 'brinco', 'conjunto', 'brasil', 'verde amarelo', 'copa', 'bijuteria'],
  },
  {
    id: 'cmr6i1ogo000arhf8s2jew94j',
    description: 'Cordão / alça para celular que permite carregar o smartphone pendurado no pescoço ou pulso, deixando as mãos livres. Estiloso, prático e seguro — reduz o risco de queda do celular.',
    benefits: '• Mãos livres durante o uso do celular\n• Reduz o risco de quedas\n• Compatível com capinhas com orifício lateral\n• Comprimento ajustável\n• Estiloso e moderno',
    howToUse: 'Encaixe a cordinha no orifício da capinha do celular. Ajuste o comprimento e passe pelo pescoço ou pulso.',
    searchTags: ['corda celular', 'alça celular', 'lanyard', 'pescoço', 'segurança celular'],
  },
  {
    id: 'cmr6i1pxz001grhf82io1vx2q',
    description: 'Dispenser de água elétrico para galões de 5 a 20 litros com bomba recarregável via USB. Serve água com um toque — sem precisar inclinar o galão ou fazer força. Prático, higiênico e silencioso.',
    benefits: '• Elimina o esforço de inclinar o galão\n• Bomba elétrica recarregável via USB\n• Serve água com apenas um toque\n• Compatível com galões de 5, 10 e 20 litros\n• Silencioso e higiênico',
    howToUse: 'Carregue via USB. Encaixe no galão, ligue e pressione o botão para servir água. Recarregue quando necessário.',
    searchTags: ['dispenser', 'agua', 'eletrico', 'galao', 'bomba agua', 'recarregavel'],
  },
  {
    id: 'cmr6i1vdj005prhf86er4xiys',
    description: 'Escova de dente dupla para pets com duas pontas — uma maior e uma menor — para higienizar dentes grandes e pequenos do seu cão ou gato com facilidade e eficiência.',
    benefits: '• Duas pontas para dentes de diferentes tamanhos\n• Cerdas macias que não machucam as gengivas\n• Ergonômica — fácil de segurar durante a escovação\n• Compatível com cães e gatos\n• Material durável e fácil de higienizar',
    howToUse: 'Aplique pasta de dente específica para pets na escova. Escove os dentes do animal em movimentos circulares suaves por 1-2 minutos. Repita 2-3 vezes por semana.',
    searchTags: ['escova dente pet', 'higiene pet', 'cachorro', 'gato', 'dental pet'],
  },
  {
    id: 'cmr6i1wuh006vrhf8t4dpnupu',
    description: 'Jogo de sedução para casais com cartas, dados e desafios picantes para esquentar a relação. Perfeito para sair da rotina e criar momentos inesquecíveis de diversão e intimidade.',
    benefits: '• Cartas e desafios para estimular a imaginação\n• Esquenta a relação e sai da rotina\n• Fácil de jogar — sem regras complicadas\n• Proporciona momentos únicos e divertidos\n• Embalagem discreta e elegante',
    howToUse: 'Abra o jogo com o parceiro em um momento a dois. Siga as instruções das cartas e dados. Deixe a imaginação fluir!',
    searchTags: ['jogo sedução', 'casal', 'cartas', 'diversão', 'sex shop', 'intimidade'],
  },
  {
    id: 'cmr6i1wy3006yrhf8jyn5q8y7',
    description: 'Jogo Duelo do Prazer para casais com desafios sensuais em formato de competição. Uma forma divertida e estimulante de descobrir novas possibilidades e intensificar a intimidade a dois.',
    benefits: '• Formato de duelo — competição divertida e sensual\n• Desafios que estimulam a imaginação\n• Sai da rotina com criatividade\n• Perfeito para casais de todos os perfis\n• Embalagem discreta',
    howToUse: 'Cada jogador recebe suas cartas de desafio. Sorteie quem começa e siga os desafios propostos. O parceiro que mais pontuar vence — e os dois saem ganhando!',
    searchTags: ['jogo casal', 'duelo do prazer', 'sex shop', 'cartas', 'desafios', 'sensual'],
  },
  {
    id: 'cmr6i1x9m0077rhf8vijleket',
    description: 'Kit com 4 prendedores de lençol elásticos para manter o lençol fixo no colchão sem escorregar. Acabamento com a cama sempre arrumado, mesmo ao se virar durante a noite.',
    benefits: '• 4 unidades — uma em cada canto do colchão\n• Mantém o lençol no lugar durante a noite\n• Elástico resistente e duradouro\n• Compatível com colchões de vários tamanhos\n• Fácil de instalar e remover',
    howToUse: 'Prenda os 4 elásticos nos cantos do lençol e encaixe sob o colchão. Ajuste a tensão para fixar sem enrugar.',
    searchTags: ['prendedor lencol', 'kit', 'lencol', 'cama', 'elastico', 'organizar cama'],
  },
  {
    id: 'cmr6i1x1s0071rhf8gy6sr6lr',
    description: 'Kit de frascos de viagem recarregáveis para transportar shampoo, condicionador, creme e outros produtos em viagens. Prático, compacto e aprovado para levar na bagagem de mão.',
    benefits: '• Frascos recarregáveis — use seus produtos preferidos\n• Tamanho aprovado para bagagem de mão (até 100ml)\n• Kit completo com diferentes formatos\n• Vedação segura — sem vazamentos\n• Material BPA Free e atóxico',
    howToUse: 'Abra o frasco, preencha com o produto desejado e feche bem. Etiquete cada frasco para identificar facilmente.',
    searchTags: ['frasco viagem', 'kit', 'shampoo viagem', 'bagagem mao', 'portatil', 'recarregavel'],
  },
  {
    id: 'cmr6i1x5o0074rhf8c4je275e',
    description: 'Limpa prata líquido para recuperar o brilho de joias, bijuterias e objetos de prata e metal prateado. Fórmula que remove oxidação e manchas rapidamente, devolvendo o brilho original em minutos.',
    benefits: '• Remove oxidação e manchas da prata\n• Devolve o brilho original em minutos\n• Funciona em joias, bijuterias e objetos prateados\n• Fácil de usar com pano ou escovinha\n• Fórmula segura para a maioria dos metais',
    howToUse: 'Aplique uma pequena quantidade no pano ou escovinha e esfregue suavemente na peça. Enxágue com água e seque bem.',
    searchTags: ['limpa prata', 'prata', 'bijuteria', 'joias', 'limpeza metal', 'brilho'],
  },
  {
    id: 'cmr6i1xsv007mrhf8i5e60qmi',
    description: 'Limpador magnético para vidros com dois lados imantados que limpam simultaneamente as duas faces do vidro. Ideal para janelas altas ou de difícil acesso, eliminando o risco de acidentes.',
    benefits: '• Limpa os dois lados do vidro ao mesmo tempo\n• Ímã potente que mantém os dois lados juntos\n• Sem precisar abrir a janela — mais segurança\n• Ideal para apartamentos e janelas altas\n• Fácil de usar e eficiente',
    howToUse: 'Coloque um lado pela parte interna e o outro pela parte externa do vidro. O ímã os mantém unidos. Deslize em movimentos retos para limpar.',
    searchTags: ['limpa vidro', 'magnetico', 'janela', 'limpeza', 'pratico', 'dois lados'],
  },
  {
    id: 'cmr6i1piu0014rhf8pxkrknn0',
    description: 'Meia de silicone para spa e hidratação dos pés. Cubra os pés com creme hidratante, calce as meias e deixe agir — o silicone sela a umidade e potencializa a absorção do creme para pés macios e hidratados.',
    benefits: '• Potencializa a absorção do creme hidratante\n• Sela a umidade — pés macios e hidratados\n• Silicone macio e confortável\n• Lavável e reutilizável\n• Ideal para tratamentos noturnos de spa em casa',
    howToUse: 'Aplique creme hidratante nos pés, calce as meias de silicone e deixe agir por 20-30 minutos. Lave as meias após o uso.',
    searchTags: ['meia silicone', 'spa', 'hidratação', 'pes', 'creme', 'esfoliante'],
  },
  {
    id: 'cmr6i1p7e000vrhf8rtjodi2d',
    description: 'Mini balança de bolso digital para pesar itens de até 500g com precisão. Ideal para viagem, mala, cozinha e uso profissional. Display LED claro e design compacto que cabe no bolso.',
    benefits: '• Precisão de 0,1g — medição confiável\n• Compacta e leve — cabe no bolso ou mochila\n• Display LED de fácil leitura\n• Modos de medição variados (g, oz, kg)\n• Funciona com pilha — sem precisar carregar',
    howToUse: 'Ligue a balança, aguarde zero, coloque o item e leia o peso no display. Para tarar, pressione o botão com o recipiente na balança.',
    searchTags: ['balança', 'digital', 'portatil', 'pesagem', 'cozinha', 'viagem'],
  },
  {
    id: 'cmr6i1yqv008drhf89wh7qc6a',
    description: 'Mix de colares em malha fina dourada com diferentes comprimentos e estilos. Kit completo para criar o look layering — vários colares combinados que adicionam elegância e sofisticação ao look.',
    benefits: '• Mix de estilos e comprimentos — look layering completo\n• Malha fina dourada com brilho elegante\n• Peças versáteis que combinam com qualquer roupa\n• Ótimo para presentear\n• Material de qualidade que mantém o brilho',
    howToUse: 'Use todos juntos em camadas sobrepostas para o efeito layering, ou escolha o favorito para usar sozinho.',
    searchTags: ['colar', 'malha fina', 'dourada', 'layering', 'bijuteria', 'mix'],
  },
  {
    id: 'cmr6i1zzr0097rhf8vf42a9g1',
    description: 'Perfume feminino inspirado no clássico Chloé, com fragrância floral e delicada de longa duração. Aroma suave de rosa, pêonia e almíscar que emana feminilidade e sofisticação para o dia a dia.',
    benefits: '• Fragrância floral e delicada inspirada no Chloé original\n• Fixação de longa duração\n• Aroma feminino e sofisticado\n• Embalagem elegante\n• Ideal para o dia a dia e ocasiões especiais',
    howToUse: 'Borrife nos pulsos, pescoço e atrás das orelhas. Não esfregue após aplicar — deixe secar naturalmente para preservar o aroma.',
    searchTags: ['perfume', 'chloe', 'feminino', 'floral', 'fragrância', 'sofisticado'],
  },
  {
    id: 'cmr6i1q1r001jrhf8763xaw2b',
    description: 'Porta-joias premium com múltiplos compartimentos para organizar colares, brincos, anéis e pulseiras. Design elegante com revestimento aveludado interno que protege as peças de arranhões.',
    benefits: '• Múltiplos compartimentos para todas as joias\n• Revestimento interno aveludado — protege as peças\n• Espelho interno incluso\n• Design premium e elegante\n• Mantém as joias organizadas e sem embaraçar',
    howToUse: 'Organize cada tipo de joia no compartimento adequado. O espelho interno permite conferir o acessório antes de usar.',
    searchTags: ['porta joias', 'organizador', 'joias', 'bijuteria', 'presente', 'premium'],
  },
  {
    id: 'cmr6i211d00a1rhf8g89b6s7h',
    description: 'Progressiva para cabelo em sachê de uso no chuveiro. Fórmula que age durante o banho para alisar, reduzir o volume e aumentar o brilho dos fios sem precisar de chapinha ou escova profissional.',
    benefits: '• Alisa e reduz volume no próprio chuveiro\n• Fórmula de ação rápida — resultados em minutos\n• Dispensável chapinha após o uso\n• Hidrata e aumenta o brilho dos fios\n• Sachet individual — dose certa sem desperdício',
    howToUse: 'Lave o cabelo normalmente. Aplique o conteúdo do sachê nos fios úmidos, distribua bem e aguarde 15-20 minutos. Enxágue bem e seque com o secador.',
    searchTags: ['progressiva', 'alisamento', 'chuveiro', 'sache', 'cabelo', 'liso'],
  },
  {
    id: 'cmr6i1pmm0017rhf85ishxgi6',
    description: 'Kit com 2 protetores de calcanhar em silicone autoadesivo para evitar bolhas, calos e irritações em sapatos novos ou fechados. O silicone macio absorve o atrito e proporciona conforto imediato.',
    benefits: '• Kit com 2 unidades — um par completo\n• Silicone macio que absorve o atrito\n• Previne bolhas, calos e feridas\n• Autoadesivo — não sai durante o uso\n• Transparente e invisível dentro do sapato\n• Lavável e reutilizável',
    howToUse: 'Limpe e seque o interior do sapato. Retire o papel adesivo e cole o protetor na região do calcanhar. Lave para reutilizar.',
    searchTags: ['protetor calcanhar', 'silicone', 'bolha', 'sapato', 'conforto', 'kit'],
  },
  {
    id: 'cmr6i226200ayrhf8zqon1xd3',
    description: 'Sutiã de silicone sem alças e sem costas para usar com decotes arrojados, roupas de ombro a ombro e vestidos. Adesivo em silicone que sustenta sem aparecer sob a roupa.',
    benefits: '• Sem alças e sem costas — invisível sob qualquer roupa\n• Silicone adesivo com boa sustentação\n• Ideal para decotes profundos e ombro a ombro\n• Reutilizável — lave e reaproveite\n• Disponível em tamanhos variados',
    howToUse: 'Limpe e seque o busto. Retire o papel protetor, posicione o sutiã e pressione firmemente. Lave após o uso com água e sabão neutro para reutilizar.',
    searchTags: ['sutia', 'silicone', 'sem alças', 'sem costas', 'decote', 'adesivo'],
  },
  {
    id: 'cmr6i22oq00bdrhf8di18w7gh',
    description: 'Vale Presente KA Bijoux no valor de R$100,00 — presenteie com liberdade para quem você ama escolher o produto favorito. Válido para qualquer item da loja.',
    benefits: '• Presente perfeito para quem não sabe o que dar\n• R$100,00 em crédito para qualquer produto\n• Sem prazo de validade\n• Entrega digital — imediata e prática\n• Válido para toda a loja KA Bijoux',
    howToUse: 'Presente o vale em formato digital ou físico. Na hora de usar, informe o código no checkout da loja para abater o valor da compra.',
    searchTags: ['vale presente', 'presente', 'gift card', 'credito', 'ka bijoux'],
  },
  {
    id: 'cmr6i22sf00bgrhf8lc2xvdpq',
    description: 'Vale Presente KA Bijoux no valor de R$200,00 — presenteie com generosidade para quem você ama escolher o produto favorito. Válido para qualquer item da loja.',
    benefits: '• Presente premium de R$200,00 em crédito\n• Liberdade total para escolher qualquer produto\n• Sem prazo de validade\n• Entrega digital — imediata e prática\n• Válido para toda a loja KA Bijoux',
    howToUse: 'Presente o vale em formato digital ou físico. Na hora de usar, informe o código no checkout da loja para abater o valor da compra.',
    searchTags: ['vale presente', 'presente', 'gift card', 'credito', 'ka bijoux'],
  },
  {
    id: 'cmr6i22zn00bjrhf8m29c3k3e',
    description: 'Vale Presente KA Bijoux no valor de R$50,00 — presenteie com carinho para quem você ama escolher o produto favorito. Válido para qualquer item da loja.',
    benefits: '• R$50,00 em crédito — presente acessível e especial\n• Liberdade para escolher qualquer produto\n• Sem prazo de validade\n• Entrega digital — imediata e prática\n• Válido para toda a loja KA Bijoux',
    howToUse: 'Presente o vale em formato digital ou físico. Na hora de usar, informe o código no checkout da loja para abater o valor da compra.',
    searchTags: ['vale presente', 'presente', 'gift card', 'credito', 'ka bijoux'],
  },
  {
    id: 'cmr6i23av00bsrhf8wc9yzvsj',
    description: 'Vibrador com controle remoto na cor branca para estimulação íntima com total liberdade de movimentos. Controle sem fio que permite ajustar intensidades à distância, aumentando a excitação.',
    benefits: '• Controle remoto sem fio — liberdade total\n• Múltiplas velocidades e modos de vibração\n• Cor branca elegante\n• Material macio e seguro para a pele\n• Silencioso para uso discreto',
    howToUse: 'Ligue o vibrador e use o controle para ajustar a intensidade. Use com lubrificante à base de água. Limpe com água e sabão neutro após o uso.',
    searchTags: ['vibrador', 'controle remoto', 'branco', 'sex shop', 'estimulação', 'sem fio'],
  },
  {
    id: 'cmr6i23en00bvrhf82bck2p97',
    description: 'Vibrador com controle remoto na cor marrom para estimulação íntima com total liberdade de movimentos. Design discreto com cor neutra e controle sem fio para ajustar as intensidades.',
    benefits: '• Controle remoto sem fio\n• Múltiplos modos de vibração\n• Cor marrom discreta e neutra\n• Material macio e seguro para a pele\n• Silencioso para uso discreto',
    howToUse: 'Use com lubrificante à base de água. Ajuste a intensidade pelo controle. Lave com água e sabão após o uso.',
    searchTags: ['vibrador', 'controle remoto', 'marrom', 'sex shop', 'estimulação'],
  },
  {
    id: 'cmr6i23id00byrhf8b2wd1eny',
    description: 'Vibrador com controle remoto na cor preta para estimulação íntima com elegância e praticidade. O preto transmite sofisticação, e o controle sem fio dá liberdade para explorar sem limitações.',
    benefits: '• Controle remoto sem fio\n• Design preto elegante e sofisticado\n• Múltiplas velocidades e padrões de vibração\n• Material macio e seguro\n• Discreto e silencioso',
    howToUse: 'Use com lubrificante à base de água. Controle a intensidade remotamente. Higienize com água e sabão após cada uso.',
    searchTags: ['vibrador', 'controle remoto', 'preto', 'sex shop', 'estimulação'],
  },
  {
    id: 'cmr6i23m700c1rhf80cbea0gh',
    description: 'Vibrador com controle remoto na cor vermelha para estimulação íntima com paixão e intensidade. O vermelho sensual combina com o controle sem fio para uma experiência apaixonante.',
    benefits: '• Cor vermelha — paixão e sensualidade\n• Controle remoto sem fio\n• Múltiplos modos de vibração\n• Material macio e seguro para a pele\n• Silencioso e discreto',
    howToUse: 'Use com lubrificante à base de água. Ajuste pelo controle remoto. Lave com água e sabão após o uso.',
    searchTags: ['vibrador', 'controle remoto', 'vermelho', 'sex shop', 'estimulação'],
  },
];

async function main() {
  console.log('Corrigindo ' + UPDATES.length + ' produtos com placeholder KA Bijoux...\n');
  let ok = 0, errors = 0;

  for (const fix of UPDATES) {
    try {
      await prisma.product.update({
        where: { id: fix.id },
        data: {
          description: fix.description,
          benefits: fix.benefits,
          howToUse: fix.howToUse,
          searchTags: fix.searchTags,
          enrichmentStatus: 'ENRICHED',
          publicationStatus: 'PUBLISHED',
        },
      });
      console.log('OK → ' + fix.id);
      ok++;
    } catch (err) {
      console.error('ERRO → ' + fix.id + ': ' + err.message);
      errors++;
    }
  }

  console.log('\nResumo: ' + ok + ' OK | ' + errors + ' erros');
}

main()
  .catch(err => { console.error('Erro fatal:', err); process.exit(1); })
  .finally(() => prisma.$disconnect());
