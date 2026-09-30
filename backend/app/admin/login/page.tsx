"use client";

import { useRef, useState } from "react";

export default function AdminLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const submitting = useRef(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting.current) return;
    if (!email.trim() || !password) {
      setError("Preencha o e-mail e a senha para entrar.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError("Informe um e-mail válido, como admin@kabijoux.com.br.");
      return;
    }
    submitting.current = true;
    setLoading(true);
    setError("");
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 20000);

    try {
      const res = await fetch("/api/auth/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
        signal: controller.signal,
      });

      const json = await res.json().catch(() => null);

      if (!res.ok) {
        setError(res.status === 401
          ? "E-mail ou senha incorretos, ou acesso desativado. Confira os dados e tente novamente."
          : res.status === 429
          ? "Muitas tentativas de acesso. Aguarde alguns minutos e tente novamente."
          : res.status >= 500
          ? "O servidor não conseguiu concluir o acesso. Tente novamente em instantes."
          : typeof json?.error === "string" ? json.error : `Não foi possível entrar (erro ${res.status}). Tente novamente.`);
        return;
      }
      if (!json?.data?.admin) {
        setError("O servidor retornou uma resposta inesperada. Atualize a página e tente novamente.");
        return;
      }
      // Load the dashboard with the new session cookie, without a stale prefetched login redirect.
      window.location.assign("/admin/dashboard");
    } catch {
      setError(controller.signal.aborted
        ? "O servidor demorou para responder. Tente novamente."
        : "Não foi possível conectar ao servidor. Verifique sua internet e tente novamente.");
    } finally {
      window.clearTimeout(timeout);
      submitting.current = false;
      setLoading(false);
    }
  }

  return (
    <div className="admin-login-page flex min-h-dvh items-center justify-center bg-gradient-to-br from-pink-50 to-white p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-pink-500 rounded-3xl shadow-lg mb-4">
            <span className="text-white text-3xl font-bold">KA</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-800">KA Bijoux</h1>
          <p className="text-gray-500 text-sm mt-1">Painel Administrativo</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-3xl shadow-xl border border-pink-100 p-5 sm:p-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-6">Entrar no painel</h2>

          {error && (
            <div id="admin-login-error" role="alert" aria-live="assertive" className="bg-red-50 border border-red-200 text-red-600 rounded-xl px-4 py-3 text-sm mb-4">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate aria-busy={loading} aria-describedby={error ? "admin-login-error" : undefined} className="space-y-4">
            <div>
              <label htmlFor="admin-email" className="block text-sm font-medium text-gray-700 mb-1.5">E-mail</label>
              <input
                id="admin-email"
                autoComplete="username"
                autoCapitalize="none"
                inputMode="email"
                spellCheck={false}
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@kabijoux.com.br"
                required
                aria-invalid={Boolean(error)}
                aria-describedby={error ? "admin-login-error" : undefined}
                className="input-field"
              />
            </div>

            <div>
              <label htmlFor="admin-password" className="block text-sm font-medium text-gray-700 mb-1.5">Senha</label>
              <div className="relative">
                <input
                id="admin-password"
                autoComplete="current-password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                aria-invalid={Boolean(error)}
                aria-describedby={error ? "admin-login-error" : undefined}
                className="input-field pr-12"
              />
                <button type="button" aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"} aria-pressed={showPassword} onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 flex w-12 items-center justify-center rounded-r-xl text-gray-500 hover:text-pink-600">
                  <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
                    <circle cx="12" cy="12" r="3" />
                    {showPassword && <path d="m3 3 18 18" />}
                  </svg>
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              aria-disabled={loading}
              className="btn-primary w-full mt-2 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <span className="animate-spin inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                  Entrando...
                </>
              ) : (
                "Entrar"
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-gray-400 text-xs mt-6">
          KA Bijoux © {new Date().getFullYear()} · Itaúna/MG
        </p>
      </div>
    </div>
  );
}
