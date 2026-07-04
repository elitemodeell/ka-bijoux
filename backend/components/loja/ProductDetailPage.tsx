"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { StaticProduct, StaticProductVariant } from "@/lib/static-sex-shop-catalog";
import { getStaticProduct } from "@/lib/static-sex-shop-catalog";
import { addCartItem } from "@/lib/client-cart";
import { getInstallmentInfo, getValidPromotionalPrice } from "@/lib/store-rules";
import ProductCard from "@/components/loja/ProductCard";
import ProductVariantImage from "@/components/loja/ProductVariantImage";

type RelatedProduct = {
  id: string;
  name: string;
  slug?: string;
  price: number;
  promotionalPrice?: number | null;
  image?: string | null;
  badge?: string | null;
  stock?: number;
  sku?: string | null;
  description?: string | null;
  category?: { name: string; slug?: string } | null;
  subcategory?: { name: string; slug?: string } | null;
};

type ProductDetailProduct = StaticProduct & {
  brand?: string | null;
  ean?: string | null;
  benefits?: string | null;
  howToUse?: string | null;
  composition?: string | null;
  careInstructions?: string | null;
  packageContents?: string | null;
  categoryName?: string | null;
  categorySlug?: string | null;
  subcategoryName?: string | null;
  promotionalPrice?: number | null;
  galleryImages?: string[];
  relatedProducts?: RelatedProduct[];
  weight?: number | null;
  height?: number | null;
  width?: number | null;
  length?: number | null;
  variations?: StaticProductVariant[];
  isAdult?: boolean | null;
};

type Props = {
  product: ProductDetailProduct;
  subcategoryName: string;
  subcategoryPathSlug: string;
};

type TechnicalSection = {
  id: string;
  title: string;
  text?: string | null;
  items?: string[];
};

const fmt = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

export default function ProductDetailPage({ product, subcategoryName }: Props) {
  const [quantity, setQuantity] = useState(1);
  const [cartAdded, setCartAdded] = useState(false);
  const [selectedImage, setSelectedImage] = useState(0);
  const [selectedVariation, setSelectedVariation] = useState(0);
  const variations = product.variations ?? product.variants ?? [];
  const selectedVariant = variations[selectedVariation] ?? null;

  const images = useMemo(() => {
    const variantGallery = selectedVariant?.images?.filter(Boolean) ?? [];
    const variantFallback = selectedVariant?.imageFile
      ? [selectedVariant.imageFile.startsWith("/") ? selectedVariant.imageFile : `/uploads/products/${selectedVariant.imageFile}`]
      : [];
    const gallery = product.galleryImages?.filter(Boolean) ?? [];
    const fallback = product.imageFile
      ? [product.imageFile.startsWith("/") ? product.imageFile : `/uploads/products/${product.imageFile}`]
      : [];
    return Array.from(new Set(variantGallery.length ? variantGallery : variantFallback.length ? variantFallback : gallery.length ? gallery : fallback));
  }, [product.galleryImages, product.imageFile, selectedVariant]);

  useEffect(() => {
    setSelectedImage(0);
  }, [selectedVariation]);

  const imageUrl = images[selectedImage] ?? "";
  const promotionalPrice = getValidPromotionalPrice(product.price, product.promotionalPrice);
  const finalPrice = promotionalPrice ?? product.price;
  const installment = getInstallmentInfo(finalPrice);
  const categoryName = product.categoryName ?? "KA Bijoux";
  const categorySlug = product.categorySlug ?? "produtos";
  const productSubcategoryName = product.subcategoryName ?? subcategoryName;
  const available = product.stock > 0;
  const isAdult = product.isAdult ?? isAdultProduct(categorySlug, product.subcategorySlug, productSubcategoryName, product.name);
  const publicBrand = publicText(product.brand);
  const publicDescription = buildCommercialDescription(
    product,
    productSubcategoryName || categoryName,
    isAdult
  );

  const relatedProducts = useMemo(() => {
    if (product.relatedProducts?.length) return product.relatedProducts;

    return product.relatedSlugs
      .map((slug) => getStaticProduct(slug))
      .filter(Boolean)
      .map((related) => ({
        id: related!.sku || related!.slug,
        name: related!.name,
        price: related!.price,
        image: `/uploads/products/${related!.imageFile}`,
        slug: related!.slug,
        badge: related!.badge,
        stock: related!.stock,
        sku: related!.sku,
        description: related!.shortDescription,
        subcategory: { name: productSubcategoryName, slug: related!.subcategorySlug },
        category: { name: categoryName, slug: categorySlug },
      }));
  }, [categoryName, categorySlug, product.relatedProducts, product.relatedSlugs, productSubcategoryName]);

  const technicalSections = buildTechnicalSections({
    product,
    categoryName,
    productSubcategoryName,
    variations,
    isAdult,
  });

  function cartPayload() {
    return {
      id: product.sku || product.slug,
      name: selectedVariant ? `${product.name} - ${selectedVariant.label}` : product.name,
      price: finalPrice,
      image: imageUrl,
      sku: product.sku,
      stock: product.stock,
      description: product.shortDescription,
      subcategory: { name: productSubcategoryName, slug: product.subcategorySlug },
      category: { name: categoryName, slug: categorySlug },
    };
  }

  function handleAddToCart() {
    if (!available) return;
    addCartItem(cartPayload(), quantity);
    setCartAdded(true);
    window.setTimeout(() => setCartAdded(false), 1800);
  }

  function handleBuyNow() {
    if (!available) return;
    addCartItem(cartPayload(), quantity);
    window.location.href = "/carrinho";
  }

  return (
    <div className="min-h-screen bg-[#fffafa] pb-32 pt-28 text-gray-900 md:pb-20">
      <nav className="mx-auto max-w-7xl px-4 pb-5 sm:px-6">
        <ol className="flex flex-wrap items-center gap-1.5 text-xs font-semibold text-gray-400">
          <li><Link href="/" className="hover:text-pink-500">Início</Link></li>
          <li>/</li>
          <li>
            <Link href={categorySlug === "produtos" ? "/produtos" : `/categoria/${categorySlug}`} className="hover:text-pink-500">
              {categoryName}
            </Link>
          </li>
          {productSubcategoryName ? <><li>/</li><li className="text-gray-600">{productSubcategoryName}</li></> : null}
        </ol>
      </nav>

      <main className="mx-auto max-w-7xl px-4 sm:px-6">
        <section className="grid gap-7 lg:grid-cols-[minmax(0,1fr)_470px] lg:items-start lg:gap-10">
          <div className="min-w-0">
            <div className="relative aspect-square max-h-[560px] overflow-hidden rounded-[24px] border border-pink-100 bg-white shadow-[0_22px_62px_rgba(201,66,119,0.11)] sm:rounded-[28px]">
              {imageUrl ? (
                <ProductVariantImage
                  src={imageUrl}
                  alt={product.name}
                  productName={selectedVariant ? `${product.name} ${selectedVariant.label}` : product.name}
                  sku={selectedVariant?.sku ?? product.sku}
                  priority
                  sizes="(max-width: 1024px) 100vw, 50vw"
                  frameClassName="h-full w-full"
                  imageClassName="object-contain p-6 sm:p-10"
                />
              ) : (
                <div className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-br from-pink-50 to-white text-pink-300">
                  <span className="text-6xl font-black">KA</span>
                  <span className="mt-2 text-sm font-bold">KA Bijoux</span>
                </div>
              )}

              {product.badge && (
                <span className="absolute left-4 top-4 rounded-full bg-pink-500 px-3 py-1.5 text-xs font-black text-white shadow-lg">
                  {product.badge}
                </span>
              )}
              <button type="button" className="absolute right-4 top-4 flex h-11 w-11 items-center justify-center rounded-full border border-pink-100 bg-white/92 text-pink-500 shadow-md backdrop-blur" aria-label="Adicionar aos favoritos">
                <HeartIcon />
              </button>
            </div>

            {images.length > 1 && (
              <div className="mt-3 flex gap-3 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {images.map((image, index) => (
                  <button
                    key={`${image}-${index}`}
                    type="button"
                    onClick={() => setSelectedImage(index)}
                    className={`h-20 w-20 shrink-0 overflow-hidden rounded-2xl border bg-white p-1 transition ${selectedImage === index ? "border-pink-500 ring-2 ring-pink-100" : "border-pink-100"}`}
                    aria-label={`Ver foto ${index + 1}`}
                  >
                    <ProductVariantImage
                      src={image}
                      alt=""
                      productName={selectedVariant ? `${product.name} ${selectedVariant.label}` : product.name}
                      sku={selectedVariant?.sku ?? product.sku}
                      sizes="80px"
                      frameClassName="h-full w-full rounded-xl"
                      imageClassName="rounded-xl object-contain"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          <aside className="rounded-[26px] border border-pink-100 bg-white p-5 shadow-[0_20px_54px_rgba(201,66,119,0.09)] sm:p-7 lg:sticky lg:top-24">
            <div className="flex flex-wrap gap-2 text-[10px] font-black uppercase tracking-[0.12em]">
              <span className="rounded-full bg-pink-50 px-3 py-1.5 text-pink-600">KA Bijoux</span>
              {isAdult && <span className="rounded-full bg-[#5d2038] px-3 py-1.5 text-white">18+ acesso restrito</span>}
            </div>

            <h1 className="mt-4 text-2xl font-black leading-tight tracking-normal text-gray-950 sm:text-3xl">{product.name}</h1>

            <dl className="mt-4 grid grid-cols-2 gap-x-5 gap-y-3 border-y border-pink-50 py-4 text-xs">
              {publicBrand ? <QuickFact label="Marca" value={publicBrand} /> : null}
              <QuickFact label="Categoria" value={productSubcategoryName || categoryName} />
              <QuickFact label="Disponibilidade" value={available ? "Pronta entrega" : "Indisponível"} />
            </dl>

            <p className="mt-4 text-sm leading-relaxed text-gray-600">
              {publicDescription}
            </p>

            <div className="mt-5 border-y border-pink-50 py-5">
              {promotionalPrice ? <p className="text-sm font-bold text-gray-400 line-through">{fmt(product.price)}</p> : null}
              <p className="text-3xl font-black text-pink-600">{fmt(finalPrice)}</p>
              <p className="mt-1 text-sm font-semibold text-gray-600">
                {installment.eligible && installment.installmentValue
                  ? `${installment.label} de ${fmt(installment.installmentValue)}`
                  : installment.label}
              </p>
            </div>

            {variations.length > 0 && (
              <div className="mt-5">
                <p className="text-xs font-black uppercase tracking-[0.15em] text-gray-500">Opções disponíveis</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {variations.map((variation, index) => (
                    <button
                      key={`${variation.slug}-${index}`}
                      type="button"
                      onClick={() => setSelectedVariation(index)}
                      disabled={variation.active === false}
                      className={`min-h-10 rounded-xl border px-3 text-xs font-bold transition disabled:cursor-not-allowed disabled:opacity-40 ${selectedVariation === index ? "border-pink-500 bg-pink-50 text-pink-600" : "border-gray-200 bg-white text-gray-700"}`}
                    >
                      {variation.color && <span className="mr-2 inline-block h-3 w-3 rounded-full border border-black/10 align-middle" style={{ backgroundColor: variation.color }} />}
                      {variation.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-5 flex items-center gap-3">
              <div className="inline-flex h-12 items-center overflow-hidden rounded-2xl border border-pink-100 bg-white">
                <button type="button" onClick={() => setQuantity((value) => Math.max(1, value - 1))} className="h-full w-11 text-lg font-black text-pink-600" aria-label="Diminuir quantidade">-</button>
                <span className="min-w-10 text-center text-base font-black">{quantity}</span>
                <button type="button" onClick={() => setQuantity((value) => Math.min(Math.max(product.stock, 1), value + 1))} className="h-full w-11 text-lg font-black text-pink-600" aria-label="Aumentar quantidade">+</button>
              </div>
              <span className={`text-xs font-bold ${available ? "text-emerald-600" : "text-red-500"}`}>{available ? `${product.stock} em estoque` : "Sem estoque"}</span>
            </div>

            <div className="mt-6 hidden grid-cols-2 gap-3 md:grid">
              <PurchaseButton onClick={handleAddToCart} disabled={!available} primary>{cartAdded ? "Adicionado" : "Adicionar ao carrinho"}</PurchaseButton>
              <PurchaseButton onClick={handleBuyNow} disabled={!available}>Comprar agora</PurchaseButton>
            </div>

            <div className="mt-6 divide-y divide-pink-50 border-y border-pink-50">
              <DeliveryItem icon={<StoreIcon />} title="Retirada na loja" text="Disponível para produtos em estoque." />
              <DeliveryItem icon={<DeliveryIcon />} title="Mototáxi em Itaúna" text="Entrega local por R$10." />
              <DeliveryItem icon={<TruckIcon />} title="Envio pelos Correios" text="Disponível conforme produto e CEP." />
              <DeliveryItem icon={<ShieldIcon />} title="Compra protegida" text="Pagamento seguro e embalagem discreta." />
            </div>
          </aside>
        </section>

        {isAdult && (
          <section className="mt-9 flex gap-4 rounded-[22px] border border-[#efd6df] bg-[#fff5f8] px-5 py-4 text-[#6d3448]">
            <ShieldIcon />
            <div>
              <p className="font-black">Produto destinado a maiores de 18 anos.</p>
              <p className="mt-1 text-sm leading-relaxed">Use conforme as orientações da embalagem. Em caso de irritação ou desconforto, interrompa o uso.</p>
            </div>
          </section>
        )}

        <section className="mt-10">
          <div className="mb-5">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-pink-500">Informações do produto</p>
            <h2 className="mt-1 text-2xl font-black text-gray-950">Tudo o que você precisa saber</h2>
          </div>

          <div className="mx-auto grid max-w-5xl gap-4">
            {technicalSections.map((section) => (
              <InfoSection key={section.id} section={section} />
            ))}
          </div>
        </section>

        <RelatedSection title="Produtos relacionados" products={relatedProducts.slice(0, 4)} />
        <RelatedSection title="Quem viu, viu também" products={(relatedProducts.length > 4 ? relatedProducts.slice(4, 8) : relatedProducts.slice(0, 4))} />
      </main>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-pink-100 bg-white/96 p-3 shadow-[0_-16px_38px_rgba(201,66,119,0.13)] backdrop-blur md:hidden">
        <div className="mx-auto grid max-w-lg grid-cols-2 gap-2">
          <PurchaseButton onClick={handleAddToCart} disabled={!available} primary>{cartAdded ? "Adicionado" : "Adicionar"}</PurchaseButton>
          <PurchaseButton onClick={handleBuyNow} disabled={!available}>Comprar agora</PurchaseButton>
        </div>
      </div>
    </div>
  );
}

function buildTechnicalSections({
  product,
  categoryName,
  productSubcategoryName,
  variations,
  isAdult,
}: {
  product: ProductDetailProduct;
  categoryName: string;
  productSubcategoryName: string;
  variations: StaticProductVariant[];
  isAdult: boolean;
}): TechnicalSection[] {
  const description = buildCommercialDescription(
    product,
    productSubcategoryName || categoryName,
    isAdult
  );
  const material = publicText(product.composition);
  const howToUse = publicText(product.howToUse) || buildSafeUsage(product.name, isAdult);
  const care = publicText(product.careInstructions);
  const packageContents = publicText(product.packageContents);
  const benefits = publicText(product.benefits);
  const color = extractColor(product.name);
  const purpose = getProductPurpose(product.name, productSubcategoryName, isAdult);
  const optionLabels = variations.map((item) => publicText(item.label)).filter((item): item is string => Boolean(item));
  const characteristicItems = Array.from(new Set([
    `Produto: ${product.name}`,
    `Categoria: ${productSubcategoryName || categoryName}`,
    ...(color ? [`Cor: ${color}`] : []),
    ...(product.details ?? []),
    ...(isAdult ? ["Uso: Adulto"] : []),
    ...(purpose ? [`Finalidade: ${purpose}`] : []),
    ...(optionLabels.length ? [`Opções disponíveis: ${optionLabels.join(", ")}`] : []),
  ].map(publicText).filter((item): item is string => Boolean(item))));

  const sections: Array<TechnicalSection | null> = [
    { id: "description", title: "Descrição do produto", text: description },
    {
      id: "characteristics",
      title: "Características",
      items: characteristicItems,
    },
    benefits ? { id: "benefits", title: "Benefícios", text: benefits } : null,
    material ? { id: "material", title: "Material e composição", text: material } : null,
    { id: "usage", title: "Modo de uso", text: howToUse },
    {
      id: "hygiene",
      title: "Higienização",
      items: isAdult
        ? [
            "Higienize antes e após o uso, quando aplicável.",
            "Use água e sabão neutro somente se a embalagem permitir.",
            "Não mergulhe componentes elétricos ou recarregáveis.",
            "Seque completamente e guarde em local limpo e seco.",
          ]
        : ["Siga as instruções de limpeza indicadas na embalagem do fabricante."],
    },
    {
      id: "care",
      title: "Cuidados",
      text: care,
      items: care
        ? undefined
        : [
            "Mantenha fora do alcance de crianças.",
            "Não exponha ao calor excessivo ou à umidade.",
            "Não utilize se a embalagem estiver violada.",
            ...(isAdult ? ["Produtos de uso íntimo não devem ser compartilhados."] : []),
          ],
    },
    {
      id: "recommendations",
      title: "Recomendações",
      items: [
        "Leia as orientações do fabricante antes do primeiro uso.",
        ...(isAdult ? ["Use lubrificante compatível somente quando aplicável.", "Suspenda o uso em caso de desconforto ou irritação."] : []),
        "Em caso de dúvida técnica, solicite atendimento antes da compra.",
      ],
    },
    packageContents ? { id: "package", title: "Conteúdo da embalagem", text: packageContents } : null,
  ];

  return sections.filter((section): section is TechnicalSection => Boolean(section));
}

function RelatedSection({ title, products }: { title: string; products: RelatedProduct[] }) {
  if (!products.length) return null;

  return (
    <section className="mt-14">
      <div className="mb-5 flex items-end justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-pink-500">Seleção KA Bijoux</p>
          <h2 className="mt-1 text-2xl font-black text-gray-950">{title}</h2>
        </div>
        <Link href="/produtos" className="text-sm font-black text-pink-600">Ver vitrine</Link>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {products.map((related, index) => <ProductCard key={`${title}-${related.id}`} product={related} revealDelay={index * 50} />)}
      </div>
    </section>
  );
}

function InfoSection({ section }: { section: TechnicalSection }) {
  const text = publicText(section.text);
  const items = section.items?.map(publicText).filter((item): item is string => Boolean(item)) ?? [];
  if (!text && !items.length) return null;

  return (
    <section className="overflow-hidden rounded-[20px] border border-pink-100 bg-white shadow-[0_10px_30px_rgba(201,66,119,0.05)]">
      <div className="border-b border-pink-50 px-5 py-4 sm:px-6">
        <h3 className="text-base font-black text-gray-950 sm:text-lg">{section.title}</h3>
      </div>
      <div className="px-5 py-5 sm:px-6">
        {text ? <RichText value={text} /> : null}
        {items.length ? (
          <ul className={`space-y-2.5 ${text ? "mt-4" : ""}`}>
            {items.map((item) => (
              <li key={item} className="flex gap-3 text-sm leading-relaxed text-gray-600">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-pink-400" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </section>
  );
}

function RichText({ value }: { value: string }) {
  const paragraphs = value.split(/\n{2,}|\r?\n/).map((item) => item.trim()).filter(Boolean);
  return <div className="space-y-3">{paragraphs.map((paragraph, index) => <p key={`${paragraph}-${index}`} className="text-sm leading-7 text-gray-600">{paragraph}</p>)}</div>;
}

function QuickFact({ label, value }: { label: string; value: string }) {
  return <div><dt className="font-bold text-gray-400">{label}</dt><dd className="mt-1 line-clamp-2 font-black text-gray-700">{value}</dd></div>;
}

function PurchaseButton({ children, onClick, disabled, primary = false }: { children: React.ReactNode; onClick: () => void; disabled: boolean; primary?: boolean }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} className={`min-h-12 rounded-2xl px-3 text-sm font-black transition disabled:cursor-not-allowed disabled:opacity-50 ${primary ? "bg-gradient-to-r from-pink-600 to-pink-400 text-white shadow-[0_12px_28px_rgba(219,39,119,0.25)]" : "border border-pink-200 bg-white text-pink-600 hover:bg-pink-50"}`}>
      {children}
    </button>
  );
}

function DeliveryItem({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return (
    <div className="flex gap-3 py-3.5">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-pink-50 text-pink-600">{icon}</span>
      <div><p className="text-sm font-black text-gray-950">{title}</p><p className="mt-0.5 text-xs font-semibold leading-relaxed text-gray-500">{text}</p></div>
    </div>
  );
}

function isAdultProduct(categorySlug: string, subcategorySlug: string, categoryName: string, productName = "") {
  const text = normalize(`${categorySlug} ${subcategorySlug} ${categoryName} ${productName}`);
  return (
    text.includes("sex shop") ||
    categorySlug === "sex-shop" ||
    subcategorySlug.startsWith("sex-shop") ||
    /\b(intimo|intima|lubrificante|vibrador|bullet|peniano|masturbador|algema|dedeira|plug anal|retardante|dessensibilizante|excitante|anestesico|protese|dildo|escroto|mydick|chicote|tapa mamilo)\b/.test(text)
  );
}

function buildCommercialDescription(product: ProductDetailProduct, categoryName: string, isAdult: boolean) {
  const name = product.name.trim();
  const normalized = normalize(`${name} ${categoryName}`);
  const savedDescription = [product.longDescription, product.shortDescription]
    .map(publicText)
    .find((value): value is string => Boolean(value));
  if (savedDescription) return savedDescription;

  if (/mini bullet|bullet|vibrador|masturbador|sugador/.test(normalized)) {
    const doublePoint = normalized.includes("duplo")
      ? " Seu design com dois pontos de contato amplia as possibilidades de uso e permite explorar diferentes formas de estímulo."
      : " Seu formato favorece estímulos direcionados e uma experiência prática.";
    return `${name} é uma opção compacta e discreta para quem deseja explorar novas sensações com praticidade.${doublePoint} O tamanho reduzido facilita o transporte e o armazenamento, mantendo a experiência reservada e confortável.`;
  }
  if (normalized.includes("anel peniano")) {
    return `${name} é um acessório íntimo pensado para complementar os momentos a dois de forma prática e discreta. O formato de anel facilita o posicionamento, enquanto o design diferenciado acrescenta novas possibilidades à experiência do casal.`;
  }
  if (/protese|dildo|escroto|mydick/.test(normalized)) {
    return `${name} faz parte da Linha Adulto KA Bijoux e foi selecionado para quem busca uma opção de uso adulto com informação clara, discrição e cuidado. Confira as características do produto, higienize antes e após o uso e siga sempre as orientações da embalagem.`;
  }
  if (/gel|creme|lubrificante|oleo|spray|desodorante/.test(normalized)) {
    return `${name} integra a seleção de cuidados e bem-estar da KA Bijoux. É uma opção prática para incluir na rotina, com embalagem fácil de guardar e proposta de uso discreta. Consulte sempre as orientações do rótulo antes da aplicação.`;
  }
  if (isAdult) {
    return `${name} faz parte da Linha Adulto KA Bijoux, uma seleção pensada para proporcionar novas experiências com discrição e cuidado. O produto é enviado em embalagem reservada e deve ser utilizado conforme as orientações presentes no rótulo ou na embalagem.`;
  }
  return `${name} foi selecionado para a vitrine KA Bijoux por sua proposta prática e versátil. Uma escolha pensada para complementar sua rotina com o estilo e o cuidado presentes em toda a nossa curadoria.`;
}

function publicText(value?: string | null) {
  if (!value) return null;
  const text = value.trim();
  if (text.length < 3) return null;
  const normalized = normalize(text);
  const blocked = [
    "nao informado",
    "nao informada",
    "nao informadas",
    "nao disponivel",
    "necessita revisao",
    "revisao",
    "revisao manual",
    "revisao pendente",
    "campo em revisao",
    "informacao indisponivel",
    "informacoes tecnicas pendentes",
    "descricao detalhada pendente",
    "importado da bling",
    "produto selecionado pela ka bijoux",
  ];
  return blocked.some((term) => normalized.includes(term)) ? null : text;
}

function buildSafeUsage(name: string, isAdult: boolean) {
  const normalized = normalize(name);
  if (/gel|creme|lubrificante|oleo|spray|desodorante/.test(normalized)) {
    return "Antes do uso, leia o rótulo e siga a forma de aplicação indicada na embalagem. Use apenas na região recomendada e interrompa a aplicação em caso de desconforto ou irritação.";
  }
  if (isAdult) {
    return "Higienize o produto antes e após o uso. Comece de forma gradual e utilize somente conforme as orientações da embalagem. Quando aplicável, use lubrificante compatível e interrompa o uso em caso de desconforto.";
  }
  return "Utilize conforme as orientações presentes no rótulo ou na embalagem e conserve o produto em local limpo, seco e protegido.";
}

function getProductPurpose(name: string, categoryName: string, isAdult: boolean) {
  const normalized = normalize(`${name} ${categoryName}`);
  if (normalized.includes("anel peniano")) return "Acessório íntimo para momentos a dois";
  if (/protese|dildo|escroto|mydick/.test(normalized)) return "Produto adulto para uso íntimo responsável";
  if (normalized.includes("bullet") || normalized.includes("vibrador")) return "Acessório íntimo para exploração de novas sensações";
  if (/gel|creme|lubrificante|oleo/.test(normalized)) return "Cuidado, bem-estar e conforto íntimo";
  if (isAdult) return "Produto de uso adulto";
  return null;
}

function extractColor(name: string) {
  const colors: Array<[RegExp, string]> = [
    [/\brox[oa]\b/, "Roxo"],
    [/\bros[ae]\b/, "Rosa"],
    [/\bpreto\b/, "Preto"],
    [/\bbranco\b/, "Branco"],
    [/\bvermelh[oa]\b/, "Vermelho"],
    [/\bazul\b/, "Azul"],
    [/\bdourad[oa]\b/, "Dourado"],
    [/\bpratead[oa]\b/, "Prateado"],
  ];
  const normalized = normalize(name);
  return colors.find(([pattern]) => pattern.test(normalized))?.[1] ?? null;
}

function normalize(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function HeartIcon() { return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.8 4.6a5.4 5.4 0 0 0-7.6 0L12 5.8l-1.2-1.2a5.4 5.4 0 0 0-7.6 7.6L12 21l8.8-8.8a5.4 5.4 0 0 0 0-7.6Z" /></svg>; }
function StoreIcon() { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 10h18"/><path d="M5 10v10h14V10"/><path d="m4 4-1 6h18l-1-6Z"/><path d="M9 20v-6h6v6"/></svg>; }
function DeliveryIcon() { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="7" cy="18" r="2"/><circle cx="17" cy="18" r="2"/><path d="M5 18H3V8h11l3 4h3v6h-1"/><path d="M9 18h6"/></svg>; }
function TruckIcon() { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7h11v10H3z"/><path d="M14 10h4l3 3v4h-7"/><circle cx="7" cy="18" r="2"/><circle cx="18" cy="18" r="2"/></svg>; }
function ShieldIcon() { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/><path d="m9 12 2 2 4-4"/></svg>; }
