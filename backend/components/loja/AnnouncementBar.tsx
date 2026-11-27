"use client";

import { HOME_ANNOUNCEMENTS } from "@/lib/home-content";

export default function AnnouncementBar({
  messages = HOME_ANNOUNCEMENTS,
  theme = "default",
}: {
  messages?: readonly string[];
  theme?: "christmas" | "default";
}) {
  const loopMessages = [...messages, ...messages];
  const christmas = theme === "christmas";

  return (
    <div className={`relative z-50 overflow-hidden border-b text-[12px] font-semibold shadow-[0_8px_24px_rgba(236,72,153,0.08)] backdrop-blur-md ${christmas ? "border-white/10 bg-gradient-to-r from-[#76001f] via-[#9b002b] to-[#76001f] text-white" : "border-pink-100/70 bg-gradient-to-r from-pink-50/95 via-white/92 to-pink-100/95 text-pink-600"}`}>
      <div className={`pointer-events-none absolute inset-y-0 left-0 w-16 bg-gradient-to-r ${christmas ? "from-[#76001f]" : "from-pink-50"} to-transparent`} />
      <div className={`pointer-events-none absolute inset-y-0 right-0 w-16 bg-gradient-to-l ${christmas ? "from-[#76001f]" : "from-pink-50"} to-transparent`} />

      <div className="flex h-12 items-center">
        <div className="ka-ticker ka-announcement-ticker flex min-w-max items-center whitespace-nowrap will-change-transform">
          {loopMessages.map((message, index) => (
            <span key={`${message}-${index}`} className="flex items-center">
              <span className="px-5 sm:px-7">{message}</span>
              <span className={`h-1.5 w-1.5 rounded-full shadow-[0_0_10px_rgba(236,72,153,0.35)] ${christmas ? "bg-[#f5cf71]" : "bg-pink-300/70"}`} />
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
