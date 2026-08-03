import type { PurchaseRequestDetail } from "../types";

type StepState = "done" | "current" | "pending" | "rejected" | "cancelled";

const MILESTONES = ["Solicitado", "Aprovado", "Cotação", "Pedido enviado", "Recebido"];

const AFTER_APPROVAL = ["aprovado", "em_cotacao", "pedido_enviado", "aguardando_entrega", "aguardando_retirada", "recebido"];
const AFTER_COTACAO = ["pedido_enviado", "aguardando_entrega", "aguardando_retirada", "recebido"];
const AFTER_ENVIO = ["pedido_enviado", "aguardando_entrega", "aguardando_retirada", "recebido"];

function doneFlags(status: string): boolean[] {
  return [
    true,
    AFTER_APPROVAL.includes(status),
    AFTER_COTACAO.includes(status),
    AFTER_ENVIO.includes(status),
    status === "recebido",
  ];
}

function computeStates(request: PurchaseRequestDetail): StepState[] {
  const { status, statusHistory } = request;

  if (status === "reprovado") {
    return ["done", "rejected", "pending", "pending", "pending"];
  }

  if (status === "cancelado") {
    const cancelEntry = [...statusHistory].reverse().find((h) => h.toStatus === "cancelado");
    const flags = doneFlags(cancelEntry?.fromStatus ?? "aguardando_aprovacao");
    const firstNotDone = flags.findIndex((f) => !f);
    return flags.map((done, i) => (done ? "done" : i === firstNotDone ? "cancelled" : "pending"));
  }

  const flags = doneFlags(status);
  const firstNotDone = flags.findIndex((f) => !f);
  return flags.map((done, i) => (done ? "done" : i === firstNotDone ? "current" : "pending"));
}

const CIRCLE_CLASSES: Record<StepState, string> = {
  done: "bg-emerald-500 text-white",
  current: "bg-blue-600 text-white ring-4 ring-blue-100 dark:ring-blue-900/40",
  pending: "bg-neutral-200 text-neutral-400 dark:bg-neutral-800 dark:text-neutral-600",
  rejected: "bg-red-500 text-white",
  cancelled: "bg-neutral-400 text-white",
};

const LABEL_CLASSES: Record<StepState, string> = {
  done: "text-neutral-700 dark:text-neutral-300",
  current: "font-semibold text-blue-700 dark:text-blue-400",
  pending: "text-neutral-400 dark:text-neutral-600",
  rejected: "font-semibold text-red-600 dark:text-red-400",
  cancelled: "text-neutral-500 dark:text-neutral-500",
};

function StepIcon({ state, index }: { state: StepState; index: number }) {
  if (state === "done") return <>✓</>;
  if (state === "rejected" || state === "cancelled") return <>✕</>;
  return <>{index + 1}</>;
}

export function Stepper({ request }: { request: PurchaseRequestDetail }) {
  const states = computeStates(request);

  return (
    <div className="flex items-start">
      {MILESTONES.map((label, i) => (
        <div key={label} className="flex flex-1 items-center last:flex-none">
          <div className="flex flex-col items-center gap-1.5">
            <span
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${CIRCLE_CLASSES[states[i]]}`}
            >
              <StepIcon state={states[i]} index={i} />
            </span>
            <span className={`text-xs ${LABEL_CLASSES[states[i]]}`}>{label}</span>
          </div>
          {i < MILESTONES.length - 1 && (
            <div
              className={`mx-2 h-0.5 flex-1 ${
                states[i] === "done" ? "bg-emerald-500" : "bg-neutral-200 dark:bg-neutral-800"
              }`}
              style={{ marginBottom: "1.25rem" }}
            />
          )}
        </div>
      ))}
    </div>
  );
}
