import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Identidade visual KA Bijoux
        pink: {
          50:  "#FFF0F5",
          100: "#FFE0EC",
          200: "#FFB6C1",
          300: "#FF8FAB",
          400: "#FF6B8A",
          500: "#FF4D6D",  // Rosa principal
          600: "#E83E5A",
          700: "#C8274A",
          800: "#A81539",
          900: "#88082A",
        },
        rose: {
          primary:   "#FF4D6D",
          light:     "#FFB6C1",
          soft:      "#FFF0F5",
          medium:    "#FF6B8A",
          dark:      "#C8274A",
        },
        neutral: {
          soft:    "#F8F8F8",
          border:  "#E8E8E8",
          text:    "#4A4A4A",
          muted:   "#9E9E9E",
        },
      },
      fontFamily: {
        sans: ["Inter", "sans-serif"],
        playfair: ["Playfair Display", "Georgia", "serif"],
      },
      boxShadow: {
        card:        "0 2px 12px rgba(255, 77, 109, 0.08)",
        "card-hover":"0 4px 20px rgba(255, 77, 109, 0.15)",
        glow:        "0 0 0 0 rgba(255, 77, 109, 0.45)",
        "glow-lg":   "0 12px 36px rgba(255, 77, 109, 0.28)",
      },
      backgroundImage: {
        "ka-hero":   "linear-gradient(135deg, #FFF5F7 0%, #FFE8EF 40%, #FFD6E3 70%, #FFB6C1 100%)",
        "ka-pink":   "linear-gradient(135deg, #FF4D6D 0%, #FF8FAB 100%)",
        "ka-subtle": "linear-gradient(180deg, #FFF9FA 0%, #FFF0F5 100%)",
      },
      animation: {
        "fade-up":    "ka-fade-up 0.65s ease-out both",
        "fade-in":    "ka-fade-in 0.5s ease-out both",
        "scale-in":   "ka-scale-in 0.55s ease-out both",
        "float":      "ka-float 4s ease-in-out infinite",
        "pulse-glow": "ka-pulse-glow 2.5s ease-in-out infinite",
        "ticker":     "ka-ticker 28s linear infinite",
        "spin-slow":  "ka-spin-slow 15s linear infinite",
        "bounce-ka":  "ka-bounce-subtle 2.2s ease-in-out infinite",
      },
      keyframes: {
        "ka-fade-up": {
          "0%":   { opacity: "0", transform: "translateY(28px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "ka-fade-in": {
          "0%":   { opacity: "0" },
          "100%": { opacity: "1" },
        },
        "ka-scale-in": {
          "0%":   { opacity: "0", transform: "scale(0.94)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        "ka-float": {
          "0%, 100%": { transform: "translateY(0)" },
          "50%":      { transform: "translateY(-14px)" },
        },
        "ka-pulse-glow": {
          "0%, 100%": { boxShadow: "0 0 0 0 rgba(255, 77, 109, 0.5)" },
          "50%":      { boxShadow: "0 0 0 18px rgba(255, 77, 109, 0)" },
        },
        "ka-ticker": {
          "0%":   { transform: "translateX(0)" },
          "100%": { transform: "translateX(-50%)" },
        },
        "ka-spin-slow": {
          "from": { transform: "rotate(0deg)" },
          "to":   { transform: "rotate(360deg)" },
        },
        "ka-bounce-subtle": {
          "0%, 100%": { transform: "translateY(0) scale(1)" },
          "40%":      { transform: "translateY(-6px) scale(1.03)" },
          "60%":      { transform: "translateY(-3px) scale(1.01)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
