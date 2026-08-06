import { sendEmail } from "../lib/email";

const APP_URL = process.env.APP_URL || "https://supplyor.com.br";

function layout(title: string, bodyHtml: string) {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; color: #111;">
      <h2 style="color: #1d4ed8;">${title}</h2>
      ${bodyHtml}
      <p style="margin-top: 32px; font-size: 12px; color: #888;">SupplyOR — sistema de pedidos de compra</p>
    </div>
  `;
}

export async function sendWelcomeEmail(input: { to: string; name: string; companyName: string; password: string }) {
  await sendEmail({
    to: input.to,
    subject: `Seu acesso ao SupplyOR — ${input.companyName}`,
    html: layout(
      "Bem-vindo(a) ao SupplyOR",
      `
        <p>Olá, ${input.name}!</p>
        <p>Foi criado um acesso pra você no sistema de pedidos de compra da <strong>${input.companyName}</strong>.</p>
        <p><strong>E-mail:</strong> ${input.to}<br/><strong>Senha provisória:</strong> ${input.password}</p>
        <p>No primeiro acesso, você vai precisar trocar essa senha por uma de sua escolha.</p>
        <p><a href="${APP_URL}/login" style="display:inline-block;background:#1d4ed8;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;">Acessar o sistema</a></p>
      `
    ),
  });
}

export async function sendPasswordResetEmail(input: { to: string; name: string; token: string }) {
  const resetUrl = `${APP_URL}/redefinir-senha?token=${input.token}`;
  await sendEmail({
    to: input.to,
    subject: "Redefinir sua senha — SupplyOR",
    html: layout(
      "Redefinição de senha",
      `
        <p>Olá, ${input.name}.</p>
        <p>Pediram a redefinição da senha da sua conta no SupplyOR. Se não foi você, pode ignorar este e-mail.</p>
        <p><a href="${resetUrl}" style="display:inline-block;background:#1d4ed8;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;">Redefinir senha</a></p>
        <p style="font-size: 13px; color: #555;">Esse link expira em 1 hora.</p>
      `
    ),
  });
}
