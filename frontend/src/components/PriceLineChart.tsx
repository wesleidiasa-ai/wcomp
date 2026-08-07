import { useState } from "react";

const MONTH_ABBR = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

function monthLabel(month: string) {
  const [year, m] = month.split("-");
  return `${MONTH_ABBR[Number(m) - 1]}/${year.slice(2)}`;
}

function formatMoney(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

const WIDTH = 600;
const HEIGHT = 160;
const PAD_X = 12;
const PAD_Y = 16;

/**
 * Gráfico de linha simples (sem lib externa) pra evolução de preço médio por mês.
 * Série única -> sem legenda, com tooltip no hover.
 */
export function PriceLineChart({ data }: { data: { month: string; avgPrice: number }[] }) {
  const [hovered, setHovered] = useState<number | null>(null);

  if (data.length === 0) return null;

  const values = data.map((d) => d.avgPrice);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  const points = data.map((d, i) => {
    const x = data.length === 1 ? WIDTH / 2 : PAD_X + (i / (data.length - 1)) * (WIDTH - PAD_X * 2);
    const y = HEIGHT - PAD_Y - ((d.avgPrice - min) / range) * (HEIGHT - PAD_Y * 2);
    return { x, y, month: d.month, avgPrice: d.avgPrice };
  });

  const path = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");

  const labelStep = Math.max(1, Math.ceil(points.length / 6));

  return (
    <div className="relative select-none">
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} preserveAspectRatio="none" className="w-full" style={{ height: 160 }}>
        <path
          d={path}
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-blue-600 dark:text-blue-400"
        />
        {points.map((p, i) => (
          <circle
            key={p.month}
            cx={p.x}
            cy={p.y}
            r={hovered === i ? 6 : 4}
            className="cursor-pointer fill-blue-600 dark:fill-blue-400"
            onMouseEnter={() => setHovered(i)}
            onMouseLeave={() => setHovered(null)}
          />
        ))}
      </svg>
      <div className="mt-1 flex justify-between text-xs text-neutral-500 dark:text-neutral-400">
        {points
          .filter((_, i) => i % labelStep === 0 || i === points.length - 1)
          .map((p) => (
            <span key={p.month}>{monthLabel(p.month)}</span>
          ))}
      </div>
      {hovered !== null && (
        <div
          className="pointer-events-none absolute -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-md bg-neutral-900 px-2 py-1 text-xs font-medium text-white shadow-sm dark:bg-neutral-100 dark:text-neutral-900"
          style={{ left: `${(points[hovered].x / WIDTH) * 100}%`, top: `${(points[hovered].y / HEIGHT) * 100}%` }}
        >
          {monthLabel(points[hovered].month)}: {formatMoney(points[hovered].avgPrice)}
        </div>
      )}
    </div>
  );
}
