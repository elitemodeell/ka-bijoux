"use client";

import { FormEvent, useState } from "react";

export function AccountDeletionRequestForm() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "sent" | "error">("idle");
  const [message, setMessage] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("loading");
    setMessage("");

    try {
      const response = await fetch("/api/account-deletion/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const payload = (await response.json()) as {
        data?: { message?: string };
        error?: string;
      };
      if (!response.ok) {
        setStatus("error");
        setMessage(payload.error || "Não foi possível enviar a solicitação.");
        return;
      }
      setStatus("sent");
      setMessage(
        payload.data?.message ||
          "Se o e-mail estiver cadastrado e ativo, você receberá as instruções."
      );
      setEmail("");
    } catch {
      setStatus("error");
      setMessage("Não foi possível conectar ao serviço. Tente novamente mais tarde.");
    }
  }

  return (
    <form
      onSubmit={submit}
      className="rounded-2xl border border-rose-100 bg-white p-6 shadow-sm"
      aria-labelledby="form-title"
    >
      <h2 id="form-title" className="text-xl font-bold text-gray-900">
        Solicitar exclusão
      </h2>
      <p className="mt-2 text-sm leading-6 text-gray-600">
        Informe o mesmo e-mail usado na conta. A resposta é sempre genérica para impedir
        que terceiros descubram se um endereço está cadastrado.
      </p>

      <label htmlFor="deletion-email" className="mt-5 block text-sm font-semibold text-gray-800">
        E-mail da conta
      </label>
      <input
        id="deletion-email"
        name="email"
        type="email"
        inputMode="email"
        autoComplete="email"
        required
        maxLength={254}
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        disabled={status === "loading"}
        className="mt-2 w-full rounded-xl border border-gray-300 px-4 py-3 text-base text-gray-900 outline-none transition focus:border-rose-700 focus:ring-2 focus:ring-rose-200 disabled:bg-gray-100"
      />

      <button
        type="submit"
        disabled={status === "loading"}
        className="mt-4 w-full rounded-xl bg-rose-900 px-5 py-3 font-bold text-white transition hover:bg-rose-800 focus:outline-none focus:ring-2 focus:ring-rose-700 focus:ring-offset-2 disabled:cursor-wait disabled:opacity-60"
      >
        {status === "loading" ? "Enviando…" : "Enviar link de confirmação"}
      </button>

      {message ? (
        <p
          className={`mt-4 rounded-xl p-3 text-sm ${
            status === "error"
              ? "bg-red-50 text-red-800"
              : "bg-emerald-50 text-emerald-900"
          }`}
          role="status"
          aria-live="polite"
        >
          {message}
        </p>
      ) : null}
    </form>
  );
}
