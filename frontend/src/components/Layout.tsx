import type { ReactNode } from "react";
import { Link, NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { Logo } from "./Logo";
import { NotificationCenter } from "./NotificationCenter";
import { buttonAccentClass } from "./ui";

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium ${
    isActive
      ? "bg-blue-700 text-white dark:bg-blue-600"
      : "text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800"
  }`;

function NavIcon({ children }: { children: ReactNode }) {
  return (
    <span className="w-5 shrink-0 text-center" aria-hidden="true">
      {children}
    </span>
  );
}

export function Layout() {
  const { user, logout } = useAuth();
  if (!user) return null;

  return (
    <div className="flex min-h-svh flex-col bg-neutral-50 text-neutral-900 dark:bg-neutral-950 dark:text-neutral-100">
      <header className="border-b border-neutral-200 dark:border-neutral-800">
        <div className="flex items-center justify-between gap-4 px-4 py-3">
          <Logo />
          <div className="flex items-center gap-4 text-sm">
            <Link to="/pedidos/novo" className={`${buttonAccentClass} flex items-center gap-1.5`}>
              <span className="text-base font-bold leading-none">+</span> Novo pedido
            </Link>
            <NotificationCenter />
            <div className="flex items-center gap-2">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-700 text-sm font-semibold text-white dark:bg-blue-600">
                {user.name.charAt(0).toUpperCase()}
              </span>
              <div className="text-right">
                <div className="font-medium">{user.name}</div>
                <div className="capitalize text-neutral-500 dark:text-neutral-400">{user.role}</div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="flex flex-1">
        <aside className="w-56 shrink-0 border-r border-neutral-200 p-3 dark:border-neutral-800">
          <nav className="flex flex-col gap-1">
            <NavLink to="/dashboard" className={linkClass}>
              <NavIcon>📊</NavIcon> Dashboard
            </NavLink>
            <NavLink to="/pedidos" className={linkClass} end>
              <NavIcon>📄</NavIcon> Pedidos
            </NavLink>
            <NavLink to="/pedidos/novo" className={linkClass}>
              <NavIcon>➕</NavIcon> Novo pedido
            </NavLink>
            {(user.role === "admin" || user.role === "comprador") && (
              <>
                <div className="mt-3 mb-1 px-3 text-xs font-semibold uppercase tracking-wide text-neutral-400 dark:text-neutral-600">
                  Compras
                </div>
                <NavLink to="/fornecedores" className={linkClass}>
                  <NavIcon>🏢</NavIcon> Fornecedores
                </NavLink>
                <NavLink to="/historico-precos" className={linkClass}>
                  <NavIcon>📈</NavIcon> Histórico de preços
                </NavLink>
              </>
            )}
            {user.role === "admin" && (
              <>
                <div className="mt-3 mb-1 px-3 text-xs font-semibold uppercase tracking-wide text-neutral-400 dark:text-neutral-600">
                  Administração
                </div>
                <NavLink to="/setores" className={linkClass}>
                  <NavIcon>🗂️</NavIcon> Setores
                </NavLink>
                <NavLink to="/usuarios" className={linkClass}>
                  <NavIcon>👥</NavIcon> Usuários
                </NavLink>
                <NavLink to="/regras-aprovacao" className={linkClass}>
                  <NavIcon>✅</NavIcon> Regras de aprovação
                </NavLink>
                <NavLink to="/empresa" className={linkClass}>
                  <NavIcon>🏛️</NavIcon> Empresa
                </NavLink>
              </>
            )}

            <div className="mt-3 mb-1 px-3 text-xs font-semibold uppercase tracking-wide text-neutral-400 dark:text-neutral-600">
              Conta
            </div>
            <NavLink to="/minha-conta/senha" className={linkClass}>
              <NavIcon>🔒</NavIcon> Alterar senha
            </NavLink>
            <NavLink to="/feedback" className={linkClass}>
              <NavIcon>💡</NavIcon> Feedback
            </NavLink>
            <button
              onClick={logout}
              className="flex items-center gap-2 rounded-md px-3 py-2 text-left text-sm font-medium text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800"
            >
              <NavIcon>🚪</NavIcon> Sair
            </button>
          </nav>
        </aside>

        <main className="min-w-0 flex-1 px-6 py-6">
          <div className="mx-auto max-w-5xl">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
