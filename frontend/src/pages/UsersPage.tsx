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

const EMPTY_EDIT_FORM = { name: "", phone: "", role: "solicitante" as Role, departmentId: "" };

export function UsersPage() {
  const [users, setUsers] = useState<User[] | null>(null);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState(EMPTY_EDIT_FORM);
  const [editError, setEditError] = useState<string | null>(null);
  const [editLoading, setEditLoading] = useState(false);

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

  function startEdit(u: User) {
    setEditingId(u.id);
    setEditError(null);
    setEditForm({
      name: u.name,
      phone: u.phone ?? "",
      role: u.role,
      departmentId: u.departmentId ?? "",
    });
  }

  function cancelEdit() {
    setEditingId(null);
    setEditError(null);
  }

  async function handleSaveEdit(id: string) {
    setEditError(null);
    setEditLoading(true);
    try {
      await api.patch(`/users/${id}`, {
        name: editForm.name,
        phone: editForm.phone || undefined,
        role: editForm.role,
        departmentId: editForm.departmentId || null,
      });
      setEditingId(null);
      load();
    } catch (err) {
      setEditError(err instanceof ApiError ? err.message : "Não foi possível salvar as alterações");
    } finally {
      setEditLoading(false);
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
              users.map((u) =>
                editingId === u.id ? (
                  <tr key={u.id} className="border-b border-neutral-100 last:border-0 dark:border-neutral-800">
                    <td className="px-4 py-3">
                      <input
                        className={inputClass}
                        value={editForm.name}
                        onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                      />
                    </td>
                    <td className="px-4 py-3 text-neutral-500 dark:text-neutral-400">{u.email}</td>
                    <td className="px-4 py-3">
                      <select
                        className={inputClass}
                        value={editForm.role}
                        onChange={(e) => setEditForm({ ...editForm, role: e.target.value as Role })}
                      >
                        {ROLES.map((r) => (
                          <option key={r.value} value={r.value}>
                            {r.label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <select
                        className={inputClass}
                        value={editForm.departmentId}
                        onChange={(e) => setEditForm({ ...editForm, departmentId: e.target.value })}
                      >
                        <option value="">Sem setor</option>
                        {departments.map((d) => (
                          <option key={d.id} value={d.id}>
                            {d.name}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex flex-col items-end gap-1">
                        <div className="flex gap-3">
                          <button
                            className="font-medium text-blue-700 disabled:opacity-50 dark:text-blue-400"
                            disabled={editLoading}
                            onClick={() => handleSaveEdit(u.id)}
                          >
                            Salvar
                          </button>
                          <button className="text-neutral-500 dark:text-neutral-400" onClick={cancelEdit}>
                            Cancelar
                          </button>
                        </div>
                        {editError && <p className="text-xs text-red-600 dark:text-red-400">{editError}</p>}
                      </div>
                    </td>
                  </tr>
                ) : (
                  <tr key={u.id} className="border-b border-neutral-100 last:border-0 dark:border-neutral-800">
                    <td className="px-4 py-3">{u.name}</td>
                    <td className="px-4 py-3">{u.email}</td>
                    <td className="px-4 py-3 capitalize">{u.role}</td>
                    <td className="px-4 py-3">{departmentName(u.departmentId)}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-3">
                        <button
                          className="font-medium text-blue-700 dark:text-blue-400"
                          onClick={() => startEdit(u)}
                        >
                          Editar
                        </button>
                        <button className="text-red-600 dark:text-red-400" onClick={() => handleDelete(u.id)}>
                          Remover
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              )
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
