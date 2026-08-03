import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { api, ApiError } from "../lib/api";
import type { PurchaseRequestSummary, RequestStatus } from "../types";
import { StatusBadge } from "../components/StatusBadge";
import { cardClass, inputClass } from "../components/ui";

const STATUS_OPTIONS: { value: RequestStatus | ""; label: string }[] = [
  { value: "", label: "Todos os status" },
  { value: "aguardando_aprovacao", label: "Aguardando aprovação" },
  { value: "aprovado", label: "Aprovado" },
  { value: "reprovado", label: "Reprovado" },
  { value: "em_cotacao", label: "Em cotação" },
  { value: "pedido_enviado", label: "Pedido enviado" },
  { value: "recebido", label: "Recebido" },
  { value: "cancelado", label: "Cancelado" },
];

function formatMoney(value: string | null) {
  if (value === null) return "—";
  return Number(value).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("pt-BR");
}

export function RequestsListPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [requests, setRequests] = useState<PurchaseRequestSummary[] | null>(null);
  const [status, setStatus] = useState<RequestStatus | "">(
    (searchParams.get("status") as RequestStatus | null) ?? ""
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setStatus((searchParams.get("status") as RequestStatus | null) ?? "");
  }, [searchParams]);

  useEffect(() => {
    let cancelled = false;
    setError(null);
    const query = status ? `?status=${status}` : "";
    api
      .get<PurchaseRequestSummary[]>(`/purchase-requests${query}`)
      .then((data) => {
        if (!cancelled) setRequests(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof ApiError ? err.message : "Erro ao carregar pedidos");
      });
    return () => {
      cancelled = true;
    };
  }, [status]);

  return (
    <div>
      <div className="mb-5 flex items-center justify-between">
        <h1 className="text-xl font-semibold">Pedidos de compra</h1>
        <select
          className={`${inputClass} w-56`}
          value={status}
          onChange={(e) => {
            const next = e.target.value as RequestStatus | "";
            setStatus(next);
            setSearchParams(next ? { status: next } : {});
          }}
        >
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {error && <p className="mb-4 text-sm text-red-600 dark:text-red-400">{error}</p>}

      {!requests ? (
        <p className="text-sm text-neutral-500">Carregando...</p>
      ) : requests.length === 0 ? (
        <div className={cardClass}>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            Nenhum pedido encontrado.
          </p>
        </div>
      ) : (
        <div className={`${cardClass} overflow-x-auto p-0`}>
          <table className="w-full text-left text-sm">
            <thead className="border-b border-neutral-200 text-neutral-500 dark:border-neutral-800 dark:text-neutral-400">
              <tr>
                <th className="px-4 py-3 font-medium">Título</th>
                <th className="px-4 py-3 font-medium">Solicitante</th>
                <th className="px-4 py-3 font-medium">Setor</th>
                <th className="px-4 py-3 font-medium">Urgência</th>
                <th className="px-4 py-3 font-medium">Total estimado</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Criado em</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((r) => (
                <tr
                  key={r.id}
                  className="border-b border-neutral-100 last:border-0 hover:bg-neutral-50 dark:border-neutral-800 dark:hover:bg-neutral-800/50"
                >
                  <td className="px-4 py-3">
                    <Link to={`/pedidos/${r.id}`} className="font-medium hover:underline">
                      {r.title}
                    </Link>
                  </td>
                  <td className="px-4 py-3">{r.requester.name}</td>
                  <td className="px-4 py-3">{r.department?.name ?? "—"}</td>
                  <td className="px-4 py-3 capitalize">{r.urgency}</td>
                  <td className="px-4 py-3">{formatMoney(r.estimatedTotal)}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={r.status} />
                  </td>
                  <td className="px-4 py-3 text-neutral-500 dark:text-neutral-400">
                    {formatDate(r.createdAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
