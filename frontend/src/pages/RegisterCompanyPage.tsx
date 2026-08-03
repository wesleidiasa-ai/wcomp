import { useState, type FormEvent } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { ApiError } from "../lib/api";
import { buttonPrimaryClass, cardClass, inputClass, labelClass } from "../components/ui";

export function RegisterCompanyPage() {
  const { user, registerCompany } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    companyName: "",
    adminName: "",
    adminEmail: "",
    password: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (user) return <Navigate to="/dashboard" replace />;

  function update(field: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((prev) => ({ ...prev, [field]: e.target.value }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await registerCompany(form);
      navigate("/dashboard");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não foi possível criar a empresa");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-svh items-center justify-center bg-neutral-50 px-4 dark:bg-neutral-950">
      <div className={`w-full max-w-sm ${cardClass}`}>
        <h1 className="mb-1 text-xl font-semibold text-neutral-900 dark:text-neutral-100">
          Criar empresa
        </h1>
        <p className="mb-5 text-sm text-neutral-500 dark:text-neutral-400">
          Isso cria a empresa e o seu usuário administrador
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className={labelClass}>Nome da empresa</label>
            <input required className={inputClass} value={form.companyName} onChange={update("companyName")} />
          </div>
          <div>
            <label className={labelClass}>Seu nome</label>
            <input required className={inputClass} value={form.adminName} onChange={update("adminName")} />
          </div>
          <div>
            <label className={labelClass}>Seu e-mail</label>
            <input
              type="email"
              required
              className={inputClass}
              value={form.adminEmail}
              onChange={update("adminEmail")}
            />
          </div>
          <div>
            <label className={labelClass}>Senha (mín. 8 caracteres)</label>
            <input
              type="password"
              required
              minLength={8}
              className={inputClass}
              value={form.password}
              onChange={update("password")}
            />
          </div>
          {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
          <button type="submit" disabled={loading} className={`w-full ${buttonPrimaryClass}`}>
            {loading ? "Criando..." : "Criar empresa"}
          </button>
        </form>
        <p className="mt-4 text-center text-sm text-neutral-500 dark:text-neutral-400">
          Já tem uma conta?{" "}
          <Link to="/login" className="font-medium text-neutral-900 underline dark:text-neutral-100">
            Entrar
          </Link>
        </p>
      </div>
    </div>
  );
}
