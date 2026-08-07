import { prisma } from "./prisma";

export async function logAudit(action: string, targetName: string, detail?: string) {
  await prisma.auditLog.create({ data: { action, targetName, detail } });
}
