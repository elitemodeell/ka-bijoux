"use client";

const MESSAGES = [
  "✨ Novidades selecionadas com carinho",
  "💳 Pagamento via Pix e cartão",
  "🎀 Acessórios femininos para todos os dias",
  "💎 Bijuterias com visual delicado",
  "🕶️ Óculos, capinhas e presentes",
  "📦 Opções de envio e retirada",
];

export default function AnnouncementBar() {
  const doubled = [...MESSAGES, ...MESSAGES];

  return (
    <div className="overflow-hidden bg-gradient-to-r from-pink-500 via-pink-400 to-pink-500 text-xs font-medium text-white">
      <div className="flex py-2.5">
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
