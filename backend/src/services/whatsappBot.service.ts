import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { normalizePhone, sendWhatsAppText } from "../lib/whatsapp";
import { createPurchaseRequest } from "./purchaseRequest.service";

type DraftItem = {
  itemName: string;
  quantity?: number;
  unit?: string;
  estimatedUnitPrice?: number;
};

type Draft = {
  title?: string;
  departmentId?: string | null;
  items: DraftItem[];
  currentItem?: DraftItem;
};

const START_TRIGGERS = ["pedido", "solicitar", "comprar"];
const CANCEL_WORDS = ["cancelar", "cancela", "parar"];

function emptyDraft(): Draft {
  return { items: [] };
}

function parseDraft(value: Prisma.JsonValue | null): Draft {
  if (!value || typeof value !== "object") return emptyDraft();
  return value as unknown as Draft;
}

function parseNumber(text: string): number | null {
  const n = Number(text.trim().replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

function normalizeText(text: string) {
  return text.trim().toLowerCase();
}

function formatMoney(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

async function reply(phone: string, message: string) {
  await sendWhatsAppText(phone, message);
}

async function saveSession(companyId: string, phone: string, state: string, draft: Draft | null) {
  await prisma.whatsAppSession.update({
    where: { companyId_phone: { companyId, phone } },
    data: { state, draft: draft ? (draft as unknown as Prisma.InputJsonValue) : Prisma.JsonNull },
  });
}

async function resetSession(companyId: string, phone: string, message: string) {
  await saveSession(companyId, phone, "idle", null);
  await reply(phone, message);
}

function itemSummaryLine(item: DraftItem, index: number) {
  const price = item.estimatedUnitPrice !== undefined ? ` x ${formatMoney(item.estimatedUnitPrice)}` : "";
  return `${index + 1}. ${item.itemName} — ${item.quantity}${item.unit ? ` ${item.unit}` : ""}${price}`;
}

async function findUserByPhone(companyId: string, phone: string) {
  const users = await prisma.user.findMany({ where: { companyId, phone: { not: null } } });
  return users.find((u) => u.phone && normalizePhone(u.phone) === phone) ?? null;
}

/**
 * Motor de conversa do bot de intake de pedidos via WhatsApp: guia o solicitante
 * por título -> setor -> itens -> confirmação, e cria o pedido no final usando
 * a mesma regra de negócio da rota REST (createPurchaseRequest).
 *
 * `companyId` já vem resolvido pelo webhook (a partir do phone_number_id que
 * recebeu a mensagem) — o usuário só é buscado dentro dessa empresa, nunca
 * globalmente, pra não vazar dado entre tenants.
 */
export async function handleIncomingWhatsAppMessage(companyId: string, rawPhone: string, rawText: string) {
  const phone = normalizePhone(rawPhone);
  const text = rawText.trim();
  const normalized = normalizeText(text);

  const session = await prisma.whatsAppSession.upsert({
    where: { companyId_phone: { companyId, phone } },
    create: { companyId, phone, state: "idle" },
    update: {},
  });

  if (session.state !== "idle" && CANCEL_WORDS.includes(normalized)) {
    await resetSession(companyId, phone, "Pedido cancelado. Digite 'pedido' para começar de novo.");
    return;
  }

  if (session.state === "idle") {
    if (!START_TRIGGERS.some((t) => normalized.includes(t))) {
      await reply(phone, "Olá! Digite 'pedido' para registrar um novo pedido de compra.");
      return;
    }

    const user = await findUserByPhone(companyId, phone);

    if (!user) {
      await reply(
        phone,
        "Seu número não está cadastrado no sistema. Peça para o administrador te cadastrar com este número de WhatsApp."
      );
      return;
    }

    await saveSession(companyId, phone, "awaiting_title", emptyDraft());
    await reply(phone, "Vamos registrar seu pedido de compra. Qual o título/resumo do pedido?");
    return;
  }

  const user = await findUserByPhone(companyId, phone);
  if (!user) {
    await resetSession(
      companyId,
      phone,
      "Seu cadastro não foi encontrado. Peça pro administrador te cadastrar e digite 'pedido' de novo."
    );
    return;
  }

  const draft = parseDraft(session.draft);

  switch (session.state) {
    case "awaiting_title": {
      draft.title = text;

      const departments = await prisma.department.findMany({
        where: { companyId: user.companyId },
        orderBy: { name: "asc" },
      });

      if (departments.length === 0) {
        await saveSession(companyId, phone, "awaiting_item_name", draft);
        await reply(phone, "Qual o nome do primeiro item?");
        return;
      }

      await saveSession(companyId, phone, "awaiting_department", draft);
      const list = departments.map((d, i) => `${i + 1}. ${d.name}`).join("\n");
      await reply(phone, `Qual o setor? Responda com o número:\n${list}\n0. Usar meu setor padrão`);
      return;
    }

    case "awaiting_department": {
      const departments = await prisma.department.findMany({
        where: { companyId: user.companyId },
        orderBy: { name: "asc" },
      });
      const n = parseNumber(text);
      if (n !== null && n >= 1 && n <= departments.length) {
        draft.departmentId = departments[n - 1].id;
      } else {
        draft.departmentId = null;
      }

      await saveSession(companyId, phone, "awaiting_item_name", draft);
      await reply(phone, "Qual o nome do primeiro item?");
      return;
    }

    case "awaiting_item_name": {
      draft.currentItem = { itemName: text };
      await saveSession(companyId, phone, "awaiting_item_qty", draft);
      await reply(phone, "Quantidade?");
      return;
    }

    case "awaiting_item_qty": {
      const qty = parseNumber(text);
      if (qty === null || qty <= 0) {
        await reply(phone, "Não entendi. Digite só o número da quantidade (ex: 10).");
        return;
      }
      draft.currentItem!.quantity = qty;
      await saveSession(companyId, phone, "awaiting_item_price", draft);
      await reply(phone, "Valor unitário estimado? (ou digite 'pular')");
      return;
    }

    case "awaiting_item_price": {
      if (normalized !== "pular") {
        const price = parseNumber(text);
        if (price === null || price < 0) {
          await reply(phone, "Não entendi. Digite um valor (ex: 25.90) ou 'pular'.");
          return;
        }
        draft.currentItem!.estimatedUnitPrice = price;
      }

      draft.items.push(draft.currentItem!);
      draft.currentItem = undefined;
      await saveSession(companyId, phone, "awaiting_more_items", draft);
      await reply(phone, "Item adicionado! Quer adicionar mais um item? (sim/não)");
      return;
    }

    case "awaiting_more_items": {
      if (normalized === "sim" || normalized === "s") {
        await saveSession(companyId, phone, "awaiting_item_name", draft);
        await reply(phone, `Item ${draft.items.length + 1} — qual o nome do item?`);
        return;
      }
      if (normalized === "não" || normalized === "nao" || normalized === "n") {
        await saveSession(companyId, phone, "awaiting_confirmation", draft);
        const lines = draft.items.map(itemSummaryLine).join("\n");
        const total = draft.items.reduce((sum, i) => sum + (i.quantity ?? 0) * (i.estimatedUnitPrice ?? 0), 0);
        await reply(
          phone,
          `Confira seu pedido:\n📌 ${draft.title}\n\nItens:\n${lines}\n\nTotal estimado: ${formatMoney(total)}\n\nConfirma o envio? (sim/não)`
        );
        return;
      }
      await reply(phone, "Responda 'sim' ou 'não'.");
      return;
    }

    case "awaiting_confirmation": {
      if (normalized === "não" || normalized === "nao" || normalized === "n" || normalized === "cancelar") {
        await resetSession(companyId, phone, "Pedido cancelado. Digite 'pedido' para começar de novo.");
        return;
      }
      if (normalized !== "sim" && normalized !== "s") {
        await reply(phone, "Responda 'sim' para confirmar ou 'não' para cancelar.");
        return;
      }

      const created = await createPurchaseRequest({
        companyId: user.companyId,
        requesterId: user.id,
        departmentId: draft.departmentId ?? undefined,
        title: draft.title!,
        urgency: "normal",
        items: draft.items.map((item) => ({
          itemName: item.itemName,
          quantity: item.quantity!,
          unit: item.unit,
          estimatedUnitPrice: item.estimatedUnitPrice,
        })),
      });

      await resetSession(
        companyId,
        phone,
        created.status === "aprovado"
          ? `Pedido "${created.title}" criado e aprovado automaticamente! ✅`
          : `Pedido "${created.title}" criado e enviado para aprovação. Você será avisado quando houver uma decisão.`
      );
      return;
    }

    default: {
      await resetSession(companyId, phone, "Algo deu errado, vamos recomeçar. Digite 'pedido' para começar de novo.");
    }
  }
}
