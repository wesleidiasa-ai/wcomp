import { useState, type FormEvent } from "react";
import { api, ApiError } from "../lib/api";
import { formatCnpj, formatPhone } from "../lib/format";
import { buttonPrimaryClass, buttonSecondaryClass, cardClass, inputClass, labelClass } from "./ui";

export type SupplierFormValues = {
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
  notes: string;
};

export const EMPTY_SUPPLIER_FORM: SupplierFormValues = {
  name: "",
  cnpj: "",
  phone: "",
  email: "",
  addressStreet: "",
  addressNumber: "",
  addressComplement: "",
  addressNeighborhood: "",
  addressCity: "",
  addressState: "",
  addressZipCode: "",
  notes: "",
};

export type SupplierPayload = {
  name: string;
  cnpj: string | null;
  phone: string | null;
  email: string | null;
  addressStreet: string | null;
  addressNumber: string | null;
  addressComplement: string | null;
  addressNeighborhood: string | null;
  addressCity: string | null;
  addressState: string | null;
  addressZipCode: string | null;
  notes: string | null;
};

function serialize(form: SupplierFormValues): SupplierPayload {
  return {
    name: form.name,
    cnpj: form.cnpj.trim() || null,
    phone: form.phone.trim() || null,
    email: form.email.trim() || null,
    addressStreet: form.addressStreet.trim() || null,
    addressNumber: form.addressNumber.trim() || null,
    addressComplement: form.addressComplement.trim() || null,
    addressNeighborhood: form.addressNeighborhood.trim() || null,
    addressCity: form.addressCity.trim() || null,
    addressState: form.addressState.trim() || null,
    addressZipCode: form.addressZipCode.trim() || null,
    notes: form.notes.trim() || null,
  };
}

type CnpjLookupResult = {
  name: string;
  phone: string;
  email: string;
  addressStreet: string;
  addressNumber: string;
  addressComplement: string;
  addressNeighborhood: string;
  addressCity: string;
  addressState: string;
  addressZipCode: string;
};

/** Formulário de fornecedor compartilhado entre criação (Fornecedores) e edição (detalhe do fornecedor). */
export function SupplierForm({
  initialValues,
  onSubmit,
  submitLabel,
  onCancel,
}: {
  initialValues?: SupplierFormValues;
  onSubmit: (payload: SupplierPayload) => Promise<void>;
  submitLabel: string;
  onCancel?: () => void;
}) {
  const [form, setForm] = useState(initialValues ?? EMPTY_SUPPLIER_FORM);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [cnpjLookupLoading, setCnpjLookupLoading] = useState(false);
  const [cnpjLookupError, setCnpjLookupError] = useState<string | null>(null);

  async function handleCnpjLookup() {
    const digits = form.cnpj.replace(/\D/g, "");
    if (digits.length !== 14) {
      setCnpjLookupError("Informe um CNPJ completo (14 dígitos) para buscar");
      return;
    }
    setCnpjLookupError(null);
    setCnpjLookupLoading(true);
    try {
      const result = await api.get<CnpjLookupResult>(`/suppliers/cnpj/${digits}`);
      setForm((f) => ({
        ...f,
        name: result.name || f.name,
        phone: result.phone ? formatPhone(result.phone) : f.phone,
        email: result.email || f.email,
        addressStreet: result.addressStreet || f.addressStreet,
        addressNumber: result.addressNumber || f.addressNumber,
        addressComplement: result.addressComplement || f.addressComplement,
        addressNeighborhood: result.addressNeighborhood || f.addressNeighborhood,
        addressCity: result.addressCity || f.addressCity,
        addressState: result.addressState || f.addressState,
        addressZipCode: result.addressZipCode || f.addressZipCode,
      }));
    } catch (err) {
      setCnpjLookupError(err instanceof ApiError ? err.message : "Não foi possível consultar o CNPJ");
    } finally {
      setCnpjLookupLoading(false);
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await onSubmit(serialize(form));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não foi possível salvar o fornecedor");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className={`${cardClass} grid grid-cols-2 gap-4`}>
      <div>
        <label className={labelClass}>Nome</label>
        <input required className={inputClass} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
      </div>
      <div>
        <label className={labelClass}>CNPJ</label>
        <div className="flex gap-2">
          <input
            className={inputClass}
            placeholder="00.000.000/0001-00"
            value={form.cnpj}
            onChange={(e) => {
              setForm({ ...form, cnpj: formatCnpj(e.target.value) });
              setCnpjLookupError(null);
            }}
          />
          <button
            type="button"
            onClick={handleCnpjLookup}
            disabled={cnpjLookupLoading}
            title="Buscar dados na Receita Federal"
            className="shrink-0 rounded-md border border-neutral-300 px-3 text-sm font-medium text-neutral-600 hover:bg-neutral-100 disabled:opacity-50 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
          >
            {cnpjLookupLoading ? "Buscando..." : "🔎 Buscar"}
          </button>
        </div>
        {cnpjLookupError && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{cnpjLookupError}</p>}
      </div>
      <div>
        <label className={labelClass}>Telefone</label>
        <input
          className={inputClass}
          placeholder="(00) 00000-0000"
          value={form.phone}
          onChange={(e) => setForm({ ...form, phone: formatPhone(e.target.value) })}
        />
      </div>
      <div>
        <label className={labelClass}>E-mail</label>
        <input type="email" className={inputClass} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
      </div>

      <div className="col-span-2 border-t border-neutral-200 pt-4 dark:border-neutral-800">
        <h2 className="mb-3 text-sm font-semibold text-neutral-700 dark:text-neutral-300">Endereço</h2>
        <div className="grid grid-cols-4 gap-4">
          <div className="col-span-3">
            <label className={labelClass}>Rua / logradouro</label>
            <input
              className={inputClass}
              value={form.addressStreet}
              onChange={(e) => setForm({ ...form, addressStreet: e.target.value })}
            />
          </div>
          <div>
            <label className={labelClass}>Número</label>
            <input
              className={inputClass}
              value={form.addressNumber}
              onChange={(e) => setForm({ ...form, addressNumber: e.target.value })}
            />
          </div>
          <div className="col-span-2">
            <label className={labelClass}>Complemento</label>
            <input
              className={inputClass}
              value={form.addressComplement}
              onChange={(e) => setForm({ ...form, addressComplement: e.target.value })}
            />
          </div>
          <div className="col-span-2">
            <label className={labelClass}>Bairro</label>
            <input
              className={inputClass}
              value={form.addressNeighborhood}
              onChange={(e) => setForm({ ...form, addressNeighborhood: e.target.value })}
            />
          </div>
          <div className="col-span-2">
            <label className={labelClass}>Cidade</label>
            <input
              className={inputClass}
              value={form.addressCity}
              onChange={(e) => setForm({ ...form, addressCity: e.target.value })}
            />
          </div>
          <div>
            <label className={labelClass}>UF</label>
            <input
              maxLength={2}
              className={inputClass}
              value={form.addressState}
              onChange={(e) => setForm({ ...form, addressState: e.target.value.toUpperCase() })}
            />
          </div>
          <div>
            <label className={labelClass}>CEP</label>
            <input
              className={inputClass}
              value={form.addressZipCode}
              onChange={(e) => setForm({ ...form, addressZipCode: e.target.value })}
            />
          </div>
        </div>
      </div>

      <div className="col-span-2">
        <label className={labelClass}>Observações</label>
        <textarea
          rows={3}
          className={inputClass}
          value={form.notes}
          onChange={(e) => setForm({ ...form, notes: e.target.value })}
        />
      </div>

      {error && <p className="col-span-2 text-sm text-red-600 dark:text-red-400">{error}</p>}

      <div className="col-span-2 flex justify-end gap-2">
        {onCancel && (
          <button type="button" onClick={onCancel} className={buttonSecondaryClass}>
            Cancelar
          </button>
        )}
        <button type="submit" disabled={submitting} className={buttonPrimaryClass}>
          {submitting ? "Salvando..." : submitLabel}
        </button>
      </div>
    </form>
  );
}
