import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AdminKeyGate } from "../components/AdminKeyGate";
import { AdminNav } from "../components/AdminNav";
import { api, ApiError } from "../lib/api";
import { cardClass } from "../components/ui";
import type { AccessRequest } from "../types";

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("pt-BR");
}

function WaitlistTable({ adminKey, onUnauthorized }: { adminKey: string; onUnauthorized: () => void }) {
  const [requests, setRequests] = useState<AccessRequest[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<AccessRequest[]>("/access-requests", { "x-admin-key": adminKey })
      .then(setRequests)
      .catch((err) => {
        if (err instanceof ApiError && err.status === 401) {
          onUnauthorized();
          return;
        }
        setError(err instanceof ApiError ? err.message : "Erro ao carregar a lista de espera");
      });
  }, [adminKey, onUnauthorized]);

  if (error) return <p className="text-sm text-red-600 dark:text-red-400">{error}</p>;
  if (!requests) return <p className="text-sm text-neutral-500">Carregando...</p>;

  return (
    <div className={cardClass}>
      {requests.length === 0 ? (
        <p className="text-sm text-neutral-500 dark:text-neutral-400">Nenhum pedido de acesso ainda.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-neutral-200 text-neutral-500 dark:border-neutral-800 dark:text-neutral-400">
                <th className="pb-2 pr-4 font-medium">Empresa</th>
                <th className="pb-2 pr-4 font-medium">Contato</th>
                <th className="pb-2 pr-4 font-medium">Cargo</th>
                <th className="pb-2 pr-4 font-medium">Cidade</th>
                <th className="pb-2 pr-4 font-medium">E-mail</th>
                <th className="pb-2 pr-4 font-medium">Telefone</th>
                <th className="pb-2 pr-4 font-medium">Mensagem</th>
                <th className="pb-2 pr-4 font-medium">Recebido em</th>
                <th className="pb-2 font-medium" />
              </tr>
            </thead>
            <tbody>
              {requests.map((r) => (
                <tr key={r.id} className="border-b border-neutral-100 last:border-0 dark:border-neutral-900">
                  <td className="py-2 pr-4">{r.companyName}</td>
                  <td className="py-2 pr-4">{r.contactName}</td>
                  <td className="py-2 pr-4">{r.role ?? "—"}</td>
                  <td className="py-2 pr-4">{r.city ?? "—"}</td>
                  <td className="py-2 pr-4">{r.email}</td>
                  <td className="py-2 pr-4">{r.phone ?? "—"}</td>
                  <td className="py-2 pr-4 max-w-xs">{r.message ?? "—"}</td>
                  <td className="py-2 pr-4 whitespace-nowrap">{formatDate(r.createdAt)}</td>
                  <td className="py-2 whitespace-nowrap">
                    <Link
                      to={`/admin/criar-empresa?companyName=${encodeURIComponent(r.companyName)}&adminName=${encodeURIComponent(r.contactName)}&adminEmail=${encodeURIComponent(r.email)}&adminPhone=${encodeURIComponent(r.phone ?? "")}`}
                      className="font-medium text-blue-700 hover:underline dark:text-blue-400"
                    >
                      Liberar acesso
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export function AdminWaitlistPage() {
  return (
    <AdminKeyGate>
      {(adminKey, clearKey) => (
        <div className="mx-auto max-w-5xl px-6 py-10">
          <h1 className="mb-4 text-xl font-semibold">Lista de espera</h1>
          <AdminNav onLogout={clearKey} />
          <WaitlistTable adminKey={adminKey} onUnauthorized={clearKey} />
        </div>
      )}
    </AdminKeyGate>
  );
}
