import Link from "next/link";

export default function HeroSection() {
  return (
    <section className="bg-white pb-12 pt-4 sm:px-4 sm:pt-8 md:pb-20">
      <div className="relative mx-auto max-w-7xl overflow-hidden bg-pink-50 shadow-[0_18px_55px_rgba(236,72,153,0.10)] sm:rounded-[28px] sm:border sm:border-pink-100">
        <img
          src="/images/home/ka-bijoux-hero-banner.jpg"
          alt=""
          className="absolute inset-0 h-full w-full object-cover object-center"
          aria-hidden="true"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-white/90 via-white/64 to-pink-50/28 md:bg-gradient-to-r md:from-white/84 md:via-white/56 md:to-white/18" />

        <div className="pointer-events-none absolute inset-0" aria-hidden="true">
          <span
            className="ka-header-sparkle"
            style={{ left: "18%", top: "22%", animationDelay: "0.8s", animationDuration: "6.6s" }}
          />
          <span
            className="ka-header-sparkle"
            style={{ left: "82%", top: "64%", animationDelay: "2.4s", animationDuration: "7.2s" }}
          />
        </div>

        <div className="relative z-10 mx-auto flex min-h-[500px] max-w-3xl flex-col items-center justify-center px-5 py-14 text-center sm:min-h-[560px] sm:px-8 md:min-h-[540px] md:py-20">
          <h1 className="font-playfair text-5xl font-bold leading-[1.02] text-gray-950 drop-shadow-[0_10px_24px_rgba(255,255,255,0.58)] sm:text-6xl md:text-7xl lg:text-8xl">
            Sua beleza,
            <br />
            <span className="ka-gradient-text">nossa paixão</span>
          </h1>

          <p className="mt-6 max-w-2xl text-base font-light leading-relaxed text-gray-600 sm:text-lg md:text-xl">
            Bijuterias, óculos de sol, capinhas e acessórios femininos que combinam com o seu estilo.
            Elegância que cabe no seu dia a dia.
          </p>

          <Link
            href="/produtos"
            className="ka-btn mt-9 inline-flex min-h-12 items-center justify-center rounded-2xl bg-gradient-to-r from-pink-500 to-pink-400 px-6 py-3 text-sm font-semibold text-white shadow-glow-lg transition-transform duration-200 hover:-translate-y-0.5 sm:px-8 sm:py-4 sm:text-base"
          >
            Conheça as novidades
          </Link>
        </div>
      </div>
    </section>
  );
}
