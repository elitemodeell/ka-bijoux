const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = (relative) => fs.readFileSync(path.join(root, relative), "utf8");
const config = JSON.parse(read("app.json"));
const checks = [];

function check(label, condition) {
  checks.push({ label, ok: Boolean(condition) });
}

const onboarding = read("lib/onboarding.ts");
const welcome = read("components/privacy/WelcomeScreen.tsx");
const rootLayout = read("app/_layout.tsx");
const privacy = read("app/privacidade-permissoes.tsx");
const profile = read("app/(tabs)/perfil.tsx");
const entry = read("app/(auth)/entrada.tsx");
const login = read("app/(auth)/login.tsx");
const register = read("app/(auth)/cadastro.tsx");
const address = read("app/endereco/index.tsx");
const manifest = read("android/app/src/main/AndroidManifest.xml");

check("onboarding é persistido no AsyncStorage", onboarding.includes("AsyncStorage.setItem") && onboarding.includes("ONBOARDING_STORAGE_KEY"));
check("root aguarda a leitura do onboarding", rootLayout.includes("hasCompletedOnboarding") && rootLayout.includes("onboardingCompleted === null"));
check("boas-vindas é exibida apenas enquanto pendente", rootLayout.includes("!onboardingCompleted") && rootLayout.includes("WelcomeScreen"));
check("tela tem logo, Continuar e opção de pular", welcome.includes("assets/icon.png") && welcome.includes('label="Continuar"') && welcome.includes("Pular por agora"));
check("tela explica que não solicita permissões na abertura", welcome.includes("Não pedimos acesso à localização, câmera, fotos ou contatos"));
check("entrada contém termos e privacidade", entry.includes("LEGAL_LINKS.terms") && entry.includes("LEGAL_LINKS.privacy"));
check("login contém termos e privacidade", login.includes("LEGAL_LINKS.terms") && login.includes("LEGAL_LINKS.privacy"));
check("cadastro exige aceite e contém links legais", register.includes("acceptedTerms") && register.includes("LEGAL_LINKS.terms") && register.includes("LEGAL_LINKS.privacy"));
check("perfil oferece Privacidade e permissões", profile.includes("/privacidade-permissoes") && profile.includes("Privacidade e permissões"));
check("tela de privacidade abre ajustes do sistema", privacy.includes("Linking.openSettings()"));
check("tela lista notificações, localização e câmera/fotos", privacy.includes('title="Notificações"') && privacy.includes('title="Localização"') && privacy.includes('title="Câmera e fotos"'));
check("tela contém links legais e exclusão", privacy.includes("LEGAL_LINKS.terms") && privacy.includes("LEGAL_LINKS.privacy") && privacy.includes("LEGAL_LINKS.accountDeletion"));
check("endereço manual por CEP continua disponível", address.includes("addressesApi.lookupPostalCode") && address.includes("Salvar endereço"));
check("localização só é solicitada por ação do usuário", address.includes("requestForegroundPermissionsAsync") && address.includes("completeWithLocation") && !rootLayout.match(/requestForegroundPermissionsAsync/));
check("app.json não solicita permissões Android", Array.isArray(config.expo.android.permissions) && config.expo.android.permissions.length === 0);
const videoPlugin = config.expo.plugins.find((plugin) => Array.isArray(plugin) && plugin[0] === "expo-video");
check("vídeo não habilita reprodução em segundo plano ou PiP", videoPlugin?.[1]?.supportsBackgroundPlayback === false && videoPlugin?.[1]?.supportsPictureInPicture === false);

const blocked = new Set(config.expo.android.blockedPermissions ?? []);
for (const permission of [
  "android.permission.ACCESS_FINE_LOCATION",
  "android.permission.CAMERA",
  "android.permission.POST_NOTIFICATIONS",
  "android.permission.READ_CONTACTS",
  "android.permission.READ_MEDIA_IMAGES",
  "android.permission.READ_PHONE_STATE",
  "android.permission.RECORD_AUDIO",
]) {
  check(`${permission} está bloqueada`, blocked.has(permission));
}

const positiveManifestPermissions = [...manifest.matchAll(/<uses-permission\s+android:name="([^"]+)"(?![^>]*tools:node="remove")[^>]*\/>/g)].map((match) => match[1]);
check("manifest fonte mantém apenas INTERNET como permissão positiva", positiveManifestPermissions.length === 1 && positiveManifestPermissions[0] === "android.permission.INTERNET");
check("Info.plist declara somente localização em uso", config.expo.ios.infoPlist?.NSLocationWhenInUseUsageDescription && !Object.keys(config.expo.ios.infoPlist ?? {}).some((key) => /^NS.+Always.+UsageDescription$/.test(key)));
check("não há API de solicitação de permissão no fluxo inicial", !rootLayout.match(/request.*Permission/i) && !welcome.match(/request.*Permission/i));

const failed = checks.filter((item) => !item.ok);
for (const item of checks) console.log(`${item.ok ? "PASS" : "FAIL"} - ${item.label}`);
if (failed.length) {
  console.error(`\nPrivacidade/permissões: ${failed.length}/${checks.length} falha(s).`);
  process.exit(1);
}
console.log(`\nPrivacidade/permissões: ${checks.length}/${checks.length} verificações aprovadas.`);
