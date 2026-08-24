const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = (relative) => fs.readFileSync(path.join(root, relative), "utf8");
let checks = 0;

function check(condition, message) {
  assert.ok(condition, message);
  checks += 1;
}

const entry = read("app/(auth)/entrada.tsx");
const login = read("app/(auth)/login.tsx");
const register = read("app/(auth)/cadastro.tsx");
const profile = read("app/(tabs)/perfil.tsx");
const shell = read("components/auth/AuthScreenShell.tsx");
const providers = read("constants/authProviders.ts");
const appleService = read("services/appleAuth.ts");
const googleService = read("services/googleAuth.ts");
const authStore = read("stores/authStore.ts");

// Perfil -> Entrar/Criar conta sempre abre o mesmo seletor, apenas mudando o modo.
check(profile.includes('params: { mode: "login" }'), "Perfil -> Entrar não abre o seletor em modo login");
check(profile.includes('params: { mode: "register" }'), "Perfil -> Criar conta não abre o seletor em modo cadastro");
check(!profile.includes('router.push("/(auth)/cadastro")'), "Perfil ainda pula diretamente para o formulário de cadastro");

// O seletor único adapta título, e-mail e alternância sem esconder provedores sociais.
for (const label of [
  "Entre na sua conta",
  "Crie sua conta",
  "Continuar com Google",
  "Entrar com e-mail",
  "Criar conta com e-mail",
  "Ainda não tem conta? ",
  "Já tem conta? ",
]) {
  check(entry.includes(label), `Texto obrigatório ausente no seletor: ${label}`);
}
check(entry.includes("AppleAuthenticationButton"), "Botão oficial Sign in with Apple ausente");
check(entry.includes('Platform.OS === "ios"'), "Apple deve continuar visível no iOS");
check(entry.includes("signInWithApple"), "A ação Apple foi removida do seletor");
check(entry.includes("signInWithGoogle"), "A ação Google foi removida do seletor");
check(entry.includes('isRegister ? "/(auth)/cadastro" : "/(auth)/login"'), "A escolha por e-mail não respeita login/cadastro");

// Formulários por e-mail compartilham a mesma identidade e retornam ao seletor correto.
for (const [name, source, mode] of [
  ["login", login, "login"],
  ["cadastro", register, "register"],
]) {
  check(source.includes("AuthScreenShell"), `Formulário de ${name} não usa o layout unificado`);
  check(source.includes("Voltar para outras opções"), `Formulário de ${name} não oferece retorno às outras opções`);
  check(source.includes(`params: { mode: "${mode}" }`), `Formulário de ${name} retorna ao modo incorreto`);
  check(source.includes('router.replace("/(tabs)")'), `${name} concluído não entra diretamente no aplicativo`);
}
check(login.includes("Mostrar senha"), "Login não possui controle de visibilidade da senha");
check(register.includes("Nome completo *"), "Cadastro não solicita nome");
check(register.includes("E-mail *"), "Cadastro não solicita e-mail");
check(register.includes("Senha *"), "Cadastro não solicita senha");
check(register.includes("Termos de Uso"), "Cadastro não preserva os Termos de Uso");
check(register.includes("Política de Privacidade"), "Cadastro não preserva a Política de Privacidade");
check(login.includes("Termos de Uso"), "Login não preserva os Termos de Uso");
check(login.includes("Política de Privacidade"), "Login não preserva a Política de Privacidade");

// SafeArea, teclado, ScrollView, iPad e acessibilidade são centralizados no scaffold.
check(shell.includes("SafeAreaView"), "Layout unificado não preserva SafeArea");
check(shell.includes("KeyboardAvoidingView"), "Layout unificado não trata teclado");
check(shell.includes("ScrollView"), "Layout unificado não preserva rolagem");
check(shell.includes('maxWidth: 560'), "Layout unificado não limita largura no iPad");
check(shell.includes('accessibilityLabel="Fechar autenticação"'), "Layout unificado não possui ação de fechamento acessível");

// As implementações funcionais dos provedores e da sessão continuam intactas.
for (const flag of ["EXPO_PUBLIC_AUTH_GOOGLE_ENABLED", "EXPO_PUBLIC_AUTH_HIDE_GOOGLE", "EXPO_PUBLIC_AUTH_APPLE_DISABLED"]) {
  check(providers.includes(flag), `Flag obrigatória ausente: ${flag}`);
}
check(appleService.includes("signInWithIdToken"), "Apple deixou de usar signInWithIdToken");
check(appleService.includes("rawNonce"), "Apple nonce foi removido");
check(appleService.includes("completeSupabaseLogin"), "Apple não conclui mais a sessão Supabase");
check(googleService.includes("completeSupabaseLogin"), "Google não conclui mais a sessão Supabase");
check(authStore.includes('SecureStore.getItemAsync("ka-token")'), "Restauração da sessão persistida foi removida");
check(authStore.includes('SecureStore.deleteItemAsync("ka-refresh-token")'), "Logout não limpa o refresh token");
check(profile.includes("await logout()") && profile.includes('router.replace("/(tabs)")'), "Logout não retorna corretamente ao estado deslogado");

const authGateFiles = [
  "app/(tabs)/carrinho.tsx",
  "app/(tabs)/perfil.tsx",
  "app/checkout/pagamento.tsx",
  "app/favoritos/index.tsx",
  "app/produto/[id].tsx",
  "components/product/ProductCard.tsx",
];

for (const file of authGateFiles) {
  check(read(file).includes("/(auth)/entrada"), `${file} não direciona para a escolha de acesso`);
}

console.log(`Auth UI unificada: ${checks}/${checks} verificações aprovadas.`);
