import { useState, type FormEvent } from "react";
import { api, ApiError } from "../lib/api";
import { buttonPrimaryClass, cardClass, inputClass, labelClass } from "../components/ui";

export function ChangePasswordPage() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (newPassword !== confirmPassword) {
      setError("A confirmação não bate com a nova senha");
      return;
    }

    setLoading(true);
    try {
      await api.patch("/auth/password", { currentPassword, newPassword });
      setSuccess(true);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não foi possível trocar a senha");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-sm space-y-4">
      <h1 className="text-xl font-semibold">Alterar senha</h1>

      <form onSubmit={handleSubmit} className={`space-y-4 ${cardClass}`}>
        <div>
          <label className={labelClass}>Senha atual</label>
          <input
            type="password"
            required
            className={inputClass}
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
          />
        </div>
        <div>
          <label className={labelClass}>Nova senha (mín. 8 caracteres)</label>
          <input
            type="password"
            required
            minLength={8}
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
        {success && <p className="text-sm text-emerald-600 dark:text-emerald-400">Senha alterada com sucesso.</p>}
        <button type="submit" disabled={loading} className={`w-full ${buttonPrimaryClass}`}>
          {loading ? "Salvando..." : "Salvar nova senha"}
        </button>
      </form>
    </div>
  );
}
