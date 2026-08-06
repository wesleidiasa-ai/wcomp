import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { api, ApiError } from "../lib/api";
import { buttonPrimaryClass, cardClass, inputClass, labelClass } from "../components/ui";

export function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await api.post("/auth/forgot-password", { email });
      setSent(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não foi possível enviar o e-mail");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-svh items-center justify-center bg-neutral-50 px-4 dark:bg-neutral-950">
      <div className={`w-full max-w-sm ${cardClass}`}>
        <h1 className="mb-1 text-xl font-semibold text-neutral-900 dark:text-neutral-100">Esqueci minha senha</h1>

        {sent ? (
          <>
            <p className="mb-5 text-sm text-neutral-600 dark:text-neutral-400">
              Se existir uma conta com esse e-mail, enviamos um link pra redefinir a senha. Confira sua caixa de
              entrada (e o spam).
            </p>
            <Link to="/login" className="text-sm font-medium text-blue-700 hover:underline dark:text-blue-400">
              Voltar para o login
            </Link>
          </>
        ) : (
          <>
            <p className="mb-5 text-sm text-neutral-500 dark:text-neutral-400">
              Digite seu e-mail e enviamos um link pra você criar uma senha nova.
            </p>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className={labelClass}>E-mail</label>
                <input
                  type="email"
                  required
                  autoFocus
                  className={inputClass}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
              <button type="submit" disabled={loading} className={`w-full ${buttonPrimaryClass}`}>
                {loading ? "Enviando..." : "Enviar link de redefinição"}
              </button>
            </form>
            <p className="mt-4 text-center text-sm text-neutral-500 dark:text-neutral-400">
              <Link to="/login" className="font-medium text-neutral-900 underline dark:text-neutral-100">
                Voltar para o login
              </Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
