import crypto from "crypto";
import { Request, Router } from "express";
import { prisma } from "../lib/prisma";
import { handleIncomingWhatsAppMessage } from "../services/whatsappBot.service";

export const whatsappWebhookRouter = Router();

const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN;
const APP_SECRET = process.env.WHATSAPP_APP_SECRET;

// Handshake de verificação exigido pela Meta ao configurar o webhook no painel.
whatsappWebhookRouter.get("/", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && VERIFY_TOKEN && token === VERIFY_TOKEN) {
    res.status(200).send(challenge);
    return;
  }
  res.sendStatus(403);
});

function isValidSignature(req: Request): boolean {
  // Sem APP_SECRET configurado não dá pra verificar — permitido só pra facilitar
  // testes locais; em produção o WHATSAPP_APP_SECRET é obrigatório.
  if (!APP_SECRET) return true;

  const signature = req.header("x-hub-signature-256");
  if (!signature || !req.rawBody) return false;

  const expected = "sha256=" + crypto.createHmac("sha256", APP_SECRET).update(req.rawBody).digest("hex");
  try {
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  } catch {
    return false;
  }
}

type WhatsAppTextMessage = {
  from: string;
  type: string;
  text?: { body: string };
};

type WhatsAppChange = {
  value?: {
    metadata?: { phone_number_id?: string };
    messages?: WhatsAppTextMessage[];
  };
};

whatsappWebhookRouter.post("/", async (req, res) => {
  if (!isValidSignature(req)) {
    res.sendStatus(401);
    return;
  }

  // Ack imediato: a Meta espera 200 rápido e reenvia (spam) se demorar ou falhar.
  res.sendStatus(200);

  const entries = (req.body?.entry ?? []) as Array<{ changes?: WhatsAppChange[] }>;

  for (const entry of entries) {
    for (const change of entry.changes ?? []) {
      const phoneNumberId = change.value?.metadata?.phone_number_id;
      const messages = change.value?.messages ?? [];
      if (messages.length === 0) continue;

      // O phone_number_id identifica QUAL número da Meta recebeu a mensagem —
      // é assim que resolvemos a qual empresa (tenant) ela pertence. Sem isso,
      // não há como saber de qual empresa é o usuário que está mandando mensagem.
      if (!phoneNumberId) {
        console.error("[whatsapp webhook] payload sem metadata.phone_number_id, ignorando");
        continue;
      }

      const company = await prisma.company.findUnique({ where: { whatsappPhoneNumberId: phoneNumberId } });
      if (!company) {
        console.error(`[whatsapp webhook] nenhuma empresa configurada para o número ${phoneNumberId}`);
        continue;
      }

      for (const message of messages) {
        if (message.type === "text" && message.from && message.text?.body) {
          await handleIncomingWhatsAppMessage(company.id, message.from, message.text.body).catch((err) => {
            console.error("[whatsapp webhook] erro ao processar mensagem", err);
          });
        }
      }
    }
  }
});
