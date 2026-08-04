import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { AdminKeyGate } from "../components/AdminKeyGate";
import { api, ApiError } from "../lib/api";
import { buttonPrimaryClass, cardClass, inputClass, labelClass } from "../components/ui";

type CompanyFormState = {
  companyName: string;
  cnpj: string;
  adminName: string;
  adminEmail: string;
  adminPhone: string;
  password: string;
};

const EMPTY_FORM: CompanyFormState = {
  companyName: "",
  cnpj: "",
  adminName: "",
  adminEmail: "",
  adminPhone: "",
  password: "",
};

function CreateCompanyForm({ adminKey, onUnauthorized }: { adminKey: string; onUnauthorized: () => void }) {
  const [form, setForm] = useState<CompanyFormState>(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [created, setCreated] = useState<{ companyName: string; email: string; password: string } | null>(null);

  function update(field: keyof CompanyFormState) {
    return (e: React.ChangeEvent<HTMLInputElement>) => setForm((prev) => ({ ...prev, [field]: e.target.value }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await api.post(
        "/auth/register-company",
        {
          companyName: form.companyName,
          cnpj: form.cnpj || undefined,
          adminName: form.adminName,
          adminEmail: form.adminEmail,
          adminPhone: form.adminPhone || undefined,
          password: form.password,
        },
        { "x-admin-key": adminKey }
      );
      setCreated({ companyName: form.companyName, email: form.adminEmail, password: form.password });
      setForm(EMPTY_FORM);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        onUnauthorized();
        return;
      }
      setError(err instanceof ApiError ? err.message : "Não foi possível criar a empresa");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      {created && (
        <div className={`${cardClass} border-emerald-300 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950`}>
          <p className="font-medium text-emerald-800 dark:text-emerald-300">
            Empresa "{created.companyName}" criada. Envie estes dados de acesso pro cliente:
          </p>
          <p className="mt-2 text-sm text-emerald-900 dark:text-emerald-200">
            E-mail: <span className="font-mono">{created.email}</span>
            <br />
            Senha: <span className="font-mono">{created.password}</span>
          </p>
        </div>
      )}

      <form onSubmit={handleSubmit} className={`space-y-4 ${cardClass}`}>
        <div>
          <label className={labelClass}>Nome da empresa</label>
          <input required className={inputClass} value={form.companyName} onChange={update("companyName")} />
        </div>
        <div>
          <label className={labelClass}>CNPJ (opcional)</label>
          <input className={inputClass} value={form.cnpj} onChange={update("cnpj")} />
        </div>
        <div>
          <label className={labelClass}>Nome do admin</label>
          <input required className={inputClass} value={form.adminName} onChange={update("adminName")} />
        </div>
        <div>
          <label className={labelClass}>E-mail do admin</label>
          <input type="email" required className={inputClass} value={form.adminEmail} onChange={update("adminEmail")} />
        </div>
        <div>
          <label className={labelClass}>Telefone do admin (opcional)</label>
          <input className={inputClass} value={form.adminPhone} onChange={update("adminPhone")} />
        </div>
        <div>
          <label className={labelClass}>Senha (mín. 8 caracteres)</label>
          <input
            type="text"
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
    </div>
  );
}

export function AdminCreateCompanyPage() {
  return (
    <AdminKeyGate>
      {(adminKey, clearKey) => (
        <div className="mx-auto max-w-sm space-y-4 px-6 py-10">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-semibold">Criar empresa</h1>
            <div className="flex items-center gap-4 text-sm">
              <Link to="/admin/waitlist" className="font-medium text-blue-700 hover:underline dark:text-blue-400">
                Lista de espera →
              </Link>
              <button onClick={clearKey} className="text-neutral-500 hover:underline dark:text-neutral-400">
                Sair
              </button>
            </div>
          </div>
          <CreateCompanyForm adminKey={adminKey} onUnauthorized={clearKey} />
        </div>
      )}
    </AdminKeyGate>
  );
}
