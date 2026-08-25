import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  authErrorMessage,
  formatBrazilianPhone,
  isValidEmail,
  isValidPhone,
} from "../../mobile/lib/authFeedback";

const mobileRoot = resolve(__dirname, "../../mobile");
const backendRoot = resolve(__dirname, "..");
const source = (path: string) => readFileSync(resolve(mobileRoot, path), "utf8");
const backendSource = (path: string) => readFileSync(resolve(backendRoot, path), "utf8");

const login = source("app/(auth)/login.tsx");
const entry = source("app/(auth)/entrada.tsx");
const register = source("app/(auth)/cadastro.tsx");
const confirmEmail = source("app/(auth)/confirmar-email.tsx");
const authShell = source("components/auth/AuthScreenShell.tsx");
const providers = source("constants/authProviders.ts");
const recovery = source("app/(auth)/recuperar-senha.tsx");
const changePassword = source("app/(auth)/alterar-senha.tsx");
const legalLinks = source("lib/legalLinks.ts");
const appleAuth = source("services/appleAuth.ts");
const appConfig = source("app.json");

function axiosError(status?: number) {
  return {
    isAxiosError: true,
    response: status ? { status, data: {} } : undefined,
  };
}

describe("experiência de autenticação mobile", () => {
  it("mantém os inputs montados e controlados durante a digitação", () => {
    expect(login).toContain("value={email}");
    expect(login).toContain("value={password}");
    expect(login).not.toContain("key={email}");
    expect(login).not.toContain("key={password}");
  });

  it("não redimensiona a tela pelo teclado no Android", () => {
    expect(authShell).toContain('Platform.OS === "ios" ? "padding" : undefined');
    expect(authShell).toContain('Platform.OS === "ios" ? "interactive" : "none"');
    expect(authShell).not.toContain('? "padding" : "height"');
  });

  it("leva o foco do e-mail para a senha e submete pelo teclado", () => {
    expect(login).toContain('returnKeyType="next"');
    expect(login).toContain("passwordRef.current?.focus()");
    expect(login).toContain("onSubmitEditing={handleLogin}");
  });

  it("configura e-mail sem capitalização ou correção automática", () => {
    expect(login).toContain('keyboardType="email-address"');
    expect(login).toContain('autoCapitalize="none"');
    expect(login).toContain("autoCorrect={false}");
    expect(login).toContain('textContentType="emailAddress"');
  });

  it("valida e normaliza e-mails", () => {
    expect(isValidEmail(" CLIENTE@EXAMPLE.COM ")).toBe(true);
    expect(isValidEmail("email-invalido")).toBe(false);
    expect(register).toContain("toLowerCase()");
  });

  it("formata e valida telefone brasileiro", () => {
    expect(formatBrazilianPhone("37999999999")).toBe("(37) 99999-9999");
    expect(isValidPhone("(37) 99999-9999")).toBe(true);
    expect(isValidPhone("123")).toBe(false);
  });

  it("mantém o cadastro por e-mail simplificado", () => {
    expect(register).toContain("name.length < 2");
    expect(register).toContain("isValidEmail(email)");
    expect(register).toContain("form.password.length < 6");
    expect(register).not.toContain("Telefone *");
    expect(register).not.toContain("Confirmar senha *");
  });

  it("exige aceite dos termos", () => {
    expect(register).toContain("if (!acceptedTerms)");
    expect(register).toContain('accessibilityRole="checkbox"');
  });

  it("bloqueia duplo envio no login, cadastro e recuperação", () => {
    expect(login).toContain("if (loading) return");
    expect(register).toContain("if (loading) return");
    expect(recovery.match(/if \(loading\) return/g)?.length).toBeGreaterThanOrEqual(2);
  });

  it("só entra na loja após confirmar o cadastro por OTP", () => {
    expect(register).toContain('router.replace("/(auth)/confirmar-email")');
    expect(register).not.toContain('router.replace("/(tabs)")');
    expect(confirmEmail.indexOf("await verifyRegistration(code)")).toBeLessThan(confirmEmail.indexOf('router.replace("/(tabs)")'));
    expect(confirmEmail).toContain("resendRegistrationCode()");
    expect(confirmEmail).toContain("Corrigir e-mail");
    expect(confirmEmail).toContain('textContentType="oneTimeCode"');
    expect(confirmEmail).toContain("maxLength={6}");
  });

  it("oferece mostrar e ocultar em todos os campos de senha", () => {
    expect(login).toContain("setShowPassword");
    expect(register).toContain("setShowPassword");
    expect(recovery).toContain("setShowNewPassword");
    expect(recovery).toContain("setShowConfirmPassword");
    expect(changePassword).toContain("setVisible");
  });

  it("apresenta Apple nativo, Google e e-mail, sem prometer métodos indisponíveis", () => {
    for (const label of ["Continuar com Google", "Entrar com e-mail", "Criar conta com e-mail", "AppleAuthenticationButton"]) {
      expect(entry).toContain(label);
    }
    for (const unavailableLabel of ["Continuar com Facebook", "Continuar com telefone"]) {
      expect(entry).not.toContain(unavailableLabel);
    }
    expect(entry).not.toContain("Em breve");
    expect(entry).not.toContain("finger-print-outline");
  });

  it("mantém Google configurável e Apple obrigatório no iOS", () => {
    expect(providers).toContain("EXPO_PUBLIC_AUTH_GOOGLE_ENABLED");
    expect(providers).toContain("EXPO_PUBLIC_AUTH_HIDE_GOOGLE");
    expect(providers).toContain("APPLE_AUTH_CONFIG");
    expect(providers).not.toMatch(/FACEBOOK|PHONE/);
    expect(entry).toContain("if (!GOOGLE_AUTH_CONFIG.enabled)");
    expect(entry).toContain('Platform.OS === "ios"');
  });

  it("mantém Termos e Privacidade em HTTPS", () => {
    expect(legalLinks).toContain('OFFICIAL_SITE_URL = "https://kabijoux.com.br"');
    expect(legalLinks).toContain("/termos");
    expect(legalLinks).toContain("/privacidade");
    expect(register).toContain("LEGAL_LINKS.terms");
    expect(login).toContain("LEGAL_LINKS.privacy");
  });

  it("mantém resposta de recuperação sem enumerar contas", () => {
    expect(recovery).toContain("Se o e-mail estiver cadastrado");
    expect(backendSource("app/api/auth/forgot-password/route.ts")).toContain("GENERIC_MESSAGE");
  });

  it("valida o código de recuperação com exatamente seis dígitos", () => {
    expect(recovery).toContain("/^\\d{6}$/");
    expect(recovery).toContain("maxLength={6}");
    expect(recovery).toContain('textContentType="oneTimeCode"');
  });

  it("trata credenciais inválidas sem enumerar a conta", () => {
    expect(authErrorMessage(axiosError(401), "login")).toBe("E-mail ou senha inválidos.");
    const loginRoute = backendSource("app/api/auth/login/route.ts");
    expect(loginRoute.match(/Credenciais inválidas\./g)?.length).toBe(2);
  });

  it("trata falta de conexão e indisponibilidade do servidor", () => {
    expect(authErrorMessage(axiosError(), "login")).toContain("Sem conexão");
    expect(authErrorMessage(axiosError(503), "recovery")).toContain("temporariamente indisponível");
  });

  it("trata rate limit e erro interno", () => {
    expect(authErrorMessage(axiosError(429), "login")).toContain("Muitas tentativas");
    expect(authErrorMessage(axiosError(500), "register")).toContain("servidor");
  });

  it("não revela no cadastro se o e-mail já existe", () => {
    const route = backendSource("app/api/auth/register/route.ts");
    expect(route).not.toContain("E-mail já cadastrado");
    expect(authErrorMessage(axiosError(409), "register")).not.toContain("já cadastrado");
  });

  it("mantém a senha do cadastro pendente apenas em memória", () => {
    const store = source("stores/authStore.ts");
    expect(store).toContain("pendingRegistration");
    expect(store).not.toContain('SecureStore.setItemAsync("ka-pending-registration"');
    expect(store).not.toContain('SecureStore.setItemAsync("ka-pending-password"');
  });

  it("mantém a sessão persistida e o logout removendo credenciais", () => {
    const store = source("stores/authStore.ts");
    expect(store).toContain('SecureStore.setItemAsync("ka-token"');
    expect(store).toContain('SecureStore.setItemAsync("ka-customer"');
    expect(store).toContain('SecureStore.deleteItemAsync("ka-token"');
    expect(store).toContain('SecureStore.deleteItemAsync("ka-customer"');
  });

  it("implementa Apple nativo com nonce, validação Supabase e capability iOS", () => {
    expect(appleAuth).toContain("AppleAuthentication.signInAsync");
    expect(appleAuth).toContain("Crypto.randomUUID()");
    expect(appleAuth).toContain("Crypto.CryptoDigestAlgorithm.SHA256");
    expect(appleAuth).toContain('provider: "apple"');
    expect(appleAuth).toContain('/api/auth/apple/complete');
    expect(appleAuth).toContain("completeSupabaseLogin");
    expect(appConfig).toContain('"usesAppleSignIn": true');
    expect(appConfig).toContain('"buildNumber": "9"');
  });

  it("navega diretamente para a loja após login por e-mail", () => {
    expect(login).toContain('router.replace("/(tabs)")');
    expect(login.indexOf("await login(")).toBeLessThan(login.indexOf('router.replace("/(tabs)")'));
  });
});
