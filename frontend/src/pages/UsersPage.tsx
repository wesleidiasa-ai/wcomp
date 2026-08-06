import { useEffect, useState, type FormEvent } from "react";
import { api, ApiError } from "../lib/api";
import type { Department, Role, User } from "../types";
import { buttonPrimaryClass, cardClass, inputClass, labelClass } from "../components/ui";

const ROLES: { value: Role; label: string }[] = [
  { value: "admin", label: "Administrador" },
  { value: "comprador", label: "Comprador" },
  { value: "solicitante", label: "Solicitante" },
  { value: "aprovador", label: "Aprovador" },
];

const EMPTY_FORM = { name: "", email: "", phone: "", role: "solicitante" as Role, departmentId: "", password: "" };

export function UsersPage() {
  const [users, setUsers] = useState<User[] | null>(null);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);

  function load() {
    api.get<User[]>("/users").then(setUsers).catch(() => {});
    api.get<Department[]>("/departments").then(setDepartments).catch(() => {});
  }

  useEffect(load, []);

  function departmentName(id: string | null) {
    return departments.find((d) => d.id === id)?.name ?? "—";
  }

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await api.post("/users", {
        name: form.name,
        email: form.email,
        phone: form.phone || undefined,
        role: form.role,
        departmentId: form.departmentId || undefined,
        password: form.password,
      });
      setForm(EMPTY_FORM);
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não foi possível criar o usuário");
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Remover este usuário?")) return;
    try {
      await api.delete(`/users/${id}`);
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não foi possível remover o usuário");
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="text-xl font-semibold">Usuários</h1>

      <form onSubmit={handleCreate} className={`${cardClass} grid grid-cols-2 gap-4`}>
        <div>
          <label className={labelClass}>Nome</label>
          <input required className={inputClass} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </div>
        <div>
          <label className={labelClass}>E-mail</label>
          <input
            required
            type="email"
            className={inputClass}
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
        </div>
        <div>
          <label className={labelClass}>Telefone (WhatsApp)</label>
          <input className={inputClass} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        </div>
        <div>
          <label className={labelClass}>Papel</label>
          <select className={inputClass} value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as Role })}>
            {ROLES.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass}>Setor</label>
          <select
            className={inputClass}
            value={form.departmentId}
            onChange={(e) => setForm({ ...form, departmentId: e.target.value })}
          >
            <option value="">Sem setor</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass}>Senha inicial</label>
          <input
            required
            type="password"
            minLength={8}
            className={inputClass}
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
          />
          <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
            Enviamos essa senha por e-mail pro usuário; no primeiro acesso ele vai precisar trocá-la.
          </p>
        </div>
        <div className="col-span-2 flex justify-end">
          <button type="submit" className={buttonPrimaryClass}>
            Adicionar usuário
          </button>
        </div>
      </form>

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

      <div className={`${cardClass} overflow-x-auto p-0`}>
        <table className="w-full text-left text-sm">
          <thead className="border-b border-neutral-200 text-neutral-500 dark:border-neutral-800 dark:text-neutral-400">
            <tr>
              <th className="px-4 py-3 font-medium">Nome</th>
              <th className="px-4 py-3 font-medium">E-mail</th>
              <th className="px-4 py-3 font-medium">Papel</th>
              <th className="px-4 py-3 font-medium">Setor</th>
              <th className="px-4 py-3 font-medium" />
            </tr>
          </thead>
          <tbody>
            {!users ? (
              <tr>
                <td className="px-4 py-3 text-neutral-500" colSpan={5}>
                  Carregando...
                </td>
              </tr>
            ) : (
              users.map((u) => (
                <tr key={u.id} className="border-b border-neutral-100 last:border-0 dark:border-neutral-800">
                  <td className="px-4 py-3">{u.name}</td>
                  <td className="px-4 py-3">{u.email}</td>
                  <td className="px-4 py-3 capitalize">{u.role}</td>
                  <td className="px-4 py-3">{departmentName(u.departmentId)}</td>
                  <td className="px-4 py-3 text-right">
                    <button className="text-red-600 dark:text-red-400" onClick={() => handleDelete(u.id)}>
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
