import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { hostname: "placehold.co" },
      { hostname: "res.cloudinary.com" },
      { hostname: "images.unsplash.com" },
      { hostname: "*.supabase.co" },
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
