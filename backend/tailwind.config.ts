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
      },
      boxShadow: {
        card: "0 2px 12px rgba(255, 77, 109, 0.08)",
        "card-hover": "0 4px 20px rgba(255, 77, 109, 0.15)",
      },
    },
  },
  plugins: [],
};

export default config;
