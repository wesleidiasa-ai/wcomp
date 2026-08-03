import { useEffect, useState, type FormEvent } from "react";
import { api, ApiError } from "../lib/api";
import type { Department } from "../types";
import { buttonPrimaryClass, buttonSecondaryClass, cardClass, inputClass, labelClass } from "../components/ui";

export function DepartmentsPage() {
  const [departments, setDepartments] = useState<Department[] | null>(null);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");

  function load() {
    api.get<Department[]>("/departments").then(setDepartments).catch(() => {});
  }

  useEffect(load, []);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await api.post("/departments", { name });
      setName("");
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não foi possível criar o setor");
    }
  }

  async function handleRename(id: string) {
    try {
      await api.patch(`/departments/${id}`, { name: editingName });
      setEditingId(null);
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não foi possível renomear o setor");
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Remover este setor?")) return;
    try {
      await api.delete(`/departments/${id}`);
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não foi possível remover o setor");
    }
  }

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <h1 className="text-xl font-semibold">Setores</h1>

      <form onSubmit={handleCreate} className={`${cardClass} flex items-end gap-3`}>
        <div className="flex-1">
          <label className={labelClass}>Novo setor</label>
          <input required className={inputClass} value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <button type="submit" className={buttonPrimaryClass}>
          Adicionar
        </button>
      </form>

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

      <div className={`${cardClass} divide-y divide-neutral-100 p-0 dark:divide-neutral-800`}>
        {!departments ? (
          <p className="p-4 text-sm text-neutral-500">Carregando...</p>
        ) : departments.length === 0 ? (
          <p className="p-4 text-sm text-neutral-500 dark:text-neutral-400">Nenhum setor cadastrado.</p>
        ) : (
          departments.map((d) => (
            <div key={d.id} className="flex items-center justify-between gap-3 px-4 py-3">
              {editingId === d.id ? (
                <input
                  className={inputClass}
                  value={editingName}
                  onChange={(e) => setEditingName(e.target.value)}
                  autoFocus
                />
              ) : (
                <span className="text-sm">{d.name}</span>
              )}
              <div className="flex gap-2">
                {editingId === d.id ? (
                  <>
                    <button className={buttonPrimaryClass} onClick={() => handleRename(d.id)}>
                      Salvar
                    </button>
                    <button className={buttonSecondaryClass} onClick={() => setEditingId(null)}>
                      Cancelar
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      className={buttonSecondaryClass}
                      onClick={() => {
                        setEditingId(d.id);
                        setEditingName(d.name);
                      }}
                    >
                      Renomear
                    </button>
                    <button className="text-sm text-red-600 dark:text-red-400" onClick={() => handleDelete(d.id)}>
                      Remover
                    </button>
                  </>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
