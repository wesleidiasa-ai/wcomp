import type { PurchaseRequestDetail } from "../types";

type TimelineEvent = {
  at: string;
  label: string;
  note?: string | null;
  tone: "done" | "rejected";
};

const STATUS_LABELS: Record<string, string> = {
  aguardando_aprovacao: "Solicitação criada",
  aprovado: "Pedido aprovado",
  reprovado: "Pedido reprovado",
  em_cotacao: "Comprador iniciou a cotação",
  pedido_enviado: "Pedido enviado ao fornecedor",
  aguardando_entrega: "Aguardando entrega (transportadora)",
  aguardando_retirada: "Aguardando retirada",
  recebido: "Material recebido",
  cancelado: "Pedido cancelado",
};

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("pt-BR");
}

function buildEvents(request: PurchaseRequestDetail): TimelineEvent[] {
  const events: TimelineEvent[] = request.statusHistory.map((entry) => ({
    at: entry.changedAt,
    label: STATUS_LABELS[entry.toStatus] ?? entry.toStatus,
    note: entry.note,
    tone: entry.toStatus === "reprovado" || entry.toStatus === "cancelado" ? "rejected" : "done",
  }));

  for (const step of request.approvalSteps) {
    if (!step.decidedAt) continue;
    events.push({
      at: step.decidedAt,
      label:
        step.status === "aprovado"
          ? `${step.approver.name} aprovou a etapa ${step.stepOrder}`
          : `${step.approver.name} reprovou a etapa ${step.stepOrder}`,
      note: step.comment,
      tone: step.status === "aprovado" ? "done" : "rejected",
    });
  }

  if (request.quotes.length > 0) {
    const lastQuoteAt = request.quotes.reduce((max, q) => (q.createdAt > max ? q.createdAt : max), request.quotes[0].createdAt);
    events.push({
      at: lastQuoteAt,
      label: `${request.quotes.length} cotação(ões) recebida(s)`,
      tone: "done",
    });
  }

  return events.sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());
}

export function Timeline({ request }: { request: PurchaseRequestDetail }) {
  const events = buildEvents(request);

  if (events.length === 0) {
    return <p className="text-sm text-neutral-500 dark:text-neutral-400">Sem histórico ainda.</p>;
  }

  return (
    <ol className="space-y-0">
      {events.map((event, index) => (
        <li key={index} className="relative flex gap-3 pb-5 last:pb-0">
          {index < events.length - 1 && (
            <span className="absolute left-[11px] top-6 h-full w-px bg-neutral-200 dark:bg-neutral-800" />
          )}
          <span
            className={`z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white ${
              event.tone === "rejected" ? "bg-red-500" : "bg-emerald-500"
            }`}
          >
            {event.tone === "rejected" ? "✕" : "✓"}
          </span>
          <div className="pt-0.5">
            <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">{event.label}</p>
            {event.note && <p className="text-sm text-neutral-500 dark:text-neutral-400">{event.note}</p>}
            <p className="text-xs text-neutral-400 dark:text-neutral-500">{formatDateTime(event.at)}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}
