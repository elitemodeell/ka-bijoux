// Static product catalog for sex shop products
// Used as fallback when DB is unavailable and for static detail pages

export type StaticProductVariant = {
  label: string;
  slug: string;
  color?: string;
  active?: boolean;
  sku?: string;
  imageFile?: string;
  images?: string[];
};

export type StaticProduct = {
  slug: string;
  name: string;
  sku: string;
  price: number;
  subcategorySlug: string;
  imageFile: string;
  shortDescription: string;
  longDescription: string;
  details: string[];
  howToUse: string;
  variants?: StaticProductVariant[];
  relatedSlugs: string[];
  badge?: string;
  stock: number;
  installments: number;
};

const products: StaticProduct[] = [
  // ────────────────────────────────────────────
  // GÉIS & CREMES
  // ────────────────────────────────────────────
  {
    slug: "creme-adstringente-sexy",
    name: "Creme Adstringente Sexy — Close Love 15g",
    sku: "3104000004693",
    price: 12,
    subcategorySlug: "sex-shop-geis-e-cremes",
    imageFile: "close-love-15g.png",
    badge: "Destaque",
    shortDescription:
      "Creme íntimo com ação adstringente que proporciona uma sensação de firmeza e maior prazer durante o momento a dois.",
    longDescription: `O Creme Adstringente Sexy Close Love é um produto desenvolvido especialmente para mulheres que desejam intensificar o prazer e a sensação de firmeza íntima. Com fórmula suave e dermatologicamente testada, o produto age de forma segura na região íntima, proporcionando uma experiência mais intensa e satisfatória.

Sua textura cremosa de rápida absorção facilita a aplicação, sem deixar resíduos ou sensação pegajosa. A embalagem discreta de 15g é prática para levar na bolsa ou guardar com privacidade, preservando seu momento especial.

Elaborado com ingredientes de qualidade, o Close Love harmoniza eficácia e delicadeza. É compatível com preservativos de látex e não interfere na flora íntima quando utilizado conforme as instruções.

Descubra mais prazer, mais conexão e mais confiança com o Creme Adstringente Sexy Close Love — porque cada detalhe do seu bem-estar íntimo merece cuidado e atenção.`,
    details: [
      "Conteúdo: 15g",
      "Ação adstringente de efeito temporário",
      "Fórmula suave e dermatologicamente testada",
      "Compatível com preservativos de látex",
      "Não contém hormônios",
      "Uso exclusivo adulto (+18)",
    ],
    howToUse:
      "Aplique uma pequena quantidade do creme na região íntima externa cerca de 15 minutos antes da relação. Espalhe delicadamente com as pontas dos dedos. Não aplicar em mucosas internas. Evite contato com os olhos. Em caso de irritação, interrompa o uso e consulte um médico.",
    relatedSlugs: [
      "virginite-gel",
      "sempre-virgem-gel",
      "k-med-gel-intimo",
      "anosex-gel",
    ],
    stock: 30,
    installments: 1,
  },
  {
    slug: "k-med-gel-intimo",
    name: "K-Med Gel Íntimo",
    sku: "3104000004698",
    price: 17,
    subcategorySlug: "sex-shop-geis-e-cremes",
    imageFile: "k-med-gel-intimo.png",
    badge: "Mais vendido",
    shortDescription:
      "Gel lubrificante íntimo com fórmula delicada para maior conforto e bem-estar durante os momentos de intimidade.",
    longDescription: `O K-Med Gel Íntimo é um clássico entre os produtos de cuidado íntimo, desenvolvido para oferecer lubrificação suave e eficaz. Sua fórmula à base d'água é compatível com o pH natural da mulher, garantindo conforto e segurança no uso diário e durante a intimidade.

Indicado para momentos em que a lubrificação natural precisa de um reforço, o K-Med não contém hormônios e é livre de fragrâncias irritantes. Sua consistência gel facilita a aplicação precisa, sem exageros e sem desperdício.

Dermatologicamente testado e aprovado por especialistas em saúde íntima, o K-Med Gel é uma escolha segura tanto para uso solitário quanto para o casal. Compatível com preservativos de látex e poliisopreno.

Com a embalagem prática e discreta, o K-Med é o companheiro ideal para quem prioriza o conforto e a saúde íntima sem abrir mão do prazer.`,
    details: [
      "Base aquosa (water-based)",
      "pH balanceado e compatível com a flora íntima",
      "Sem hormônios, sem perfumes irritantes",
      "Compatível com preservativos de látex e poliisopreno",
      "Dermatologicamente testado",
      "Uso exclusivo adulto (+18)",
    ],
    howToUse:
      "Aplique a quantidade desejada diretamente na região íntima ou no preservativo antes da relação. Pode ser reaplicado conforme necessário. Lave a região com água após o uso. Evite contato com os olhos. Em caso de irritação, interrompa e consulte um médico.",
    relatedSlugs: [
      "nabucetim-sex-18ml",
      "nocucedim-sex-18ml",
      "creme-adstringente-sexy",
      "hot-ice-gel",
    ],
    stock: 25,
    installments: 1,
  },
  {
    slug: "vamos-ser-feliz-gel",
    name: "Vamos Ser Feliz Gel",
    sku: "3104000004713",
    price: 12,
    subcategorySlug: "sex-shop-geis-e-cremes",
    imageFile: "vamos-ser-feliz-gel.png",
    shortDescription:
      "Gel estimulante com nome bem-humorado que traz leveza e prazer ao momento a dois.",
    longDescription: `O Vamos Ser Feliz Gel é um produto que combina descontração com eficácia, trazendo um toque de alegria ao seu momento mais íntimo. Com fórmula estimulante suave, proporciona sensações agradáveis e aumenta a cumplicidade entre parceiros.

Seu nome bem-humorado é só o começo: a fórmula de gel leve e de fácil absorção age rapidamente, criando uma sensação de calor suave que intensifica cada toque e eleva o prazer compartilhado.

Produzido com ingredientes cuidadosamente selecionados, o Vamos Ser Feliz Gel é seguro para a pele e compatível com preservativos de látex. A embalagem discreta permite guardá-lo sem chamar atenção.

Porque o prazer merece ser celebrado com leveza e cuidado — o Vamos Ser Feliz Gel é o convite perfeito para momentos mais intensos e felizes.`,
    details: [
      "Gel estimulante de ação térmica suave",
      "Fórmula leve e de rápida absorção",
      "Compatível com preservativos de látex",
      "Embalagem discreta",
      "Uso exclusivo adulto (+18)",
    ],
    howToUse:
      "Aplique uma pequena quantidade do gel na região desejada e espalhe com movimentos suaves. Aguarde alguns minutos para sentir os efeitos. Lave com água após o uso. Evite contato com os olhos e mucosas. Em caso de irritação, interrompa o uso.",
    relatedSlugs: [
      "rivosex-gel",
      "pererecard-gel",
      "hot-ice-gel",
      "anis-sex-gel",
    ],
    stock: 20,
    installments: 1,
  },
  {
    slug: "rivosex-gel",
    name: "Rivosex Gel",
    sku: "3104000004704",
    price: 12,
    subcategorySlug: "sex-shop-geis-e-cremes",
    imageFile: "rivosex-gel.png",
    shortDescription:
      "Gel íntimo com fórmula estimulante que intensifica a sensibilidade e potencializa o prazer do casal.",
    longDescription: `O Rivosex Gel é um produto íntimo com fórmula estimulante desenvolvida para ampliar a sensibilidade e elevar a qualidade do prazer. Sua textura em gel de absorção rápida facilita a aplicação e proporciona uma experiência mais intensa para ambos os parceiros.

Com ação vasodilatadora suave, o Rivosex estimula a circulação local, aumentando a sensibilidade dos tecidos e potencializando cada sensação. O resultado é um momento mais conectado, intenso e prazeroso.

Formulado com ingredientes de qualidade, o produto é seguro para uso adulto e compatível com preservativos. Sua embalagem prática garante facilidade de manuseio mesmo nos momentos mais espontâneos.

Deixe o Rivosex Gel ser seu aliado para momentos inesquecíveis — porque o prazer merece ser explorado sem limites e com toda a segurança.`,
    details: [
      "Gel estimulante com ação vasodilatadora suave",
      "Rápida absorção pela pele",
      "Compatível com preservativos de látex",
      "Fórmula dermatologicamente testada",
      "Uso exclusivo adulto (+18)",
    ],
    howToUse:
      "Aplique uma pequena quantidade do gel diretamente na região íntima. Massageie suavemente até absorver. Aguarde de 5 a 10 minutos para os efeitos se manifestarem. Lave com água após o uso. Em caso de irritação, interrompa imediatamente.",
    relatedSlugs: [
      "vamos-ser-feliz-gel",
      "pirocadura-gel",
      "hot-ice-gel",
      "jonumete-gel",
    ],
    stock: 18,
    installments: 1,
  },
  {
    slug: "pererecard-gel",
    name: "Pererecard Gel",
    sku: "3104000004714",
    price: 12,
    subcategorySlug: "sex-shop-geis-e-cremes",
    imageFile: "pererecard-gel.png",
    shortDescription:
      "Gel íntimo com nome criativo que traz diversão e prazer intensificado ao momento a dois.",
    longDescription: `O Pererecard Gel faz parte da linha de géis íntimos com nomes bem-humorados que unem leveza e eficácia. Com fórmula estimulante de absorção rápida, o produto proporciona sensações amplificadas que tornam cada encontro mais especial e memorável.

Sua formulação é pensada para aumentar a sensibilidade local de forma suave e progressiva, criando uma experiência mais intensa e satisfatória tanto para homens quanto para mulheres. A textura gel facilita a aplicação precisa sem desperdício.

Com ingredientes cuidadosamente selecionados, o Pererecard Gel é seguro para a pele íntima e compatível com os principais tipos de preservativos. A embalagem compacta e discreta garante privacidade total.

Celebre o prazer com leveza e qualidade — o Pererecard Gel está pronto para tornar seus momentos íntimos ainda mais especiais.`,
    details: [
      "Gel estimulante de absorção rápida",
      "Fórmula suave para pele íntima",
      "Compatível com preservativos de látex",
      "Embalagem compacta e discreta",
      "Uso exclusivo adulto (+18)",
    ],
    howToUse:
      "Aplique uma pequena quantidade do gel na região desejada e espalhe com movimentos suaves. Aguarde alguns minutos para sentir os efeitos. Lave com água após o uso. Evite contato com os olhos. Em caso de irritação, interrompa o uso.",
    relatedSlugs: [
      "pirocadura-gel",
      "vamos-ser-feliz-gel",
      "paracetaduro-gel",
      "fofatoba-gel",
    ],
    stock: 15,
    installments: 1,
  },
  {
    slug: "pirocadura-gel",
    name: "Pirocadura Gel",
    sku: "3104000004709",
    price: 12,
    subcategorySlug: "sex-shop-geis-e-cremes",
    imageFile: "pirocadura-gel.png",
    shortDescription:
      "Gel com efeito thermal que combina sensação de calor e frescor para uma experiência íntima intensa e divertida.",
    longDescription: `O Pirocadura Gel é um produto íntimo que brinca com as sensações térmicas para elevar o prazer a um novo patamar. Com efeito que alterna entre calor e frescor, o gel cria uma experiência sensorial única e inesquecível para o casal.

A fórmula de ação dupla estimula os nervos da pele de forma suave e progressiva, aumentando a circulação local e intensificando cada toque. O nome bem-humorado reflete a personalidade divertida do produto, que garante momentos de leveza e muito prazer.

Produzido com ingredientes de qualidade dermatologicamente testados, o Pirocadura Gel é seguro para uso na região íntima e compatível com preservativos de látex. A embalagem discreta preserva sua privacidade.

Surpreenda-se com a intensidade das sensações que o Pirocadura Gel pode proporcionar — porque o prazer é mais gostoso quando vem com surpresas.`,
    details: [
      "Efeito thermal (calor + frescor)",
      "Ação estimulante progressiva",
      "Compatível com preservativos de látex",
      "Dermatologicamente testado",
      "Embalagem discreta",
      "Uso exclusivo adulto (+18)",
    ],
    howToUse:
      "Aplique uma pequena quantidade do gel na região desejada. Sopre levemente para ativar o efeito thermal. Aguarde os efeitos por alguns minutos antes da relação. Lave com água após o uso. Evite mucosas internas e contato com os olhos.",
    relatedSlugs: [
      "hot-ice-gel",
      "rivosex-gel",
      "pererecard-gel",
      "anis-sex-gel",
    ],
    stock: 20,
    installments: 1,
  },
  {
    slug: "beijo-grego-gel",
    name: "Beijo Grego Gel",
    sku: "3104000004707",
    price: 12,
    subcategorySlug: "sex-shop-geis-e-cremes",
    imageFile: "beijo-grego-gel.png",
    shortDescription:
      "Gel anal relaxante com fórmula suave para maior conforto e prazer em novas descobertas íntimas.",
    longDescription: `O Beijo Grego Gel é um produto desenvolvido especialmente para quem deseja explorar novas formas de prazer com segurança e conforto. Sua fórmula com propriedades relaxantes suaves facilita a experiência anal, tornando os momentos de descoberta mais agradáveis e seguros.

A textura em gel de alta viscosidade proporciona lubrificação duradoura e confortável, reduzindo o atrito e potencializando o prazer sem desconforto. O produto foi desenvolvido pensando na segurança e no bem-estar do usuário.

Com ingredientes cuidadosamente selecionados, o Beijo Grego Gel é compatível com preservativos de látex e não interfere na saúde da pele íntima quando usado corretamente. A embalagem discreta garante total privacidade.

Explore novos territórios do prazer com confiança e cuidado — o Beijo Grego Gel é seu aliado para descobertas seguras e prazerosas.`,
    details: [
      "Gel lubrificante com propriedades relaxantes suaves",
      "Alta viscosidade para lubrificação duradoura",
      "Compatível com preservativos de látex",
      "Formulado para uso anal externo e interno",
      "Dermatologicamente testado",
      "Uso exclusivo adulto (+18)",
    ],
    howToUse:
      "Aplique generosamente o gel na região anal e nos acessórios/preservativo antes do uso. Reaplicar conforme necessário. Lave cuidadosamente com água e sabão após o uso. Em caso de irritação ou desconforto, interrompa imediatamente e consulte um médico.",
    relatedSlugs: [
      "anosex-gel",
      "lone-anel-gel",
      "nabucetim-sex-18ml",
      "k-med-gel-intimo",
    ],
    stock: 15,
    installments: 1,
  },
  {
    slug: "paracetaduro-gel",
    name: "Paracetaduro Sexy Gel",
    sku: "3104000004711",
    price: 12,
    subcategorySlug: "sex-shop-geis-e-cremes",
    imageFile: "paracetaduro-gel.png",
    badge: "Novo",
    shortDescription:
      "Gel íntimo bem-humorado com fórmula estimulante para aliviar a falta de prazer e intensificar o momento a dois.",
    longDescription: `O Paracetaduro Sexy Gel vem com dose certa de humor e muito prazer. Com um nome inspirado num clássico remédio, o produto promete aliviar qualquer falta de ânimo no quarto e turbinar o prazer do casal com sua fórmula estimulante especial.

A fórmula de gel de absorção rápida age diretamente na região íntima, aumentando a sensibilidade e proporcionando sensações mais intensas. O efeito começa em poucos minutos, tornando cada toque mais prazeroso e conectado.

Produzido com ingredientes de qualidade e dermatologicamente testado, o Paracetaduro Sexy Gel é seguro para uso adulto e compatível com preservativos. A embalagem discreta garante que seu produto chegue e fique guardado com total privacidade.

Esqueça a monotonia e prescreva mais prazer ao seu relacionamento — o Paracetaduro Sexy Gel é o tratamento que o seu quarto estava precisando.`,
    details: [
      "Gel estimulante de rápida absorção",
      "Fórmula suave para pele íntima",
      "Compatível com preservativos de látex",
      "Embalagem discreta",
      "Sem receita médica necessária",
      "Uso exclusivo adulto (+18)",
    ],
    howToUse:
      "Aplique uma dose generosa do gel na região íntima e espalhe com movimentos suaves. Aguarde de 5 a 10 minutos para sentir os efeitos. Lave com água após o uso. Evite contato com os olhos. Em caso de irritação, interrompa o uso.",
    relatedSlugs: [
      "pirocaxona-gel",
      "jonumete-gel",
      "pererecard-gel",
      "vamos-ser-feliz-gel",
    ],
    stock: 18,
    installments: 1,
  },
  {
    slug: "pirocaxona-gel",
    name: "Pirocaxona Gel",
    sku: "3104000004710",
    price: 12,
    subcategorySlug: "sex-shop-geis-e-cremes",
    imageFile: "pirocaexana-gel.png",
    shortDescription:
      "Gel estimulante masculino com fórmula vasodilatadora para maior firmeza e desempenho íntimo.",
    longDescription: `O Pirocaxona Gel é um produto íntimo com humor e eficácia em partes iguais. Com fórmula vasodilatadora suave, o gel estimula a circulação local no órgão masculino, proporcionando mais firmeza e sensação de vigor durante o momento íntimo.

A textura em gel de absorção rápida facilita a aplicação e age em poucos minutos, preparando o homem para uma experiência mais intensa e confiante. O produto é seguro para uso externo e compatível com preservativos de látex.

Desenvolvido com ingredientes de qualidade e cuidadosamente testado, o Pirocaxona Gel alia o humor ao resultado. A embalagem compacta e discreta cabe no bolso e garante privacidade total em qualquer situação.

Porque às vezes um empurrãozinho faz toda a diferença — o Pirocaxona Gel está pronto para quando você precisar.`,
    details: [
      "Gel vasodilatador de uso masculino",
      "Ação de estimulação suave da circulação local",
      "Rápida absorção pela pele",
      "Compatível com preservativos de látex",
      "Dermatologicamente testado",
      "Uso exclusivo adulto (+18)",
    ],
    howToUse:
      "Aplique uma pequena quantidade do gel no órgão masculino e espalhe com movimentos suaves. Aguarde de 5 a 10 minutos para sentir os efeitos antes da relação. Lave com água após o uso. Evite mucosas e contato com os olhos.",
    relatedSlugs: [
      "paracetaduro-gel",
      "metioulate-gel",
      "rivosex-gel",
      "mete-ficha-gel",
    ],
    stock: 20,
    installments: 1,
  },
  {
    slug: "jonumete-gel",
    name: "Jonumete Gel",
    sku: "3104000004708",
    price: 12,
    subcategorySlug: "sex-shop-geis-e-cremes",
    imageFile: "janumete-gel.png",
    shortDescription:
      "Gel íntimo estimulante com fórmula de ação rápida para intensificar o prazer e a conexão do casal.",
    longDescription: `O Jonumete Gel é mais um representante da linha de géis íntimos com nomes bem-humorados que encantam pela criatividade e surpreendem pela eficácia. Com fórmula estimulante de ação rápida, o produto potencializa as sensações e eleva a qualidade do prazer compartilhado.

A textura gel leve e de absorção rápida permite uma aplicação prática e precisa, sem sujar e sem desperdício. Em poucos minutos, a fórmula começa a agir, criando uma sensação agradável de calor suave que prepara o corpo para o prazer.

Elaborado com ingredientes testados e aprovados para uso íntimo adulto, o Jonumete Gel é compatível com preservativos de látex e seguro para a pele. A embalagem prática e discreta é perfeita para guardar com privacidade.

Dê uma virada no seu momento íntimo — o Jonumete Gel garante que cada encontro seja mais intenso e memorável.`,
    details: [
      "Gel estimulante de ação rápida",
      "Textura leve de rápida absorção",
      "Compatível com preservativos de látex",
      "Fórmula testada para pele íntima",
      "Embalagem discreta",
      "Uso exclusivo adulto (+18)",
    ],
    howToUse:
      "Aplique uma pequena quantidade do gel na região desejada e massageie suavemente. Aguarde alguns minutos para sentir os efeitos. Lave com água após o uso. Evite contato com os olhos e mucosas internas.",
    relatedSlugs: [
      "paracetaduro-gel",
      "rivosex-gel",
      "pirocaxona-gel",
      "kama-sutra-gel",
    ],
    stock: 15,
    installments: 1,
  },
  {
    slug: "anis-sex-gel",
    name: "Anis Sex Gel",
    sku: "3104000004706",
    price: 12,
    subcategorySlug: "sex-shop-geis-e-cremes",
    imageFile: "anis-sex-gel.png",
    shortDescription:
      "Gel íntimo com aroma delicado de anis para uma experiência sensorial mais completa e prazerosa.",
    longDescription: `O Anis Sex Gel combina a suavidade de um gel íntimo de qualidade com o aroma delicado e envolvente do anis, criando uma experiência sensorial que vai além do toque. O aroma suave estimula os sentidos e cria uma atmosfera mais íntima e relaxante para o casal.

Sua fórmula estimulante com propriedades vasoativas suaves potencializa a sensibilidade da pele, tornando cada toque mais consciente e prazeroso. A textura em gel de absorção rápida facilita a aplicação e age em poucos minutos.

Produzido com ingredientes de qualidade e livre de substâncias irritantes, o Anis Sex Gel é seguro para pele íntima e compatível com preservativos. A embalagem compacta e discreta garante privacidade total.

Envolva-se num momento de prazer e aromas — o Anis Sex Gel transforma a intimidade em uma experiência sensorial completa.`,
    details: [
      "Gel íntimo com aroma de anis",
      "Ação estimulante suave",
      "Compatível com preservativos de látex",
      "Sem substâncias irritantes",
      "Embalagem discreta",
      "Uso exclusivo adulto (+18)",
    ],
    howToUse:
      "Aplique uma pequena quantidade do gel na região íntima e espalhe suavemente. O aroma de anis se intensifica com o calor corporal. Aguarde alguns minutos para sentir os efeitos estimulantes. Lave com água após o uso. Evite contato com os olhos.",
    relatedSlugs: [
      "pirocadura-gel",
      "vamos-ser-feliz-gel",
      "hot-ice-gel",
      "kama-sutra-gel",
    ],
    stock: 18,
    installments: 1,
  },
  {
    slug: "fofatoba-gel",
    name: "Fofatoba Gel",
    sku: "3104000004712",
    price: 12,
    subcategorySlug: "sex-shop-geis-e-cremes",
    imageFile: "fofatoba-gel.png",
    shortDescription:
      "Gel íntimo fofo e poderoso com fórmula estimulante para momentos mais intensos e divertidos a dois.",
    longDescription: `O Fofatoba Gel une o charme do nome descontraído com a seriedade de uma fórmula íntima eficaz. Desenvolvido para mulheres que buscam mais prazer e intensidade, o gel estimulante age diretamente na região clitoriana e nos tecidos ao redor, amplificando cada sensação.

A fórmula de gel leve e de absorção rápida começa a agir em poucos minutos, criando uma sensação agradável de calor e pulsação suave que torna cada toque mais consciente e prazeroso. O efeito é progressivo e natural, respeitando os ritmos do corpo.

Com ingredientes de qualidade dermatologicamente testados, o Fofatoba Gel é seguro para uso feminino e compatível com preservativos de látex. A embalagem discreta preserva sua intimidade em qualquer situação.

Deixe o Fofatoba Gel revelar o seu potencial de prazer — porque cada mulher merece descobrir o máximo das suas sensações.`,
    details: [
      "Gel estimulante feminino",
      "Ação térmica suave e progressiva",
      "Fórmula dermatologicamente testada",
      "Compatível com preservativos de látex",
      "Embalagem discreta",
      "Uso exclusivo adulto (+18)",
    ],
    howToUse:
      "Aplique uma pequena quantidade do gel diretamente na região clitoriana e na vulva. Espalhe com movimentos circulares suaves. Aguarde de 5 a 10 minutos para os efeitos se manifestarem. Lave com água após o uso. Em caso de irritação, interrompa o uso.",
    relatedSlugs: [
      "pererecard-gel",
      "vamos-ser-feliz-gel",
      "dando-uma-gostoso-gel",
      "kama-sutra-gel",
    ],
    stock: 20,
    installments: 1,
  },
  {
    slug: "kama-sutra-gel",
    name: "Kama Sutra Gel",
    sku: "3104000004703",
    price: 12,
    subcategorySlug: "sex-shop-geis-e-cremes",
    imageFile: "kama-sutra-gel.png",
    badge: "Destaque",
    shortDescription:
      "Gel inspirado na arte milenar do Kama Sutra para uma experiência íntima mais consciente e intensa.",
    longDescription: `O Kama Sutra Gel é inspirado na milenar arte indiana do prazer consciente. Com fórmula estimulante desenvolvida para ampliar a conexão entre parceiros, o gel promove sensações mais intensas e uma percepção mais aguçada de cada momento compartilhado.

A textura suave e de absorção rápida permite uma aplicação confortável em diferentes regiões do corpo, intensificando o prazer durante a exploração mútua. O efeito é progressivo, acompanhando o ritmo natural do casal e potencializando cada momento de intimidade.

Desenvolvido com ingredientes de alta qualidade, o Kama Sutra Gel é seguro para pele íntima e compatível com preservativos de látex. A embalagem elegante e discreta é um presente sofisticado para casais que buscam elevar sua vida íntima.

Explore os segredos do prazer com o Kama Sutra Gel — porque a arte do amor merece ser vivida em sua forma mais intensa e consciente.`,
    details: [
      "Gel estimulante multiuso",
      "Inspirado na filosofia do Kama Sutra",
      "Ação de estimulação progressiva",
      "Compatível com preservativos de látex",
      "Fórmula dermatologicamente testada",
      "Uso exclusivo adulto (+18)",
    ],
    howToUse:
      "Aplique o gel nas regiões erógenas desejadas. Espalhe suavemente com as pontas dos dedos ou através do toque do parceiro. Aguarde alguns minutos para sentir os efeitos estimulantes. Lave com água após o uso. Evite contato com os olhos.",
    relatedSlugs: [
      "hot-ice-gel",
      "anis-sex-gel",
      "fofatoba-gel",
      "rivosex-gel",
    ],
    stock: 22,
    installments: 1,
  },
  {
    slug: "hot-ice-gel",
    name: "Hot Ice Gel",
    sku: "3104000004719",
    price: 12,
    subcategorySlug: "sex-shop-geis-e-cremes",
    imageFile: "hot-ice-gel.png",
    badge: "Mais vendido",
    shortDescription:
      "Gel thermal com efeito hot & ice que alterna sensações de calor e frescor para uma experiência íntima única.",
    longDescription: `O Hot Ice Gel é um dos favoritos da linha de géis íntimos da KA Bijoux, e não é difícil entender por quê. Com seu exclusivo efeito thermal hot & ice, o gel cria uma alternância deliciosa entre calor e frescor que desperta a sensibilidade da pele de forma completamente diferente.

A fórmula de absorção rápida age em segundos, criando uma sensação que parece de contraste entre temperatura, com o calor estimulando a circulação e o frescor renovando a percepção sensorial. O resultado é uma experiência íntima surpreendente e altamente prazerosa.

Produzido com ingredientes de alta qualidade e dermatologicamente testado, o Hot Ice Gel é seguro para uso na pele íntima e compatível com preservativos de látex. A embalagem discreta e prática é ideal para manter sempre à mão.

Descubra o prazer das sensações contrastantes — o Hot Ice Gel transforma cada toque em uma experiência que você vai querer repetir.`,
    details: [
      "Efeito hot & ice (calor e frescor alternados)",
      "Ação imediata e progressiva",
      "Compatível com preservativos de látex",
      "Fórmula dermatologicamente testada",
      "Embalagem discreta",
      "Uso exclusivo adulto (+18)",
    ],
    howToUse:
      "Aplique uma pequena quantidade do gel na região desejada. Sopre levemente para ativar o efeito frescor, ou mantenha o toque para sentir o calor. Aguarde alguns minutos para explorar as sensações. Lave com água após o uso. Evite mucosas internas e contato com os olhos.",
    relatedSlugs: [
      "pirocadura-gel",
      "kama-sutra-gel",
      "anis-sex-gel",
      "rivosex-gel",
    ],
    stock: 30,
    installments: 1,
  },
  {
    slug: "anosex-gel",
    name: "Anosex Gel",
    sku: "3104000004726",
    price: 12,
    subcategorySlug: "sex-shop-geis-e-cremes",
    imageFile: "amoxsex-gel.png",
    shortDescription:
      "Gel anal lubrificante e relaxante para uma experiência mais confortável e prazerosa.",
    longDescription: `O Anosex Gel é um produto desenvolvido especificamente para quem busca maior conforto e prazer na experiência anal. Com fórmula de alta viscosidade e propriedades relaxantes suaves, o gel proporciona lubrificação duradoura e reduz o atrito, tornando a experiência mais segura e prazerosa.

A textura densa e aderente garante que a lubrificação permaneça onde é necessária por mais tempo, evitando reaplicações frequentes durante o momento íntimo. As propriedades relaxantes suaves ajudam na preparação natural do corpo para a experiência.

Desenvolvido com ingredientes de qualidade e testado dermatologicamente, o Anosex Gel é compatível com preservativos de látex e não interfere na saúde da pele quando usado corretamente. A embalagem discreta preserva totalmente a sua privacidade.

Com o Anosex Gel, cada descoberta é feita com segurança, conforto e muito prazer — porque explorar deve ser sempre agradável.`,
    details: [
      "Gel lubrificante de alta viscosidade para uso anal",
      "Propriedades relaxantes suaves",
      "Lubrificação de longa duração",
      "Compatível com preservativos de látex",
      "Dermatologicamente testado",
      "Uso exclusivo adulto (+18)",
    ],
    howToUse:
      "Aplique generosamente o gel na região anal e nos acessórios utilizados. Reaplicar conforme a necessidade durante o uso. Lave cuidadosamente com água e sabão após o uso. Em caso de irritação ou desconforto, interrompa imediatamente e consulte um médico.",
    relatedSlugs: [
      "beijo-grego-gel",
      "lone-anel-gel",
      "nabucetim-sex-18ml",
      "k-med-gel-intimo",
    ],
    stock: 15,
    installments: 1,
  },
  {
    slug: "virginite-gel",
    name: "Virginite Gel",
    sku: "3104000004727",
    price: 12,
    subcategorySlug: "sex-shop-geis-e-cremes",
    imageFile: "virginite-gel.png",
    shortDescription:
      "Gel adstringente feminino que proporciona sensação de firmeza e renovação da sensibilidade íntima.",
    longDescription: `O Virginite Gel é um produto íntimo feminino com ação adstringente suave que proporciona a sensação de firmeza e maior sensibilidade na região íntima. Desenvolvido para mulheres que desejam intensificar as sensações durante a intimidade, o gel age de forma eficaz e segura.

A fórmula de ação adstringente temporária estimula os tecidos da mucosa vaginal de forma segura, criando uma sensação de firmeza que intensifica o prazer tanto para a mulher quanto para o parceiro. O efeito é temporário e desaparece naturalmente.

Com ingredientes de alta qualidade e dermatologicamente testado, o Virginite Gel é seguro para uso íntimo feminino e compatível com preservativos de látex. Não contém hormônios e não interfere permanentemente na fisiologia íntima.

Redescubra sua sensibilidade com o Virginite Gel — porque o prazer feminino merece atenção e cuidado especiais.`,
    details: [
      "Gel adstringente feminino de ação temporária",
      "Proporciona sensação de firmeza íntima",
      "Sem hormônios",
      "Compatível com preservativos de látex",
      "Fórmula dermatologicamente testada",
      "Uso exclusivo adulto (+18)",
    ],
    howToUse:
      "Aplique uma pequena quantidade do gel na região vaginal externa cerca de 15 minutos antes da relação. Espalhe delicadamente com as pontas dos dedos. Não aplicar profundamente. Evite contato com os olhos. Em caso de irritação, interrompa e consulte um médico.",
    relatedSlugs: [
      "creme-adstringente-sexy",
      "sempre-virgem-gel",
      "k-med-gel-intimo",
      "fofatoba-gel",
    ],
    stock: 18,
    installments: 1,
  },
  {
    slug: "sempre-virgem-gel",
    name: "Sempre Virgem Gel",
    sku: "3104000004718",
    price: 12,
    subcategorySlug: "sex-shop-geis-e-cremes",
    imageFile: "sempre-virgem-gel.png",
    shortDescription:
      "Gel adstringente íntimo com efeito de firming temporário para sensações mais intensas e renovadas.",
    longDescription: `O Sempre Virgem Gel é um produto íntimo feminino com nome sugestivo que entrega uma experiência de renovação das sensações. Com ação adstringente de efeito temporário, o gel proporciona firmeza íntima e amplifica a sensibilidade durante o momento a dois.

Desenvolvido com uma fórmula cuidadosamente equilibrada, o produto age de forma suave e progressiva, respeitando a fisiologia feminina. O efeito é temporário e seguro, desaparecendo naturalmente ao longo do tempo sem causar alterações permanentes.

Com ingredientes de qualidade testados dermatologicamente, o Sempre Virgem Gel é seguro para uso externo na região íntima e compatível com preservativos de látex. Não contém hormônios sintéticos nem substâncias irritantes.

Renove suas sensações com o Sempre Virgem Gel — porque o prazer feminino pode sempre ser descoberto de um novo ângulo.`,
    details: [
      "Gel adstringente feminino",
      "Efeito de firming temporário e reversível",
      "Sem hormônios sintéticos",
      "Compatível com preservativos de látex",
      "Dermatologicamente testado",
      "Uso exclusivo adulto (+18)",
    ],
    howToUse:
      "Aplique uma pequena quantidade do gel na região vaginal externa 15 a 20 minutos antes da relação. Espalhe com os dedos de forma delicada. Não introduzir. Lave com água após o uso. Evite contato com os olhos. Em caso de irritação, interrompa o uso.",
    relatedSlugs: [
      "virginite-gel",
      "creme-adstringente-sexy",
      "fofatoba-gel",
      "k-med-gel-intimo",
    ],
    stock: 20,
    installments: 1,
  },
  {
    slug: "metioulate-gel",
    name: "Metioulate Gel",
    sku: "3104000004705",
    price: 12,
    subcategorySlug: "sex-shop-geis-e-cremes",
    imageFile: "metioulate-gel.png",
    shortDescription:
      "Gel retardante masculino que prolonga o prazer e aumenta o tempo de desempenho íntimo.",
    longDescription: `O Metioulate Gel é um produto íntimo masculino desenvolvido para homens que desejam prolongar o prazer e melhorar seu desempenho durante a relação. Com fórmula levemente dessensibilizante aplicada externamente, o gel ajuda a retardar a ejaculação de forma segura e controlada.

A textura gel de absorção rápida facilita a aplicação discreta antes do uso do preservativo, sem interferir na sensação do parceiro. O efeito é suave e progressivo, permitindo ao homem maior controle sobre o momento do clímax.

Formulado com ingredientes de qualidade e dermatologicamente testado, o Metioulate Gel é seguro para uso externo masculino e compatível com preservativos de látex. A embalagem compacta e discreta é fácil de guardar ou levar.

Tome o controle do seu prazer com o Metioulate Gel — porque durar mais é dar mais para si mesmo e para quem você ama.`,
    details: [
      "Gel retardante masculino de uso externo",
      "Efeito levemente dessensibilizante",
      "Absorção rápida pela pele",
      "Compatível com preservativos de látex",
      "Dermatologicamente testado",
      "Uso exclusivo adulto (+18)",
    ],
    howToUse:
      "Aplique uma pequena quantidade do gel na glande e no pênis 10 a 15 minutos antes da relação. Espalhe uniformemente e aguarde absorção antes de usar o preservativo. Lave com água após o uso. Em caso de irritação, interrompa imediatamente.",
    relatedSlugs: [
      "pirocaxona-gel",
      "pirocadura-gel",
      "mete-ficha-gel",
      "rivosex-gel",
    ],
    stock: 18,
    installments: 1,
  },
  {
    slug: "lone-anel-gel",
    name: "Lone Anel Gel",
    sku: "3104000004722",
    price: 12,
    subcategorySlug: "sex-shop-geis-e-cremes",
    imageFile: "come-anel-gel.png",
    shortDescription:
      "Gel íntimo especialmente formulado para uso com acessórios e brinquedos eróticos.",
    longDescription: `O Lone Anel Gel é um produto desenvolvido especialmente para quem utiliza acessórios íntimos como anéis penianos, vibradores e outros brinquedos eróticos. Com fórmula lubrificante de alta compatibilidade, o gel facilita a aplicação e uso dos acessórios, potencializando o prazer e o conforto.

A textura em gel de viscosidade média proporciona lubrificação eficiente sem interferir no funcionamento dos acessórios. O produto é compatível com acessórios de silicone, plástico e borracha, além de ser compatível com preservativos de látex.

Com ingredientes de qualidade e testado dermatologicamente, o Lone Anel Gel é seguro para pele íntima. A fórmula não resseca rapidamente, garantindo conforto por mais tempo durante o uso dos acessórios.

Complete sua experiência com os acessórios íntimos da KA Bijoux com o Lone Anel Gel — o complemento perfeito para o prazer.`,
    details: [
      "Gel lubrificante para uso com acessórios íntimos",
      "Compatível com silicone, plástico e borracha",
      "Compatível com preservativos de látex",
      "Viscosidade média para lubrificação duradoura",
      "Dermatologicamente testado",
      "Uso exclusivo adulto (+18)",
    ],
    howToUse:
      "Aplique o gel no acessório íntimo e na região desejada antes do uso. Reaplicar conforme necessário. Lave o acessório e a pele com água e sabão após o uso. Evite contato com os olhos. Consulte a compatibilidade com o material do acessório antes de usar.",
    relatedSlugs: [
      "anel-peniano-bolinha-cores",
      "anel-peniano-orelha-roxo",
      "anosex-gel",
      "nabucetim-sex-18ml",
    ],
    stock: 15,
    installments: 1,
  },
  {
    slug: "mete-ficha-gel",
    name: "Mete Ficha Gel",
    sku: "3104000004715",
    price: 12,
    subcategorySlug: "sex-shop-geis-e-cremes",
    imageFile: "mete-ficha-gel.png",
    shortDescription:
      "Gel estimulante bem-humorado com fórmula de ação rápida para quem quer colocar as fichas no prazer.",
    longDescription: `O Mete Ficha Gel é para quem não tem medo de colocar as fichas no prazer. Com fórmula estimulante de ação rápida, o gel intensifica a sensibilidade e prepara o corpo para uma experiência mais intensa e satisfatória.

O nome brincalhão esconde uma fórmula séria e eficaz: a textura em gel leve de absorção rápida age em poucos minutos, criando uma sensação de calor suave e pulsação que transforma cada toque em prazer intensificado.

Com ingredientes de qualidade testados para uso íntimo adulto, o Mete Ficha Gel é compatível com preservativos de látex e seguro para a pele. A embalagem compacta é fácil de guardar e leva discritamente a qualquer lugar.

Aposte no prazer — o Mete Ficha Gel é a aposta certa para momentos inesquecíveis.`,
    details: [
      "Gel estimulante de ação rápida",
      "Efeito térmico suave",
      "Compatível com preservativos de látex",
      "Fórmula testada para uso íntimo",
      "Embalagem compacta",
      "Uso exclusivo adulto (+18)",
    ],
    howToUse:
      "Aplique uma pequena quantidade do gel na região desejada e espalhe com movimentos suaves. Aguarde de 5 a 10 minutos para sentir os efeitos. Lave com água após o uso. Evite contato com os olhos e mucosas internas.",
    relatedSlugs: [
      "jonumete-gel",
      "pirocaxona-gel",
      "metioulate-gel",
      "dando-uma-gostoso-gel",
    ],
    stock: 18,
    installments: 1,
  },
  {
    slug: "dando-uma-gostoso-gel",
    name: "Dando uma Gostoso Gel",
    sku: "3104000004723",
    price: 12,
    subcategorySlug: "sex-shop-geis-e-cremes",
    imageFile: "dando-uma-gostoso-gel.png",
    shortDescription:
      "Gel íntimo com fórmula especial para ampliar o prazer e a conexão durante o momento mais gostoso a dois.",
    longDescription: `O Dando uma Gostoso Gel faz jus ao nome — é um produto que eleva o prazer a um novo patamar. Com fórmula estimulante desenvolvida para amplificar as sensações, o gel intensifica cada toque e cria uma conexão mais profunda entre os parceiros.

A textura suave em gel de absorção rápida permite uma aplicação confortável e precisa na região desejada. Em poucos minutos, a fórmula começa a agir, criando uma sensação agradável de calor e sensibilização que transforma o momento íntimo.

Desenvolvido com ingredientes de qualidade e dermatologicamente testado, o produto é seguro para uso adulto e compatível com preservativos de látex. A embalagem discreta e prática é o parceiro perfeito para momentos espontâneos.

Quando o assunto é prazer, não tem meio-termo — o Dando uma Gostoso Gel está pronto para fazer jus ao seu nome.`,
    details: [
      "Gel estimulante de dupla ação",
      "Amplifica sensibilidade e prazer",
      "Textura suave de rápida absorção",
      "Compatível com preservativos de látex",
      "Dermatologicamente testado",
      "Uso exclusivo adulto (+18)",
    ],
    howToUse:
      "Aplique uma quantidade generosa do gel nas regiões erógenas desejadas. Espalhe com movimentos circulares suaves. Aguarde de 5 a 10 minutos para sentir o efeito pleno. Lave com água após o uso. Evite contato com os olhos.",
    relatedSlugs: [
      "fofatoba-gel",
      "mete-ficha-gel",
      "kama-sutra-gel",
      "hot-ice-gel",
    ],
    stock: 20,
    installments: 1,
  },

  // ────────────────────────────────────────────
  // VIBRADORES
  // ────────────────────────────────────────────
  {
    slug: "vibrador-sexy-controle-rosa",
    name: "Vibrador Sexy com Controle Rosa",
    sku: "3104000004755",
    price: 12,
    subcategorySlug: "sex-shop-vibradores",
    imageFile: "vibrador-sexy-controle-cores.png",
    badge: "Destaque",
    shortDescription:
      "Vibrador com controle remoto que oferece múltiplos modos de vibração para experiências personalizadas e intensas.",
    longDescription: `O Vibrador Sexy com Controle Rosa é a escolha perfeita para quem deseja variedade e praticidade. Com controle remoto incluso, o produto oferece total liberdade para ajustar a intensidade e o modo de vibração sem interromper o momento, criando experiências personalizadas e altamente satisfatórias.

Desenvolvido com material seguro e de alta qualidade, o vibrador possui design ergonômico que facilita a utilização e proporciona estimulação precisa nas regiões desejadas. Os múltiplos modos de vibração garantem que cada experiência seja única e progressivamente mais intensa.

O tom rosa delicado harmoniza com a estética da KA Bijoux, unindo elegância e funcionalidade em um só produto. Compacto e discreto, é fácil de guardar e de transportar com privacidade total.

Transforme cada momento a sós ou a dois em uma experiência inesquecível com o Vibrador Sexy com Controle — porque o prazer é melhor quando você tem o controle.`,
    details: [
      "Vibrador com controle remoto incluso",
      "Múltiplos modos de vibração",
      "Material seguro e livre de ftalatos",
      "Design ergonômico",
      "Cor: Rosa",
      "Requer pilhas (inclusa)",
      "Uso exclusivo adulto (+18)",
    ],
    howToUse:
      "Insira as pilhas no vibrador e no controle remoto conforme indicado. Aplique gel lubrificante à base d'água na região desejada e no produto. Utilize o controle para selecionar o modo de vibração desejado. Após o uso, lave o produto com água e sabão neutro e seque bem antes de guardar.",
    relatedSlugs: [
      "vibrador-golfinho-rosa",
      "mini-bullet-rosa-ponta-fina",
      "mini-bullet-duplo-linguinha",
      "mini-bullet-duplo-rosa",
    ],
    stock: 15,
    installments: 1,
  },
  {
    slug: "vibrador-golfinho-rosa",
    name: "Vibrador Golfinho Rosa",
    sku: "3104000004751",
    price: 12,
    subcategorySlug: "sex-shop-vibradores",
    imageFile: "vibrador-golfinho-rosa.png",
    badge: "Novo",
    shortDescription:
      "Vibrador com formato de golfinho para estimulação dupla com design divertido e eficaz.",
    longDescription: `O Vibrador Golfinho Rosa é um produto que une charme e funcionalidade em um design divertido e altamente eficaz. Com formato inspirado no simpático animal, o produto oferece estimulação dupla simultânea: penetração e estimulação externa, para uma experiência completa e muito prazerosa.

O design do golfinho foi pensado para encaixar perfeitamente na anatomia feminina, com a cauda posicionada para estimulação clitoriana simultânea. As vibrações se distribuem em todo o produto, maximizando o prazer em cada uso.

Fabricado com material de qualidade, seguro para uso íntimo e livre de substâncias nocivas, o Vibrador Golfinho Rosa é fácil de higienizar e durável. O tom rosa harmoniza com a estética delicada e elegante da KA Bijoux.

Uma experiência completa num design adorável — o Vibrador Golfinho Rosa é a escolha para quem quer diversão e prazer máximo.`,
    details: [
      "Dupla estimulação (penetração + estimulação clitoriana)",
      "Design em formato de golfinho",
      "Material seguro e livre de ftalatos",
      "Múltiplos modos de vibração",
      "Cor: Rosa",
      "Requer pilhas (inclusas)",
      "Uso exclusivo adulto (+18)",
    ],
    howToUse:
      "Insira as pilhas conforme indicado. Aplique gel lubrificante à base d'água no produto e na região desejada. Posicione o produto para que a cauda do golfinho fique voltada para o clitóris. Selecione o modo de vibração desejado. Após o uso, limpe com água e sabão neutro.",
    relatedSlugs: [
      "vibrador-sexy-controle-rosa",
      "mini-bullet-rosa-ponta-fina",
      "mini-bullet-duplo-linguinha",
      "mini-bullet-duplo-rosa",
    ],
    stock: 12,
    installments: 1,
  },
  {
    slug: "mini-bullet-rosa-ponta-fina",
    name: "Mini Bullet Duplo Rosa Ponta Fina",
    sku: "3104000004760",
    price: 24,
    subcategorySlug: "sex-shop-vibradores",
    imageFile: "mini-bullet-rosa-ponta-fina.png",
    badge: "Novo",
    shortDescription:
      "Mini bullet duplo com ponta fina para estimulação precisa e intensa em pontos erógenos específicos.",
    longDescription: `O Mini Bullet Duplo Rosa Ponta Fina é o produto ideal para quem busca estimulação precisa e direcionada. Com design de ponta fina, o bullet permite alcançar pontos erógenos específicos com alta precisão, proporcionando sensações intensas e focadas.

O formato duplo do mini bullet oferece versatilidade de uso: enquanto uma extremidade oferece estimulação concentrada com a ponta fina, o produto pode ser explorado de diferentes formas para descobrir novas zonas de prazer. As vibrações potentes e os múltiplos modos garantem uma experiência rica e variada.

Compacto e discreto, o Mini Bullet Rosa é perfeito para uso individual ou como complemento durante a intimidade a dois. O tamanho pequeno facilita o transporte e o armazenamento com privacidade total.

Precisão é o nome do jogo — descubra o poder de um bullet focado com o Mini Bullet Duplo Rosa Ponta Fina.`,
    details: [
      "Design de ponta fina para estimulação precisa",
      "Formato duplo versátil",
      "Múltiplos modos de vibração",
      "Material seguro e livre de ftalatos",
      "Cor: Rosa",
      "Requer pilhas inclusas",
      "Uso exclusivo adulto (+18)",
    ],
    howToUse:
      "Insira as pilhas conforme indicado. Aplique gel lubrificante à base d'água na região desejada e na ponta do bullet. Utilize a ponta fina para estimulação precisa nas regiões erógenas. Selecione o modo de vibração desejado. Após o uso, limpe com água e sabão neutro.",
    variants: [
      { label: "Rosa Ponta Fina", slug: "mini-bullet-rosa-ponta-fina", active: true },
      { label: "Linguinha Roxo", slug: "mini-bullet-duplo-linguinha" },
      { label: "Duplo Rosa", slug: "mini-bullet-duplo-rosa" },
    ],
    relatedSlugs: [
      "mini-bullet-duplo-linguinha",
      "mini-bullet-duplo-rosa",
      "vibrador-golfinho-rosa",
      "vibrador-sexy-controle-rosa",
    ],
    stock: 10,
    installments: 1,
  },
  {
    slug: "mini-bullet-duplo-linguinha",
    name: "Mini Bullet Duplo Linguinha Roxo",
    sku: "3104000004758",
    price: 24,
    subcategorySlug: "sex-shop-vibradores",
    imageFile: "mini-bullet-duplo-linguinha.png",
    shortDescription:
      "Mini bullet duplo com formato de linguinha para estimulação clitoriana suave e precisa.",
    longDescription: `O Mini Bullet Duplo Linguinha Roxo é um produto desenvolvido especialmente para estimulação clitoriana precisa e envolvente. O design em formato de linguinha imita o movimento natural do toque, proporcionando sensações mais naturais e altamente prazerosas.

A extremidade em formato de linguinha se encaixa perfeitamente na anatomia do clitóris, distribuindo as vibrações de forma ampla e eficiente. Os múltiplos modos de vibração permitem explorar desde a estimulação mais suave e delicada até as intensidades mais elevadas.

Em tom roxo vibrante, o Mini Bullet Linguinha é discreto o suficiente para uso em qualquer situação e potente o suficiente para proporcionar experiências memoráveis. Compacto e fácil de higienizar, é um produto durável e confiável.

Explore o prazer clitoriano com o Mini Bullet Duplo Linguinha Roxo — porque a estimulação certa muda tudo.`,
    details: [
      "Design de linguinha para estimulação clitoriana",
      "Múltiplos modos de vibração",
      "Formato duplo versátil",
      "Material seguro e livre de ftalatos",
      "Cor: Roxo",
      "Requer pilhas inclusas",
      "Uso exclusivo adulto (+18)",
    ],
    howToUse:
      "Insira as pilhas conforme indicado. Aplique gel lubrificante à base d'água na região desejada. Posicione o formato de linguinha sobre o clitóris. Selecione o modo de vibração preferido. Após o uso, limpe com água e sabão neutro e seque antes de guardar.",
    variants: [
      { label: "Rosa Ponta Fina", slug: "mini-bullet-rosa-ponta-fina" },
      { label: "Linguinha Roxo", slug: "mini-bullet-duplo-linguinha", active: true },
      { label: "Duplo Rosa", slug: "mini-bullet-duplo-rosa" },
    ],
    relatedSlugs: [
      "mini-bullet-rosa-ponta-fina",
      "mini-bullet-duplo-rosa",
      "vibrador-golfinho-rosa",
      "vibrador-sexy-controle-rosa",
    ],
    stock: 10,
    installments: 1,
  },
  {
    slug: "mini-bullet-duplo-rosa",
    name: "Mini Bullet Duplo Vibrador Rosa",
    sku: "3104000004759",
    price: 24,
    subcategorySlug: "sex-shop-vibradores",
    imageFile: "mini-bullet-duplo-rosa.png",
    shortDescription:
      "Mini bullet duplo rosa com dois pontos de estimulação simultânea para uma experiência de prazer completa.",
    longDescription: `O Mini Bullet Duplo Vibrador Rosa é o produto perfeito para quem deseja dupla estimulação simultânea em um produto compacto e elegante. Com dois pontos de vibração independentes, o bullet oferece uma experiência rica e multidimensional que potencializa o prazer.

O design duplo permite estimulação simultânea de diferentes regiões erógenas, criando combinações de sensações que tornam cada uso único. Os múltiplos modos de vibração de cada extremidade garantem uma variedade enorme de experiências possíveis.

Em tom rosa delicado, o Mini Bullet Duplo é ao mesmo tempo discreto e poderoso. Fabricado com material de qualidade, seguro para uso íntimo e fácil de higienizar, é um investimento no seu prazer que dura.

Duplique o prazer — o Mini Bullet Duplo Vibrador Rosa é para quem quer o dobro de tudo.`,
    details: [
      "Dupla estimulação simultânea",
      "Dois modos de vibração independentes",
      "Material seguro e livre de ftalatos",
      "Design compacto e discreto",
      "Cor: Rosa",
      "Requer pilhas inclusas",
      "Uso exclusivo adulto (+18)",
    ],
    howToUse:
      "Insira as pilhas conforme indicado em cada câmara. Aplique gel lubrificante à base d'água nas extremidades e nas regiões desejadas. Selecione os modos de vibração independentemente em cada extremidade. Após o uso, limpe com água e sabão neutro.",
    variants: [
      { label: "Rosa Ponta Fina", slug: "mini-bullet-rosa-ponta-fina" },
      { label: "Linguinha Roxo", slug: "mini-bullet-duplo-linguinha" },
      { label: "Duplo Rosa", slug: "mini-bullet-duplo-rosa", active: true },
    ],
    relatedSlugs: [
      "mini-bullet-rosa-ponta-fina",
      "mini-bullet-duplo-linguinha",
      "vibrador-golfinho-rosa",
      "vibrador-sexy-controle-rosa",
    ],
    stock: 10,
    installments: 1,
  },

  // ────────────────────────────────────────────
  // ANÉIS PENIANOS
  // ────────────────────────────────────────────
  {
    slug: "anel-peniano-bolinha-cores",
    name: "Anel Peniano Sexy Bolinha",
    sku: "3104000004747",
    price: 12,
    subcategorySlug: "sex-shop-aneis",
    imageFile: "anel-peniano-bolinha-cores.png",
    shortDescription:
      "Anel peniano com bolinhas texturizadas para estimulação extra e prazer intensificado a dois.",
    longDescription: `O Anel Peniano Sexy Bolinha é um acessório íntimo versátil e estimulante que eleva o prazer tanto para ele quanto para ela. Com textura de bolinhas estrategicamente posicionadas no exterior do anel, o produto proporciona estimulação adicional durante a penetração, intensificando as sensações para a parceira.

A função primária do anel peniano é manter uma ereção mais firme e duradoura, ao mesmo tempo que atrasa a ejaculação, permitindo prolongar o momento de prazer compartilhado. As bolinhas texturizadas adicionam uma camada extra de estimulação física que transforma a experiência.

Fabricado com material elástico de qualidade, o anel se adapta confortavelmente a diferentes tamanhos com segurança. A versão transparente é discreta e compatível com qualquer look.

Um pequeno acessório, um grande impacto no prazer — o Anel Peniano Sexy Bolinha é o complemento perfeito para o seu momento íntimo.`,
    details: [
      "Textura de bolinhas estimulantes",
      "Material elástico flexível e seguro",
      "Anel único de uso masculino",
      "Prolonga a ereção e retarda a ejaculação",
      "Cor: Transparente",
      "Tamanho único ajustável",
      "Uso exclusivo adulto (+18)",
    ],
    howToUse:
      "Aplique o anel na base do pênis ereto ou semi-ereto. Ajuste para conforto adequado. Não usar por mais de 20 a 30 minutos seguidos. Após o uso, lave com água e sabão neutro e seque bem antes de guardar. Em caso de desconforto, retire imediatamente.",
    variants: [
      { label: "Transparente", slug: "anel-peniano-bolinha-cores", active: true },
    ],
    relatedSlugs: [
      "anel-peniano-orelha-roxo",
      "anel-peniano-orelha-rosa",
      "lone-anel-gel",
      "nabucetim-sex-18ml",
    ],
    stock: 20,
    installments: 1,
  },
  {
    slug: "anel-peniano-orelha-roxo",
    name: "Anel Peniano Roxo de Orelha",
    sku: "3104000004741",
    price: 12,
    subcategorySlug: "sex-shop-aneis",
    imageFile: "anel-peniano-orelha-cores.png",
    shortDescription:
      "Anel peniano com projeção de orelha vibratória para estimulação clitoriana simultânea durante a penetração.",
    longDescription: `O Anel Peniano Roxo de Orelha é um acessório íntimo diferenciado que adiciona uma dimensão extra ao prazer durante a penetração. Com projeção em formato de orelha vibratória na parte superior, o anel estimula o clitóris simultaneamente à penetração, criando uma experiência de prazer duplo muito intensa.

A função estrutural do anel de manter a ereção firme se combina perfeitamente com a estimulação clitoriana proporcionada pela orelha. O resultado é um prazer sinérgico e simultaneamente compartilhado que eleva a qualidade da experiência para o casal.

Fabricado com material flexível de qualidade e em tom roxo vibrante, o Anel de Orelha está disponível também em rosa para combinar com sua preferência. O material seguro é compatível com o uso de lubrificantes à base d'água.

Eleve a experiência do casal com o Anel Peniano de Orelha — porque o prazer simultâneo é o melhor prazer.`,
    details: [
      "Projeção de orelha vibratória para estimulação clitoriana",
      "Duplo prazer simultâneo (ereção + estimulação clitoriana)",
      "Material flexível e seguro",
      "Cor: Roxo",
      "Tamanho único ajustável",
      "Compatível com lubrificantes à base d'água",
      "Uso exclusivo adulto (+18)",
    ],
    howToUse:
      "Aplique o anel na base do pênis com a projeção de orelha voltada para cima. Posicione para que a orelha fique em contato com o clitóris da parceira durante a penetração. Não usar por mais de 20 a 30 minutos. Lave com água e sabão após o uso.",
    variants: [
      { label: "Roxo", slug: "anel-peniano-orelha-roxo", color: "#7c3aed", active: true },
      { label: "Rosa", slug: "anel-peniano-orelha-rosa", color: "#ec4899" },
    ],
    relatedSlugs: [
      "anel-peniano-orelha-rosa",
      "anel-peniano-bolinha-cores",
      "lone-anel-gel",
      "vibrador-sexy-controle-rosa",
    ],
    stock: 15,
    installments: 1,
  },
  {
    slug: "anel-peniano-orelha-rosa",
    name: "Anel Peniano Rosa de Orelha",
    sku: "3104000004742",
    price: 12,
    subcategorySlug: "sex-shop-aneis",
    imageFile: "anel-peniano-orelha-rosa-roxo.png",
    shortDescription:
      "Anel peniano rosa com projeção de orelha vibratória para estimulação clitoriana simultânea e prazer a dois.",
    longDescription: `O Anel Peniano Rosa de Orelha é a versão em rosa do clássico anel de orelha vibratório, trazendo a mesma eficácia com a cor favorita das clientes da KA Bijoux. Com projeção em formato de orelha posicionada para estimulação clitoriana simultânea, o produto oferece prazer duplo durante a penetração.

O design pensado para o casal garante que ambos os parceiros sejam beneficiados pelo uso do produto: ele mantém a ereção mais firme e duradoura, enquanto a orelha posicionada estrategicamente intensifica o prazer dela com estimulação clitoriana contínua.

Em tom rosa delicado e fabricado com material flexível de qualidade, o Anel de Orelha Rosa é compatível com lubrificantes à base d'água e fácil de higienizar após o uso.

O prazer é mais intenso quando é compartilhado — o Anel Peniano Rosa de Orelha é feito para essa experiência.`,
    details: [
      "Projeção de orelha vibratória para estimulação clitoriana",
      "Material flexível e seguro para uso íntimo",
      "Cor: Rosa",
      "Tamanho único ajustável",
      "Compatível com lubrificantes à base d'água",
      "Fácil higienização",
      "Uso exclusivo adulto (+18)",
    ],
    howToUse:
      "Aplique o anel na base do pênis com a orelha voltada para cima. Posicione para que a orelha estimule o clitóris durante a penetração. Não usar por mais de 20 a 30 minutos contínuos. Lave com água e sabão neutro após o uso e seque antes de guardar.",
    variants: [
      { label: "Roxo", slug: "anel-peniano-orelha-roxo", color: "#7c3aed" },
      { label: "Rosa", slug: "anel-peniano-orelha-rosa", color: "#ec4899", active: true },
    ],
    relatedSlugs: [
      "anel-peniano-orelha-roxo",
      "anel-peniano-bolinha-cores",
      "lone-anel-gel",
      "vibrador-golfinho-rosa",
    ],
    stock: 15,
    installments: 1,
  },

  // ────────────────────────────────────────────
  // MASTURBADORES
  // ────────────────────────────────────────────
  {
    slug: "egg-silky",
    name: "EGG Silky",
    sku: "3104000004696",
    price: 12,
    subcategorySlug: "sex-shop-masturbadores",
    imageFile: "egg-silky.png",
    shortDescription:
      "Masturbador EGG Silky com textura sedosa interna para uma sensação suave e envolvente.",
    longDescription: `O EGG Silky é o masturbador da linha EGG com textura interna sedosa que proporciona uma sensação suave, envolvente e altamente realista. Desenvolvido para homens que preferem uma estimulação mais delicada e progressiva, o EGG Silky oferece uma experiência única que imita a suavidade natural do contato íntimo.

O formato de ovo compacto é discreto e fácil de manusear. O material elástico de alta qualidade se expande para acomodar diferentes tamanhos e retorna ao formato original após o uso. A textura interna sedosa distribui a pressão de forma uniforme, criando uma sensação de envolvimento completo.

Descartável ou reutilizável quando higienizado corretamente, o EGG Silky é prático e acessível. O material é livre de substâncias nocivas e testado para segurança no uso íntimo masculino.

Descubra o prazer da suavidade com o EGG Silky — porque às vezes menos é muito mais.`,
    details: [
      "Textura interna sedosa",
      "Material elástico expansível",
      "Formato compacto de ovo",
      "Livre de substâncias nocivas",
      "Uso único ou reutilizável (com higienização)",
      "Uso exclusivo adulto (+18)",
    ],
    howToUse:
      "Aplique lubrificante à base d'água generosamente no interior do EGG e no pênis. Encaixe o EGG e comece a movimentação suavemente. Após o uso, vire o EGG ao contrário, lave com água morna e sabão neutro e deixe secar completamente antes de guardar.",
    variants: [
      { label: "Silky", slug: "egg-silky", active: true },
      { label: "Stepper", slug: "egg-stepper-rosa" },
      { label: "Twister", slug: "egg-twister-laranja" },
      { label: "Wavy", slug: "egg-wavy-roxo" },
    ],
    relatedSlugs: [
      "egg-stepper-rosa",
      "egg-twister-laranja",
      "egg-wavy-roxo",
      "nabucetim-sex-18ml",
    ],
    stock: 15,
    installments: 1,
  },
  {
    slug: "egg-stepper-rosa",
    name: "Masturbador EGG Stepper Rosa",
    sku: "3104000004694",
    price: 12,
    subcategorySlug: "sex-shop-masturbadores",
    imageFile: "egg-stepper.png",
    shortDescription:
      "Masturbador EGG Stepper com textura interna em degraus para estimulação progressiva e intensa.",
    longDescription: `O EGG Stepper Rosa da linha de masturbadores EGG apresenta uma textura interna única em formato de degraus que proporciona estimulação progressiva e altamente intensa. Cada movimento dentro do EGG Stepper gera uma sensação diferente conforme os degraus internos interagem com a pele, criando uma experiência rica e variada.

A textura em degraus foi desenvolvida para simular a sensação de contração progressiva, tornando cada movimento mais estimulante que o anterior. O material elástico se adapta perfeitamente ao corpo, garantindo um encaixe confortável e eficiente.

Disponível em tom rosa vibrante, o EGG Stepper é compacto, discreto e fácil de usar com apenas uma mão. O material de qualidade é livre de substâncias nocivas e pode ser reutilizado com a higienização adequada.

Suba o degrau do prazer com o EGG Stepper Rosa — cada passo é mais intenso que o anterior.`,
    details: [
      "Textura interna em degraus para estimulação progressiva",
      "Material elástico de alta qualidade",
      "Expansível para diferentes tamanhos",
      "Cor: Rosa",
      "Livre de substâncias nocivas",
      "Uso exclusivo adulto (+18)",
    ],
    howToUse:
      "Aplique lubrificante à base d'água no interior do EGG e no pênis antes do uso. Encaixe e explore os movimentos para sentir a estimulação da textura em degraus. Após o uso, vire ao contrário, lave com água morna e sabão neutro e seque completamente.",
    variants: [
      { label: "Silky", slug: "egg-silky" },
      { label: "Stepper", slug: "egg-stepper-rosa", active: true },
      { label: "Twister", slug: "egg-twister-laranja" },
      { label: "Wavy", slug: "egg-wavy-roxo" },
    ],
    relatedSlugs: [
      "egg-silky",
      "egg-twister-laranja",
      "egg-wavy-roxo",
      "nabucetim-sex-18ml",
    ],
    stock: 15,
    installments: 1,
  },
  {
    slug: "egg-twister-laranja",
    name: "Masturbador EGG Twister Laranja",
    sku: "3104000000801",
    price: 12,
    subcategorySlug: "sex-shop-masturbadores",
    imageFile: "egg-twister.png",
    shortDescription:
      "Masturbador EGG Twister com textura espiral interna para uma estimulação rotativa e intensa.",
    longDescription: `O EGG Twister Laranja é o masturbador da linha EGG para quem quer uma experiência diferente e altamente estimulante. Com textura interna em espiral, o produto cria uma sensação rotativa durante o uso que é completamente diferente de qualquer outro masturbador da linha.

A textura em espiral envolve o pênis em um abraço rotativo que se intensifica com cada movimento. A sensação de torção suave e progressiva torna cada uso do EGG Twister uma experiência única e memorável que vai surpreender mesmo os mais experientes.

Em tom laranja vibrante e com material de qualidade expansível e livre de substâncias nocivas, o EGG Twister é compacto, discreto e fácil de usar. Pode ser reutilizado com higienização adequada.

Gire o prazer em uma direção completamente nova com o EGG Twister Laranja — porque às vezes o que faltava era uma nova perspectiva.`,
    details: [
      "Textura interna em espiral rotativa",
      "Material elástico expansível",
      "Estimulação única e diferenciada",
      "Cor: Laranja",
      "Livre de substâncias nocivas",
      "Uso exclusivo adulto (+18)",
    ],
    howToUse:
      "Aplique lubrificante à base d'água abundantemente no interior do EGG e no pênis. Encaixe e explore movimentos de rotação para aproveitar a textura espiral. Após o uso, vire ao contrário, lave com água morna e sabão neutro e seque antes de guardar.",
    variants: [
      { label: "Silky", slug: "egg-silky" },
      { label: "Stepper", slug: "egg-stepper-rosa" },
      { label: "Twister", slug: "egg-twister-laranja", active: true },
      { label: "Wavy", slug: "egg-wavy-roxo" },
    ],
    relatedSlugs: [
      "egg-silky",
      "egg-stepper-rosa",
      "egg-wavy-roxo",
      "nocucedim-sex-18ml",
    ],
    stock: 12,
    installments: 1,
  },
  {
    slug: "egg-wavy-roxo",
    name: "Masturbador EGG Wavy Roxo",
    sku: "3104000004695",
    price: 12,
    subcategorySlug: "sex-shop-masturbadores",
    imageFile: "egg-wavy.png",
    shortDescription:
      "Masturbador EGG Wavy com textura interna ondulada para sensações suaves e progressivamente intensas.",
    longDescription: `O EGG Wavy Roxo completa a linha de masturbadores EGG com uma textura interna ondulada que imita o movimento natural das ondas. A sensação é ao mesmo tempo suave e progressivamente intensa, criando um ritmo de prazer que evolui naturalmente com cada uso.

As ondulações internas distribuem a pressão de forma não uniforme ao longo do comprimento do EGG, criando zonas de maior e menor estimulação que se alternam com cada movimento. O resultado é uma experiência rica e multidimensional que varia conforme o ritmo de uso.

Em tom roxo elegante e com material elástico de qualidade livre de substâncias nocivas, o EGG Wavy é compacto, discreto e versátil. O formato de ovo facilita o manuseio e o armazenamento discreto.

Surfe na onda do prazer com o EGG Wavy Roxo — cada movimento é uma nova sensação.`,
    details: [
      "Textura interna ondulada",
      "Estimulação progressiva e variada",
      "Material elástico de qualidade",
      "Cor: Roxo",
      "Livre de substâncias nocivas",
      "Uso exclusivo adulto (+18)",
    ],
    howToUse:
      "Aplique lubrificante à base d'água generosamente no interior do EGG e no pênis. Encaixe o EGG e explore diferentes ritmos de movimento para sentir as variações da textura ondulada. Após o uso, vire ao contrário, lave com água morna e sabão neutro e seque completamente.",
    variants: [
      { label: "Silky", slug: "egg-silky" },
      { label: "Stepper", slug: "egg-stepper-rosa" },
      { label: "Twister", slug: "egg-twister-laranja" },
      { label: "Wavy", slug: "egg-wavy-roxo", active: true },
    ],
    relatedSlugs: [
      "egg-silky",
      "egg-stepper-rosa",
      "egg-twister-laranja",
      "nabucetim-sex-18ml",
    ],
    stock: 12,
    installments: 1,
  },

  // ────────────────────────────────────────────
  // LUBRIFICANTES
  // ────────────────────────────────────────────
  {
    slug: "nabucetim-sex-18ml",
    name: "Nabucetim Sex 18ml",
    sku: "3104000001491",
    price: 12,
    subcategorySlug: "sex-shop-lubrificantes",
    imageFile: "nabucetim-18ml.png",
    badge: "Mais vendido",
    shortDescription:
      "Lubrificante íntimo à base d'água com pH neutro para máximo conforto e prazer durante a intimidade.",
    longDescription: `O Nabucetim Sex 18ml é um lubrificante íntimo de alta qualidade formulado especialmente para proporcionar máximo conforto e prazer durante a intimidade. Com fórmula à base d'água e pH neutro, o produto é compatível com a fisiologia íntima feminina e com todos os tipos de preservativos.

A fórmula do Nabucetim Sex foi desenvolvida para imitar a lubrificação natural do corpo, proporcionando uma sensação mais natural e confortável. O produto não resseca rapidamente, mantendo a lubrificação por mais tempo e reduzindo a necessidade de reaplicações frequentes.

Sem fragrâncias artificiais, sem parabenos e sem substâncias irritantes, o Nabucetim Sex é uma escolha segura para todos. A embalagem de 18ml é compacta e discreta, perfeita para guardar na bolsa ou no criado-mudo.

Conforto e prazer começam com o Nabucetim Sex — porque a lubrificação certa transforma completamente a experiência íntima.`,
    details: [
      "Base aquosa (water-based)",
      "pH neutro e compatível com a flora íntima",
      "Sem fragrâncias artificiais",
      "Sem parabenos",
      "Compatível com preservativos de látex e silicone",
      "Conteúdo: 18ml",
      "Uso exclusivo adulto (+18)",
    ],
    howToUse:
      "Aplique a quantidade desejada diretamente na região íntima, no preservativo ou nos acessórios utilizados. Reaplicar conforme necessário durante o uso. Após o uso, lave a região com água. Evite contato com os olhos. Em caso de irritação, interrompa e consulte um médico.",
    relatedSlugs: [
      "nocucedim-sex-18ml",
      "k-med-gel-intimo",
      "lone-anel-gel",
      "egg-stepper-rosa",
    ],
    stock: 25,
    installments: 1,
  },
  {
    slug: "nocucedim-sex-18ml",
    name: "Nocucedim Sex 18ml",
    sku: "3104000001500",
    price: 12,
    subcategorySlug: "sex-shop-lubrificantes",
    imageFile: "nocucedim-18ml.png",
    shortDescription:
      "Lubrificante íntimo masculino à base d'água para maior conforto e sensação durante a intimidade.",
    longDescription: `O Nocucedim Sex 18ml é um lubrificante íntimo formulado pensando no conforto e no prazer masculino durante a intimidade. Com fórmula à base d'água de pH balanceado, o produto proporciona lubrificação eficiente, natural e de longa duração sem deixar resíduo oleoso ou pegajoso.

Desenvolvido com ingredientes de qualidade e sem substâncias irritantes, o Nocucedim Sex é adequado para todos os tipos de pele, incluindo peles sensíveis. A compatibilidade com preservativos de látex e acessórios íntimos torna o produto versátil para diferentes situações.

A embalagem compacta de 18ml é prática e discreta, facilitando o armazenamento e o transporte. O produto tem longa validade e mantém suas propriedades lubrificantes em condições normais de uso.

O complemento perfeito para uma experiência íntima mais confortável e prazerosa — o Nocucedim Sex está pronto para quando você precisar.`,
    details: [
      "Base aquosa (water-based)",
      "pH balanceado para uso masculino",
      "Longa duração sem ressecar",
      "Sem residuo oleoso",
      "Compatível com preservativos de látex e silicone",
      "Conteúdo: 18ml",
      "Uso exclusivo adulto (+18)",
    ],
    howToUse:
      "Aplique o gel lubrificante diretamente no pênis, no preservativo ou no acessório antes do uso. Reaplicar conforme necessário durante a atividade. Lave com água após o uso. Evite contato com os olhos. Em caso de irritação, interrompa imediatamente.",
    relatedSlugs: [
      "nabucetim-sex-18ml",
      "k-med-gel-intimo",
      "egg-twister-laranja",
      "egg-wavy-roxo",
    ],
    stock: 22,
    installments: 1,
  },

  // ────────────────────────────────────────────
  // DESODORANTES ÍNTIMOS
  // ────────────────────────────────────────────
  {
    slug: "desodorante-intimo-doce-paixao",
    name: "Desodorante Íntimo Doce Paixão",
    sku: "3104000004310",
    price: 17,
    subcategorySlug: "sex-shop-desodorantes",
    imageFile: "desodorante-intimo-doce-paixao.png",
    badge: "Destaque",
    shortDescription:
      "Desodorante íntimo com fragrância de Doce Paixão para frescor, proteção e um aroma irresistível.",
    longDescription: `O Desodorante Íntimo Doce Paixão foi criado para mulheres que desejam manter a sensação de frescor e bem-estar na região íntima ao longo do dia. Com fragrância suave e irresistível de Doce Paixão, o produto neutraliza odores indesejados e proporciona uma sensação de limpeza e leveza que dura horas.

A fórmula delicada foi desenvolvida com ingredientes compatíveis com o pH íntimo feminino, evitando a irritação e respeitando o equilíbrio natural da flora vaginal. Livre de substâncias agressivas, o desodorante pode ser usado diariamente com segurança.

O aroma de Doce Paixão é uma mistura especialmente criada para ser ao mesmo tempo suave e marcante, deixando uma fragrância irresistível sem ser excessiva. É a escolha perfeita para sentir-se fresca e confiante em qualquer momento do dia.

Disponível também nas fragrâncias Tutti Frutti e Morango para variar conforme o humor. O Desodorante Íntimo Doce Paixão é para a mulher que cuida de si mesma com carinho e estilo.`,
    details: [
      "Fragrância: Doce Paixão",
      "pH balanceado e compatível com a flora íntima",
      "Neutraliza odores indesejados",
      "Sem substâncias irritantes",
      "Uso externo na região íntima",
      "Uso diário",
      "Uso exclusivo adulto (+18)",
    ],
    howToUse:
      "Após o banho e a higienização da região íntima, aplique o desodorante externamente na vulva. Espalhe delicadamente. Não aplicar internamente. Pode ser reaplicado ao longo do dia conforme necessário. Evite contato com os olhos. Em caso de irritação, interrompa o uso.",
    variants: [
      { label: "Doce Paixão", slug: "desodorante-intimo-doce-paixao", active: true },
      { label: "Tutti Frutti", slug: "desodorante-intimo-tutti-frutti" },
      { label: "Morango", slug: "desodorante-intimo-morango" },
    ],
    relatedSlugs: [
      "desodorante-intimo-tutti-frutti",
      "desodorante-intimo-morango",
      "k-med-gel-intimo",
      "creme-adstringente-sexy",
    ],
    stock: 20,
    installments: 1,
  },
  {
    slug: "desodorante-intimo-tutti-frutti",
    name: "Desodorante Íntimo Tutti Frutti",
    sku: "3104000004311",
    price: 17,
    subcategorySlug: "sex-shop-desodorantes",
    imageFile: "desodorante-intimo-tutti-frutti.png",
    shortDescription:
      "Desodorante íntimo com fragrância Tutti Frutti para frescor diário com um toque de alegria e leveza.",
    longDescription: `O Desodorante Íntimo Tutti Frutti traz frescor e alegria para o cuidado íntimo diário com sua fragrância vibrante e divertida. A mistura de frutas tropicais cria um aroma suave, mas marcante, que mantém a sensação de limpeza e frescor por horas.

Desenvolvido com fórmula delicada e compatível com o pH feminino, o desodorante respeita o equilíbrio natural da flora vaginal e pode ser usado diariamente sem riscos. A textura suave se distribui uniformemente na região íntima, proporcionando conforto e proteção ao longo do dia.

A fragrância Tutti Frutti é a escolha perfeita para dias ensolarados e momentos de leveza — um convite para celebrar o cuidado com o próprio corpo com alegria e frescor.

Use o dia que quiser a fragrância que mais combina com você: Tutti Frutti para os dias alegres, Doce Paixão para os dias românticos e Morango para os dias especiais.`,
    details: [
      "Fragrância: Tutti Frutti",
      "pH balanceado e compatível com a flora íntima",
      "Proteção e frescor de longa duração",
      "Fórmula suave sem substâncias irritantes",
      "Uso externo na região íntima",
      "Uso diário",
      "Uso exclusivo adulto (+18)",
    ],
    howToUse:
      "Após a higienização, aplique externamente na região íntima com movimentos suaves. Não usar internamente. Reaplicar ao longo do dia se necessário. Evite contato com os olhos. Em caso de irritação, interrompa o uso e consulte um médico.",
    variants: [
      { label: "Doce Paixão", slug: "desodorante-intimo-doce-paixao" },
      { label: "Tutti Frutti", slug: "desodorante-intimo-tutti-frutti", active: true },
      { label: "Morango", slug: "desodorante-intimo-morango" },
    ],
    relatedSlugs: [
      "desodorante-intimo-doce-paixao",
      "desodorante-intimo-morango",
      "k-med-gel-intimo",
      "fofatoba-gel",
    ],
    stock: 18,
    installments: 1,
  },
  {
    slug: "desodorante-intimo-morango",
    name: "Desodorante Íntimo Morango",
    sku: "3104000004313",
    price: 17,
    subcategorySlug: "sex-shop-desodorantes",
    imageFile: "desodorante-intimo-morango.png",
    shortDescription:
      "Desodorante íntimo com fragrância de Morango para um frescor irresistível e delicioso no dia a dia.",
    longDescription: `O Desodorante Íntimo Morango é para as mulheres que adoram um toque doce e irresistível no seu cuidado íntimo. Com fragrância suave de morango maduro, o produto deixa uma sensação de frescor e delicadeza que dura horas, elevando a confiança e o bem-estar feminino.

A fórmula desenvolvida com ingredientes compatíveis com o pH íntimo feminino garante proteção diária sem irritação. Sem substâncias agressivas, o desodorante de morango pode ser usado todos os dias com segurança e eficácia.

O aroma de morango é uma escolha clássica entre as consumidoras da KA Bijoux — doce o suficiente para ser marcante, suave o suficiente para ser usado a qualquer hora do dia. É a fragrância que torna o momento de cuidado pessoal mais prazeroso e especial.

Complete sua rotina de cuidados íntimos com o Desodorante de Morango — porque você merece se sentir fresca e irresistível o dia todo.`,
    details: [
      "Fragrância: Morango",
      "pH balanceado e compatível com a flora íntima",
      "Frescor e proteção de longa duração",
      "Fórmula suave e sem irritantes",
      "Uso externo na região íntima",
      "Uso diário",
      "Uso exclusivo adulto (+18)",
    ],
    howToUse:
      "Após o banho e a higienização da região íntima, aplique o desodorante externamente com movimentos delicados. Não aplicar internamente. Reaplicar ao longo do dia conforme necessário. Evite contato com os olhos. Em caso de irritação, interrompa e consulte um médico.",
    variants: [
      { label: "Doce Paixão", slug: "desodorante-intimo-doce-paixao" },
      { label: "Tutti Frutti", slug: "desodorante-intimo-tutti-frutti" },
      { label: "Morango", slug: "desodorante-intimo-morango", active: true },
    ],
    relatedSlugs: [
      "desodorante-intimo-doce-paixao",
      "desodorante-intimo-tutti-frutti",
      "sempre-virgem-gel",
      "virginite-gel",
    ],
    stock: 18,
    installments: 1,
  },
];

// Build the catalog map
export const STATIC_SEX_SHOP_CATALOG: Map<string, StaticProduct> = new Map(
  products.map((product) => [product.slug, product])
);

// Lookup function
export function getStaticProduct(slug: string): StaticProduct | null {
  return STATIC_SEX_SHOP_CATALOG.get(slug) ?? null;
}

// Subcategory name lookup helper
const SUBCATEGORY_NAMES: Record<string, string> = {
  "sex-shop-geis-e-cremes": "Géis & Cremes",
  "sex-shop-vibradores": "Vibradores",
  "sex-shop-aneis": "Anéis Penianos",
  "sex-shop-masturbadores": "Masturbadores",
  "sex-shop-lubrificantes": "Lubrificantes",
  "sex-shop-desodorantes": "Desodorantes Íntimos",
};

export function getSubcategoryName(subcategorySlug: string): string {
  return SUBCATEGORY_NAMES[subcategorySlug] ?? "Linha Adulto";
}

// Subcategory pathSlug lookup for breadcrumb links
const SUBCATEGORY_PATH_SLUGS: Record<string, string> = {
  "sex-shop-geis-e-cremes": "geis-e-cremes",
  "sex-shop-vibradores": "vibradores",
  "sex-shop-aneis": "aneis-penianos",
  "sex-shop-masturbadores": "masturbadores",
  "sex-shop-lubrificantes": "lubrificantes",
  "sex-shop-desodorantes": "desodorantes-intimos",
};

export function getSubcategoryPathSlug(subcategorySlug: string): string {
  return SUBCATEGORY_PATH_SLUGS[subcategorySlug] ?? "sex-shop";
}
