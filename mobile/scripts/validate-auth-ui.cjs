const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = (relative) => fs.readFileSync(path.join(root, relative), "utf8");

const entry = read("app/(auth)/entrada.tsx");
const login = read("app/(auth)/login.tsx");
const register = read("app/(auth)/cadastro.tsx");
const providers = read("constants/authProviders.ts");

for (const label of [
  "Entre ou crie sua conta",
  "Continuar com Google",
  "Continuar com e-mail",
]) {
  assert.ok(entry.includes(label), `Texto obrigatório ausente: ${label}`);
}

assert.ok(login.includes("Entrar com e-mail"), "Login por e-mail não está separado");
assert.ok(login.includes("Mostrar senha"), "Login não possui controle de visibilidade da senha");
assert.ok(register.includes("Nome completo *"), "Cadastro não solicita nome");
assert.ok(register.includes("E-mail *"), "Cadastro não solicita e-mail");
assert.ok(register.includes("Senha *"), "Cadastro não solicita senha");
assert.ok(register.includes("Termos de Uso"), "Cadastro não preserva os Termos de Uso");
assert.ok(register.includes("Política de Privacidade"), "Cadastro não preserva a Política de Privacidade");
assert.ok(!register.includes("Telefone *"), "Cadastro simplificado ainda solicita telefone");
assert.ok(!register.includes("Confirmar senha *"), "Cadastro simplificado ainda solicita confirmação da senha");
assert.ok(!entry.includes("Em breve"), "A tela não pode usar mensagem 'Em breve'");

for (const flag of ["EXPO_PUBLIC_AUTH_GOOGLE_ENABLED", "EXPO_PUBLIC_AUTH_HIDE_GOOGLE"]) {
  assert.ok(providers.includes(flag), `Flag obrigatória ausente: ${flag}`);
}
assert.ok(entry.includes("AppleAuthenticationButton"), "Botão oficial Sign in with Apple ausente");
assert.ok(entry.includes('Platform.OS === "ios"'), "Apple deve ser exibido no iOS");
assert.ok(providers.includes("APPLE_AUTH_CONFIG"), "Configuração Apple ausente");

assert.deepEqual(
  entry.match(/label="Continuar com [^"]+"/g),
  ['label="Continuar com Google"', 'label="Continuar com e-mail"'],
  "Os botões customizados devem expor Google e e-mail; Apple usa o componente oficial",
);
assert.deepEqual(
  [...new Set(providers.match(/EXPO_PUBLIC_AUTH_[A-Z_]+/g))],
  ["EXPO_PUBLIC_AUTH_HIDE_GOOGLE", "EXPO_PUBLIC_AUTH_GOOGLE_ENABLED", "EXPO_PUBLIC_AUTH_APPLE_DISABLED"],
  "A configuração pública deve conter somente flags de Google e Apple",
);
assert.deepEqual(
  [...entry.matchAll(/icon="logo-([^"]+)"/g)].map((match) => match[1]),
  ["google"],
  "A entrada deve conter somente o ícone do provedor Google",
);
assert.ok(!entry.includes("externalProvider"), "Não deve existir fallback para provedor sem implementação");

const authGateFiles = [
  "app/(tabs)/carrinho.tsx",
  "app/(tabs)/perfil.tsx",
  "app/checkout/pagamento.tsx",
  "app/favoritos/index.tsx",
  "app/produto/[id].tsx",
  "components/product/ProductCard.tsx",
];

for (const file of authGateFiles) {
  assert.ok(read(file).includes("/(auth)/entrada"), `${file} não direciona para a escolha de acesso`);
}

console.log(`Auth UI: ${19 + authGateFiles.length}/${19 + authGateFiles.length} verificações aprovadas.`);
