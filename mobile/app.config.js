const productionHosts = new Set([
  "kabijoux.com.br",
  "www.kabijoux.com.br",
  "sxohqngzypmxtmuulfoa.supabase.co",
  "ka-bijoux.vercel.app",
  "ka-bijoux-ecommerce.vercel.app",
]);

module.exports = ({ config }) => {
  const profile = process.env.EAS_BUILD_PROFILE;
  const previewVersion = process.env.KA_IOS_HOMOLOGATION_VERSION;
  const previewBuildNumber = process.env.KA_IOS_HOMOLOGATION_BUILD_NUMBER;
  const nonProduction = ["development", "preview"].includes(profile) ||
    profile === "testflight-homologation" ||
    process.env.EXPO_PUBLIC_KA_ENVIRONMENT === "homologation";

  if (nonProduction) {
    for (const [key, address] of Object.entries({
      EXPO_PUBLIC_API_URL: process.env.EXPO_PUBLIC_API_URL,
      EXPO_PUBLIC_SITE_URL: process.env.EXPO_PUBLIC_SITE_URL,
      EXPO_PUBLIC_SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL,
    })) {
      if (!address) throw new Error(`Defina ${key} para a homologação.`);
      const url = new URL(address);
      if (url.protocol !== "https:" || productionHosts.has(url.hostname)) {
        throw new Error(`${key} deve apontar para um serviço HTTPS de homologação.`);
      }
    }
    if (!process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY && !process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY) {
      throw new Error("Defina a chave pública do Supabase de homologação.");
    }

    const ios = {
      ...config.ios,
      ...(previewVersion ? { buildNumber: previewBuildNumber } : {}),
    };
    return {
      ...config,
      ...(previewVersion ? { version: previewVersion } : {}),
      ios,
      updates: { ...config.updates, enabled: false },
    };
  }

  return config;
};
