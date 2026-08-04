import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { api, ApiError } from "../lib/api";
import { buttonPrimaryClass, cardClass, inputClass, labelClass } from "../components/ui";

export function RegisterCompanyPage() {
  const [form, setForm] = useState({
    companyName: "",
    contactName: "",
    email: "",
    phone: "",
    message: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  function update(field: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((prev) => ({ ...prev, [field]: e.target.value }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await api.post("/access-requests", {
        ...form,
        phone: form.phone || undefined,
        message: form.message || undefined,
      });
      setSent(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não foi possível enviar seu pedido");
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-neutral-50 px-4 dark:bg-neutral-950">
        <div className={`w-full max-w-sm text-center ${cardClass}`}>
          <h1 className="mb-2 text-xl font-semibold text-neutral-900 dark:text-neutral-100">
            Pedido recebido!
          </h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            Recebemos seu pedido de acesso. Vamos entrar em contato em breve pelo e-mail ou telefone que você
            informou.
          </p>
          <Link to="/" className="mt-5 inline-block text-sm font-medium text-blue-700 underline dark:text-blue-400">
            Voltar para o início
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-svh items-center justify-center bg-neutral-50 px-4 py-10 dark:bg-neutral-950">
      <div className={`w-full max-w-sm ${cardClass}`}>
        <h1 className="mb-1 text-xl font-semibold text-neutral-900 dark:text-neutral-100">
          Solicitar acesso
        </h1>
        <p className="mb-5 text-sm text-neutral-500 dark:text-neutral-400">
          Estamos liberando o acesso aos poucos enquanto evoluímos a plataforma. Preencha seus dados que entramos
          em contato pra configurar sua empresa.
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className={labelClass}>Nome da empresa</label>
            <input required className={inputClass} value={form.companyName} onChange={update("companyName")} />
          </div>
          <div>
            <label className={labelClass}>Seu nome</label>
            <input required className={inputClass} value={form.contactName} onChange={update("contactName")} />
          </div>
          <div>
            <label className={labelClass}>Seu e-mail</label>
            <input type="email" required className={inputClass} value={form.email} onChange={update("email")} />
          </div>
          <div>
            <label className={labelClass}>Telefone (opcional)</label>
            <input className={inputClass} value={form.phone} onChange={update("phone")} />
          </div>
          <div>
            <label className={labelClass}>Conte um pouco do que você precisa (opcional)</label>
            <textarea rows={3} className={inputClass} value={form.message} onChange={update("message")} />
          </div>
          {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
          <button type="submit" disabled={loading} className={`w-full ${buttonPrimaryClass}`}>
            {loading ? "Enviando..." : "Solicitar acesso"}
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
