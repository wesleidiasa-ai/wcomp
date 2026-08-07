import { useEffect, useState } from "react";
import { api, ApiError } from "../lib/api";
import type { Department, PriceHistoryDetail, PriceHistoryItem, PriceStatus, Supplier } from "../types";
import { cardClass, inputClass, labelClass } from "../components/ui";
import { Modal } from "../components/Modal";
import { PriceLineChart } from "../components/PriceLineChart";

function formatMoney(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR");
}

const STATUS_BADGE: Record<PriceStatus, { label: string; dot: string; text: string }> = {
  abaixo: { label: "Abaixo da média", dot: "bg-emerald-500", text: "text-emerald-700 dark:text-emerald-400" },
  medio: { label: "Dentro da média", dot: "bg-amber-500", text: "text-amber-700 dark:text-amber-400" },
  acima: { label: "Acima da média", dot: "bg-red-500", text: "text-red-700 dark:text-red-400" },
};

function StatusBadge({ status }: { status: PriceStatus | null }) {
  if (!status) return <span className="text-xs text-neutral-400 dark:text-neutral-600">—</span>;
  const s = STATUS_BADGE[status];
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${s.text}`}>
      <span className={`h-2 w-2 rounded-full ${s.dot}`} aria-hidden="true" />
      {s.label}
    </span>
  );
}

function SavingsTag({ pct }: { pct: number | null }) {
  if (pct === null || Math.abs(pct) < 0.5) return null;
  const isGood = pct > 0;
  return (
    <span className={`ml-1.5 text-xs font-medium ${isGood ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
      {isGood ? "↓" : "↑"} {Math.abs(pct).toFixed(0)}%
    </span>
  );
}

export function PriceHistoryPage() {
  const [items, setItems] = useState<PriceHistoryItem[] | null>(null);
  const [years, setYears] = useState<number[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [year, setYear] = useState("");
  const [supplierId, setSupplierId] = useState("");
  const [departmentId, setDepartmentId] = useState("");

  const [selectedItem, setSelectedItem] = useState<string | null>(null);
  const [detail, setDetail] = useState<PriceHistoryDetail | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);

  useEffect(() => {
    api.get<Supplier[]>("/suppliers").then(setSuppliers).catch(() => {});
    api.get<Department[]>("/departments").then(setDepartments).catch(() => {});
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    const params = new URLSearchParams();
    if (debouncedSearch) params.set("search", debouncedSearch);
    if (year) params.set("year", year);
    if (supplierId) params.set("supplierId", supplierId);
    if (departmentId) params.set("departmentId", departmentId);

    api
      .get<{ items: PriceHistoryItem[]; years: number[] }>(`/price-history?${params.toString()}`)
      .then((data) => {
        setItems(data.items);
        setYears(data.years);
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : "Erro ao carregar histórico de preços"));
  }, [debouncedSearch, year, supplierId, departmentId]);

  function openItem(itemName: string) {
    setSelectedItem(itemName);
    setDetail(null);
    setDetailError(null);
    api
      .get<PriceHistoryDetail>(`/price-history/${encodeURIComponent(itemName)}`)
      .then(setDetail)
      .catch((err) => setDetailError(err instanceof ApiError ? err.message : "Erro ao carregar detalhes do item"));
  }

  if (error) return <p className="text-sm text-red-600 dark:text-red-400">{error}</p>;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Histórico de preços</h1>
        <p className="text-sm text-neutral-500 dark:text-neutral-400">
          Preço, fornecedor e evolução por item, com base nos pedidos criados.
        </p>
      </div>

      <div className={`${cardClass} grid grid-cols-1 gap-3 sm:grid-cols-4`}>
        <div className="sm:col-span-2">
          <label className={labelClass}>Pesquisar item</label>
          <input
            className={inputClass}
            placeholder="🔎 Pesquisar item..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div>
          <label className={labelClass}>Ano</label>
          <select className={inputClass} value={year} onChange={(e) => setYear(e.target.value)}>
            <option value="">Todos</option>
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>
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
          <label className={labelClass}>Setor</label>
          <select className={inputClass} value={departmentId} onChange={(e) => setDepartmentId(e.target.value)}>
            <option value="">Todos</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {!items ? (
        <p className="text-sm text-neutral-500">Carregando...</p>
      ) : items.length === 0 ? (
        <div className={cardClass}>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            Nenhum item encontrado com esses filtros.
          </p>
        </div>
      ) : (
        <div className={`${cardClass} overflow-x-auto p-0`}>
          <table className="w-full text-left text-sm">
            <thead className="border-b border-neutral-200 text-neutral-500 dark:border-neutral-800 dark:text-neutral-400">
              <tr>
                <th className="px-4 py-3 font-medium">Item</th>
                <th className="px-4 py-3 font-medium">Último preço</th>
                <th className="px-4 py-3 font-medium">Preço médio</th>
                <th className="px-4 py-3 font-medium">Menor</th>
                <th className="px-4 py-3 font-medium">Maior</th>
                <th className="px-4 py-3 font-medium">Última compra</th>
                <th className="px-4 py-3 font-medium">Último fornecedor</th>
                <th className="px-4 py-3 font-medium">Situação</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr
                  key={item.itemName}
                  className="cursor-pointer border-b border-neutral-100 last:border-0 hover:bg-neutral-50 dark:border-neutral-800 dark:hover:bg-neutral-800/50"
                  onClick={() => openItem(item.itemName)}
                >
                  <td className="px-4 py-3 font-medium">{item.itemName}</td>
                  <td className="px-4 py-3">
                    {formatMoney(item.lastPrice)}
                    <SavingsTag pct={item.savingsPct} />
                  </td>
                  <td className="px-4 py-3">{formatMoney(item.avgPrice)}</td>
                  <td className="px-4 py-3">{formatMoney(item.minPrice)}</td>
                  <td className="px-4 py-3">{formatMoney(item.maxPrice)}</td>
                  <td className="px-4 py-3">{formatDate(item.lastPurchaseDate)}</td>
                  <td className="px-4 py-3">{item.lastSupplierName ?? "—"}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={item.priceStatus} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selectedItem && (
        <Modal onClose={() => setSelectedItem(null)}>
          <div className="mb-4 flex items-start justify-between">
            <h2 className="text-lg font-semibold">{selectedItem}</h2>
            <button
              onClick={() => setSelectedItem(null)}
              className="text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200"
              aria-label="Fechar"
            >
              ✕
            </button>
          </div>

          {detailError && <p className="text-sm text-red-600 dark:text-red-400">{detailError}</p>}

          {!detail && !detailError && <p className="text-sm text-neutral-500">Carregando...</p>}

          {detail && (
            <div className="space-y-6">
              <div>
                <h3 className="mb-3 text-sm font-semibold text-neutral-700 dark:text-neutral-300">
                  Evolução do preço médio
                </h3>
                <PriceLineChart data={detail.monthly} />
              </div>

              <div>
                <h3 className="mb-3 text-sm font-semibold text-neutral-700 dark:text-neutral-300">
                  Histórico de compras
                </h3>
                <div className="overflow-x-auto rounded-md border border-neutral-200 dark:border-neutral-800">
                  <table className="w-full text-left text-sm">
                    <thead className="border-b border-neutral-200 text-neutral-500 dark:border-neutral-800 dark:text-neutral-400">
                      <tr>
                        <th className="px-3 py-2 font-medium">Fornecedor</th>
                        <th className="px-3 py-2 font-medium">Data</th>
                        <th className="px-3 py-2 font-medium">Quantidade</th>
                        <th className="px-3 py-2 font-medium">Valor</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detail.events.map((e, i) => (
                        <tr key={i} className="border-b border-neutral-100 last:border-0 dark:border-neutral-800">
                          <td className="px-3 py-2">{e.supplierName ?? "—"}</td>
                          <td className="px-3 py-2">{formatDate(e.date)}</td>
                          <td className="px-3 py-2">
                            {e.quantity} {e.unit ?? ""}
                          </td>
                          <td className="px-3 py-2">{formatMoney(e.price)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </Modal>
      )}
    </div>
  );
}
