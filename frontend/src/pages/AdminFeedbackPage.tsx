import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AdminKeyGate } from "../components/AdminKeyGate";
import { api, ApiError } from "../lib/api";
import { cardClass } from "../components/ui";
import type { FeedbackEntry } from "../types";

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("pt-BR");
}

const TYPE_LABEL: Record<string, string> = {
  sugestao: "💡 Sugestão",
  problema: "🐞 Problema",
};

function FeedbackList({ adminKey, onUnauthorized }: { adminKey: string; onUnauthorized: () => void }) {
  const [items, setItems] = useState<FeedbackEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<FeedbackEntry[]>("/feedback", { "x-admin-key": adminKey })
      .then(setItems)
      .catch((err) => {
        if (err instanceof ApiError && err.status === 401) {
          onUnauthorized();
          return;
        }
        setError(err instanceof ApiError ? err.message : "Erro ao carregar o feedback");
      });
  }, [adminKey, onUnauthorized]);

  if (error) return <p className="text-sm text-red-600 dark:text-red-400">{error}</p>;
  if (!items) return <p className="text-sm text-neutral-500">Carregando...</p>;

  if (items.length === 0) {
    return (
      <div className={cardClass}>
        <p className="text-sm text-neutral-500 dark:text-neutral-400">Nenhum feedback recebido ainda.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <div key={item.id} className={cardClass}>
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="font-medium">{TYPE_LABEL[item.type] ?? item.type}</span>
            <span className="text-neutral-400 dark:text-neutral-500">{formatDate(item.createdAt)}</span>
          </div>
          <p className="whitespace-pre-wrap text-sm text-neutral-800 dark:text-neutral-200">{item.message}</p>
          <p className="mt-2 text-xs text-neutral-500 dark:text-neutral-400">
            {item.user.name} ({item.user.email}) · {item.company.name}
          </p>
        </div>
      ))}
    </div>
  );
}

export function AdminFeedbackPage() {
  return (
    <AdminKeyGate>
      {(adminKey, clearKey) => (
        <div className="mx-auto max-w-3xl space-y-4 px-6 py-10">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-semibold">Sugestões e problemas</h1>
            <div className="flex items-center gap-4 text-sm">
              <Link to="/admin/waitlist" className="font-medium text-blue-700 hover:underline dark:text-blue-400">
                Lista de espera →
              </Link>
              <Link to="/admin/empresas" className="font-medium text-blue-700 hover:underline dark:text-blue-400">
                Empresas →
              </Link>
              <button onClick={clearKey} className="text-neutral-500 hover:underline dark:text-neutral-400">
                Sair
              </button>
            </div>
          </div>
          <FeedbackList adminKey={adminKey} onUnauthorized={clearKey} />
        </div>
      )}
    </AdminKeyGate>
  );
}
