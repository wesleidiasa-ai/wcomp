import { useNavigate } from "react-router-dom";
import type { PurchaseRequestSummary } from "../types";
import { StatusBadge } from "./StatusBadge";
import { PriorityBadge } from "./PriorityBadge";
import { MiniStepper } from "./MiniStepper";
import { categoryIcon } from "../lib/categoryIcon";
import { formatRelativeDate, daysSince } from "../lib/relativeDate";
import { getRequestAlert } from "../lib/requestAlerts";
import { cardClass, buttonAccentClass } from "./ui";

function PrazoCell({ r }: { r: PurchaseRequestSummary }) {
  const alert = getRequestAlert(r);
  if (alert) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-red-700 dark:text-red-400">
        🔴 {alert.text}
      </span>
    );
  }
  const days = daysSince(r.createdAt);
  const isFresh = days <= 1;
  return (
    <span
      className={`inline-flex items-center gap-1 text-xs font-medium ${
        isFresh ? "text-emerald-700 dark:text-emerald-400" : "text-amber-700 dark:text-amber-400"
      }`}
      title={new Date(r.createdAt).toLocaleDateString("pt-BR")}
    >
      {isFresh ? "🟢" : "🟡"} {formatRelativeDate(r.createdAt)}
    </span>
  );
}

/** Tabela de pedidos compartilhada entre "Todos os pedidos" e as páginas de fila por etapa. */
export function RequestsTable({
  requests,
  emptyMessage,
  showAnalyzeAction,
}: {
  requests: PurchaseRequestSummary[];
  emptyMessage: string;
  showAnalyzeAction?: boolean;
}) {
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
            <th className="px-4 py-3 font-medium">Pedido</th>
            <th className="px-4 py-3 font-medium">Solicitante</th>
            <th className="px-4 py-3 font-medium">Setor</th>
            <th className="px-4 py-3 font-medium">Prioridade</th>
            <th className="px-4 py-3 font-medium">Progresso</th>
            <th className="px-4 py-3 font-medium">Status</th>
            <th className="px-4 py-3 font-medium">Prazo</th>
            <th className="px-4 py-3 font-medium" />
          </tr>
        </thead>
        <tbody>
          {requests.map((r) => (
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
              <td className="px-4 py-3">
                <StatusBadge status={r.status} />
              </td>
              <td className="px-4 py-3">
                <PrazoCell r={r} />
              </td>
              <td className="px-4 py-3 text-right">
                <div className="flex items-center justify-end gap-3">
                  {showAnalyzeAction && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/pedidos/${r.id}`);
                      }}
                      className={`${buttonAccentClass} px-3 py-1.5 text-xs`}
                    >
                      Analisar pedido
                    </button>
                  )}
                  <button
                    onClick={(e) => handleDuplicate(e, r.id)}
                    title="Duplicar pedido"
                    className="text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200"
                  >
                    📄
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
