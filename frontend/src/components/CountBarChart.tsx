import { useState } from "react";

/**
 * Gráfico de barras simples (sem lib externa) pra contagem por mês.
 * Série única -> sem legenda, com tooltip no hover. Mesmo padrão do MonthlyChart.
 */
export function CountBarChart({ data, unitLabel }: { data: { month: string; label: string; count: number }[]; unitLabel: string }) {
  const [hovered, setHovered] = useState<string | null>(null);
  const max = Math.max(1, ...data.map((d) => d.count));

  return (
    <div className="flex h-40 items-end gap-3 px-1">
      {data.map((d) => {
        const heightPct = d.count === 0 ? 0 : Math.max(4, (d.count / max) * 100);
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
                {d.count} {unitLabel}
              </div>
            )}
            <div className="flex h-28 w-full items-end">
              <div
                className={`w-full rounded-t-md transition-colors ${
                  d.count > 0
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
