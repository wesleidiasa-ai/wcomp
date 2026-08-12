import { useEffect, useMemo, useState, type FocusEvent, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { api, ApiError } from "../lib/api";
import { formatCnpj, formatPhone } from "../lib/format";
import type { Supplier } from "../types";
import { buttonPrimaryClass, cardClass, inputClass, labelClass } from "../components/ui";

const EMPTY_FORM = {
  name: "",
  cnpj: "",
  phone: "",
  email: "",
  addressStreet: "",
  addressNumber: "",
  addressComplement: "",
  addressNeighborhood: "",
  addressCity: "",
  addressState: "",
  addressZipCode: "",
};

type CnpjLookupResult = {
  name: string;
  phone: string;
  email: string;
  addressStreet: string;
  addressNumber: string;
  addressComplement: string;
  addressNeighborhood: string;
  addressCity: string;
  addressState: string;
  addressZipCode: string;
};

export function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[] | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);
  const [cnpjLookupLoading, setCnpjLookupLoading] = useState(false);
  const [cnpjLookupError, setCnpjLookupError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [listOpen, setListOpen] = useState(false);

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

  async function handleCnpjLookup() {
    const digits = form.cnpj.replace(/\D/g, "");
    if (digits.length !== 14) {
      setCnpjLookupError("Informe um CNPJ completo (14 dígitos) para buscar");
      return;
    }
    setCnpjLookupError(null);
    setCnpjLookupLoading(true);
    try {
      const result = await api.get<CnpjLookupResult>(`/suppliers/cnpj/${digits}`);
      setForm((f) => ({
        ...f,
        name: result.name || f.name,
        phone: result.phone ? formatPhone(result.phone) : f.phone,
        email: result.email || f.email,
        addressStreet: result.addressStreet || f.addressStreet,
        addressNumber: result.addressNumber || f.addressNumber,
        addressComplement: result.addressComplement || f.addressComplement,
        addressNeighborhood: result.addressNeighborhood || f.addressNeighborhood,
        addressCity: result.addressCity || f.addressCity,
        addressState: result.addressState || f.addressState,
        addressZipCode: result.addressZipCode || f.addressZipCode,
      }));
    } catch (err) {
      setCnpjLookupError(err instanceof ApiError ? err.message : "Não foi possível consultar o CNPJ");
    } finally {
      setCnpjLookupLoading(false);
    }
  }

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await api.post("/suppliers", {
        name: form.name,
        cnpj: form.cnpj || undefined,
        phone: form.phone || undefined,
        email: form.email || undefined,
        addressStreet: form.addressStreet || undefined,
        addressNumber: form.addressNumber || undefined,
        addressComplement: form.addressComplement || undefined,
        addressNeighborhood: form.addressNeighborhood || undefined,
        addressCity: form.addressCity || undefined,
        addressState: form.addressState || undefined,
        addressZipCode: form.addressZipCode || undefined,
      });
      setForm(EMPTY_FORM);
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não foi possível criar o fornecedor");
    }
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

      <form onSubmit={handleCreate} className={`${cardClass} grid grid-cols-2 gap-4`}>
        <div>
          <label className={labelClass}>Nome</label>
          <input required className={inputClass} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </div>
        <div>
          <label className={labelClass}>CNPJ</label>
          <div className="flex gap-2">
            <input
              className={inputClass}
              placeholder="00.000.000/0001-00"
              value={form.cnpj}
              onChange={(e) => {
                setForm({ ...form, cnpj: formatCnpj(e.target.value) });
                setCnpjLookupError(null);
              }}
            />
            <button
              type="button"
              onClick={handleCnpjLookup}
              disabled={cnpjLookupLoading}
              title="Buscar dados na Receita Federal"
              className="shrink-0 rounded-md border border-neutral-300 px-3 text-sm font-medium text-neutral-600 hover:bg-neutral-100 disabled:opacity-50 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
            >
              {cnpjLookupLoading ? "Buscando..." : "🔎 Buscar"}
            </button>
          </div>
          {cnpjLookupError && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{cnpjLookupError}</p>}
        </div>
        <div>
          <label className={labelClass}>Telefone</label>
          <input
            className={inputClass}
            placeholder="(00) 00000-0000"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: formatPhone(e.target.value) })}
          />
        </div>
        <div>
          <label className={labelClass}>E-mail</label>
          <input type="email" className={inputClass} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </div>

        <div className="col-span-2 border-t border-neutral-200 pt-4 dark:border-neutral-800">
          <h2 className="mb-3 text-sm font-semibold text-neutral-700 dark:text-neutral-300">Endereço</h2>
          <div className="grid grid-cols-4 gap-4">
            <div className="col-span-3">
              <label className={labelClass}>Rua / logradouro</label>
              <input
                className={inputClass}
                value={form.addressStreet}
                onChange={(e) => setForm({ ...form, addressStreet: e.target.value })}
              />
            </div>
            <div>
              <label className={labelClass}>Número</label>
              <input
                className={inputClass}
                value={form.addressNumber}
                onChange={(e) => setForm({ ...form, addressNumber: e.target.value })}
              />
            </div>
            <div className="col-span-2">
              <label className={labelClass}>Complemento</label>
              <input
                className={inputClass}
                value={form.addressComplement}
                onChange={(e) => setForm({ ...form, addressComplement: e.target.value })}
              />
            </div>
            <div className="col-span-2">
              <label className={labelClass}>Bairro</label>
              <input
                className={inputClass}
                value={form.addressNeighborhood}
                onChange={(e) => setForm({ ...form, addressNeighborhood: e.target.value })}
              />
            </div>
            <div className="col-span-2">
              <label className={labelClass}>Cidade</label>
              <input
                className={inputClass}
                value={form.addressCity}
                onChange={(e) => setForm({ ...form, addressCity: e.target.value })}
              />
            </div>
            <div>
              <label className={labelClass}>UF</label>
              <input
                maxLength={2}
                className={inputClass}
                value={form.addressState}
                onChange={(e) => setForm({ ...form, addressState: e.target.value.toUpperCase() })}
              />
            </div>
            <div>
              <label className={labelClass}>CEP</label>
              <input
                className={inputClass}
                value={form.addressZipCode}
                onChange={(e) => setForm({ ...form, addressZipCode: e.target.value })}
              />
            </div>
          </div>
        </div>

        <div className="col-span-2 flex justify-end">
          <button type="submit" className={buttonPrimaryClass}>
            Adicionar fornecedor
          </button>
        </div>
      </form>

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
