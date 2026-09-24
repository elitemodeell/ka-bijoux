"use client";

import { useState } from "react";
import Link from "next/link";

export function AccountDeletionConfirmation({ token }: { token: string }) {
  const [acknowledged, setAcknowledged] = useState(false);
  const [status, setStatus] = useState<
    "idle" | "confirming" | "cancelling" | "completed" | "cancelled" | "error"
  >("idle");
  const [message, setMessage] = useState("");

  async function act(action: "confirm" | "cancel") {
    setStatus(action === "confirm" ? "confirming" : "cancelling");
    setMessage("");
    try {
      const response = await fetch(`/api/account-deletion/${action}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          action === "confirm" ? { token, confirmation: "EXCLUIR" } : { token }
        ),
      });
      const payload = (await response.json()) as {
        data?: { message?: string };
        error?: string;
      };
      if (!response.ok) {
        setStatus("error");
        setMessage(payload.error || "O link não pôde ser processado.");
        return;
      }
      setStatus(action === "confirm" ? "completed" : "cancelled");
      setMessage(payload.data?.message || "Solicitação processada.");
    } catch {
      setStatus("error");
      setMessage("Não foi possível conectar ao serviço. Tente novamente mais tarde.");
    }
  }

  if (!token) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-amber-950">
        <h2 className="text-xl font-bold">Link incompleto</h2>
        <p className="mt-2 text-sm leading-6">
          Solicite um novo link na página de exclusão de conta.
        </p>
        <Link href="/excluir-conta" className="mt-4 inline-block font-bold underline">
          Voltar para a solicitação
        </Link>
      </div>
    );
  }

  const finished = status === "completed" || status === "cancelled";

  return (
    <div className="rounded-2xl border border-rose-100 bg-white p-6 shadow-sm">
      <h2 className="text-xl font-bold text-gray-900">Confirme sua decisão</h2>
      <p className="mt-2 text-sm leading-6 text-gray-600">
        O link é temporário e de uso único. A exclusão só será executada ao selecionar
        a confirmação abaixo.
      </p>

      <ul className="mt-5 list-disc space-y-2 pl-5 text-sm leading-6 text-gray-700">
        <li>Perfil, credenciais, favoritos, avaliações, notificações e carrinho serão removidos.</li>
        <li>Endereços sem vínculo com pedidos serão removidos.</li>
        <li>
          Pedidos, pagamentos, referências antifraude e endereços ligados a transações
          podem ser retidos pelo prazo legal aplicável.
        </li>
        <li>Após a execução, a conta não poderá ser recuperada.</li>
      </ul>

      {!finished ? (
        <label className="mt-6 flex cursor-pointer items-start gap-3 rounded-xl bg-gray-50 p-4 text-sm text-gray-800">
          <input
            type="checkbox"
            checked={acknowledged}
            onChange={(event) => setAcknowledged(event.target.checked)}
            className="mt-1 h-4 w-4 accent-rose-900"
          />
          <span>
            Entendi quais dados serão apagados e quais registros podem ser legalmente retidos.
          </span>
        </label>
      ) : null}

      {message ? (
        <p
          className={`mt-4 rounded-xl p-3 text-sm ${
            status === "error" ? "bg-red-50 text-red-800" : "bg-emerald-50 text-emerald-900"
          }`}
          role="status"
          aria-live="polite"
        >
          {message}
        </p>
      ) : null}

      {!finished ? (
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            disabled={!acknowledged || status === "confirming" || status === "cancelling"}
            onClick={() => act("confirm")}
            className="rounded-xl bg-red-700 px-5 py-3 font-bold text-white hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-600 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {status === "confirming" ? "Excluindo…" : "Excluir minha conta"}
          </button>
          <button
            type="button"
            disabled={status === "confirming" || status === "cancelling"}
            onClick={() => act("cancel")}
            className="rounded-xl border border-gray-300 px-5 py-3 font-bold text-gray-800 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:opacity-50"
          >
            {status === "cancelling" ? "Cancelando…" : "Cancelar solicitação"}
          </button>
        </div>
      ) : null}
    </div>
  );
}
