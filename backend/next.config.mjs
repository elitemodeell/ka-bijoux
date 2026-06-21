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
