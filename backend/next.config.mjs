import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Fallback para build sem DATABASE_URL (Vercel build-time)
  env: {
    DATABASE_URL: process.env.DATABASE_URL ?? "postgresql://placeholder:placeholder@localhost:5432/placeholder",
  },
  images: {
    formats: ["image/avif", "image/webp"],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [64, 128, 256, 384],
    minimumCacheTTL: 86400,
    remotePatterns: [
      { hostname: "placehold.co" },
      { hostname: "res.cloudinary.com" },
      { hostname: "images.unsplash.com" },
      { hostname: "*.supabase.co" },
      { hostname: "bling.com.br" },
      { hostname: "*.bling.com.br" },
      { hostname: "storage.googleapis.com" },
    ],
  },
  async headers() {
    return [
      {
        // Imagens de produto (uploads locais) — imutáveis: só mudam quando o nome muda
        source: "/uploads/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
      {
        // Imagens/banners estáticos do site
        source: "/imagens/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=86400, stale-while-revalidate=604800" },
        ],
      },
      {
        source: "/banners/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=86400, stale-while-revalidate=604800" },
        ],
      },
      {
        source: "/images/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=86400, stale-while-revalidate=604800" },
        ],
      },
      {
        // Fontes — imutáveis por fingerprint
        source: "/_next/static/media/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
    ];
  },
  experimental: {
    serverComponentsExternalPackages: ["@prisma/client", "bcryptjs"],
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Externaliza pacotes server-only para evitar conflitos de versão no workspace
      config.externals.push(
        "@prisma/client",
        "jsonwebtoken",
        "bcryptjs"
      );
    }
    // Garante que browserslist e caniuse-lite resolvam do backend,
    // evitando conflito com versão do root (workspace npm)
    config.resolve.alias = {
      ...config.resolve.alias,
      browserslist: path.resolve(__dirname, "node_modules/browserslist"),
      "caniuse-lite": path.resolve(__dirname, "node_modules/caniuse-lite"),
    };
    return config;
  },
};

export default nextConfig;
