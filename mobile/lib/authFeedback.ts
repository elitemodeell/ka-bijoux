import axios from "axios";

export type AuthFlow = "login" | "register" | "recovery" | "reset";

export function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export function isValidPhone(value: string): boolean {
  const digits = value.replace(/\D/g, "");
  return digits.length === 10 || digits.length === 11;
}

export function formatBrazilianPhone(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 2) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

export function authErrorMessage(reason: unknown, flow: AuthFlow): string {
  if (!axios.isAxiosError(reason)) {
    return "Não foi possível concluir a operação. Tente novamente.";
  }

  if (!reason.response) {
    return "Sem conexão. Verifique sua internet e tente novamente.";
  }

  const status = reason.response.status;
  if (status === 429) return "Muitas tentativas. Aguarde alguns minutos e tente novamente.";
  if (status === 503) return "Serviço temporariamente indisponível. Tente novamente em instantes.";
  if (status >= 500) return "O servidor encontrou um problema. Tente novamente em instantes.";
  if (flow === "login" && status === 401) return "E-mail ou senha inválidos.";
  if (flow === "register" && status === 409) {
    return "Não foi possível concluir o cadastro com esses dados. Tente entrar ou recuperar sua senha.";
  }
  if (flow === "reset" && status === 400) return "Código inválido ou expirado. Solicite um novo código.";

  const serverMessage = (reason.response.data as { error?: unknown } | undefined)?.error;
  return typeof serverMessage === "string" && serverMessage.length <= 160
    ? serverMessage
    : "Não foi possível concluir a operação. Tente novamente.";
}
