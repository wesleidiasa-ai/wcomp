import { Prisma } from "@prisma/client";

type Db = Prisma.TransactionClient;

type NotifyInput = {
  userId: string;
  requestId: string;
  message: string;
  channel?: "whatsapp" | "email";
};

/**
 * Stub de envio: grava a notificação no banco e loga no console.
 * Trocar o console.log por uma integração real (WhatsApp Business API / e-mail) aqui.
 */
export async function notify(db: Db, { userId, requestId, message, channel = "whatsapp" }: NotifyInput) {
  console.log(`[notify:${channel}] user=${userId} request=${requestId} -> ${message}`);

  return db.notification.create({
    data: { userId, requestId, channel, message },
  });
}
