import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, ApiError } from "../lib/api";
import { useAuth } from "../lib/auth";
import type { AttentionItem, DashboardIndicators, DashboardSummary, Insight, MonthlyRange, MonthlyStat } from "../types";
import { cardClass, inputClass } from "../components/ui";
import { MonthlyChart } from "../components/MonthlyChart";
import { STATUS_DOT_COLORS, STATUS_LABELS } from "../components/StatusBadge";

function formatMoney(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatDays(value: number | null) {
  if (value === null) return "—";
  return `${value.toFixed(1)} dia(s)`;
}

function deltaPct(current: number, previous: number): number | null {
  if (previous === 0) return null;
  return ((current - previous) / previous) * 100;
}

function DeltaLabel({ pct, suffix = "vs mês anterior" }: { pct: number | null; suffix?: string }) {
  if (pct === null) return null;
  const rounded = Math.round(pct);
  if (rounded === 0) return <span className="text-xs text-neutral-400">= {suffix}</span>;
  const up = rounded > 0;
  return (
    <span className={`text-xs font-medium ${up ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
      {up ? "↑" : "↓"} {Math.abs(rounded)}% {suffix}
    </span>
  );
}

const RANGE_OPTIONS: { value: MonthlyRange; label: string }[] = [
  { value: "6m", label: "Últimos 6 meses" },
  { value: "12m", label: "Últimos 12 meses" },
  { value: "ytd", label: "Este ano" },
  { value: "last_year", label: "Ano anterior" },
];

const MONTH_NAMES = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];

export function DashboardPage() {
  const { user } = useAuth();
  const canSeeCompanyIndicators = user?.role === "admin" || user?.role === "comprador";
  const isSolicitante = user?.role === "solicitante";

  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [indicators, setIndicators] = useState<DashboardIndicators | null>(null);
  const [monthly, setMonthly] = useState<MonthlyStat[] | null>(null);
  const [monthlyRange, setMonthlyRange] = useState<MonthlyRange>("6m");
  const [insights, setInsights] = useState<Insight[] | null>(null);
  const [attention, setAttention] = useState<AttentionItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const requests: Promise<void>[] = [
      api.get<DashboardSummary>("/dashboard/summary").then(setSummary),
      api.get<AttentionItem[]>("/dashboard/attention").then(setAttention),
    ];
    if (canSeeCompanyIndicators) {
      requests.push(api.get<DashboardIndicators>("/dashboard/indicators").then(setIndicators));
      requests.push(api.get<Insight[]>("/dashboard/insights").then(setInsights));
    }
    Promise.all(requests).catch((err) => setError(err instanceof ApiError ? err.message : "Erro ao carregar o dashboard"));
  }, [canSeeCompanyIndicators]);

  useEffect(() => {
    api
      .get<MonthlyStat[]>(`/dashboard/monthly?range=${monthlyRange}`)
      .then(setMonthly)
      .catch((err) => setError(err instanceof ApiError ? err.message : "Erro ao carregar o gráfico"));
  }, [monthlyRange]);

  if (error) return <p className="text-sm text-red-600 dark:text-red-400">{error}</p>;
  if (!summary || !monthly) return <p className="text-sm text-neutral-500">Carregando...</p>;

  const maxSetorGasto = Math.max(1, ...(indicators?.gastoPorSetor.map((d) => d.total) ?? []));
  const now = new Date();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Dashboard</h1>
        <Link to="/pedidos" className="text-sm font-medium text-blue-700 hover:underline dark:text-blue-400">
          Ver todos os pedidos →
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
        <div className={cardClass}>
          <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400">
            📋 {isSolicitante ? "Meus pedidos no mês" : "Pedidos no mês"}
          </p>
          <p className="mt-1 text-2xl font-bold text-blue-700 dark:text-blue-400">{summary.pedidosEsteMes}</p>
          <DeltaLabel pct={deltaPct(summary.pedidosEsteMes, summary.previousMonth.pedidos)} />
        </div>
        <div className={cardClass}>
          <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400">
            ⏳ {isSolicitante ? "Aguardando aprovação" : "Aguardando aprovação"}
          </p>
          <p className="mt-1 text-2xl font-bold text-amber-600 dark:text-amber-400">{summary.aguardandoAprovacao}</p>
        </div>
        <div className={cardClass}>
          <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400">💬 Em cotação</p>
          <p className="mt-1 text-2xl font-bold text-cyan-600 dark:text-cyan-400">{summary.emCotacao}</p>
        </div>
        <div className={cardClass}>
          <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400">⚠️ Pedidos atrasados</p>
          <p className={`mt-1 text-2xl font-bold ${summary.pedidosAtrasados > 0 ? "text-red-600 dark:text-red-400" : "text-neutral-900 dark:text-neutral-100"}`}>
            {summary.pedidosAtrasados}
          </p>
        </div>
        <div className={cardClass}>
          <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400">
            💰 {isSolicitante ? "Minhas compras" : "Compras realizadas"}
          </p>
          <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400">{summary.comprasRealizadasCount} pedido(s)</p>
          <p className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">{formatMoney(summary.comprasRealizadas)}</p>
          <DeltaLabel pct={deltaPct(summary.comprasRealizadas, summary.previousMonth.compras)} />
        </div>
        <div className={cardClass}>
          <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400">📈 Economia obtida</p>
          <p className="mt-1 text-2xl font-bold text-emerald-600 dark:text-emerald-400">{formatMoney(summary.economiaObtida)}</p>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            {summary.economiaObtidaPercent === null ? "" : `${summary.economiaObtidaPercent.toFixed(1)}% sobre o estimado`}
          </p>
          <DeltaLabel pct={deltaPct(summary.economiaObtida, summary.previousMonth.economia)} />
        </div>
      </div>

      <div className={`${cardClass} border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/40`}>
        <h2 className="mb-1 text-sm font-semibold text-emerald-900 dark:text-emerald-200">
          📊 Resumo de {MONTH_NAMES[now.getMonth()]}
        </h2>
        <p className="text-sm text-emerald-900 dark:text-emerald-200">
          {summary.pedidosEsteMes} pedido(s) criado(s), {formatMoney(summary.comprasRealizadas)} em compras e{" "}
          {formatMoney(summary.economiaObtida)} economizados
          {summary.economiaObtidaPercent !== null && ` (${summary.economiaObtidaPercent.toFixed(1)}% de economia média)`}.
        </p>
        <p className="mt-1 text-xs text-emerald-700 dark:text-emerald-400">
          Economia gerada através de negociações e comparação de cotações — esse é o ROI direto do SupplyOR.
        </p>
      </div>

      {attention && attention.length > 0 && (
        <div className={`${cardClass} border-amber-200 dark:border-amber-900`}>
          <h2 className="mb-3 text-sm font-semibold text-neutral-700 dark:text-neutral-300">⚠️ Pedidos que precisam de atenção</h2>
          <ul className="space-y-2">
            {attention.map((item) => (
              <li key={item.id}>
                <Link to={`/pedidos/${item.id}`} className="flex items-start gap-2 text-sm hover:underline">
                  <span aria-hidden="true">{item.severity === "alta" ? "🔴" : "🟠"}</span>
                  <span>
                    {item.requestNumber ? `Pedido #${item.requestNumber}` : item.title} — {item.reason}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          <Link to="/pedidos" className="mt-3 inline-block text-sm font-medium text-blue-700 hover:underline dark:text-blue-400">
            Ver todos →
          </Link>
        </div>
      )}

      {insights && insights.length > 0 && (
        <div className={cardClass}>
          <h2 className="mb-3 text-sm font-semibold text-neutral-700 dark:text-neutral-300">Insights</h2>
          <ul className="space-y-2">
            {insights.map((insight, i) => {
              const content = (
                <>
                  <span className="text-base leading-none">{insight.icon}</span>
                  {insight.text}
                </>
              );
              return (
                <li key={i} className="flex items-start gap-2 text-sm text-neutral-700 dark:text-neutral-300">
                  {insight.link ? (
                    <Link to={insight.link} className="flex items-start gap-2 hover:underline">
                      {content}
                    </Link>
                  ) : (
                    content
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className={cardClass}>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-neutral-700 dark:text-neutral-300">
              {isSolicitante ? "Minhas compras por mês" : "Compras por mês"}
            </h2>
            <select
              className={`${inputClass} w-auto py-1 text-xs`}
              value={monthlyRange}
              onChange={(e) => setMonthlyRange(e.target.value as MonthlyRange)}
            >
              {RANGE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <MonthlyChart data={monthly} />
        </div>

        {indicators && (
          <div className={cardClass}>
            <h2 className="mb-3 text-sm font-semibold text-neutral-700 dark:text-neutral-300">Status dos pedidos</h2>
            {indicators.statusBreakdown.length === 0 ? (
              <p className="text-sm text-neutral-500 dark:text-neutral-400">Nenhum pedido ainda.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {[...indicators.statusBreakdown]
                  .sort((a, b) => b.count - a.count)
                  .map((s) => (
                    <li key={s.status} className="flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <span className={`h-2.5 w-2.5 rounded-full ${STATUS_DOT_COLORS[s.status]}`} aria-hidden="true" />
                        {STATUS_LABELS[s.status]}
                      </span>
                      <span className="font-medium">{s.count}</span>
                    </li>
                  ))}
              </ul>
            )}
          </div>
        )}
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
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="text-xs text-neutral-500 dark:text-neutral-400">
                    <tr>
                      <th className="pb-2 pr-2 font-medium">Fornecedor</th>
                      <th className="pb-2 pr-2 font-medium">Compras</th>
                      <th className="pb-2 pr-2 font-medium">Total</th>
                      <th className="pb-2 font-medium">Economia</th>
                    </tr>
                  </thead>
                  <tbody>
                    {indicators.topFornecedores.map((f) => (
                      <tr key={f.name} className="border-t border-neutral-100 dark:border-neutral-800">
                        <td className="py-1.5 pr-2">
                          {f.supplierId ? (
                            <Link to={`/fornecedores/${f.supplierId}`} className="hover:underline">
                              {f.name}
                            </Link>
                          ) : (
                            f.name
                          )}
                        </td>
                        <td className="py-1.5 pr-2">{f.count}</td>
                        <td className="py-1.5 pr-2 font-medium">{formatMoney(f.total)}</td>
                        <td className="py-1.5 text-emerald-600 dark:text-emerald-400">
                          {f.economia > 0 ? formatMoney(f.economia) : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
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
