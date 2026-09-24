import axios from "axios";

type AuthFlow = "apple" | "google" | "password" | "registration" | "session" | "logout";

function sanitize(value: unknown) {
  if (typeof value !== "string") return undefined;
  return value
    .replace(/Bearer\s+[A-Za-z0-9._~-]+/gi, "Bearer [redacted]")
    .replace(/[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}/g, "[token]")
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[email]")
    .slice(0, 180);
}

function safeEndpoint(value: unknown) {
  if (typeof value !== "string") return undefined;
  try {
    const parsed = new URL(value, "https://mobile.invalid");
    return parsed.pathname;
  } catch {
    return value.split("?")[0]?.slice(0, 120);
  }
}

export function logAuthFailure(flow: AuthFlow, stage: string, error: unknown) {
  const axiosError = axios.isAxiosError(error) ? error : undefined;
  const responseData = axiosError?.response?.data as { code?: unknown; error?: unknown; message?: unknown } | undefined;
  const genericError = error as { code?: unknown; message?: unknown } | undefined;

  console.warn("[auth-diagnostic]", {
    flow,
    stage,
    endpoint: safeEndpoint(axiosError?.config?.url),
    status: axiosError?.response?.status,
    code: sanitize(responseData?.code ?? genericError?.code),
    message: sanitize(responseData?.error ?? responseData?.message ?? genericError?.message),
  });
}
