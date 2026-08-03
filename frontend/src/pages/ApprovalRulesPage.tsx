import { useEffect, useState, type FormEvent } from "react";
import { api, ApiError } from "../lib/api";
import type { ApprovalRule, Department, User } from "../types";
import { buttonPrimaryClass, cardClass, inputClass, labelClass } from "../components/ui";

const EMPTY_FORM = { departmentId: "", minValue: "0", maxValue: "", stepOrder: "1", approverId: "" };

export function ApprovalRulesPage() {
  const [rules, setRules] = useState<ApprovalRule[] | null>(null);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);

  function load() {
    api.get<ApprovalRule[]>("/approval-rules").then(setRules).catch(() => {});
    api.get<Department[]>("/departments").then(setDepartments).catch(() => {});
    api.get<User[]>("/users").then(setUsers).catch(() => {});
  }

  useEffect(load, []);

  function departmentName(id: string | null) {
    return id ? departments.find((d) => d.id === id)?.name ?? "—" : "Empresa toda";
  }

  function formatMoney(value: string | null) {
    if (value === null) return "sem limite";
    return Number(value).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  }

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await api.post("/approval-rules", {
        departmentId: form.departmentId || null,
        minValue: Number(form.minValue) || 0,
        maxValue: form.maxValue ? Number(form.maxValue) : null,
        stepOrder: Number(form.stepOrder),
        approverId: form.approverId,
      });
      setForm(EMPTY_FORM);
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não foi possível criar a regra");
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Remover esta regra de aprovação?")) return;
    try {
      await api.delete(`/approval-rules/${id}`);
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não foi possível remover a regra");
    }
  }

  const approverOptions = users.filter((u) => u.role === "aprovador" || u.role === "admin");

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Regras de aprovação</h1>
        <p className="text-sm text-neutral-500 dark:text-neutral-400">
          Regras de um setor específico têm prioridade sobre regras "empresa toda". Pedidos sem regra aplicável
          são aprovados automaticamente.
        </p>
      </div>

      <form onSubmit={handleCreate} className={`${cardClass} grid grid-cols-2 gap-4`}>
        <div>
          <label className={labelClass}>Setor (vazio = empresa toda)</label>
          <select
            className={inputClass}
            value={form.departmentId}
            onChange={(e) => setForm({ ...form, departmentId: e.target.value })}
          >
            <option value="">Empresa toda</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass}>Aprovador</label>
          <select
            required
            className={inputClass}
            value={form.approverId}
            onChange={(e) => setForm({ ...form, approverId: e.target.value })}
          >
            <option value="" disabled>
              Selecione...
            </option>
            {approverOptions.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass}>Valor mínimo</label>
          <input
            type="number"
            min="0"
            step="any"
            className={inputClass}
            value={form.minValue}
            onChange={(e) => setForm({ ...form, minValue: e.target.value })}
          />
        </div>
        <div>
          <label className={labelClass}>Valor máximo (vazio = sem limite)</label>
          <input
            type="number"
            min="0"
            step="any"
            className={inputClass}
            value={form.maxValue}
            onChange={(e) => setForm({ ...form, maxValue: e.target.value })}
          />
        </div>
        <div>
          <label className={labelClass}>Ordem da etapa</label>
          <input
            required
            type="number"
            min="1"
            className={inputClass}
            value={form.stepOrder}
            onChange={(e) => setForm({ ...form, stepOrder: e.target.value })}
          />
        </div>
        <div className="col-span-2 flex justify-end">
          <button type="submit" className={buttonPrimaryClass}>
            Adicionar regra
          </button>
        </div>
      </form>

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

      <div className={`${cardClass} overflow-x-auto p-0`}>
        <table className="w-full text-left text-sm">
          <thead className="border-b border-neutral-200 text-neutral-500 dark:border-neutral-800 dark:text-neutral-400">
            <tr>
              <th className="px-4 py-3 font-medium">Setor</th>
              <th className="px-4 py-3 font-medium">Faixa de valor</th>
              <th className="px-4 py-3 font-medium">Etapa</th>
              <th className="px-4 py-3 font-medium">Aprovador</th>
              <th className="px-4 py-3 font-medium" />
            </tr>
          </thead>
          <tbody>
            {!rules ? (
              <tr>
                <td className="px-4 py-3 text-neutral-500" colSpan={5}>
                  Carregando...
                </td>
              </tr>
            ) : rules.length === 0 ? (
              <tr>
                <td className="px-4 py-3 text-neutral-500 dark:text-neutral-400" colSpan={5}>
                  Nenhuma regra cadastrada — todos os pedidos serão aprovados automaticamente.
                </td>
              </tr>
            ) : (
              rules.map((r) => (
                <tr key={r.id} className="border-b border-neutral-100 last:border-0 dark:border-neutral-800">
                  <td className="px-4 py-3">{departmentName(r.departmentId)}</td>
                  <td className="px-4 py-3">
                    {formatMoney(r.minValue)} até {formatMoney(r.maxValue)}
                  </td>
                  <td className="px-4 py-3">{r.stepOrder}</td>
                  <td className="px-4 py-3">{r.approver.name}</td>
                  <td className="px-4 py-3 text-right">
                    <button className="text-red-600 dark:text-red-400" onClick={() => handleDelete(r.id)}>
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
