import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";
import { daysUntil, deadlineLabel } from "../lib/date";
import type { PendingNotifications } from "../types";

export function NotificationCenter() {
  const { user } = useAuth();
  const [pending, setPending] = useState<PendingNotifications | null>(null);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api
      .get<PendingNotifications>("/notifications/pending")
      .then(setPending)
      .catch(() => {});
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (!pending || !user) return null;

  const items: { key: string; to: string; label: string }[] = [];

  if (pending.pendingApprovals > 0) {
    items.push({
      key: "approvals",
      to: "/pedidos?status=aguardando_aprovacao",
      label: `${pending.pendingApprovals} etapa(s) de aprovação pendente(s) pra você`,
    });
  }
  if (pending.pendingQuotes > 0) {
    items.push({
      key: "quotes",
      to: "/pedidos?status=em_cotacao",
      label: `${pending.pendingQuotes} pedido(s) aguardando cotação`,
    });
  }
  if (pending.atrasados > 0) {
    items.push({
      key: "atrasados",
      to: "/pedidos",
      label: `${pending.atrasados} pedido(s) atrasado(s) (parados há mais de 3 dias)`,
    });
  }
  for (const q of pending.quotesDueSoon) {
    items.push({
      key: `deadline-${q.id}`,
      to: `/pedidos/${q.id}`,
      label: `Cotação do pedido "${q.title}" ${deadlineLabel(daysUntil(q.quoteDeadline))}`,
    });
  }
  if (pending.myPendingRequests > 0) {
    items.push({
      key: "mine",
      to: "/pedidos",
      label: `Você tem ${pending.myPendingRequests} pedido(s) aguardando aprovação`,
    });
  }

  return (
    <div className="relative" ref={containerRef}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative flex h-9 w-9 items-center justify-center rounded-full text-lg hover:bg-neutral-100 dark:hover:bg-neutral-800"
        aria-label="Notificações"
      >
        🔔
        {items.length > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
            {items.length}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-20 mt-2 w-80 rounded-lg border border-neutral-200 bg-white py-2 shadow-lg dark:border-neutral-800 dark:bg-neutral-900">
          <p className="px-3 pb-2 text-xs font-semibold uppercase tracking-wide text-neutral-400 dark:text-neutral-600">
            Notificações
          </p>
          {items.length === 0 ? (
            <p className="px-3 py-4 text-sm text-neutral-500 dark:text-neutral-400">Tudo em dia por aqui.</p>
          ) : (
            <ul>
              {items.map((item) => (
                <li key={item.key}>
                  <Link
                    to={item.to}
                    onClick={() => setOpen(false)}
                    className="block px-3 py-2 text-sm text-neutral-700 hover:bg-neutral-50 dark:text-neutral-300 dark:hover:bg-neutral-800"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
