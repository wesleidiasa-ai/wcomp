import { useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { api, ApiError } from "../lib/api";
import { buttonPrimaryClass, cardClass, inputClass, labelClass } from "../components/ui";

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const navigate = useNavigate();

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (newPassword !== confirmPassword) {
      setError("A confirmação não bate com a nova senha");
      return;
    }

    setLoading(true);
    try {
      await api.post("/auth/reset-password", { token, newPassword });
      navigate("/login");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não foi possível redefinir a senha");
    } finally {
      setLoading(false);
    }
  }

  if (!token) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-neutral-50 px-4 dark:bg-neutral-950">
        <div className={`w-full max-w-sm text-center ${cardClass}`}>
          <p className="text-sm text-red-600 dark:text-red-400">Link inválido — falta o token de redefinição.</p>
          <Link to="/esqueci-senha" className="mt-3 inline-block text-sm font-medium text-blue-700 hover:underline dark:text-blue-400">
            Pedir um novo link
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-svh items-center justify-center bg-neutral-50 px-4 dark:bg-neutral-950">
      <div className={`w-full max-w-sm ${cardClass}`}>
        <h1 className="mb-1 text-xl font-semibold text-neutral-900 dark:text-neutral-100">Redefinir senha</h1>
        <p className="mb-5 text-sm text-neutral-500 dark:text-neutral-400">Escolha uma nova senha de acesso.</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className={labelClass}>Nova senha (mín. 8 caracteres)</label>
            <input
              type="password"
              required
              minLength={8}
              autoFocus
              className={inputClass}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
          </div>
          <div>
            <label className={labelClass}>Confirmar nova senha</label>
            <input
              type="password"
              required
              minLength={8}
              className={inputClass}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </div>
          {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
          <button type="submit" disabled={loading} className={`w-full ${buttonPrimaryClass}`}>
            {loading ? "Salvando..." : "Redefinir senha"}
          </button>
        </form>
      </div>
    </div>
  );
}
