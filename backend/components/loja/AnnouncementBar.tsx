"use client";

type AnnouncementMessage = {
  text: string;
  active: boolean;
};

const STORE_MESSAGES: AnnouncementMessage[] = [
  { text: "\uD83D\uDC96 Novidades selecionadas para voce", active: true },
  { text: "\uD83D\uDCF1 Capinhas estilosas para o seu celular", active: true },
  { text: "\uD83D\uDD76\uFE0F Oculos de sol com muito charme", active: true },
  { text: "\u2728 Bijuterias delicadas para o dia a dia", active: true },
  { text: "\uD83D\uDED2 Acessorios femininos com estilo", active: true },
  { text: "\uD83D\uDE9A Envio para todo o Brasil", active: true },
  { text: "\uD83D\uDCB3 Pix e cartao disponiveis", active: true },
  { text: "\uD83C\uDF81 Presentes especiais para quem voce ama", active: true },
];

const FUTURE_CAMPAIGN_MESSAGES: AnnouncementMessage[] = [
  { text: "10% OFF em produtos selecionados", active: false },
  { text: "Promocao especial da semana", active: false },
  { text: "Clima de Copa", active: false },
  { text: "Especial Dia dos Namorados", active: false },
  { text: "Especial Natal", active: false },
  { text: "Black Friday KA Bijoux", active: false },
  { text: "Novidades de verao", active: false },
  { text: "Presentes de fim de ano", active: false },
];

const ANNOUNCEMENTS = [...STORE_MESSAGES, ...FUTURE_CAMPAIGN_MESSAGES].filter((message) => message.active);

export default function AnnouncementBar() {
  const loopMessages = [...ANNOUNCEMENTS, ...ANNOUNCEMENTS];

  return (
    <div className="relative z-50 overflow-hidden border-b border-pink-100/70 bg-gradient-to-r from-pink-50/95 via-white/92 to-pink-100/95 text-[12px] font-semibold text-pink-600 shadow-[0_8px_24px_rgba(236,72,153,0.08)] backdrop-blur-md">
      <div className="pointer-events-none absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-pink-50 to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-pink-50 to-transparent" />

      <div className="flex h-12 items-center">
        <div className="ka-ticker ka-announcement-ticker flex min-w-max items-center whitespace-nowrap will-change-transform">
          {loopMessages.map((message, index) => (
            <span key={`${message.text}-${index}`} className="flex items-center">
              <span className="px-5 sm:px-7">{message.text}</span>
              <span className="h-1.5 w-1.5 rounded-full bg-pink-300/70 shadow-[0_0_10px_rgba(236,72,153,0.35)]" />
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
