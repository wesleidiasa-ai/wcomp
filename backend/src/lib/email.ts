const RESEND_API_KEY = process.env.RESEND_API_KEY;
const EMAIL_FROM = process.env.EMAIL_FROM || "SupplyOR <onboarding@resend.dev>";

export const emailConfigured = Boolean(RESEND_API_KEY);

/**
 * Envia um e-mail via Resend. Sem RESEND_API_KEY configurada (dev), só loga no
 * console — mesmo padrão do stub do WhatsApp, dá pra testar o fluxo inteiro
 * sem conta no Resend.
 */
export async function sendEmail({ to, subject, html }: { to: string; subject: string; html: string }): Promise<void> {
  if (!emailConfigured) {
    console.log(`[email:stub] to=${to} subject="${subject}"\n${html}`);
    return;
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from: EMAIL_FROM, to, subject, html }),
  });

  if (!res.ok) {
    const errorBody = await res.text().catch(() => "");
    console.error(`[email] falha ao enviar e-mail para ${to}: ${res.status} ${errorBody}`);
  }
}
