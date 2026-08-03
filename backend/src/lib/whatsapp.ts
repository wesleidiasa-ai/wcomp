const ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN;
const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;
const GRAPH_API_VERSION = process.env.WHATSAPP_GRAPH_API_VERSION || "v21.0";

export const whatsappConfigured = Boolean(ACCESS_TOKEN && PHONE_NUMBER_ID);

export function normalizePhone(raw: string): string {
  return raw.replace(/\D/g, "");
}

/**
 * Envia uma mensagem de texto via WhatsApp Cloud API.
 * Sem credenciais configuradas (dev), só loga no console — mesmo padrão do
 * stub de notifications, pra dar pra testar o bot inteiro sem conta da Meta.
 */
export async function sendWhatsAppText(to: string, body: string): Promise<void> {
  if (!whatsappConfigured) {
    console.log(`[whatsapp:stub] to=${to} -> ${body}`);
    return;
  }

  const res = await fetch(`https://graph.facebook.com/${GRAPH_API_VERSION}/${PHONE_NUMBER_ID}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${ACCESS_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to,
      type: "text",
      text: { body },
    }),
  });

  if (!res.ok) {
    const errorBody = await res.text().catch(() => "");
    console.error(`[whatsapp] falha ao enviar mensagem para ${to}: ${res.status} ${errorBody}`);
  }
}
