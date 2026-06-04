import Link from "next/link";

const storeLinks = [
  { label: "Inicio", href: "/" },
  { label: "Produtos", href: "/produtos" },
  { label: "Carrinho", href: "/carrinho" },
];

const categoryLinks = [
  { label: "Bijuterias", href: "/categoria/bijuterias" },
  { label: "Oculos de sol", href: "/categoria/oculos" },
  { label: "Capinhas", href: "/categoria/capinhas-acessorios-celular" },
  { label: "Bolsas e necessaires", href: "/categoria/bolsas-necessaires" },
  { label: "Maquiagem", href: "/categoria/maquiagem" },
];

const checkoutBenefits = ["Compra pelo site", "Carrinho com subtotal", "Pix e cartao", "Produto selecionado"];

export default function Footer() {
  return (
    <footer className="bg-[#1A0A0F] text-white">
      <div className="border-b border-white/10">
        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-10 px-6 py-10 md:grid-cols-[1.2fr_0.8fr_0.9fr_1fr]">
          <div>
            <div className="mb-4 flex items-center gap-1.5">
              <svg className="h-5 w-5 text-pink-400" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M12 2l2.09 6.26H21l-5.47 3.97 2.09 6.26L12 14.52l-5.62 3.97 2.09-6.26L3 8.26h6.91L12 2z" />
              </svg>
              <span className="text-xl font-black text-pink-400">KA</span>
              <span className="text-xl font-light text-gray-300">Bijoux</span>
            </div>
            <p className="max-w-sm text-sm leading-relaxed text-gray-400">
              Bijuterias, oculos de sol, capinhas e acessorios femininos com estilo, delicadeza e praticidade para o dia a dia.
            </p>
            <div className="mt-5 flex gap-2">
              <a
                href="https://instagram.com"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram"
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 text-white transition-colors hover:bg-pink-500"
              >
                <InstagramIcon />
              </a>
            </div>
          </div>

          <FooterColumn title="Loja" links={storeLinks} />
          <FooterColumn title="Categorias" links={categoryLinks} />

          <div>
            <h3 className="mb-4 text-sm font-semibold uppercase text-white">Compra online</h3>
            <ul className="space-y-2.5">
              {checkoutBenefits.map((benefit) => (
                <li key={benefit} className="flex items-center gap-2 text-sm text-gray-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-pink-400" />
                  {benefit}
                </li>
              ))}
            </ul>
            <Link
              href="/carrinho"
              className="mt-5 inline-flex rounded-2xl bg-white px-5 py-3 text-sm font-bold text-pink-600 transition-colors hover:bg-pink-50"
            >
              Ver carrinho
            </Link>
          </div>
        </div>
      </div>

      <div className="border-b border-white/10">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-6 py-5">
          <p className="text-xs text-gray-500">Formas de pagamento disponiveis:</p>
          <div className="flex flex-wrap gap-2">
            {["Pix", "Cartao", "Boleto", "Debito"].map((method) => (
              <span key={method} className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs text-gray-300">
                {method}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-6 py-5 sm:flex-row">
        <p className="text-xs text-gray-500">
          © {new Date().getFullYear()} KA Bijoux. Todos os direitos reservados.
        </p>
        <Link href="/admin/login" className="text-xs text-gray-600 transition-colors hover:text-pink-400">
          Area administrativa
        </Link>
      </div>
    </footer>
  );
}

function FooterColumn({ title, links }: { title: string; links: Array<{ label: string; href: string }> }) {
  return (
    <div>
      <h3 className="mb-4 text-sm font-semibold uppercase text-white">{title}</h3>
      <ul className="space-y-2.5">
        {links.map(({ label, href }) => (
          <li key={href}>
            <Link href={href} className="text-sm text-gray-400 transition-colors hover:text-pink-400">
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

function InstagramIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
    </svg>
  );
}
