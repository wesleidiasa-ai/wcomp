import type { RequestStatus } from "../types";

const STYLES: Record<RequestStatus, string> = {
  aguardando_aprovacao:
    "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
  aprovado: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
  reprovado: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
  em_cotacao: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
  pedido_enviado: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300",
  aguardando_entrega: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900/40 dark:text-cyan-300",
  aguardando_retirada: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900/40 dark:text-cyan-300",
  recebido: "bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-300",
  cancelado: "bg-neutral-200 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300",
};

const LABELS: Record<RequestStatus, string> = {
  aguardando_aprovacao: "Aguardando aprovação",
  aprovado: "Aprovado",
  reprovado: "Reprovado",
  em_cotacao: "Em cotação",
  pedido_enviado: "Pedido enviado",
  aguardando_entrega: "Aguardando entrega",
  aguardando_retirada: "Aguardando retirada",
  recebido: "Recebido",
  cancelado: "Cancelado",
};

export function StatusBadge({ status }: { status: RequestStatus }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${STYLES[status]}`}>
      {LABELS[status]}
    </span>
  );
}
