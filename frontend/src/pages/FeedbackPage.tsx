import { useState, type FormEvent } from "react";
import { api, ApiError } from "../lib/api";
import type { FeedbackType } from "../types";
import { buttonPrimaryClass, cardClass, inputClass, labelClass } from "../components/ui";

const TYPES: { value: FeedbackType; label: string }[] = [
  { value: "sugestao", label: "💡 Sugestão" },
  { value: "problema", label: "🐞 Problema" },
];

export function FeedbackPage() {
  const [type, setType] = useState<FeedbackType>("sugestao");
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setLoading(true);
    try {
      await api.post("/feedback", { type, message });
      setSuccess(true);
      setMessage("");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não foi possível enviar");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-sm space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Enviar sugestão ou reportar problema</h1>
        <p className="text-sm text-neutral-500 dark:text-neutral-400">
          Encontrou algo estranho ou tem uma ideia pra melhorar o sistema? Manda aqui — vai direto pra
          equipe.
        </p>
      </div>

      <form onSubmit={handleSubmit} className={`space-y-4 ${cardClass}`}>
        <div>
          <label className={labelClass}>Tipo</label>
          <div className="flex gap-3">
            {TYPES.map((t) => (
              <button
                key={t.value}
                type="button"
                onClick={() => setType(t.value)}
                className={`flex-1 rounded-md border px-3 py-2 text-sm font-medium ${
                  type === t.value
                    ? "border-blue-600 bg-blue-50 text-blue-700 dark:border-blue-500 dark:bg-blue-900/30 dark:text-blue-400"
                    : "border-neutral-300 text-neutral-600 hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className={labelClass}>Sua mensagem</label>
          <textarea
            required
            rows={5}
            className={inputClass}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={
              type === "sugestao" ? "O que você gostaria de ver no sistema?" : "O que aconteceu? Onde?"
            }
          />
        </div>
        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
        {success && (
          <p className="text-sm text-emerald-600 dark:text-emerald-400">
            Enviado! Obrigado — recebemos sua mensagem.
          </p>
        )}
        <button type="submit" disabled={loading} className={`w-full ${buttonPrimaryClass}`}>
          {loading ? "Enviando..." : "Enviar"}
        </button>
      </form>
    </div>
  );
}
