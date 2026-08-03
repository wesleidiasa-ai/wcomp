import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../lib/auth";
import type { Role } from "../types";

export function ProtectedRoute({ roles }: { roles?: Role[] }) {
  const { user, ready } = useAuth();

  if (!ready) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/pedidos" replace />;

  return <Outlet />;
}
