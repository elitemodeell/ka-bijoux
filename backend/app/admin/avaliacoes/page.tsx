"use client";

import { useCallback, useEffect, useState } from "react";
import Header from "@/components/admin/Header";

type Review = {
  id: string;
  rating: number;
  comment: string | null;
  approved: boolean;
  createdAt: string;
  verifiedPurchase: boolean;
  customer: { name: string; email: string };
  product: { name: string; slug: string };
};

export default function AdminReviewsPage() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [showApproved, setShowApproved] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/admin/reviews?pending=${showApproved ? "false" : "true"}`, { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Não foi possível carregar as avaliações.");
      setReviews(Array.isArray(payload.data) ? payload.data : []);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível carregar as avaliações.");
    } finally {
      setLoading(false);
    }
  }, [showApproved]);

  useEffect(() => { void load(); }, [load]);

  async function moderate(review: Review, approved: boolean) {
    setSavingId(review.id);
    setError("");
    try {
      const response = await fetch(`/api/admin/reviews/${review.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ approved }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Não foi possível moderar a avaliação.");
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível moderar a avaliação.");
    } finally {
      setSavingId(null);
    }
  }

  return (
    <div>
      <Header title="Avaliações de clientes" subtitle="Moderação de avaliações enviadas após compras entregues ou retiradas" />
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-gray-600">{reviews.length} avaliações {showApproved ? "aprovadas" : "aguardando análise"}</p>
        <button type="button" onClick={() => setShowApproved((value) => !value)} className="btn-outline">
          {showApproved ? "Ver pendentes" : "Ver aprovadas"}
        </button>
      </div>
      {error ? <p role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p> : null}
      {loading ? <div className="card py-10 text-center text-gray-500">Carregando avaliações…</div> : null}
      {!loading && !reviews.length ? <div className="card py-10 text-center text-gray-500">Nenhuma avaliação nesta fila.</div> : null}
      <div className="space-y-4">
        {reviews.map((review) => (
          <article key={review.id} className="card">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-semibold text-gray-900">{review.product.name}</p>
                <p className="mt-1 text-sm text-gray-600">{review.customer.name} · {review.customer.email}</p>
                <p className="mt-1 text-xs text-gray-400">{new Date(review.createdAt).toLocaleString("pt-BR")}</p>
              </div>
              <span className={`rounded-full px-3 py-1 text-xs font-bold ${review.verifiedPurchase ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-800"}`}>
                {review.verifiedPurchase ? "Compra verificada" : "Compra não confirmada"}
              </span>
            </div>
            <p className="mt-3 text-lg tracking-wider text-amber-500" aria-label={`${review.rating} de 5 estrelas`}>{"★".repeat(review.rating)}{"☆".repeat(5 - review.rating)}</p>
            {review.comment ? <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-gray-700">{review.comment}</p> : <p className="mt-2 text-sm italic text-gray-400">Sem comentário escrito.</p>}
            {!showApproved ? (
              <div className="mt-4 flex flex-wrap gap-2">
                <button type="button" disabled={savingId === review.id || !review.verifiedPurchase} onClick={() => void moderate(review, true)} className="btn-primary disabled:cursor-not-allowed disabled:opacity-50">
                  {savingId === review.id ? "Salvando…" : "Aprovar publicação"}
                </button>
                <button type="button" disabled={savingId === review.id} onClick={() => void moderate(review, false)} className="btn-outline text-red-600">
                  Ocultar e preservar registro
                </button>
              </div>
            ) : null}
          </article>
        ))}
      </div>
    </div>
  );
}
