import Link from "next/link";

export default function Footer() {
  return (
    <footer className="bg-[#1A0A0F] text-white">
      {/* Top bar */}
      <div className="border-b border-white/10">
        <div className="max-w-7xl mx-auto px-6 py-10 grid grid-cols-1 md:grid-cols-4 gap-10">

          {/* Brand */}
          <div className="md:col-span-1">
            <div className="flex items-center gap-1.5 mb-4">
              <svg className="w-5 h-5 text-pink-400" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2l2.09 6.26H21l-5.47 3.97 2.09 6.26L12 14.52l-5.62 3.97 2.09-6.26L3 8.26h6.91L12 2z" />
              </svg>
              <span className="text-xl font-black text-pink-400">KA</span>
              <span className="text-xl font-light text-gray-300">Bijoux</span>
            </div>
            <p className="text-gray-400 text-sm leading-relaxed mb-5">
              Bijuterias, óculos de sol e acessórios femininos com estilo e personalidade. Sua beleza, nossa missão.
            </p>
            {/* Social */}
            <div className="flex gap-3">
              <SocialLink href="https://instagram.com" label="Instagram">
                <InstagramIcon />
              </SocialLink>
              <SocialLink href="https://wa.me/5537999999999" label="WhatsApp">
                <WhatsAppIcon />
              </SocialLink>
              <SocialLink href="https://tiktok.com" label="TikTok">
                <TikTokIcon />
              </SocialLink>
            </div>
          </div>

          {/* Links */}
          <div>
            <h3 className="text-sm font-semibold text-white mb-4 uppercase tracking-wider">Produtos</h3>
            <ul className="space-y-2.5">
              {[
                { label: "Bijuterias",    href: "/produtos?cat=bijuterias" },
                { label: "Óculos de Sol", href: "/produtos?cat=oculos" },
                { label: "Capinhas",      href: "/produtos?cat=capinhas" },
                { label: "Bolsas",        href: "/produtos?cat=bolsas" },
                { label: "Promoções",     href: "/produtos?promo=true" },
              ].map(({ label, href }) => (
                <li key={href}>
                  <Link href={href} className="text-gray-400 hover:text-pink-400 text-sm transition-colors">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-white mb-4 uppercase tracking-wider">Atendimento</h3>
            <ul className="space-y-2.5">
              {[
                { label: "Minha Conta",    href: "/perfil" },
                { label: "Meus Pedidos",   href: "/pedidos" },
                { label: "Fale Conosco",   href: "https://wa.me/5537999999999" },
                { label: "Trocas e Dev.",  href: "/trocas" },
                { label: "Política Priv.", href: "/privacidade" },
              ].map(({ label, href }) => (
                <li key={href}>
                  <Link href={href} className="text-gray-400 hover:text-pink-400 text-sm transition-colors">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="text-sm font-semibold text-white mb-4 uppercase tracking-wider">Contato</h3>
            <ul className="space-y-3 text-sm text-gray-400">
              <li className="flex items-start gap-2">
                <span className="text-pink-400 mt-0.5">📍</span>
                Itaúna – MG, Brasil
              </li>
              <li className="flex items-start gap-2">
                <span className="text-pink-400">📱</span>
                <a href="https://wa.me/5537999999999" className="hover:text-pink-400 transition-colors">
                  (37) 9 9999-9999
                </a>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-pink-400">📧</span>
                <a href="mailto:contato@kabijoux.com.br" className="hover:text-pink-400 transition-colors">
                  contato@kabijoux.com.br
                </a>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-pink-400">🕐</span>
                Seg – Sáb: 9h às 18h
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Payment methods */}
      <div className="border-b border-white/10">
        <div className="max-w-7xl mx-auto px-6 py-5 flex flex-wrap items-center justify-between gap-4">
          <p className="text-gray-500 text-xs">Formas de pagamento aceitas:</p>
          <div className="flex flex-wrap gap-2">
            {["Pix", "Cartão de Crédito", "Boleto", "Débito"].map((method) => (
              <span
                key={method}
                className="text-xs bg-white/10 text-gray-300 px-3 py-1 rounded-full border border-white/10"
              >
                {method}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom */}
      <div className="max-w-7xl mx-auto px-6 py-5 flex flex-col sm:flex-row items-center justify-between gap-3">
        <p className="text-gray-500 text-xs">
          © {new Date().getFullYear()} KA Bijoux. Todos os direitos reservados.
        </p>
        <Link href="/admin/login" className="text-gray-600 hover:text-pink-400 text-xs transition-colors">
          Área Administrativa
        </Link>
      </div>
    </footer>
  );
}

function SocialLink({ href, label, children }: { href: string; label: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      className="w-9 h-9 rounded-xl bg-white/10 hover:bg-pink-500 flex items-center justify-center transition-all duration-300 hover:scale-110"
    >
      {children}
    </a>
  );
}

function InstagramIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/>
    </svg>
  );
}

function WhatsAppIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"/>
    </svg>
  );
}

function TikTokIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.82a8.16 8.16 0 0 0 4.77 1.53V6.9a4.85 4.85 0 0 1-1-.21z"/>
    </svg>
  );
}
