import type { RequestStatus } from "../types";

type DotState = "done" | "current" | "pending" | "stopped";

const MILESTONES = ["Solicitado", "Aprovado", "Cotação", "Enviado", "Recebido"];

const AFTER_APPROVAL: RequestStatus[] = ["aprovado", "em_cotacao", "pedido_enviado", "aguardando_entrega", "aguardando_retirada", "recebido"];
const AFTER_COTACAO: RequestStatus[] = ["pedido_enviado", "aguardando_entrega", "aguardando_retirada", "recebido"];
const AFTER_ENVIO: RequestStatus[] = ["pedido_enviado", "aguardando_entrega", "aguardando_retirada", "recebido"];

function statesFor(status: RequestStatus): DotState[] {
  if (status === "reprovado") return ["done", "stopped", "pending", "pending", "pending"];
  if (status === "cancelado") return ["done", "stopped", "pending", "pending", "pending"];

  const flags = [true, AFTER_APPROVAL.includes(status), AFTER_COTACAO.includes(status), AFTER_ENVIO.includes(status), status === "recebido"];
  const firstNotDone = flags.findIndex((f) => !f);
  return flags.map((done, i) => (done ? "done" : i === firstNotDone ? "current" : "pending"));
}

const DOT_CLASSES: Record<DotState, string> = {
  done: "bg-emerald-500",
  current: "bg-blue-600 ring-2 ring-blue-100 dark:ring-blue-900/50",
  pending: "bg-neutral-200 dark:bg-neutral-700",
  stopped: "bg-red-500",
};

/** Versão compacta do Stepper pra caber numa linha de tabela — sem rótulo, com tooltip. */
export function MiniStepper({ status }: { status: RequestStatus }) {
  const states = statesFor(status);
  const activeIndex = states.includes("current") ? states.indexOf("current") : states.indexOf("stopped");
  const label = activeIndex >= 0 ? MILESTONES[activeIndex] : "Recebido";

  return (
    <div className="flex items-center gap-1" title={`Etapa atual: ${label}`}>
      {states.map((state, i) => (
        <span key={i} className={`h-1.5 w-4 rounded-full ${DOT_CLASSES[state]}`} aria-hidden="true" />
      ))}
    </div>
  );
}
