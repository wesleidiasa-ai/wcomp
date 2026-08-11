import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { api, ApiError } from "../lib/api";
import { useAuth } from "../lib/auth";
import type { Department, PurchaseRequestStats, PurchaseRequestSummary, RequestStatus, Supplier, Urgency, User } from "../types";
import { StatusBadge } from "../components/StatusBadge";
import { PriorityBadge } from "../components/PriorityBadge";
import { MiniStepper } from "../components/MiniStepper";
import { categoryIcon } from "../lib/categoryIcon";
import { formatRelativeDate } from "../lib/relativeDate";
import { getRequestAlert } from "../lib/requestAlerts";
import { downloadCsv } from "../lib/exportCsv";
import { cardClass, inputClass, labelClass } from "../components/ui";

const STATUS_OPTIONS: { value: RequestStatus | ""; label: string }[] = [
  { value: "", label: "Todos os status" },
  { value: "aguardando_aprovacao", label: "Aguardando aprovação" },
  { value: "aprovado", label: "Aprovado" },
  { value: "reprovado", label: "Reprovado" },
  { value: "em_cotacao", label: "Em cotação" },
  { value: "pedido_enviado", label: "Pedido enviado" },
  { value: "aguardando_entrega", label: "Aguardando entrega" },
  { value: "aguardando_retirada", label: "Aguardando retirada" },
  { value: "recebido", label: "Recebido" },
  { value: "cancelado", label: "Cancelado" },
];

const URGENCY_OPTIONS: { value: Urgency | ""; label: string }[] = [
  { value: "", label: "Todas as urgências" },
  { value: "urgente", label: "🔴 Urgente" },
  { value: "alta", label: "🟠 Alta" },
  { value: "normal", label: "🟡 Normal" },
  { value: "baixa", label: "🟢 Baixa" },
];

function formatMoney(value: string | number | null) {
  if (value === null) return "—";
  return Number(value).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("pt-BR");
}

function StatTile({ label, value }: { label: string; value: string | number }) {
  return (
    <div className={cardClass}>
      <p className="text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">{label}</p>
      <p className="mt-1 text-xl font-bold">{value}</p>
    </div>
  );
}

const HIGH_VALUE_THRESHOLD = 10000;

function ValueCell({ value }: { value: string | null }) {
  if (value === null) return <span className="text-neutral-400">—</span>;
  const n = Number(value);
  const isHigh = n >= HIGH_VALUE_THRESHOLD;
  return (
    <span className={isHigh ? "font-bold text-emerald-800 dark:text-emerald-400" : "font-medium"}>
      {isHigh && <span aria-hidden="true">💰 </span>}
      {formatMoney(n)}
    </span>
  );
}

export function RequestsListPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const [requests, setRequests] = useState<PurchaseRequestSummary[] | null>(null);
  const [stats, setStats] = useState<PurchaseRequestStats | null>(null);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState(searchParams.get("q") ?? "");
  const [debouncedSearch, setDebouncedSearch] = useState(search);
  const [status, setStatus] = useState<RequestStatus | "">((searchParams.get("status") as RequestStatus | null) ?? "");
  const [departmentId, setDepartmentId] = useState(searchParams.get("departmentId") ?? "");
  const [requesterId, setRequesterId] = useState(searchParams.get("requesterId") ?? "");
  const [supplierId, setSupplierId] = useState(searchParams.get("supplierId") ?? "");
  const [urgency, setUrgency] = useState<Urgency | "">((searchParams.get("urgency") as Urgency | null) ?? "");
  const [dateFrom, setDateFrom] = useState(searchParams.get("dateFrom") ?? "");
  const [dateTo, setDateTo] = useState(searchParams.get("dateTo") ?? "");
  const [minValue, setMinValue] = useState(searchParams.get("minValue") ?? "");
  const [maxValue, setMaxValue] = useState(searchParams.get("maxValue") ?? "");
  const [mine, setMine] = useState(searchParams.get("mine") === "true");

  const showMineControls = user?.role !== "solicitante";

  // re-sincroniza os filtros com a URL quando ela muda por fora (ex: link do menu
  // lateral pra uma etapa diferente, enquanto já se está em /pedidos) — sem isso,
  // o estado local só lia a URL na primeira montagem e ignorava navegações depois
  useEffect(() => {
    setSearch(searchParams.get("q") ?? "");
    setStatus((searchParams.get("status") as RequestStatus | null) ?? "");
    setDepartmentId(searchParams.get("departmentId") ?? "");
    setRequesterId(searchParams.get("requesterId") ?? "");
    setSupplierId(searchParams.get("supplierId") ?? "");
    setUrgency((searchParams.get("urgency") as Urgency | null) ?? "");
    setDateFrom(searchParams.get("dateFrom") ?? "");
    setDateTo(searchParams.get("dateTo") ?? "");
    setMinValue(searchParams.get("minValue") ?? "");
    setMaxValue(searchParams.get("maxValue") ?? "");
    setMine(searchParams.get("mine") === "true");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  useEffect(() => {
    api.get<Department[]>("/departments").then(setDepartments).catch(() => {});
    api.get<Supplier[]>("/suppliers").then(setSuppliers).catch(() => {});
    if (showMineControls) api.get<User[]>("/users").then(setUsers).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    const params = new URLSearchParams();
    if (debouncedSearch) params.set("q", debouncedSearch);
    if (status) params.set("status", status);
    if (departmentId) params.set("departmentId", departmentId);
    if (requesterId) params.set("requesterId", requesterId);
    if (supplierId) params.set("supplierId", supplierId);
    if (urgency) params.set("urgency", urgency);
    if (dateFrom) params.set("dateFrom", dateFrom);
    if (dateTo) params.set("dateTo", dateTo);
    if (minValue) params.set("minValue", minValue);
    if (maxValue) params.set("maxValue", maxValue);
    if (mine) params.set("mine", "true");
    setSearchParams(params, { replace: true });

    setError(null);
    api
      .get<PurchaseRequestSummary[]>(`/purchase-requests?${params.toString()}`)
      .then(setRequests)
      .catch((err) => setError(err instanceof ApiError ? err.message : "Erro ao carregar pedidos"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, status, departmentId, requesterId, supplierId, urgency, dateFrom, dateTo, minValue, maxValue, mine]);

  useEffect(() => {
    api.get<PurchaseRequestStats>("/purchase-requests/stats").then(setStats).catch(() => {});
  }, []);

  function handleExportCsv() {
    if (!requests) return;
    downloadCsv(
      `pedidos-${new Date().toISOString().slice(0, 10)}.csv`,
      ["Número", "Título", "Solicitante", "Setor", "Urgência", "Total estimado", "Status", "Fornecedor", "Criado em"],
      requests.map((r) => [
        r.requestNumber ?? "",
        r.title,
        r.requester.name,
        r.department?.name ?? "",
        r.urgency,
        r.estimatedTotal ?? "",
        r.status,
        r.quotes[0]?.supplierName ?? "",
        formatDate(r.createdAt),
      ])
    );
  }

  function handleDuplicate(e: React.MouseEvent, id: string) {
    e.stopPropagation();
    navigate(`/pedidos/novo?duplicateFrom=${id}`);
  }

  return (
    <div>
      <div className="mb-5 flex items-center justify-between">
        <h1 className="text-xl font-semibold">Pedidos de compra</h1>
        <button onClick={handleExportCsv} disabled={!requests?.length} className={`${inputClass} w-auto disabled:opacity-40`}>
          ⬇ Exportar CSV
        </button>
      </div>

      {stats && (
        <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <StatTile label="Pedidos abertos" value={stats.abertos} />
          <StatTile label="Aguardando aprovação" value={stats.aguardandoAprovacao} />
          <StatTile label="Em cotação" value={stats.emCotacao} />
          <StatTile label="Urgentes" value={stats.urgentes} />
          <StatTile label="Recebidos hoje" value={stats.recebidosHoje} />
          <StatTile label="Valor total aberto" value={formatMoney(stats.valorTotalAberto)} />
        </div>
      )}

      <div className={`${cardClass} mb-5 space-y-3`}>
        <div>
          <label className={labelClass}>Pesquisar</label>
          <input
            className={inputClass}
            placeholder="🔎 Número, item, solicitante, fornecedor, observação..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          <div>
            <label className={labelClass}>Status</label>
            <select className={inputClass} value={status} onChange={(e) => setStatus(e.target.value as RequestStatus | "")}>
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>Setor</label>
            <select className={inputClass} value={departmentId} onChange={(e) => setDepartmentId(e.target.value)}>
              <option value="">Todos os setores</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>
          {showMineControls && (
            <div>
              <label className={labelClass}>Solicitante</label>
              <select className={inputClass} value={requesterId} onChange={(e) => setRequesterId(e.target.value)}>
                <option value="">Todos</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div>
            <label className={labelClass}>Fornecedor</label>
            <select className={inputClass} value={supplierId} onChange={(e) => setSupplierId(e.target.value)}>
              <option value="">Todos</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>Urgência</label>
            <select className={inputClass} value={urgency} onChange={(e) => setUrgency(e.target.value as Urgency | "")}>
              {URGENCY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>Período (de)</label>
            <input type="date" className={inputClass} value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
          </div>
          <div>
            <label className={labelClass}>Período (até)</label>
            <input type="date" className={inputClass} value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
          </div>
          <div className="flex gap-2">
            <div className="flex-1">
              <label className={labelClass}>Valor mín.</label>
              <input type="number" min="0" className={inputClass} value={minValue} onChange={(e) => setMinValue(e.target.value)} />
            </div>
            <div className="flex-1">
              <label className={labelClass}>Valor máx.</label>
              <input type="number" min="0" className={inputClass} value={maxValue} onChange={(e) => setMaxValue(e.target.value)} />
            </div>
          </div>
        </div>
        {showMineControls && (
          <label className="flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-300">
            <input type="checkbox" checked={mine} onChange={(e) => setMine(e.target.checked)} />
            ⭐ Mostrar apenas meus pedidos
          </label>
        )}
      </div>

      {error && <p className="mb-4 text-sm text-red-600 dark:text-red-400">{error}</p>}

      {!requests ? (
        <p className="text-sm text-neutral-500">Carregando...</p>
      ) : requests.length === 0 ? (
        <div className={cardClass}>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">Nenhum pedido encontrado com esses filtros.</p>
        </div>
      ) : (
        <div className={`${cardClass} overflow-x-auto p-0`}>
          <table className="w-full text-left text-sm">
            <thead className="border-b border-neutral-200 text-neutral-500 dark:border-neutral-800 dark:text-neutral-400">
              <tr>
                <th className="px-4 py-3 font-medium">Título</th>
                <th className="px-4 py-3 font-medium">Solicitante</th>
                <th className="px-4 py-3 font-medium">Setor</th>
                <th className="px-4 py-3 font-medium">Prioridade</th>
                <th className="px-4 py-3 font-medium">Progresso</th>
                <th className="px-4 py-3 font-medium">Fornecedor</th>
                <th className="px-4 py-3 font-medium">Total estimado</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Criado</th>
                <th className="px-4 py-3 font-medium">Alerta</th>
                <th className="px-4 py-3 font-medium" />
              </tr>
            </thead>
            <tbody>
              {requests.map((r) => {
                const alert = getRequestAlert(r);
                return (
                  <tr
                    key={r.id}
                    onClick={() => navigate(`/pedidos/${r.id}`)}
                    className="cursor-pointer border-b border-neutral-100 last:border-0 hover:bg-neutral-50 dark:border-neutral-800 dark:hover:bg-neutral-800/50"
                  >
                    <td className="px-4 py-3 font-medium">
                      <span className="mr-1.5" aria-hidden="true" title={r.department?.name ?? "Sem setor"}>
                        {categoryIcon(r.department?.name)}
                      </span>
                      {r.requestNumber && <span className="text-neutral-400 dark:text-neutral-500">#{r.requestNumber} · </span>}
                      {r.title}
                    </td>
                    <td className="px-4 py-3">{r.requester.name}</td>
                    <td className="px-4 py-3">{r.department?.name ?? "—"}</td>
                    <td className="px-4 py-3">
                      <PriorityBadge urgency={r.urgency} />
                    </td>
                    <td className="px-4 py-3">
                      <MiniStepper status={r.status} />
                    </td>
                    <td className="px-4 py-3">{r.quotes[0]?.supplierName ?? "—"}</td>
                    <td className="px-4 py-3">
                      <ValueCell value={r.estimatedTotal} />
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={r.status} />
                    </td>
                    <td className="px-4 py-3 text-neutral-500 dark:text-neutral-400" title={formatDate(r.createdAt)}>
                      {formatRelativeDate(r.createdAt)}
                    </td>
                    <td className="px-4 py-3">
                      {alert && (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 dark:text-amber-400">
                          ⚠️ {alert.text}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={(e) => handleDuplicate(e, r.id)}
                        title="Duplicar pedido"
                        className="text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200"
                      >
                        📄
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
