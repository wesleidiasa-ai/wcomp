import type { PurchaseRequestSummary } from "../types";
import { daysSince } from "./relativeDate";

const STALL_THRESHOLD_DAYS = 3;
const STALLABLE_STATUSES = ["aguardando_aprovacao", "em_cotacao"];
const AWAITING_DELIVERY_STATUSES = ["pedido_enviado", "aguardando_entrega", "aguardando_retirada"];

export type RequestAlert = { text: string } | null;

/** Alertas simples calculados no cliente a partir dos dados já carregados na lista. */
export function getRequestAlert(r: PurchaseRequestSummary): RequestAlert {
  if (STALLABLE_STATUSES.includes(r.status)) {
    const days = daysSince(r.updatedAt);
    if (days >= STALL_THRESHOLD_DAYS) {
      return { text: `Parado há ${days} dias` };
    }
  }

  if (AWAITING_DELIVERY_STATUSES.includes(r.status)) {
    const quote = r.quotes[0];
    if (quote?.deliveryDays) {
      const expected = new Date(quote.createdAt);
      expected.setDate(expected.getDate() + quote.deliveryDays);
      if (new Date() > expected) {
        return { text: `Fornecedor atrasado (${daysSince(expected.toISOString())}d)` };
      }
    }
  }

  return null;
}
