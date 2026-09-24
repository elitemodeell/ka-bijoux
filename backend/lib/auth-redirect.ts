export const DEFAULT_AUTH_REDIRECT = "/conta";

/**
 * OAuth redirects must always stay on the KA Bijoux origin. This deliberately
 * accepts only an absolute path and rejects protocol-relative URLs.
 */
export function safeAuthRedirect(value: string | null | undefined) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return DEFAULT_AUTH_REDIRECT;
  }

  try {
    const parsed = new URL(value, "https://kabijoux.com.br");
    if (parsed.origin !== "https://kabijoux.com.br") return DEFAULT_AUTH_REDIRECT;
    if (parsed.pathname === "/auth/callback") return DEFAULT_AUTH_REDIRECT;
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return DEFAULT_AUTH_REDIRECT;
  }
}

export function googleOAuthCallbackUrl(origin: string, next?: string | null) {
  const callback = new URL("/auth/callback", origin);
  callback.searchParams.set("next", safeAuthRedirect(next));
  return callback.toString();
}
