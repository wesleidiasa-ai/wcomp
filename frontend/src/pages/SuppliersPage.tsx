import { useEffect, useMemo, useState, type FocusEvent } from "react";
import { Link } from "react-router-dom";
import { api, ApiError } from "../lib/api";
import type { Supplier } from "../types";
import { SupplierForm } from "../components/SupplierForm";
import { cardClass, inputClass, labelClass } from "../components/ui";

export function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [listOpen, setListOpen] = useState(false);
  const [formKey, setFormKey] = useState(0);

  function load() {
    api.get<Supplier[]>("/suppliers").then(setSuppliers).catch(() => {});
  }

  useEffect(load, []);

  const filteredSuppliers = useMemo(() => {
    if (!suppliers) return null;
    const q = search.trim().toLowerCase();
    if (!q) return suppliers;
    const digits = search.replace(/\D/g, "");
    return suppliers.filter((s) => {
      if (s.name.toLowerCase().includes(q)) return true;
      if (s.email?.toLowerCase().includes(q)) return true;
      if (digits && s.cnpj?.replace(/\D/g, "").includes(digits)) return true;
      if (digits && s.phone?.replace(/\D/g, "").includes(digits)) return true;
      return false;
    });
  }, [suppliers, search]);

  function closeListIfFocusLeft(e: FocusEvent<HTMLDivElement>) {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) setListOpen(false);
  }

  async function handleDelete(id: string) {
    if (!confirm("Remover este fornecedor do catálogo?")) return;
    try {
      await api.delete(`/suppliers/${id}`);
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não foi possível remover o fornecedor");
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="text-xl font-semibold">Fornecedores</h1>

      <SupplierForm
        key={formKey}
        submitLabel="Adicionar fornecedor"
        onSubmit={async (payload) => {
          await api.post("/suppliers", payload);
          setFormKey((k) => k + 1);
          load();
        }}
      />

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

      <div>
        <label className={labelClass}>Fornecedores cadastrados</label>
        <div className="relative" onBlur={closeListIfFocusLeft}>
          <input
            className={inputClass}
            placeholder="🔎 Buscar por nome, CNPJ, telefone ou e-mail..."
            value={search}
            onFocus={() => setListOpen(true)}
            onChange={(e) => {
              setSearch(e.target.value);
              setListOpen(true);
            }}
            onKeyDown={(e) => {
              if (e.key === "Escape") e.currentTarget.blur();
            }}
          />
          {listOpen && (
            <div
              className={`${cardClass} absolute z-20 mt-1 max-h-80 w-full overflow-y-auto p-0 shadow-lg`}
            >
              {!filteredSuppliers ? (
                <p className="px-4 py-3 text-sm text-neutral-500">Carregando...</p>
              ) : filteredSuppliers.length === 0 ? (
                <p className="px-4 py-3 text-sm text-neutral-500 dark:text-neutral-400">
                  {search
                    ? "Nenhum fornecedor encontrado para essa busca."
                    : "Nenhum fornecedor cadastrado ainda — eles também são criados automaticamente ao registrar cotações."}
                </p>
              ) : (
                filteredSuppliers.map((s) => (
                  <div
                    key={s.id}
                    className="flex items-center justify-between gap-3 border-b border-neutral-100 px-4 py-2 last:border-0 hover:bg-neutral-50 dark:border-neutral-800 dark:hover:bg-neutral-800/50"
                  >
                    <Link to={`/fornecedores/${s.id}`} className="min-w-0 flex-1">
                      <div className="truncate font-medium">{s.name}</div>
                      <div className="truncate text-xs text-neutral-500 dark:text-neutral-400">
                        {[s.cnpj, s.phone, s.email].filter(Boolean).join(" · ") || "—"}
                      </div>
                    </Link>
                    <button
                      type="button"
                      className="shrink-0 text-xs text-red-600 dark:text-red-400"
                      onClick={() => handleDelete(s.id)}
                    >
                      Remover
                    </button>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
        <p className="mt-1 text-xs text-neutral-400 dark:text-neutral-500">
          {suppliers ? `${suppliers.length} fornecedor(es) cadastrado(s)` : "Carregando..."} — clique no campo para ver a lista
        </p>
      </div>
    </div>
  );
}
