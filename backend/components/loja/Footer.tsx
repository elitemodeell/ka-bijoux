"use client";

import type { FormEvent, ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";

const WHATSAPP_NUMBER = "5537999999999";
const WHATSAPP_LINK = `https://wa.me/${WHATSAPP_NUMBER}`;

const benefitCards = [
  {
    title: "Entrega rápida",
    subtitle: "Para todo Brasil",
    icon: TruckIcon,
  },
  {
    title: "Compra segura",
    subtitle: "Dados protegidos",
    icon: ShieldIcon,
  },
  {
    title: "Produtos selecionados",
    subtitle: "Qualidade garantida",
    icon: DiamondIcon,
  },
  {
    title: "Mimos exclusivos",
    subtitle: "Em todos os pedidos",
    icon: GiftIcon,
  },
];

const storeLinks = [
  { label: "Início", href: "/" },
  { label: "Produtos", href: "/produtos" },
  { label: "Categorias", href: "/produtos" },
  { label: "Lançamentos", href: "/produtos?new=true" },
  { label: "Promoções", href: "/produtos?promo=true" },
  { label: "Carrinho", href: "/carrinho" },
  { label: "Meus Pedidos", href: "/carrinho" },
  { label: "Rastrear Pedido", href: WHATSAPP_LINK, external: true },
];

const categoryLinks = [
  { label: "Bijuterias", href: "/categoria/bijuterias" },
  { label: "Capinhas", href: "/categoria/capinhas-acessorios-celular" },
  { label: "Bolsas", href: "/categoria/bolsas-necessaires" },
  { label: "Maquiagem", href: "/categoria/maquiagem" },
  { label: "Utilidades", href: "/categoria/utilidades-domesticas" },
  { label: "Acessórios", href: "/categoria/acessorios-cabelo" },
  { label: "Perfumes", href: "/categoria/perfumaria" },
  { label: "Ver todas", href: "/produtos" },
];

const helpLinks = [
  { label: "Central de Atendimento", href: WHATSAPP_LINK, external: true },
  { label: "Trocas", href: WHATSAPP_LINK, external: true },
  { label: "Pagamento", href: "/carrinho" },
  { label: "Privacidade", href: "/privacidade" },
  { label: "Termos", href: "/privacidade" },
  { label: "Contato", href: WHATSAPP_LINK, external: true },
];

const socialLinks = [
  { label: "Instagram", href: "https://instagram.com", icon: InstagramIcon },
  { label: "Facebook", href: "https://facebook.com", icon: FacebookIcon },
  { label: "TikTok", href: "https://www.tiktok.com", icon: TikTokIcon },
  { label: "WhatsApp", href: WHATSAPP_LINK, icon: WhatsAppIcon },
];

const paymentMethods = [
  { name: "Pix", className: "text-[#22c7b8]", mark: "pix" },
  { name: "Visa", className: "text-[#1f5cc9]", mark: "VISA" },
  { name: "Mastercard", className: "text-[#f15a24]", mark: "●●" },
  { name: "American Express", className: "text-[#2878c8]", mark: "AMEX" },
  { name: "Elo", className: "text-[#111827]", mark: "elo" },
  { name: "Hipercard", className: "text-[#c41230]", mark: "Hiper" },
  { name: "Boleto", className: "text-[#111827]", mark: "Boleto" },
];

export default function Footer() {
  const [newsletterSent, setNewsletterSent] = useState(false);
  const [showBackToTop, setShowBackToTop] = useState(false);

  useEffect(() => {
    const onScroll = () => setShowBackToTop(window.scrollY > 480);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  function submitNewsletter(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNewsletterSent(true);
    event.currentTarget.reset();
  }

  function backToTop() {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <footer className="relative overflow-hidden bg-[#17070C] text-white">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,#17070C_0%,#120509_48%,#080204_100%)]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#FF4F87]/70 to-transparent" />

      <div className="relative mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        <Reveal>
          <section aria-label="Benefícios KA Bijoux" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {benefitCards.map((benefit) => (
              <BenefitCard key={benefit.title} {...benefit} />
            ))}
          </section>
        </Reveal>

        <Reveal className="mt-14 lg:mt-20">
          <section className="grid gap-10 lg:grid-cols-[1.28fr_0.82fr_0.82fr_1fr] lg:gap-12" aria-label="Rodapé KA Bijoux">
            <BrandColumn newsletterSent={newsletterSent} onSubmitNewsletter={submitNewsletter} />

            <FooterLinks title="Loja" links={storeLinks} />
            <FooterLinks title="Categorias" links={categoryLinks} />

            <div className="space-y-5">
              <FooterLinks title="Ajuda" links={helpLinks} />
              <ContactCard />
            </div>
          </section>
        </Reveal>

        <Reveal className="mt-12 border-y border-white/10 py-8 lg:mt-16">
          <PaymentStrip />
        </Reveal>

        <Reveal>
          <section className="grid gap-6 pt-8 text-center text-sm text-white/60 lg:grid-cols-[1fr_auto_1fr] lg:items-center lg:text-left">
            <div className="flex items-center justify-center gap-4 lg:justify-start">
              <HeartLargeIcon className="h-11 w-11 shrink-0 text-[#FF4F87] drop-shadow-[0_0_18px_rgba(255,79,135,0.45)]" />
              <p className="max-w-xs leading-relaxed">
                <span className="block font-playfair text-xl italic text-white">Feito com amor</span>
                para você brilhar todos os dias.
              </p>
            </div>

            <p className="text-white/55">© 2026 KA Bijoux</p>

            <nav className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 lg:justify-end" aria-label="Links finais">
              <Link href="/privacidade" className="transition-colors duration-300 hover:text-[#FF4F87]">
                Política de Privacidade
              </Link>
              <Link href="/admin/login" className="transition-colors duration-300 hover:text-[#FF4F87]">
                Área Administrativa
              </Link>
            </nav>
          </section>
        </Reveal>
      </div>

      <button
        type="button"
        onClick={backToTop}
        className={`fixed bottom-32 right-5 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-[#FF4F87] text-white shadow-[0_14px_36px_rgba(255,79,135,0.38)] transition-all duration-300 hover:-translate-y-1 hover:scale-105 hover:shadow-[0_18px_44px_rgba(255,79,135,0.52)] focus:outline-none focus:ring-2 focus:ring-white/80 focus:ring-offset-2 focus:ring-offset-[#17070C] md:bottom-5 ${
          showBackToTop ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-4 opacity-0"
        }`}
        aria-label="Voltar ao topo"
      >
        <ArrowUpIcon className="h-5 w-5" />
      </button>
    </footer>
  );
}

function BrandColumn({
  newsletterSent,
  onSubmitNewsletter,
}: {
  newsletterSent: boolean;
  onSubmitNewsletter: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <div className="text-center lg:text-left">
      <Link href="/" aria-label="KA Bijoux" className="inline-flex justify-center lg:justify-start">
        <Image
          src="/images/brand/ka-bijoux-logo-transparente.png"
          alt="KA Bijoux"
          width={5311}
          height={4882}
          sizes="96px"
          quality={78}
          className="h-24 w-auto object-contain drop-shadow-[0_0_28px_rgba(255,79,135,0.22)]"
        />
      </Link>

      <p className="mx-auto mt-5 max-w-sm text-[15px] leading-7 text-white/72 lg:mx-0">
        Bijuterias, óculos, capinhas e acessórios femininos com curadoria delicada para deixar sua rotina mais bonita.
      </p>

      <div className="mt-7 flex justify-center gap-3 lg:justify-start" aria-label="Redes sociais">
        {socialLinks.map((social) => (
          <SocialButton key={social.label} {...social} />
        ))}
      </div>

      <div className="mt-9 max-w-sm rounded-[26px] border border-white/10 bg-white/[0.045] p-4 text-left shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur lg:max-w-md">
        <p className="text-lg font-black text-white">Receba Novidades ✨</p>
        <p className="mt-1 text-sm leading-relaxed text-white/56">Cadastre seu e-mail e fique por dentro das promoções.</p>

        <form onSubmit={onSubmitNewsletter} className="mt-4 flex overflow-hidden rounded-2xl border border-white/12 bg-black/20 focus-within:border-[#FF4F87]/70">
          <label htmlFor="footer-email" className="sr-only">
            Seu melhor e-mail
          </label>
          <input
            id="footer-email"
            name="email"
            type="email"
            required
            placeholder="Seu melhor e-mail"
            className="min-h-12 min-w-0 flex-1 bg-transparent px-4 text-sm text-white outline-none placeholder:text-white/38"
          />
          <button
            type="submit"
            className="ka-btn flex min-h-12 w-14 shrink-0 items-center justify-center bg-[#FF4F87] text-white transition-colors duration-300 hover:bg-[#ff6d9c]"
            aria-label="Cadastrar e-mail"
          >
            <SendIcon className="h-5 w-5" />
          </button>
        </form>

        {newsletterSent && (
          <p className="mt-3 text-xs font-semibold text-[#ff9fbd]" role="status">
            Pronto. Quando tiver novidade bonita, você fica sabendo.
          </p>
        )}
      </div>
    </div>
  );
}

function FooterLinks({ title, links }: { title: string; links: Array<{ label: string; href: string; external?: boolean }> }) {
  const [open, setOpen] = useState(false);
  const contentId = `footer-${title.toLowerCase().replace(/\s+/g, "-")}`;

  return (
    <section className="border-b border-white/10 pb-4 lg:border-b-0 lg:pb-0">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="flex w-full items-center justify-between py-1 text-left lg:pointer-events-none lg:block"
        aria-expanded={open}
        aria-controls={contentId}
      >
        <h3 className="text-sm font-black uppercase tracking-[0.16em] text-[#FF6F9C]">{title}</h3>
        <ChevronDownIcon className={`h-4 w-4 text-[#FF6F9C] transition-transform duration-300 lg:hidden ${open ? "rotate-180" : ""}`} />
      </button>

      <ul id={contentId} className={`space-y-3 pt-4 lg:block ${open ? "block" : "hidden"}`}>
        {links.map((link) => (
          <li key={`${title}-${link.label}`}>
            <FooterLink {...link} />
          </li>
        ))}
      </ul>
    </section>
  );
}

function FooterLink({ label, href, external }: { label: string; href: string; external?: boolean }) {
  const className = "group inline-flex items-center gap-2 text-[15px] font-medium text-white/68 transition-colors duration-300 hover:text-white";
  const content = (
    <>
      <span className="h-1 w-1 rounded-full bg-[#FF4F87] opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
      {label}
    </>
  );

  if (external) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={className}>
        {content}
      </a>
    );
  }

  return (
    <Link href={href} className={className}>
      {content}
    </Link>
  );
}

function BenefitCard({ title, subtitle, icon: Icon }: { title: string; subtitle: string; icon: IconComponent }) {
  return (
    <article className="group rounded-[26px] border border-white/10 bg-white/[0.055] p-5 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_18px_46px_rgba(0,0,0,0.18)] backdrop-blur transition-all duration-300 hover:-translate-y-1 hover:border-[#FF4F87]/45 hover:bg-white/[0.075] hover:shadow-[0_22px_58px_rgba(255,79,135,0.14)]">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#FF4F87]/12 text-[#FF6F9C] transition-transform duration-300 group-hover:scale-110">
        <Icon className="h-8 w-8" />
      </div>
      <h3 className="mt-4 text-base font-black text-white">{title}</h3>
      <p className="mt-1 text-sm text-white/62">{subtitle}</p>
    </article>
  );
}

function ContactCard() {
  return (
    <article className="rounded-[28px] border border-[#FF4F87]/35 bg-gradient-to-br from-[#2a0b15] via-[#1b0710] to-[#13050a] p-5 shadow-[0_18px_52px_rgba(255,79,135,0.12)]">
      <div className="flex items-start gap-4">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#FF4F87] text-white shadow-[0_14px_28px_rgba(255,79,135,0.35)]">
          <HeadsetIcon className="h-6 w-6" />
        </span>
        <div>
          <h3 className="text-lg font-black text-white">Fale com a gente</h3>
          <p className="mt-2 text-sm leading-relaxed text-white/62">
            Segunda a Sexta
            <br />
            09h às 18h
          </p>
        </div>
      </div>

      <a
        href={WHATSAPP_LINK}
        target="_blank"
        rel="noopener noreferrer"
        className="ka-btn mt-5 flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#FF4F87] px-5 py-3 text-sm font-black text-white shadow-[0_14px_30px_rgba(255,79,135,0.28)] transition-all duration-300 hover:bg-[#ff6d9c] sm:w-fit"
      >
        WhatsApp
        <ArrowRightIcon className="h-4 w-4" />
      </a>
    </article>
  );
}

function PaymentStrip() {
  return (
    <section aria-label="Formas de pagamento" className="text-center">
      <h3 className="text-xs font-black uppercase tracking-[0.22em] text-[#FF6F9C]">Formas de Pagamento</h3>
      <div className="-mx-4 mt-6 flex gap-3 overflow-x-auto px-4 pb-2 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:justify-center sm:px-0 [&::-webkit-scrollbar]:hidden">
        {paymentMethods.map((method) => (
          <div
            key={method.name}
            className="group flex h-14 min-w-[112px] items-center justify-center rounded-2xl border border-white/10 bg-white text-center shadow-[0_12px_28px_rgba(0,0,0,0.22)] transition-all duration-300 hover:-translate-y-1 hover:border-[#FF4F87]/50 hover:shadow-[0_18px_36px_rgba(255,79,135,0.18)]"
            aria-label={method.name}
            title={method.name}
          >
            <span className={`font-black tracking-tight transition-transform duration-300 group-hover:scale-105 ${method.className}`}>{method.mark}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

function SocialButton({ label, href, icon: Icon }: { label: string; href: string; icon: IconComponent }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      className="group flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-white/[0.075] text-[#FF6F9C] shadow-[0_12px_28px_rgba(255,79,135,0.10)] transition-all duration-300 hover:-translate-y-1 hover:scale-105 hover:border-[#FF4F87]/50 hover:bg-[#FF4F87] hover:text-white hover:shadow-[0_16px_36px_rgba(255,79,135,0.30)]"
    >
      <Icon className="h-5 w-5 transition-transform duration-300 group-hover:scale-110" />
    </a>
  );
}

function Reveal({ children, className = "" }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (!("IntersectionObserver" in window)) {
      setVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className={`ka-reveal ${visible ? "ka-visible" : ""} ${className}`}>
      {children}
    </div>
  );
}

type IconComponent = ({ className }: { className?: string }) => JSX.Element;

function TruckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 6h11v10H3z" />
      <path d="M14 9h3.8L21 12.3V16h-7z" />
      <path d="M7 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4ZM18 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z" />
      <path d="m7.5 9.5 1.2 1.2 2.3-2.4" />
    </svg>
  );
}

function ShieldIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 3 5 6v5c0 4.7 3 8.5 7 10 4-1.5 7-5.3 7-10V6l-7-3Z" />
      <path d="m8.8 12.2 2.1 2.1 4.5-4.8" />
    </svg>
  );
}

function DiamondIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M6 3h12l4 6-10 12L2 9l4-6Z" />
      <path d="M2 9h20M8 3l4 18 4-18M6 3l6 6 6-6" />
    </svg>
  );
}

function GiftIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20 12v9H4v-9M2 7h20v5H2zM12 7v14" />
      <path d="M12 7H7.5A2.5 2.5 0 1 1 10 4.5c0 1.8 2 2.5 2 2.5ZM12 7h4.5A2.5 2.5 0 1 0 14 4.5C14 6.3 12 7 12 7Z" />
    </svg>
  );
}

function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <path d="M17.5 6.5h.01" />
    </svg>
  );
}

function FacebookIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M14 8.5V6.7c0-.8.3-1.2 1.4-1.2H17V2.3c-.8-.1-1.7-.2-2.5-.2-2.6 0-4.4 1.6-4.4 4.5v1.9H7.2V12h2.9v9.8H14V12h2.9l.5-3.5H14Z" />
    </svg>
  );
}

function TikTokIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M16.7 3c.4 2.4 1.8 3.9 4.1 4.1v3.1a7.1 7.1 0 0 1-4.1-1.3v6.1c0 4-2.7 6.6-6.5 6.6-3.3 0-5.9-2.2-5.9-5.4 0-3.5 2.8-5.6 6.7-5.3v3.2c-1.9-.3-3.3.5-3.3 2 0 1.3 1.1 2.1 2.4 2.1 1.6 0 2.6-.9 2.6-3V3h4Z" />
    </svg>
  );
}

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M17.5 14.4c-.3-.1-1.8-.9-2.1-1-.3-.1-.5-.1-.7.2-.2.3-.8 1-.9 1.1-.2.2-.3.2-.6.1a8.1 8.1 0 0 1-2.4-1.5A9 9 0 0 1 9.1 11c-.2-.3 0-.5.1-.6l.5-.6c.1-.2.2-.3.3-.5.1-.2 0-.4 0-.5 0-.1-.7-1.7-1-2.3-.2-.6-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.4-.3.3-1.1 1.1-1.1 2.6s1.1 3 1.2 3.2c.1.2 2.2 3.4 5.4 4.8.8.3 1.4.5 1.9.6.8.2 1.4.2 2 .1.6-.1 1.8-.7 2-1.4.3-.7.3-1.3.2-1.4-.1-.2-.3-.3-.6-.5ZM12.1 22h-.1a10 10 0 0 1-5.1-1.4l-.4-.2-3.8 1 1-3.7-.2-.4A10 10 0 1 1 12.1 22Z" />
    </svg>
  );
}

function HeadsetIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 13a8 8 0 0 1 16 0" />
      <path d="M4 13v3a2 2 0 0 0 2 2h1v-7H6a2 2 0 0 0-2 2ZM20 13v3a2 2 0 0 1-2 2h-1v-7h1a2 2 0 0 1 2 2Z" />
      <path d="M16 18.5c-.7 1.5-2 2.5-4 2.5" />
    </svg>
  );
}

function SendIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m22 2-7 20-4-9-9-4 20-7Z" />
      <path d="M22 2 11 13" />
    </svg>
  );
}

function ChevronDownIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

function ArrowRightIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 12h14M13 5l7 7-7 7" />
    </svg>
  );
}

function ArrowUpIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 19V5M5 12l7-7 7 7" />
    </svg>
  );
}

function HeartLargeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8Z" />
    </svg>
  );
}
