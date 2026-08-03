import { useState, type FormEvent } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { ApiError } from "../lib/api";
import { buttonPrimaryClass, cardClass, inputClass, labelClass } from "../components/ui";

export function LoginPage() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (user) return <Navigate to="/dashboard" replace />;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(email, password);
      navigate("/dashboard");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não foi possível entrar");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-svh items-center justify-center bg-neutral-50 px-4 dark:bg-neutral-950">
      <div className={`w-full max-w-sm ${cardClass}`}>
        <h1 className="mb-1 text-xl font-semibold text-neutral-900 dark:text-neutral-100">Entrar</h1>
        <p className="mb-5 text-sm text-neutral-500 dark:text-neutral-400">
          Sistema de pedidos de compra
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className={labelClass}>E-mail</label>
            <input
              type="email"
              required
              className={inputClass}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoFocus
            />
          </div>
          <div>
            <label className={labelClass}>Senha</label>
            <input
              type="password"
              required
              className={inputClass}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
          <button type="submit" disabled={loading} className={`w-full ${buttonPrimaryClass}`}>
            {loading ? "Entrando..." : "Entrar"}
          </button>
        </form>
        <p className="mt-4 text-center text-sm text-neutral-500 dark:text-neutral-400">
          Ainda não tem empresa cadastrada?{" "}
          <Link to="/registrar" className="font-medium text-neutral-900 underline dark:text-neutral-100">
            Criar empresa
          </Link>
        </p>
      </div>
    </div>
  );
}
