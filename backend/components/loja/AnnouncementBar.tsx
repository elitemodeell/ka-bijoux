"use client";

const MESSAGES = [
  "✨ FRETE GRÁTIS em pedidos acima de R$ 150",
  "💳 PIX com 5% de desconto",
  "🎀 Novas coleções toda semana",
  "💎 Bijuterias premium com estilo feminino",
  "🕶️ Óculos de sol a partir de R$ 59,90",
  "📱 Capinhas exclusivas para o seu celular",
  "🎁 Embalagem especial para presente",
  "⭐ Mais de 500 produtos disponíveis",
];

export default function AnnouncementBar() {
  const doubled = [...MESSAGES, ...MESSAGES];

  return (
    <div className="bg-gradient-to-r from-pink-500 via-pink-400 to-pink-500 text-white text-xs font-medium overflow-hidden">
      <div className="py-2.5 flex">
        <div className="ka-ticker flex items-center gap-0 whitespace-nowrap">
          {doubled.map((msg, i) => (
            <span key={i} className="flex items-center">
              <span className="px-6">{msg}</span>
              <span className="text-white/40">•</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
