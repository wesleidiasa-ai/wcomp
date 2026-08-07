import { NavLink } from "react-router-dom";

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `rounded-md px-3 py-1.5 text-sm font-medium ${
    isActive
      ? "bg-blue-700 text-white dark:bg-blue-600"
      : "text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800"
  }`;

export function AdminNav({ onLogout }: { onLogout: () => void }) {
  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-neutral-200 pb-4 dark:border-neutral-800">
      <nav className="flex flex-wrap gap-1">
        <NavLink to="/admin" end className={linkClass}>
          Dashboard
        </NavLink>
        <NavLink to="/admin/waitlist" className={linkClass}>
          Lista de espera
        </NavLink>
        <NavLink to="/admin/empresas" className={linkClass}>
          Empresas
        </NavLink>
        <NavLink to="/admin/feedback" className={linkClass}>
          Feedback
        </NavLink>
        <NavLink to="/admin/criar-empresa" className={linkClass}>
          Criar empresa
        </NavLink>
      </nav>
      <button onClick={onLogout} className="text-sm text-neutral-500 hover:underline dark:text-neutral-400">
        Sair
      </button>
    </div>
  );
}
