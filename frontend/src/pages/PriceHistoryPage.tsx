import { useEffect, useState } from "react";
import { api, ApiError } from "../lib/api";
import type { PriceHistoryItem } from "../types";
import { cardClass } from "../components/ui";

function formatMoney(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function PriceHistoryPage() {
  const [items, setItems] = useState<PriceHistoryItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<PriceHistoryItem[]>("/price-history")
      .then(setItems)
      .catch((err) => setError(err instanceof ApiError ? err.message : "Erro ao carregar histórico de preços"));
  }, []);

  if (error) return <p className="text-sm text-red-600 dark:text-red-400">{error}</p>;
  if (!items) return <p className="text-sm text-neutral-500">Carregando...</p>;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Histórico de preços</h1>
        <p className="text-sm text-neutral-500 dark:text-neutral-400">
          Preço médio estimado por item, por ano, com base nos pedidos criados.
        </p>
      </div>

      {items.length === 0 ? (
        <div className={cardClass}>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            Ainda não há itens com preço estimado suficiente para montar o histórico.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <div key={item.itemName} className={cardClass}>
              <h2 className="mb-2 text-sm font-semibold text-neutral-900 dark:text-neutral-100">{item.itemName}</h2>
              <div className="flex flex-wrap gap-4">
                {item.years.map((y) => (
                  <div key={y.year} className="min-w-[100px]">
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">{y.year}</p>
                    <p className="text-lg font-bold">{formatMoney(y.avgPrice)}</p>
                    {y.variationPct !== null && (
                      <p
                        className={`text-xs font-medium ${
                          y.variationPct > 0
                            ? "text-red-600 dark:text-red-400"
                            : y.variationPct < 0
                              ? "text-emerald-600 dark:text-emerald-400"
                              : "text-neutral-500"
                        }`}
                      >
                        {y.variationPct > 0 ? "+" : ""}
                        {y.variationPct.toFixed(1)}%
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
