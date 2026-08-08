import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, ApiError } from "../lib/api";
import { useAuth } from "../lib/auth";
import type { DashboardIndicators, DashboardSummary, Insight, MonthlyStat } from "../types";
import { cardClass } from "../components/ui";
import { MonthlyChart } from "../components/MonthlyChart";

function formatMoney(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatDays(value: number | null) {
  if (value === null) return "—";
  return `${value.toFixed(1)} dia(s)`;
}

export function DashboardPage() {
  const { user } = useAuth();
  const canSeeCompanyIndicators = user?.role === "admin" || user?.role === "comprador";

  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [indicators, setIndicators] = useState<DashboardIndicators | null>(null);
  const [monthly, setMonthly] = useState<MonthlyStat[] | null>(null);
  const [insights, setInsights] = useState<Insight[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const requests: Promise<void>[] = [
      api.get<DashboardSummary>("/dashboard/summary").then(setSummary),
      api.get<MonthlyStat[]>("/dashboard/monthly").then(setMonthly),
    ];
    if (canSeeCompanyIndicators) {
      requests.push(api.get<DashboardIndicators>("/dashboard/indicators").then(setIndicators));
      requests.push(api.get<Insight[]>("/dashboard/insights").then(setInsights));
    }
    Promise.all(requests).catch((err) => setError(err instanceof ApiError ? err.message : "Erro ao carregar o dashboard"));
  }, [canSeeCompanyIndicators]);

  if (error) return <p className="text-sm text-red-600 dark:text-red-400">{error}</p>;
  if (!summary || !monthly) return <p className="text-sm text-neutral-500">Carregando...</p>;

  const isSolicitante = user?.role === "solicitante";

  const KPI_CARDS: { key: keyof DashboardSummary; label: string; format: (v: number) => string; accent: string }[] = [
    {
      key: "pedidosEsteMes",
      label: isSolicitante ? "Meus pedidos este mês" : "Pedidos este mês",
      format: (v) => String(v),
      accent: "text-blue-700 dark:text-blue-400",
    },
    {
      key: "aguardandoAprovacao",
      label: isSolicitante ? "Meus pedidos aguardando aprovação" : "Aguardando aprovação",
      format: (v) => String(v),
      accent: "text-amber-600 dark:text-amber-400",
    },
    {
      key: "emCotacao",
      label: isSolicitante ? "Meus pedidos em cotação" : "Em cotação",
      format: (v) => String(v),
      accent: "text-cyan-600 dark:text-cyan-400",
    },
    {
      key: "pedidosAtrasados",
      label: isSolicitante ? "Meus pedidos atrasados" : "Pedidos atrasados",
      format: (v) => String(v),
      accent: "text-red-600 dark:text-red-400",
    },
    {
      key: "economiaObtida",
      label: "Economia obtida",
      format: formatMoney,
      accent: "text-emerald-600 dark:text-emerald-400",
    },
  ];

  const maxSetorGasto = Math.max(1, ...(indicators?.gastoPorSetor.map((d) => d.total) ?? []));
  const maxFornecedorTotal = Math.max(1, ...(indicators?.topFornecedores.map((d) => d.total) ?? []));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Dashboard</h1>
        <Link to="/pedidos" className="text-sm font-medium text-blue-700 hover:underline dark:text-blue-400">
          Ver todos os pedidos →
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
        {KPI_CARDS.slice(0, 3).map((card) => (
          <div key={card.key} className={cardClass}>
            <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400">{card.label}</p>
            <p className={`mt-1 text-2xl font-bold ${card.accent}`}>{card.format(summary[card.key])}</p>
          </div>
        ))}

        <div className={cardClass}>
          <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400">
            {isSolicitante ? "Minhas compras recebidas" : "Compras realizadas"} ({summary.comprasRealizadasCount})
          </p>
          <p className="mt-1 text-2xl font-bold text-neutral-900 dark:text-neutral-100">
            {formatMoney(summary.comprasRealizadas)}
          </p>
        </div>

        {KPI_CARDS.slice(3).map((card) => (
          <div key={card.key} className={cardClass}>
            <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400">{card.label}</p>
            <p className={`mt-1 text-2xl font-bold ${card.accent}`}>{card.format(summary[card.key])}</p>
          </div>
        ))}
      </div>

      {insights && insights.length > 0 && (
        <div className={cardClass}>
          <h2 className="mb-3 text-sm font-semibold text-neutral-700 dark:text-neutral-300">Insights</h2>
          <ul className="space-y-2">
            {insights.map((insight, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-neutral-700 dark:text-neutral-300">
                <span className="text-base leading-none">{insight.icon}</span>
                {insight.text}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className={cardClass}>
        <h2 className="mb-4 text-sm font-semibold text-neutral-700 dark:text-neutral-300">
          {isSolicitante ? "Minhas compras por mês (últimos 6 meses)" : "Compras por mês (últimos 6 meses)"}
        </h2>
        <MonthlyChart data={monthly} />
      </div>

      {indicators && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className={cardClass}>
            <h2 className="mb-3 text-sm font-semibold text-neutral-700 dark:text-neutral-300">Gasto por setor</h2>
            {indicators.gastoPorSetor.length === 0 ? (
              <p className="text-sm text-neutral-500 dark:text-neutral-400">Sem pedidos recebidos ainda.</p>
            ) : (
              <ul className="space-y-2">
                {indicators.gastoPorSetor.map((d) => (
                  <li key={d.name}>
                    <div className="mb-1 flex justify-between text-sm">
                      <span>{d.name}</span>
                      <span className="font-medium">{formatMoney(d.total)}</span>
                    </div>
                    <div className="h-2 rounded-full bg-neutral-100 dark:bg-neutral-800">
                      <div
                        className="h-2 rounded-full bg-blue-600"
                        style={{ width: `${(d.total / maxSetorGasto) * 100}%` }}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className={cardClass}>
            <h2 className="mb-3 text-sm font-semibold text-neutral-700 dark:text-neutral-300">Top fornecedores</h2>
            {indicators.topFornecedores.length === 0 ? (
              <p className="text-sm text-neutral-500 dark:text-neutral-400">Nenhuma cotação vencedora ainda.</p>
            ) : (
              <ul className="space-y-2">
                {indicators.topFornecedores.map((f) => (
                  <li key={f.name}>
                    <div className="mb-1 flex justify-between text-sm">
                      <span>
                        {f.name} <span className="text-neutral-400">· {f.count}x</span>
                      </span>
                      <span className="font-medium">{formatMoney(f.total)}</span>
                    </div>
                    <div className="h-2 rounded-full bg-neutral-100 dark:bg-neutral-800">
                      <div
                        className="h-2 rounded-full bg-orange-500"
                        style={{ width: `${(f.total / maxFornecedorTotal) * 100}%` }}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className={cardClass}>
            <h2 className="mb-3 text-sm font-semibold text-neutral-700 dark:text-neutral-300">Quem mais solicita</h2>
            {indicators.topSolicitantes.length === 0 ? (
              <p className="text-sm text-neutral-500 dark:text-neutral-400">Nenhum pedido ainda.</p>
            ) : (
              <ul className="space-y-1 text-sm">
                {indicators.topSolicitantes.map((s) => (
                  <li key={s.name} className="flex justify-between">
                    <span>{s.name}</span>
                    <span className="font-medium">{s.count} pedido(s)</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className={cardClass}>
            <h2 className="mb-3 text-sm font-semibold text-neutral-700 dark:text-neutral-300">Tempos e economia</h2>
            <dl className="grid grid-cols-3 gap-3 text-center">
              <div>
                <dt className="text-xs text-neutral-500 dark:text-neutral-400">Tempo médio de aprovação</dt>
                <dd className="mt-1 text-lg font-semibold">{formatDays(indicators.tempoMedioAprovacaoDias)}</dd>
              </div>
              <div>
                <dt className="text-xs text-neutral-500 dark:text-neutral-400">Tempo médio de compra</dt>
                <dd className="mt-1 text-lg font-semibold">{formatDays(indicators.tempoMedioCompraDias)}</dd>
              </div>
              <div>
                <dt className="text-xs text-neutral-500 dark:text-neutral-400">Economia em negociações</dt>
                <dd className="mt-1 text-lg font-semibold text-emerald-600 dark:text-emerald-400">
                  {formatMoney(indicators.economiaEmNegociacoes)}
                </dd>
              </div>
            </dl>
          </div>
        </div>
      )}
    </div>
  );
}
