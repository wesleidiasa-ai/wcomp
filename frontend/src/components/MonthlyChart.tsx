import { useState } from "react";
import type { MonthlyStat } from "../types";

function formatMoney(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
}

/**
 * Gráfico de barras simples (sem lib externa) pro total de compras por mês.
 * Série única -> sem legenda (o título já identifica), com tooltip no hover.
 */
export function MonthlyChart({ data }: { data: MonthlyStat[] }) {
  const [hovered, setHovered] = useState<string | null>(null);
  const max = Math.max(1, ...data.map((d) => d.total));

  return (
    <div className="flex h-40 items-end gap-3 px-1">
      {data.map((d) => {
        const heightPct = d.total === 0 ? 0 : Math.max(4, (d.total / max) * 100);
        const isHovered = hovered === d.month;
        return (
          <div
            key={d.month}
            className="group relative flex flex-1 flex-col items-center gap-1.5"
            onMouseEnter={() => setHovered(d.month)}
            onMouseLeave={() => setHovered(null)}
          >
            {isHovered && (
              <div className="absolute -top-9 z-10 whitespace-nowrap rounded-md bg-neutral-900 px-2 py-1 text-xs font-medium text-white shadow-sm dark:bg-neutral-100 dark:text-neutral-900">
                {formatMoney(d.total)} · {d.count} pedido(s)
              </div>
            )}
            <div className="flex h-28 w-full items-end">
              <div
                className={`w-full rounded-t-md transition-colors ${
                  d.total > 0
                    ? "bg-blue-600 group-hover:bg-blue-700 dark:bg-blue-500 dark:group-hover:bg-blue-400"
                    : "bg-neutral-100 dark:bg-neutral-800"
                }`}
                style={{ height: `${heightPct}%` }}
              />
            </div>
            <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400">{d.label}</span>
          </div>
        );
      })}
    </div>
  );
}
