import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AdminKeyGate } from "../components/AdminKeyGate";
import { AdminNav } from "../components/AdminNav";
import { CountBarChart } from "../components/CountBarChart";
import { api, ApiError } from "../lib/api";
import { cardClass } from "../components/ui";
import type { AdminDashboardSummary, AdminSearchResult, AuditLogEntry } from "../types";

function formatMoney(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("pt-BR");
}

const AUDIT_LABEL: Record<string, string> = {
  empresa_criada: "Empresa criada",
  empresa_ativada: "Empresa ativada",
  empresa_desativada: "Empresa desativada",
  limite_usuarios_alterado: "Limite de usuários alterado",
};

function KpiTile({ label, value }: { label: string; value: string | number }) {
  return (
    <div className={cardClass}>
      <p className="text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">{label}</p>
      <p className="mt-1 text-2xl font-bold">{value}</p>
    </div>
  );
}

function HeroStat({ icon, label, value }: { icon: string; label: string; value: string | number }) {
  return (
    <div>
      <p className="text-2xl font-bold text-white">
        {icon} {value}
      </p>
      <p className="text-sm text-blue-100">{label}</p>
    </div>
  );
}

function SecondaryTile({ label, value, to }: { label: string; value: number; to: string }) {
  return (
    <Link to={to} className={`${cardClass} block transition-colors hover:border-blue-400 dark:hover:border-blue-600`}>
      <p className="text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">{label}</p>
      <p className="mt-1 text-xl font-bold">{value}</p>
    </Link>
  );
}

function InfraPill({ label, ok }: { label: string; ok: boolean }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className={`h-2 w-2 rounded-full ${ok ? "bg-emerald-500" : "bg-red-500"}`} aria-hidden="true" />
      <span className="font-medium">{label}</span>
      <span className={ok ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}>
        {ok ? "Operacional" : "Indisponível"}
      </span>
    </div>
  );
}

function GlobalSearch({ adminKey }: { adminKey: string }) {
  const [q, setQ] = useState("");
  const [result, setResult] = useState<AdminSearchResult | null>(null);

  useEffect(() => {
    if (q.trim().length < 2) {
      setResult(null);
      return;
    }
    const t = setTimeout(() => {
      api
        .get<AdminSearchResult>(`/admin/dashboard/search?q=${encodeURIComponent(q)}`, { "x-admin-key": adminKey })
        .then(setResult)
        .catch(() => {});
    }, 300);
    return () => clearTimeout(t);
  }, [q, adminKey]);

  const hasResults =
    result && (result.companies.length || result.users.length || result.purchaseRequests.length || result.suppliers.length);

  return (
    <div className={cardClass}>
      <h2 className="mb-3 text-sm font-semibold text-neutral-700 dark:text-neutral-300">Pesquisa global</h2>
      <input
        className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100"
        placeholder="🔎 Empresa, usuário, pedido ou fornecedor..."
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />
      {result && !hasResults && q.trim().length >= 2 && (
        <p className="mt-3 text-sm text-neutral-500 dark:text-neutral-400">Nada encontrado.</p>
      )}
      {result && hasResults && (
        <div className="mt-4 space-y-3 text-sm">
          {result.companies.length > 0 && (
            <div>
              <p className="mb-1 text-xs font-semibold uppercase text-neutral-400">Empresas</p>
              {result.companies.map((c) => (
                <p key={c.id}>{c.name}</p>
              ))}
            </div>
          )}
          {result.users.length > 0 && (
            <div>
              <p className="mb-1 text-xs font-semibold uppercase text-neutral-400">Usuários</p>
              {result.users.map((u) => (
                <p key={u.id}>
                  {u.name} <span className="text-neutral-400">· {u.email} · {u.company.name}</span>
                </p>
              ))}
            </div>
          )}
          {result.purchaseRequests.length > 0 && (
            <div>
              <p className="mb-1 text-xs font-semibold uppercase text-neutral-400">Pedidos</p>
              {result.purchaseRequests.map((p) => (
                <p key={p.id}>
                  {p.requestNumber ? `#${p.requestNumber} ` : ""}
                  {p.title} <span className="text-neutral-400">· {p.company.name}</span>
                </p>
              ))}
            </div>
          )}
          {result.suppliers.length > 0 && (
            <div>
              <p className="mb-1 text-xs font-semibold uppercase text-neutral-400">Fornecedores</p>
              {result.suppliers.map((s) => (
                <p key={s.id}>
                  {s.name} <span className="text-neutral-400">· {s.company.name}</span>
                </p>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function DashboardContent({ adminKey, onUnauthorized }: { adminKey: string; onUnauthorized: () => void }) {
  const [summary, setSummary] = useState<AdminDashboardSummary | null>(null);
  const [audit, setAudit] = useState<AuditLogEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      api.get<AdminDashboardSummary>("/admin/dashboard/summary", { "x-admin-key": adminKey }),
      api.get<AuditLogEntry[]>("/admin/dashboard/audit", { "x-admin-key": adminKey }),
    ])
      .then(([s, a]) => {
        setSummary(s);
        setAudit(a);
      })
      .catch((err) => {
        if (err instanceof ApiError && err.status === 401) {
          onUnauthorized();
          return;
        }
        setError(err instanceof ApiError ? err.message : "Erro ao carregar o painel");
      });
  }, [adminKey, onUnauthorized]);

  if (error) return <p className="text-sm text-red-600 dark:text-red-400">{error}</p>;
  if (!summary) return <p className="text-sm text-neutral-500">Carregando...</p>;

  const pendingCount = summary.secondary.accessRequestCount + summary.secondary.feedbackCount;

  return (
    <div className="space-y-6">
      {pendingCount > 0 && (
        <div className={`${cardClass} border-amber-300 bg-amber-50 dark:border-amber-900 dark:bg-amber-950`}>
          <p className="text-sm font-medium text-amber-900 dark:text-amber-200">
            Você tem {summary.secondary.accessRequestCount} solicitaç{summary.secondary.accessRequestCount === 1 ? "ão" : "ões"} de
            acesso e {summary.secondary.feedbackCount} feedback{summary.secondary.feedbackCount === 1 ? "" : "s"} registrado
            {summary.secondary.feedbackCount === 1 ? "" : "s"} pra revisar.
          </p>
        </div>
      )}

      <div className="rounded-lg bg-gradient-to-br from-blue-700 to-blue-900 p-6 shadow-sm dark:from-blue-800 dark:to-neutral-950">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-blue-200">SupplyOR em números</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
          <HeroStat icon="🏢" label="Empresas ativas" value={summary.kpis.activeCompanies} />
          <HeroStat icon="👥" label="Usuários" value={summary.kpis.users} />
          <HeroStat icon="📦" label="Pedidos processados" value={summary.kpis.purchaseRequests} />
          <HeroStat icon="💰" label="Em compras gerenciadas" value={formatMoney(summary.stats.totalMovimentado)} />
          <HeroStat icon="💵" label="Economia identificada" value={formatMoney(summary.stats.economiaGerada)} />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <KpiTile label="Empresas ativas" value={summary.kpis.activeCompanies} />
        <KpiTile label="Empresas em teste" value={summary.kpis.trialCompanies} />
        <KpiTile label="Empresas pagantes" value={summary.kpis.payingCompanies} />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <SecondaryTile label="Solicitações de acesso" value={summary.secondary.accessRequestCount} to="/admin/waitlist" />
        <SecondaryTile label="Feedbacks" value={summary.secondary.feedbackCount} to="/admin/feedback" />
      </div>

      <div className={cardClass}>
        <h2 className="mb-4 text-sm font-semibold text-neutral-700 dark:text-neutral-300">
          Crescimento — empresas cadastradas (últimos 6 meses)
        </h2>
        <CountBarChart data={summary.growth} unitLabel="empresa(s)" />
      </div>

      <div className={cardClass}>
        <h2 className="mb-3 text-sm font-semibold text-neutral-700 dark:text-neutral-300">
          Ranking de setores mais ativos
        </h2>
        {summary.sectorRanking.length === 0 ? (
          <p className="text-sm text-neutral-500 dark:text-neutral-400">Nenhum pedido com setor definido ainda.</p>
        ) : (
          <>
            <ol className="space-y-2 text-sm">
              {summary.sectorRanking.map((s, i) => (
                <li key={s.name} className="flex items-center justify-between">
                  <span>
                    <span className="mr-2 text-neutral-400">{i + 1}.</span>
                    {s.name}
                  </span>
                  <span className="font-medium">{s.count} pedido(s)</span>
                </li>
              ))}
            </ol>
            <p className="mt-3 text-xs text-neutral-400">
              Agrupado pelo nome do setor cadastrado em cada empresa — nomes iguais em empresas diferentes
              entram juntos; não é uma categoria padronizada entre clientes.
            </p>
          </>
        )}
      </div>

      <div className={`${cardClass} border-neutral-200 bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-900/50`}>
        <p className="text-sm text-neutral-500 dark:text-neutral-400">
          Receita, MRR e funil de conversão ainda não aparecem aqui porque o SupplyOR não tem cobrança nem
          rastreamento de visitantes implementados — isso está no{" "}
          <a
            href="https://github.com/wesleidiasa-ai/wcomp/blob/main/docs/funcionalidades-e-roadmap.md"
            target="_blank"
            rel="noreferrer"
            className="underline"
          >
            roadmap
          </a>
          .
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <KpiTile label="Pedidos hoje" value={summary.stats.pedidosHoje} />
        <KpiTile label="Pedidos no mês" value={summary.stats.pedidosMes} />
        <KpiTile
          label="Tempo médio de aprovação"
          value={summary.stats.tempoMedioAprovacaoDias === null ? "—" : `${summary.stats.tempoMedioAprovacaoDias.toFixed(1)}d`}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className={cardClass}>
          <h2 className="mb-3 text-sm font-semibold text-neutral-700 dark:text-neutral-300">Infraestrutura</h2>
          <div className="space-y-2">
            <InfraPill label="Banco de dados" ok={summary.infra.database} />
            <InfraPill label="API" ok={summary.infra.api} />
            <InfraPill label="E-mail (Resend)" ok={summary.infra.email} />
          </div>
          {!summary.infra.email && (
            <p className="mt-2 text-xs text-neutral-400">
              E-mail em modo stub (sem RESEND_API_KEY configurada) — ainda não envia de verdade.
            </p>
          )}
        </div>

        <div className={cardClass}>
          <h2 className="mb-3 text-sm font-semibold text-neutral-700 dark:text-neutral-300">Últimas ações (auditoria)</h2>
          {!audit || audit.length === 0 ? (
            <p className="text-sm text-neutral-500 dark:text-neutral-400">Nenhuma ação registrada ainda.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {audit.map((a) => (
                <li key={a.id} className="flex items-start justify-between gap-3">
                  <div>
                    <span className="font-medium">{AUDIT_LABEL[a.action] ?? a.action}</span>
                    <span className="text-neutral-400"> · {a.targetName}</span>
                    {a.detail && <span className="block text-xs text-neutral-400">{a.detail}</span>}
                  </div>
                  <span className="shrink-0 whitespace-nowrap text-xs text-neutral-400">{formatDateTime(a.createdAt)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <GlobalSearch adminKey={adminKey} />
    </div>
  );
}

export function AdminDashboardPage() {
  return (
    <AdminKeyGate>
      {(adminKey, clearKey) => (
        <div className="mx-auto max-w-5xl px-6 py-10">
          <h1 className="mb-1 text-xl font-semibold">Painel administrativo</h1>
          <p className="mb-4 text-sm text-neutral-500 dark:text-neutral-400">Visão geral da plataforma SupplyOR.</p>
          <AdminNav onLogout={clearKey} />
          <DashboardContent adminKey={adminKey} onUnauthorized={clearKey} />
        </div>
      )}
    </AdminKeyGate>
  );
}
