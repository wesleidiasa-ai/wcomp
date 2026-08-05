import { prisma } from "../lib/prisma";
import { ApiError } from "../middleware/errorHandler";
import { generateApprovalSteps } from "./approvalEngine.service";

type CreatePurchaseRequestItem = {
  itemName: string;
  quantity: number;
  unit?: string;
  estimatedUnitPrice?: number;
  notes?: string;
};

type CreatePurchaseRequestInput = {
  companyId: string;
  requesterId: string;
  departmentId?: string;
  title: string;
  justification?: string;
  urgency: "baixa" | "normal" | "alta" | "urgente";
  estimatedTotal?: number;
  items: CreatePurchaseRequestItem[];
};

/**
 * Cria um pedido de compra e roda o motor de aprovação em cima dele.
 * Compartilhado entre a rota REST (POST /purchase-requests) e o bot do WhatsApp,
 * pra manter as duas entradas com exatamente a mesma regra de negócio.
 */
export async function createPurchaseRequest(input: CreatePurchaseRequestInput) {
  if (input.departmentId) {
    const department = await prisma.department.findFirst({
      where: { id: input.departmentId, companyId: input.companyId },
    });
    if (!department) throw new ApiError(400, "Setor inválido para esta empresa");
  }

  const computedTotal =
    input.estimatedTotal ??
    input.items.reduce((sum, item) => sum + item.quantity * (item.estimatedUnitPrice ?? 0), 0);

  return prisma.$transaction(async (tx) => {
    const company = await tx.company.update({
      where: { id: input.companyId },
      data: { requestCounter: { increment: 1 } },
    });

    const created = await tx.purchaseRequest.create({
      data: {
        companyId: input.companyId,
        requesterId: input.requesterId,
        departmentId: input.departmentId,
        title: input.title,
        justification: input.justification,
        urgency: input.urgency,
        estimatedTotal: computedTotal,
        requestNumber: company.requestCounter,
        items: { create: input.items },
      },
    });

    return generateApprovalSteps(tx, created);
  });
}
