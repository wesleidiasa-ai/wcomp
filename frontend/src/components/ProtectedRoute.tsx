import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../lib/auth";
import type { Role } from "../types";

const PASSWORD_CHANGE_PATH = "/minha-conta/senha";

export function ProtectedRoute({ roles }: { roles?: Role[] }) {
  const { user, ready } = useAuth();
  const location = useLocation();

  if (!ready) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (user.mustChangePassword && location.pathname !== PASSWORD_CHANGE_PATH) {
    return <Navigate to={PASSWORD_CHANGE_PATH} replace />;
  }
  if (roles && !roles.includes(user.role)) return <Navigate to="/pedidos" replace />;

  return <Outlet />;
}
