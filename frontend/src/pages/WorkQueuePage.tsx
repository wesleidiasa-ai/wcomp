import { useEffect, useState } from "react";
import { api, ApiError } from "../lib/api";
import type { PurchaseRequestSummary, StageStatItem } from "../types";
import { RequestsTable } from "../components/RequestsTable";
import { cardClass, inputClass } from "../components/ui";

function formatMoney(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function StatChip({ item }: { item: StageStatItem }) {
  return (
    <div className={cardClass}>
      <p className="text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">{item.label}</p>
      <p className="mt-1 text-xl font-bold">{item.isMoney ? formatMoney(item.value) : item.value}</p>
    </div>
  );
}

export type WorkQueuePageProps = {
  stage: string;
  status: string;
  icon: string;
  title: string;
  description: string;
  emptyMessage: string;
};

/** Página de fila de trabalho por etapa (Solicitações/Aprovações/Cotações/Pedidos/Recebimentos) —
 * reaproveita a tabela de pedidos, só troca o filtro de status e os indicadores no topo. */
export function WorkQueuePage({ stage, status, icon, title, description, emptyMessage }: WorkQueuePageProps) {
  const [requests, setRequests] = useState<PurchaseRequestSummary[] | null>(null);
  const [stats, setStats] = useState<StageStatItem[] | null>(null);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [error, setError] = useState<string | null>(null);

  // reseta a busca quando o usuário troca de etapa pelo menu
  useEffect(() => {
    setSearch("");
    setDebouncedSearch("");
    setRequests(null);
  }, [stage]);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    const params = new URLSearchParams({ status });
    if (debouncedSearch) params.set("q", debouncedSearch);

    setError(null);
    api
      .get<PurchaseRequestSummary[]>(`/purchase-requests?${params.toString()}`)
      .then(setRequests)
      .catch((err) => setError(err instanceof ApiError ? err.message : "Erro ao carregar pedidos"));
  }, [status, debouncedSearch]);

  useEffect(() => {
    api
      .get<StageStatItem[]>(`/purchase-requests/stage-summary?stage=${stage}`)
      .then(setStats)
      .catch(() => {});
  }, [stage]);

  return (
    <div>
      <div className="mb-5">
        <h1 className="text-xl font-semibold">
          {icon} {title}
        </h1>
        <p className="text-sm text-neutral-500 dark:text-neutral-400">{description}</p>
      </div>

      {stats && (
        <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {stats.map((item) => (
            <StatChip key={item.label} item={item} />
          ))}
        </div>
      )}

      <input
        className={`${inputClass} mb-5`}
        placeholder="🔎 Número, item, solicitante, fornecedor, observação..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {error && <p className="mb-4 text-sm text-red-600 dark:text-red-400">{error}</p>}

      {!requests ? (
        <p className="text-sm text-neutral-500">Carregando...</p>
      ) : (
        <RequestsTable requests={requests} emptyMessage={emptyMessage} />
      )}
    </div>
  );
}
