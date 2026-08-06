import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AdminKeyGate } from "../components/AdminKeyGate";
import { api, ApiError } from "../lib/api";
import { cardClass, inputClass } from "../components/ui";
import type { AdminCompany } from "../types";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR");
}

function CompanyRow({
  company,
  adminKey,
  onUnauthorized,
  onUpdated,
}: {
  company: AdminCompany;
  adminKey: string;
  onUnauthorized: () => void;
  onUpdated: (company: AdminCompany) => void;
}) {
  const [maxUsers, setMaxUsers] = useState(company.maxUsers === null ? "" : String(company.maxUsers));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function patch(body: { active?: boolean; maxUsers?: number | null }) {
    setBusy(true);
    setError(null);
    try {
      const updated = await api.patch<AdminCompany>(`/admin/companies/${company.id}`, body, {
        "x-admin-key": adminKey,
      });
      onUpdated({ ...company, ...updated });
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        onUnauthorized();
        return;
      }
      setError(err instanceof ApiError ? err.message : "Não foi possível salvar");
    } finally {
      setBusy(false);
    }
  }

  return (
    <tr className="border-b border-neutral-100 last:border-0 dark:border-neutral-900">
      <td className="py-2 pr-4">
        <div className="font-medium">{company.name}</div>
        <div className="text-xs text-neutral-400">{company.email ?? "—"}</div>
      </td>
      <td className="py-2 pr-4">
        {company.userCount}
        {company.maxUsers !== null && ` / ${company.maxUsers}`}
      </td>
      <td className="py-2 pr-4">
        <input
          type="number"
          min={1}
          placeholder="sem limite"
          className={`${inputClass} w-28`}
          value={maxUsers}
          disabled={busy}
          onChange={(e) => setMaxUsers(e.target.value)}
          onBlur={() => patch({ maxUsers: maxUsers === "" ? null : Number(maxUsers) })}
        />
      </td>
      <td className="py-2 pr-4 whitespace-nowrap">{formatDate(company.createdAt)}</td>
      <td className="py-2 text-right">
        <button
          disabled={busy}
          onClick={() => patch({ active: !company.active })}
          className={
            company.active
              ? "text-red-600 dark:text-red-400"
              : "font-medium text-emerald-600 dark:text-emerald-400"
          }
        >
          {company.active ? "Desativar" : "Ativar"}
        </button>
        {error && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{error}</p>}
      </td>
    </tr>
  );
}

function CompaniesTable({ adminKey, onUnauthorized }: { adminKey: string; onUnauthorized: () => void }) {
  const [companies, setCompanies] = useState<AdminCompany[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<AdminCompany[]>("/admin/companies", { "x-admin-key": adminKey })
      .then(setCompanies)
      .catch((err) => {
        if (err instanceof ApiError && err.status === 401) {
          onUnauthorized();
          return;
        }
        setError(err instanceof ApiError ? err.message : "Erro ao carregar empresas");
      });
  }, [adminKey, onUnauthorized]);

  function updateCompany(updated: AdminCompany) {
    setCompanies((prev) => prev?.map((c) => (c.id === updated.id ? updated : c)) ?? prev);
  }

  if (error) return <p className="text-sm text-red-600 dark:text-red-400">{error}</p>;
  if (!companies) return <p className="text-sm text-neutral-500">Carregando...</p>;

  return (
    <div className={cardClass}>
      {companies.length === 0 ? (
        <p className="text-sm text-neutral-500 dark:text-neutral-400">Nenhuma empresa cadastrada ainda.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-neutral-200 text-neutral-500 dark:border-neutral-800 dark:text-neutral-400">
                <th className="pb-2 pr-4 font-medium">Empresa</th>
                <th className="pb-2 pr-4 font-medium">Usuários</th>
                <th className="pb-2 pr-4 font-medium">Limite</th>
                <th className="pb-2 pr-4 font-medium">Criada em</th>
                <th className="pb-2 font-medium" />
              </tr>
            </thead>
            <tbody>
              {companies.map((c) => (
                <CompanyRow
                  key={c.id}
                  company={c}
                  adminKey={adminKey}
                  onUnauthorized={onUnauthorized}
                  onUpdated={updateCompany}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export function AdminCompaniesPage() {
  return (
    <AdminKeyGate>
      {(adminKey, clearKey) => (
        <div className="mx-auto max-w-4xl space-y-4 px-6 py-10">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-semibold">Empresas cadastradas</h1>
            <div className="flex items-center gap-4 text-sm">
              <Link to="/admin/waitlist" className="font-medium text-blue-700 hover:underline dark:text-blue-400">
                Lista de espera →
              </Link>
              <button onClick={clearKey} className="text-neutral-500 hover:underline dark:text-neutral-400">
                Sair
              </button>
            </div>
          </div>
          <CompaniesTable adminKey={adminKey} onUnauthorized={clearKey} />
        </div>
      )}
    </AdminKeyGate>
  );
}
