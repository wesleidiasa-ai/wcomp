import { useNavigate } from "react-router-dom";
import type { PurchaseRequestSummary } from "../types";
import { StatusBadge } from "./StatusBadge";
import { PriorityBadge } from "./PriorityBadge";
import { MiniStepper } from "./MiniStepper";
import { categoryIcon } from "../lib/categoryIcon";
import { formatRelativeDate } from "../lib/relativeDate";
import { getRequestAlert } from "../lib/requestAlerts";
import { cardClass } from "./ui";

function formatMoney(value: string | number | null) {
  if (value === null) return "—";
  return Number(value).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("pt-BR");
}

const HIGH_VALUE_THRESHOLD = 10000;

function ValueCell({ value }: { value: string | null }) {
  if (value === null) return <span className="text-neutral-400">—</span>;
  const n = Number(value);
  const isHigh = n >= HIGH_VALUE_THRESHOLD;
  return (
    <span className={isHigh ? "font-bold text-emerald-800 dark:text-emerald-400" : "font-medium"}>
      {isHigh && <span aria-hidden="true">💰 </span>}
      {formatMoney(n)}
    </span>
  );
}

/** Tabela de pedidos compartilhada entre "Todos os pedidos" e as páginas de fila por etapa. */
export function RequestsTable({ requests, emptyMessage }: { requests: PurchaseRequestSummary[]; emptyMessage: string }) {
  const navigate = useNavigate();

  function handleDuplicate(e: React.MouseEvent, id: string) {
    e.stopPropagation();
    navigate(`/pedidos/novo?duplicateFrom=${id}`);
  }

  if (requests.length === 0) {
    return (
      <div className={cardClass}>
        <p className="text-sm text-neutral-500 dark:text-neutral-400">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className={`${cardClass} overflow-x-auto p-0`}>
      <table className="w-full text-left text-sm">
        <thead className="border-b border-neutral-200 text-neutral-500 dark:border-neutral-800 dark:text-neutral-400">
          <tr>
            <th className="px-4 py-3 font-medium">Título</th>
            <th className="px-4 py-3 font-medium">Solicitante</th>
            <th className="px-4 py-3 font-medium">Setor</th>
            <th className="px-4 py-3 font-medium">Prioridade</th>
            <th className="px-4 py-3 font-medium">Progresso</th>
            <th className="px-4 py-3 font-medium">Fornecedor</th>
            <th className="px-4 py-3 font-medium">Total estimado</th>
            <th className="px-4 py-3 font-medium">Status</th>
            <th className="px-4 py-3 font-medium">Criado</th>
            <th className="px-4 py-3 font-medium">Alerta</th>
            <th className="px-4 py-3 font-medium" />
          </tr>
        </thead>
        <tbody>
          {requests.map((r) => {
            const alert = getRequestAlert(r);
            return (
              <tr
                key={r.id}
                onClick={() => navigate(`/pedidos/${r.id}`)}
                className="cursor-pointer border-b border-neutral-100 last:border-0 hover:bg-neutral-50 dark:border-neutral-800 dark:hover:bg-neutral-800/50"
              >
                <td className="px-4 py-3 font-medium">
                  <span className="mr-1.5" aria-hidden="true" title={r.department?.name ?? "Sem setor"}>
                    {categoryIcon(r.department?.name)}
                  </span>
                  {r.requestNumber && <span className="text-neutral-400 dark:text-neutral-500">#{r.requestNumber} · </span>}
                  {r.title}
                </td>
                <td className="px-4 py-3">{r.requester.name}</td>
                <td className="px-4 py-3">{r.department?.name ?? "—"}</td>
                <td className="px-4 py-3">
                  <PriorityBadge urgency={r.urgency} />
                </td>
                <td className="px-4 py-3">
                  <MiniStepper status={r.status} />
                </td>
                <td className="px-4 py-3">{r.quotes[0]?.supplierName ?? "—"}</td>
                <td className="px-4 py-3">
                  <ValueCell value={r.estimatedTotal} />
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={r.status} />
                </td>
                <td className="px-4 py-3 text-neutral-500 dark:text-neutral-400" title={formatDate(r.createdAt)}>
                  {formatRelativeDate(r.createdAt)}
                </td>
                <td className="px-4 py-3">
                  {alert && (
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 dark:text-amber-400">
                      ⚠️ {alert.text}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={(e) => handleDuplicate(e, r.id)}
                    title="Duplicar pedido"
                    className="text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200"
                  >
                    📄
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
