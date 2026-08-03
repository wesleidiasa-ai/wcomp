import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api, ApiError } from "../lib/api";
import type { SupplierDetail } from "../types";
import { StatusBadge } from "../components/StatusBadge";
import { cardClass } from "../components/ui";

function formatMoney(value: string | number | null) {
  if (value === null) return "—";
  return Number(value).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function SupplierDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [supplier, setSupplier] = useState<SupplierDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    api
      .get<SupplierDetail>(`/suppliers/${id}`)
      .then(setSupplier)
      .catch((err) => setError(err instanceof ApiError ? err.message : "Erro ao carregar fornecedor"));
  }, [id]);

  if (error) return <p className="text-sm text-red-600 dark:text-red-400">{error}</p>;
  if (!supplier) return <p className="text-sm text-neutral-500">Carregando...</p>;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link to="/fornecedores" className="text-sm text-neutral-500 hover:underline dark:text-neutral-400">
        ← Voltar para fornecedores
      </Link>

      <div className={cardClass}>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-semibold">{supplier.name}</h1>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              {[supplier.phone, supplier.email, supplier.cnpj].filter(Boolean).join(" · ") || "Sem contato cadastrado"}
            </p>
          </div>
          {supplier.rating && <span className="text-lg text-amber-500">{"★".repeat(supplier.rating)}</span>}
        </div>
        {supplier.notes && <p className="mt-3 text-sm text-neutral-700 dark:text-neutral-300">{supplier.notes}</p>}
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <div className={cardClass}>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">Cotações enviadas</p>
          <p className="mt-1 text-xl font-bold">{supplier.stats.totalQuotes}</p>
        </div>
        <div className={cardClass}>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">Cotações vencidas</p>
          <p className="mt-1 text-xl font-bold text-emerald-600 dark:text-emerald-400">{supplier.stats.wonQuotes}</p>
        </div>
        <div className={cardClass}>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">Prazo médio</p>
          <p className="mt-1 text-xl font-bold">
            {supplier.stats.avgLeadDays !== null ? `${supplier.stats.avgLeadDays.toFixed(1)}d` : "—"}
          </p>
        </div>
        <div className={cardClass}>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">Preço médio</p>
          <p className="mt-1 text-xl font-bold">{formatMoney(supplier.stats.avgPrice)}</p>
        </div>
      </div>

      <div className={cardClass}>
        <h2 className="mb-3 text-sm font-semibold text-neutral-700 dark:text-neutral-300">Produtos fornecidos</h2>
        {supplier.stats.productsSold.length === 0 ? (
          <p className="text-sm text-neutral-500 dark:text-neutral-400">Nenhuma cotação vencedora ainda.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {supplier.stats.productsSold.map((p) => (
              <span
                key={p}
                className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-medium text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300"
              >
                {p}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className={cardClass}>
        <h2 className="mb-3 text-sm font-semibold text-neutral-700 dark:text-neutral-300">Histórico de compras</h2>
        {supplier.purchaseHistory.length === 0 ? (
          <p className="text-sm text-neutral-500 dark:text-neutral-400">Nenhuma compra vencida ainda.</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="border-b border-neutral-200 text-neutral-500 dark:border-neutral-800 dark:text-neutral-400">
              <tr>
                <th className="py-2 font-medium">Pedido</th>
                <th className="py-2 font-medium">Valor</th>
                <th className="py-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {supplier.purchaseHistory.map((h) => (
                <tr key={h.requestId} className="border-b border-neutral-100 last:border-0 dark:border-neutral-800">
                  <td className="py-2">
                    <Link to={`/pedidos/${h.requestId}`} className="hover:underline">
                      {h.title}
                    </Link>
                  </td>
                  <td className="py-2">{formatMoney(h.value)}</td>
                  <td className="py-2">
                    <StatusBadge status={h.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
