import { Fragment, useEffect, useState, type FormEvent } from "react";
import { Link, useParams } from "react-router-dom";
import { api, ApiError } from "../lib/api";
import { useAuth } from "../lib/auth";
import { daysUntil, deadlineLabel } from "../lib/date";
import type { PurchaseRequestDetail, QuoteAttachment, RequestStatus, Supplier } from "../types";
import { StatusBadge } from "../components/StatusBadge";
import { Timeline } from "../components/Timeline";
import { Stepper } from "../components/Stepper";
import {
  buttonDangerClass,
  buttonPrimaryClass,
  buttonSecondaryClass,
  buttonSuccessClass,
  cardClass,
  inputClass,
  labelClass,
} from "../components/ui";

function formatMoney(value: string | null) {
  if (value === null) return "—";
  return Number(value).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("pt-BR");
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const NEXT_STATUS: Partial<Record<RequestStatus, { value: RequestStatus; label: string }[]>> = {
  aprovado: [
    { value: "em_cotacao", label: "Mover para em cotação" },
    { value: "cancelado", label: "Cancelar pedido" },
  ],
  em_cotacao: [
    { value: "pedido_enviado", label: "Marcar pedido como enviado" },
    { value: "cancelado", label: "Cancelar pedido" },
  ],
  pedido_enviado: [
    { value: "aguardando_entrega", label: "Aguardando entrega (transportadora)" },
    { value: "aguardando_retirada", label: "Aguardando retirada (loja/depósito)" },
    { value: "cancelado", label: "Cancelar pedido" },
  ],
  aguardando_entrega: [
    { value: "recebido", label: "Marcar como recebido" },
    { value: "cancelado", label: "Cancelar pedido" },
  ],
  aguardando_retirada: [
    { value: "recebido", label: "Marcar como recebido" },
    { value: "cancelado", label: "Cancelar pedido" },
  ],
};

export function RequestDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [request, setRequest] = useState<PurchaseRequestDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const [quoteForm, setQuoteForm] = useState({
    supplierName: "",
    totalPrice: "",
    freightValue: "",
    deliveryDays: "",
    notes: "",
  });
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);

  useEffect(() => {
    api
      .get<Supplier[]>("/suppliers")
      .then(setSuppliers)
      .catch(() => {});
  }, []);

  function load() {
    if (!id) return;
    api
      .get<PurchaseRequestDetail>(`/purchase-requests/${id}`)
      .then(setRequest)
      .catch((err) => setError(err instanceof ApiError ? err.message : "Erro ao carregar pedido"));
  }

  useEffect(load, [id]);

  if (!request) {
    if (error) return <p className="text-sm text-red-600 dark:text-red-400">{error}</p>;
    return <p className="text-sm text-neutral-500">Carregando...</p>;
  }

  const firstPendingStep = request.approvalSteps.find((s) => s.status === "pendente");
  const canDecide =
    !!firstPendingStep &&
    (user?.role === "admin" || firstPendingStep.approverId === user?.id) &&
    (user?.role === "admin" || user?.role === "aprovador");

  async function decide(decision: "approve" | "reject") {
    if (!firstPendingStep || !id) return;
    setBusy(true);
    setError(null);
    try {
      await api.post(`/purchase-requests/${id}/approval-steps/${firstPendingStep.id}/${decision}`, {
        comment: comment || undefined,
      });
      setComment("");
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não foi possível registrar a decisão");
    } finally {
      setBusy(false);
    }
  }

  async function advanceStatus(status: RequestStatus) {
    if (!id) return;
    setBusy(true);
    setError(null);
    try {
      await api.patch(`/purchase-requests/${id}/status`, { status });
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não foi possível mudar o status");
    } finally {
      setBusy(false);
    }
  }

  const canAdvanceStatus = user?.role === "admin" || user?.role === "comprador";
  const statusOptions = NEXT_STATUS[request.status] ?? [];

  const canManageQuotes = canAdvanceStatus && request.status === "em_cotacao";
  const showQuotes = canManageQuotes || request.quotes.length > 0;

  async function addQuote(e: FormEvent) {
    e.preventDefault();
    if (!id) return;
    setBusy(true);
    setError(null);
    try {
      await api.post(`/purchase-requests/${id}/quotes`, {
        supplierName: quoteForm.supplierName,
        totalPrice: Number(quoteForm.totalPrice),
        freightValue: quoteForm.freightValue ? Number(quoteForm.freightValue) : undefined,
        deliveryDays: quoteForm.deliveryDays ? Number(quoteForm.deliveryDays) : undefined,
        notes: quoteForm.notes || undefined,
      });
      setQuoteForm({ supplierName: "", totalPrice: "", freightValue: "", deliveryDays: "", notes: "" });
      api.get<Supplier[]>("/suppliers").then(setSuppliers).catch(() => {});
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não foi possível registrar a cotação");
    } finally {
      setBusy(false);
    }
  }

  async function selectQuote(quoteId: string) {
    if (!id) return;
    setBusy(true);
    setError(null);
    try {
      await api.post(`/purchase-requests/${id}/quotes/${quoteId}/select`);
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não foi possível selecionar a cotação");
    } finally {
      setBusy(false);
    }
  }

  async function removeQuote(quoteId: string) {
    if (!id) return;
    setBusy(true);
    setError(null);
    try {
      await api.delete(`/purchase-requests/${id}/quotes/${quoteId}`);
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não foi possível remover a cotação");
    } finally {
      setBusy(false);
    }
  }

  async function uploadAttachment(quoteId: string, file: File) {
    if (!id) return;
    setBusy(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      await api.upload(`/purchase-requests/${id}/quotes/${quoteId}/attachments`, formData);
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não foi possível enviar o anexo");
    } finally {
      setBusy(false);
    }
  }

  async function openAttachment(quoteId: string, attachment: QuoteAttachment) {
    setError(null);
    try {
      const blob = await api.getBlob(`/purchase-requests/${id}/quotes/${quoteId}/attachments/${attachment.id}`);
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank", "noopener");
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não foi possível abrir o anexo");
    }
  }

  async function removeAttachment(quoteId: string, attachmentId: string) {
    if (!id) return;
    setBusy(true);
    setError(null);
    try {
      await api.delete(`/purchase-requests/${id}/quotes/${quoteId}/attachments/${attachmentId}`);
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não foi possível remover o anexo");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link to="/pedidos" className="text-sm text-neutral-500 hover:underline dark:text-neutral-400">
          ← Voltar para pedidos
        </Link>
      </div>

      {error && (
        <div className="rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
          {error}
        </div>
      )}

      <div className={cardClass}>
        <Stepper request={request} />
      </div>

      <div className={cardClass}>
        <div className="mb-3 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold">{request.title}</h1>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              Solicitado por {request.requester.name} · {request.department?.name ?? "sem setor"} ·{" "}
              {formatDateTime(request.createdAt)}
            </p>
          </div>
          <StatusBadge status={request.status} />
        </div>
        {request.justification && (
          <p className="mb-3 text-sm text-neutral-700 dark:text-neutral-300">{request.justification}</p>
        )}
        <div className="flex gap-6 text-sm text-neutral-500 dark:text-neutral-400">
          <span>
            Urgência: <span className="font-medium capitalize text-neutral-900 dark:text-neutral-100">{request.urgency}</span>
          </span>
          <span>
            Total estimado:{" "}
            <span className="font-medium text-neutral-900 dark:text-neutral-100">
              {formatMoney(request.estimatedTotal)}
            </span>
          </span>
        </div>
      </div>

      <div className={cardClass}>
        <h2 className="mb-3 text-sm font-semibold text-neutral-700 dark:text-neutral-300">Itens</h2>
        <table className="w-full text-left text-sm">
          <thead className="border-b border-neutral-200 text-neutral-500 dark:border-neutral-800 dark:text-neutral-400">
            <tr>
              <th className="py-2 font-medium">Item</th>
              <th className="py-2 font-medium">Qtd</th>
              <th className="py-2 font-medium">Unidade</th>
              <th className="py-2 font-medium">Preço unit. est.</th>
            </tr>
          </thead>
          <tbody>
            {request.items.map((item) => (
              <tr key={item.id} className="border-b border-neutral-100 last:border-0 dark:border-neutral-800">
                <td className="py-2">{item.itemName}</td>
                <td className="py-2">{item.quantity}</td>
                <td className="py-2">{item.unit ?? "—"}</td>
                <td className="py-2">{formatMoney(item.estimatedUnitPrice)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className={cardClass}>
        <h2 className="mb-3 text-sm font-semibold text-neutral-700 dark:text-neutral-300">Etapas de aprovação</h2>
        {request.approvalSteps.length === 0 ? (
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            Nenhuma etapa de aprovação foi necessária para este pedido.
          </p>
        ) : (
          <ul className="space-y-2">
            {request.approvalSteps.map((step) => (
              <li key={step.id} className="flex items-center justify-between rounded-md border border-neutral-200 px-3 py-2 text-sm dark:border-neutral-800">
                <span>
                  Etapa {step.stepOrder} · {step.approver.name}
                  {step.comment && <span className="ml-2 text-neutral-500 dark:text-neutral-400">"{step.comment}"</span>}
                </span>
                <span
                  className={
                    step.status === "aprovado"
                      ? "text-emerald-600 dark:text-emerald-400"
                      : step.status === "reprovado"
                        ? "text-red-600 dark:text-red-400"
                        : "text-amber-600 dark:text-amber-400"
                  }
                >
                  {step.status}
                </span>
              </li>
            ))}
          </ul>
        )}

        {canDecide && (
          <div className="mt-4 space-y-2 border-t border-neutral-200 pt-4 dark:border-neutral-800">
            <input
              className={inputClass}
              placeholder="Comentário (opcional)"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
            />
            <div className="flex gap-3">
              <button disabled={busy} onClick={() => decide("approve")} className={buttonSuccessClass}>
                Aprovar etapa
              </button>
              <button disabled={busy} onClick={() => decide("reject")} className={buttonDangerClass}>
                Reprovar etapa
              </button>
            </div>
          </div>
        )}
      </div>

      {showQuotes && (
        <div className={cardClass}>
          <h2 className="mb-3 text-sm font-semibold text-neutral-700 dark:text-neutral-300">
            Cotações {request.quoteDeadline && <QuoteDeadlineBadge deadline={request.quoteDeadline} />}
          </h2>

          {request.quotes.length === 0 ? (
            <p className="text-sm text-neutral-500 dark:text-neutral-400">Nenhuma cotação registrada ainda.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-neutral-200 text-neutral-500 dark:border-neutral-800 dark:text-neutral-400">
                  <tr>
                    <th className="py-2 pr-3 font-medium">Fornecedor</th>
                    <th className="py-2 pr-3 font-medium">Valor</th>
                    <th className="py-2 pr-3 font-medium">Frete</th>
                    <th className="py-2 pr-3 font-medium">Prazo</th>
                    <th className="py-2 pr-3 font-medium">Condição</th>
                    <th className="py-2 pr-3 font-medium">Escolhido</th>
                    {canManageQuotes && <th className="py-2 font-medium" />}
                  </tr>
                </thead>
                <tbody>
                  {request.quotes.map((quote) => (
                    <Fragment key={quote.id}>
                      <tr
                        className={`border-b border-neutral-100 dark:border-neutral-800 ${
                          quote.selected ? "bg-emerald-50 dark:bg-emerald-900/20" : ""
                        }`}
                      >
                        <td className="py-2 pr-3 font-medium">
                          {quote.supplier?.rating ? `${quote.supplierName} (${"★".repeat(quote.supplier.rating)})` : quote.supplierName}
                        </td>
                        <td className="py-2 pr-3">{formatMoney(quote.totalPrice)}</td>
                        <td className="py-2 pr-3">{quote.freightValue ? formatMoney(quote.freightValue) : "—"}</td>
                        <td className="py-2 pr-3">{quote.deliveryDays !== null ? `${quote.deliveryDays}d` : "—"}</td>
                        <td className="py-2 pr-3 text-neutral-500 dark:text-neutral-400">{quote.notes ?? "—"}</td>
                        <td className="py-2 pr-3">
                          {quote.selected ? (
                            <span className="font-medium text-emerald-700 dark:text-emerald-400">✓ Vencedora</span>
                          ) : (
                            canManageQuotes && (
                              <button
                                disabled={busy}
                                onClick={() => selectQuote(quote.id)}
                                className="font-medium text-neutral-900 underline dark:text-neutral-100"
                              >
                                Selecionar
                              </button>
                            )
                          )}
                        </td>
                        {canManageQuotes && (
                          <td className="py-2 text-right">
                            {!quote.selected && (
                              <button
                                disabled={busy}
                                onClick={() => removeQuote(quote.id)}
                                className="text-red-600 dark:text-red-400"
                              >
                                Remover
                              </button>
                            )}
                          </td>
                        )}
                      </tr>
                      <tr key={`${quote.id}-attachments`} className="border-b border-neutral-100 dark:border-neutral-800">
                        <td colSpan={canManageQuotes ? 7 : 6} className="pb-2 pl-0">
                          <div className="flex flex-wrap items-center gap-3 pl-0 text-xs">
                            {quote.attachments.map((attachment) => (
                              <span key={attachment.id} className="flex items-center gap-1">
                                <button
                                  onClick={() => openAttachment(quote.id, attachment)}
                                  className="text-neutral-700 underline hover:text-neutral-900 dark:text-neutral-300 dark:hover:text-neutral-100"
                                >
                                  📎 {attachment.fileName} ({formatBytes(attachment.sizeBytes)})
                                </button>
                                {canManageQuotes && (
                                  <button
                                    disabled={busy}
                                    onClick={() => removeAttachment(quote.id, attachment.id)}
                                    className="text-red-600 dark:text-red-400"
                                  >
                                    ✕
                                  </button>
                                )}
                              </span>
                            ))}
                            {canManageQuotes && (
                              <label className="font-medium text-neutral-500 underline dark:text-neutral-400">
                                + anexar orçamento
                                <input
                                  type="file"
                                  accept="image/png,image/jpeg,image/webp,application/pdf"
                                  className="hidden"
                                  disabled={busy}
                                  onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) uploadAttachment(quote.id, file);
                                    e.target.value = "";
                                  }}
                                />
                              </label>
                            )}
                          </div>
                        </td>
                      </tr>
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {canManageQuotes && (
            <form onSubmit={addQuote} className="mt-4 space-y-3 border-t border-neutral-200 pt-4 dark:border-neutral-800">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className={labelClass}>Fornecedor</label>
                  <input
                    required
                    list="supplier-options"
                    className={inputClass}
                    value={quoteForm.supplierName}
                    onChange={(e) => setQuoteForm({ ...quoteForm, supplierName: e.target.value })}
                  />
                  <datalist id="supplier-options">
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.name} />
                    ))}
                  </datalist>
                </div>
                <div>
                  <label className={labelClass}>Valor total</label>
                  <input
                    required
                    type="number"
                    min="0"
                    step="any"
                    className={inputClass}
                    value={quoteForm.totalPrice}
                    onChange={(e) => setQuoteForm({ ...quoteForm, totalPrice: e.target.value })}
                  />
                </div>
                <div>
                  <label className={labelClass}>Frete</label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    className={inputClass}
                    value={quoteForm.freightValue}
                    onChange={(e) => setQuoteForm({ ...quoteForm, freightValue: e.target.value })}
                  />
                </div>
                <div>
                  <label className={labelClass}>Prazo de entrega (dias)</label>
                  <input
                    type="number"
                    min="0"
                    className={inputClass}
                    value={quoteForm.deliveryDays}
                    onChange={(e) => setQuoteForm({ ...quoteForm, deliveryDays: e.target.value })}
                  />
                </div>
                <div className="col-span-2">
                  <label className={labelClass}>Condição (pagamento, observações)</label>
                  <input
                    className={inputClass}
                    value={quoteForm.notes}
                    onChange={(e) => setQuoteForm({ ...quoteForm, notes: e.target.value })}
                  />
                </div>
              </div>
              <div className="flex justify-end">
                <button type="submit" disabled={busy} className={buttonPrimaryClass}>
                  Adicionar cotação
                </button>
              </div>
            </form>
          )}

          {canManageQuotes && <QuoteDeadlineForm requestId={id!} deadline={request.quoteDeadline} onSaved={load} />}
        </div>
      )}

      {canAdvanceStatus && statusOptions.length > 0 && (
        <div className={cardClass}>
          <h2 className="mb-3 text-sm font-semibold text-neutral-700 dark:text-neutral-300">Avançar status</h2>
          <div className="flex flex-wrap gap-3">
            {statusOptions.map((opt) => (
              <button
                key={opt.value}
                disabled={busy}
                onClick={() => advanceStatus(opt.value)}
                className={buttonSecondaryClass}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className={cardClass}>
        <h2 className="mb-3 text-sm font-semibold text-neutral-700 dark:text-neutral-300">Linha do tempo</h2>
        <Timeline request={request} />
      </div>
    </div>
  );
}

function QuoteDeadlineBadge({ deadline }: { deadline: string }) {
  const days = daysUntil(deadline);
  const label = deadlineLabel(days);
  const tone =
    days < 0
      ? "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400"
      : days <= 1
        ? "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400"
        : "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400";

  return (
    <span className={`ml-2 rounded-full px-2 py-0.5 text-xs font-medium normal-case ${tone}`}>
      Prazo: {new Date(deadline).toLocaleDateString("pt-BR")} · {label}
    </span>
  );
}

function QuoteDeadlineForm({
  requestId,
  deadline,
  onSaved,
}: {
  requestId: string;
  deadline: string | null;
  onSaved: () => void;
}) {
  const [value, setValue] = useState(deadline ? deadline.slice(0, 10) : "");
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      await api.patch(`/purchase-requests/${requestId}/quote-deadline`, {
        quoteDeadline: value ? new Date(`${value}T23:59:59`).toISOString() : null,
      });
      onSaved();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mt-4 flex items-end gap-3 border-t border-neutral-200 pt-4 dark:border-neutral-800">
      <div>
        <label className={labelClass}>Prazo para fechar a cotação</label>
        <input type="date" className={inputClass} value={value} onChange={(e) => setValue(e.target.value)} />
      </div>
      <button type="button" disabled={saving} onClick={save} className={buttonSecondaryClass}>
        Salvar prazo
      </button>
    </div>
  );
}
