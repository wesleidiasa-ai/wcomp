import { useEffect, useState, type FormEvent } from "react";
import { api, ApiError } from "../lib/api";
import type { Company } from "../types";
import { buttonPrimaryClass, cardClass, inputClass, labelClass } from "../components/ui";

type FormState = {
  name: string;
  cnpj: string;
  phone: string;
  email: string;
  addressStreet: string;
  addressNumber: string;
  addressComplement: string;
  addressNeighborhood: string;
  addressCity: string;
  addressState: string;
  addressZipCode: string;
  whatsappPhoneNumberId: string;
};

function toForm(company: Company): FormState {
  return {
    name: company.name ?? "",
    cnpj: company.cnpj ?? "",
    phone: company.phone ?? "",
    email: company.email ?? "",
    addressStreet: company.addressStreet ?? "",
    addressNumber: company.addressNumber ?? "",
    addressComplement: company.addressComplement ?? "",
    addressNeighborhood: company.addressNeighborhood ?? "",
    addressCity: company.addressCity ?? "",
    addressState: company.addressState ?? "",
    addressZipCode: company.addressZipCode ?? "",
    whatsappPhoneNumberId: company.whatsappPhoneNumberId ?? "",
  };
}

export function CompanySettingsPage() {
  const [form, setForm] = useState<FormState | null>(null);
  const [hasLogo, setHasLogo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [saving, setSaving] = useState(false);

  function loadCompany() {
    return api
      .get<Company>("/companies/me")
      .then((company) => {
        setForm(toForm(company));
        setHasLogo(company.hasLogo);
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : "Erro ao carregar dados da empresa"));
  }

  useEffect(() => {
    loadCompany();
  }, []);

  function update(field: keyof FormState) {
    return (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((prev) => (prev ? { ...prev, [field]: e.target.value } : prev));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!form) return;
    setError(null);
    setSuccess(false);
    setSaving(true);
    try {
      const updated = await api.patch<Company>("/companies/me", {
        ...form,
        whatsappPhoneNumberId: form.whatsappPhoneNumberId || null,
      });
      setForm(toForm(updated));
      setHasLogo(updated.hasLogo);
      setSuccess(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não foi possível salvar os dados da empresa");
    } finally {
      setSaving(false);
    }
  }

  if (!form) {
    if (error) return <p className="text-sm text-red-600 dark:text-red-400">{error}</p>;
    return <p className="text-sm text-neutral-500">Carregando...</p>;
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Dados da empresa</h1>
        <p className="text-sm text-neutral-500 dark:text-neutral-400">
          Essas informações identificam a empresa responsável pelos pedidos de compra.
        </p>
      </div>

      <form onSubmit={handleSubmit} className={`${cardClass} space-y-5`}>
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className={labelClass}>Razão social / nome</label>
            <input required className={inputClass} value={form.name} onChange={update("name")} />
          </div>
          <div>
            <label className={labelClass}>CNPJ</label>
            <input
              className={inputClass}
              placeholder="00.000.000/0001-00"
              value={form.cnpj}
              onChange={update("cnpj")}
            />
          </div>
          <div>
            <label className={labelClass}>Telefone</label>
            <input className={inputClass} value={form.phone} onChange={update("phone")} />
          </div>
          <div className="col-span-2">
            <label className={labelClass}>E-mail</label>
            <input type="email" className={inputClass} value={form.email} onChange={update("email")} />
          </div>
        </div>

        <div className="border-t border-neutral-200 pt-4 dark:border-neutral-800">
          <h2 className="mb-1 text-sm font-semibold text-neutral-700 dark:text-neutral-300">Logo da empresa</h2>
          <p className="mb-3 text-sm text-neutral-500 dark:text-neutral-400">
            Aparece no PDF do pedido de compra gerado pra enviar aos fornecedores. Envie um PNG ou JPEG.
          </p>
          <LogoUploader hasLogo={hasLogo} onChange={setHasLogo} />
        </div>

        <div className="border-t border-neutral-200 pt-4 dark:border-neutral-800">
          <h2 className="mb-3 text-sm font-semibold text-neutral-700 dark:text-neutral-300">Endereço</h2>
          <div className="grid grid-cols-4 gap-4">
            <div className="col-span-3">
              <label className={labelClass}>Rua / logradouro</label>
              <input className={inputClass} value={form.addressStreet} onChange={update("addressStreet")} />
            </div>
            <div>
              <label className={labelClass}>Número</label>
              <input className={inputClass} value={form.addressNumber} onChange={update("addressNumber")} />
            </div>
            <div className="col-span-2">
              <label className={labelClass}>Complemento</label>
              <input
                className={inputClass}
                value={form.addressComplement}
                onChange={update("addressComplement")}
              />
            </div>
            <div className="col-span-2">
              <label className={labelClass}>Bairro</label>
              <input
                className={inputClass}
                value={form.addressNeighborhood}
                onChange={update("addressNeighborhood")}
              />
            </div>
            <div className="col-span-2">
              <label className={labelClass}>Cidade</label>
              <input className={inputClass} value={form.addressCity} onChange={update("addressCity")} />
            </div>
            <div>
              <label className={labelClass}>UF</label>
              <input maxLength={2} className={inputClass} value={form.addressState} onChange={update("addressState")} />
            </div>
            <div>
              <label className={labelClass}>CEP</label>
              <input className={inputClass} value={form.addressZipCode} onChange={update("addressZipCode")} />
            </div>
          </div>
        </div>

        <div className="border-t border-neutral-200 pt-4 dark:border-neutral-800">
          <h2 className="mb-1 text-sm font-semibold text-neutral-700 dark:text-neutral-300">
            Integração com WhatsApp
          </h2>
          <p className="mb-3 text-sm text-neutral-500 dark:text-neutral-400">
            Phone Number ID do WhatsApp Business (painel da Meta) desta empresa. É assim que o bot de
            pedidos sabe que uma mensagem recebida é sua, e não de outra empresa que também use o
            sistema.
          </p>
          <input
            className={inputClass}
            placeholder="ex: 109876543210987"
            value={form.whatsappPhoneNumberId}
            onChange={update("whatsappPhoneNumberId")}
          />
        </div>

        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
        {success && <p className="text-sm text-emerald-600 dark:text-emerald-400">Dados salvos com sucesso.</p>}

        <div className="flex justify-end">
          <button type="submit" disabled={saving} className={buttonPrimaryClass}>
            {saving ? "Salvando..." : "Salvar"}
          </button>
        </div>
      </form>
    </div>
  );
}

function LogoUploader({ hasLogo, onChange }: { hasLogo: boolean; onChange: (hasLogo: boolean) => void }) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!hasLogo) {
      setPreviewUrl(null);
      return;
    }
    let objectUrl: string | null = null;
    api
      .getBlob("/companies/me/logo")
      .then((blob) => {
        objectUrl = URL.createObjectURL(blob);
        setPreviewUrl(objectUrl);
      })
      .catch(() => {});
    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [hasLogo]);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setError(null);
    setBusy(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      await api.upload("/companies/me/logo", formData);
      onChange(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não foi possível enviar o logo");
    } finally {
      setBusy(false);
    }
  }

  async function handleRemove() {
    setError(null);
    setBusy(true);
    try {
      await api.delete("/companies/me/logo");
      onChange(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não foi possível remover o logo");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center gap-4">
      <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-md border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
        {previewUrl ? (
          <img src={previewUrl} alt="Logo da empresa" className="h-full w-full object-contain p-1" />
        ) : (
          <span className="text-xs text-neutral-400">sem logo</span>
        )}
      </div>
      <div className="space-y-1">
        <div className="flex items-center gap-3 text-sm">
          <label className="cursor-pointer font-medium text-blue-700 hover:underline dark:text-blue-400">
            {hasLogo ? "Trocar logo" : "Enviar logo"}
            <input type="file" accept="image/png,image/jpeg" className="hidden" disabled={busy} onChange={handleFile} />
          </label>
          {hasLogo && (
            <button type="button" disabled={busy} onClick={handleRemove} className="text-red-600 dark:text-red-400">
              Remover
            </button>
          )}
        </div>
        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
      </div>
    </div>
  );
}
