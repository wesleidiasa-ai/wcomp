import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { api, ApiError } from "../lib/api";
import { formatCnpj, formatPhone } from "../lib/format";
import type { Supplier } from "../types";
import { buttonPrimaryClass, cardClass, inputClass, labelClass } from "../components/ui";

const EMPTY_FORM = { name: "", cnpj: "", phone: "", email: "", rating: "" };

export function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[] | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);

  function load() {
    api.get<Supplier[]>("/suppliers").then(setSuppliers).catch(() => {});
  }

  useEffect(load, []);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await api.post("/suppliers", {
        name: form.name,
        cnpj: form.cnpj || undefined,
        phone: form.phone || undefined,
        email: form.email || undefined,
        rating: form.rating ? Number(form.rating) : undefined,
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
          <input
            className={inputClass}
            placeholder="00.000.000/0001-00"
            value={form.cnpj}
            onChange={(e) => setForm({ ...form, cnpj: formatCnpj(e.target.value) })}
          />
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
        <div>
          <label className={labelClass}>Avaliação (1 a 5)</label>
          <select className={inputClass} value={form.rating} onChange={(e) => setForm({ ...form, rating: e.target.value })}>
            <option value="">—</option>
            {[1, 2, 3, 4, 5].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </div>
        <div className="col-span-2 flex justify-end">
          <button type="submit" className={buttonPrimaryClass}>
            Adicionar fornecedor
          </button>
        </div>
      </form>

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

      <div className={`${cardClass} overflow-x-auto p-0`}>
        <table className="w-full text-left text-sm">
          <thead className="border-b border-neutral-200 text-neutral-500 dark:border-neutral-800 dark:text-neutral-400">
            <tr>
              <th className="px-4 py-3 font-medium">Nome</th>
              <th className="px-4 py-3 font-medium">Contato</th>
              <th className="px-4 py-3 font-medium">Avaliação</th>
              <th className="px-4 py-3 font-medium" />
            </tr>
          </thead>
          <tbody>
            {!suppliers ? (
              <tr>
                <td className="px-4 py-3 text-neutral-500" colSpan={4}>
                  Carregando...
                </td>
              </tr>
            ) : suppliers.length === 0 ? (
              <tr>
                <td className="px-4 py-3 text-neutral-500 dark:text-neutral-400" colSpan={4}>
                  Nenhum fornecedor cadastrado ainda — eles também são criados automaticamente ao registrar
                  cotações.
                </td>
              </tr>
            ) : (
              suppliers.map((s) => (
                <tr key={s.id} className="border-b border-neutral-100 last:border-0 dark:border-neutral-800">
                  <td className="px-4 py-3">
                    <Link to={`/fornecedores/${s.id}`} className="font-medium hover:underline">
                      {s.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-neutral-500 dark:text-neutral-400">
                    {[s.phone, s.email].filter(Boolean).join(" · ") || "—"}
                  </td>
                  <td className="px-4 py-3">{s.rating ? "★".repeat(s.rating) : "—"}</td>
                  <td className="px-4 py-3 text-right">
                    <button className="text-red-600 dark:text-red-400" onClick={() => handleDelete(s.id)}>
                      Remover
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
