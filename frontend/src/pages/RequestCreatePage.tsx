import { useEffect, useState, type FormEvent } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { api, ApiError } from "../lib/api";
import type { Department, PurchaseRequestDetail, Urgency } from "../types";
import { buttonAccentClass, buttonSecondaryClass, cardClass, inputClass, labelClass } from "../components/ui";

type ItemForm = {
  itemName: string;
  quantity: string;
  unit: string;
  estimatedUnitPrice: string;
  notes: string;
};

const EMPTY_ITEM: ItemForm = { itemName: "", quantity: "1", unit: "", estimatedUnitPrice: "", notes: "" };

export function RequestCreatePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const duplicateFrom = searchParams.get("duplicateFrom");

  const [departments, setDepartments] = useState<Department[]>([]);
  const [title, setTitle] = useState("");
  const [justification, setJustification] = useState("");
  const [urgency, setUrgency] = useState<Urgency>("normal");
  const [departmentId, setDepartmentId] = useState("");
  const [items, setItems] = useState<ItemForm[]>([{ ...EMPTY_ITEM }]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [duplicating, setDuplicating] = useState(Boolean(duplicateFrom));

  useEffect(() => {
    api.get<Department[]>("/departments").then(setDepartments).catch(() => {});
  }, []);

  useEffect(() => {
    if (!duplicateFrom) return;
    api
      .get<PurchaseRequestDetail>(`/purchase-requests/${duplicateFrom}`)
      .then((original) => {
        setTitle(`${original.title} (cópia)`);
        setJustification(original.justification ?? "");
        setUrgency(original.urgency);
        setDepartmentId(original.department?.id ?? "");
        setItems(
          original.items.map((it) => ({
            itemName: it.itemName,
            quantity: String(it.quantity),
            unit: it.unit ?? "",
            estimatedUnitPrice: it.estimatedUnitPrice ?? "",
            notes: it.notes ?? "",
          }))
        );
      })
      .catch(() => setError("Não foi possível carregar o pedido original pra duplicar"))
      .finally(() => setDuplicating(false));
  }, [duplicateFrom]);

  function updateItem(index: number, field: keyof ItemForm, value: string) {
    setItems((prev) => prev.map((it, i) => (i === index ? { ...it, [field]: value } : it)));
  }

  function addItem() {
    setItems((prev) => [...prev, { ...EMPTY_ITEM }]);
  }

  function removeItem(index: number) {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }

  const estimatedTotal = items.reduce((sum, it) => {
    const qty = Number(it.quantity) || 0;
    const price = Number(it.estimatedUnitPrice) || 0;
    return sum + qty * price;
  }, 0);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (items.some((it) => !it.itemName.trim() || !it.quantity)) {
      setError("Preencha nome e quantidade de todos os itens");
      return;
    }

    setLoading(true);
    try {
      const created = await api.post<PurchaseRequestDetail>("/purchase-requests", {
        title,
        justification: justification || undefined,
        urgency,
        departmentId: departmentId || undefined,
        items: items.map((it) => ({
          itemName: it.itemName,
          quantity: Number(it.quantity),
          unit: it.unit || undefined,
          estimatedUnitPrice: it.estimatedUnitPrice ? Number(it.estimatedUnitPrice) : undefined,
          notes: it.notes || undefined,
        })),
      });
      navigate(`/pedidos/${created.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não foi possível criar o pedido");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-5 text-xl font-semibold">Novo pedido de compra</h1>
      {duplicating && <p className="mb-4 text-sm text-neutral-500">Carregando dados do pedido original...</p>}
      <form onSubmit={handleSubmit} className={`${cardClass} space-y-5`}>
        <div>
          <label className={labelClass}>Título</label>
          <input required className={inputClass} value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>

        <div>
          <label className={labelClass}>Justificativa</label>
          <textarea
            className={inputClass}
            rows={3}
            value={justification}
            onChange={(e) => setJustification(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Urgência</label>
            <select className={inputClass} value={urgency} onChange={(e) => setUrgency(e.target.value as Urgency)}>
              <option value="baixa">Baixa</option>
              <option value="normal">Normal</option>
              <option value="alta">Alta</option>
              <option value="urgente">Urgente</option>
            </select>
          </div>
          <div>
            <label className={labelClass}>Setor</label>
            <select className={inputClass} value={departmentId} onChange={(e) => setDepartmentId(e.target.value)}>
              <option value="">Sem setor específico</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <label className={labelClass}>Itens</label>
            <button type="button" onClick={addItem} className="text-sm font-medium text-neutral-900 underline dark:text-neutral-100">
              + adicionar item
            </button>
          </div>
          <div className="space-y-3">
            {items.map((item, index) => (
              <div key={index} className="grid grid-cols-12 gap-2 rounded-md border border-neutral-200 p-3 dark:border-neutral-800">
                <input
                  className={`${inputClass} col-span-4`}
                  placeholder="Item"
                  value={item.itemName}
                  onChange={(e) => updateItem(index, "itemName", e.target.value)}
                />
                <input
                  className={`${inputClass} col-span-2`}
                  placeholder="Qtd"
                  type="number"
                  min="0"
                  step="any"
                  value={item.quantity}
                  onChange={(e) => updateItem(index, "quantity", e.target.value)}
                />
                <input
                  className={`${inputClass} col-span-2`}
                  placeholder="Unidade"
                  value={item.unit}
                  onChange={(e) => updateItem(index, "unit", e.target.value)}
                />
                <input
                  className={`${inputClass} col-span-3`}
                  placeholder="Preço unit. est."
                  type="number"
                  min="0"
                  step="any"
                  value={item.estimatedUnitPrice}
                  onChange={(e) => updateItem(index, "estimatedUnitPrice", e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => removeItem(index)}
                  disabled={items.length === 1}
                  className="col-span-1 rounded-md text-red-600 disabled:opacity-30 dark:text-red-400"
                  title="Remover item"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
          <p className="mt-2 text-right text-sm text-neutral-500 dark:text-neutral-400">
            Total estimado:{" "}
            <span className="font-medium text-neutral-900 dark:text-neutral-100">
              {estimatedTotal.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
            </span>
          </p>
        </div>

        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

        <div className="flex justify-end gap-3">
          <button type="button" className={buttonSecondaryClass} onClick={() => navigate(-1)}>
            Cancelar
          </button>
          <button type="submit" disabled={loading} className={buttonAccentClass}>
            {loading ? "Enviando..." : "Criar pedido"}
          </button>
        </div>
      </form>
    </div>
  );
}
