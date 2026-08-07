import type { Urgency } from "../types";

const PRIORITY: Record<Urgency, { icon: string; label: string; className: string }> = {
  urgente: { icon: "🔴", label: "Urgente", className: "text-red-700 dark:text-red-400" },
  alta: { icon: "🟠", label: "Alta", className: "text-orange-700 dark:text-orange-400" },
  normal: { icon: "🟡", label: "Normal", className: "text-amber-700 dark:text-amber-400" },
  baixa: { icon: "🟢", label: "Baixa", className: "text-emerald-700 dark:text-emerald-400" },
};

export function PriorityBadge({ urgency }: { urgency: Urgency }) {
  const p = PRIORITY[urgency];
  return (
    <span className={`inline-flex items-center gap-1 text-sm font-medium ${p.className}`}>
      <span aria-hidden="true">{p.icon}</span>
      {p.label}
    </span>
  );
}
