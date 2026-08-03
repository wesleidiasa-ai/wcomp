import { Prisma, PurchaseRequest } from "@prisma/client";
import { ApiError } from "../middleware/errorHandler";
import { notify } from "./notification.service";

type Db = Prisma.TransactionClient;

/**
 * Decide quais approval_rules se aplicam a um pedido: regras do setor têm
 * prioridade sobre regras "vale pra empresa toda" (department_id = null).
 * Dentro do grupo escolhido, filtra pela faixa de valor e ordena por step_order.
 */
async function pickApplicableRules(db: Db, companyId: string, departmentId: string | null, total: number) {
  const inRange = (min: Prisma.Decimal, max: Prisma.Decimal | null) =>
    total >= Number(min) && (max === null || total <= Number(max));

  if (departmentId) {
    const departmentRules = await db.approvalRule.findMany({
      where: { companyId, departmentId },
      orderBy: { stepOrder: "asc" },
    });
    const applicable = departmentRules.filter((r) => inRange(r.minValue, r.maxValue));
    if (applicable.length > 0) return applicable;
  }

  const companyWideRules = await db.approvalRule.findMany({
    where: { companyId, departmentId: null },
    orderBy: { stepOrder: "asc" },
  });
  return companyWideRules.filter((r) => inRange(r.minValue, r.maxValue));
}

/**
 * Gera as approval_steps (cópia congelada das regras) para um pedido recém-criado,
 * registra o histórico de status e notifica o primeiro aprovador.
 * Se nenhuma regra se aplicar, o pedido é aprovado automaticamente.
 */
export async function generateApprovalSteps(db: Db, request: PurchaseRequest) {
  const rules = await pickApplicableRules(
    db,
    request.companyId,
    request.departmentId,
    Number(request.estimatedTotal ?? 0)
  );

  if (rules.length === 0) {
    const updated = await db.purchaseRequest.update({
      where: { id: request.id },
      data: { status: "aprovado" },
    });

    await db.statusHistory.create({
      data: {
        requestId: request.id,
        fromStatus: request.status,
        toStatus: "aprovado",
        note: "Aprovado automaticamente: nenhuma regra de aprovação aplicável",
      },
    });

    await notify(db, {
      userId: request.requesterId,
      requestId: request.id,
      message: `Seu pedido "${request.title}" foi aprovado automaticamente (sem regra de aprovação aplicável).`,
    });

    return updated;
  }

  await db.approvalStep.createMany({
    data: rules.map((rule) => ({
      requestId: request.id,
      stepOrder: rule.stepOrder,
      approverId: rule.approverId,
    })),
  });

  await db.statusHistory.create({
    data: {
      requestId: request.id,
      fromStatus: request.status,
      toStatus: "aguardando_aprovacao",
      note: `${rules.length} etapa(s) de aprovação geradas`,
    },
  });

  const firstApprover = rules[0].approverId;
  await notify(db, {
    userId: firstApprover,
    requestId: request.id,
    message: `Novo pedido de compra "${request.title}" aguardando sua aprovação.`,
  });

  return db.purchaseRequest.findUniqueOrThrow({ where: { id: request.id } });
}

type DecideInput = {
  requestId: string;
  stepId: string;
  decision: "aprovado" | "reprovado";
  comment?: string;
  actingUserId: string;
  actingUserRole: string;
};

export async function decideApprovalStep(db: Db, input: DecideInput) {
  const step = await db.approvalStep.findFirst({
    where: { id: input.stepId, requestId: input.requestId },
  });
  if (!step) throw new ApiError(404, "Etapa de aprovação não encontrada");
  if (step.status !== "pendente") throw new ApiError(409, "Esta etapa já foi decidida");

  if (step.approverId !== input.actingUserId && input.actingUserRole !== "admin") {
    throw new ApiError(403, "Você não é o aprovador designado para esta etapa");
  }

  const priorPending = await db.approvalStep.findFirst({
    where: { requestId: input.requestId, stepOrder: { lt: step.stepOrder }, status: "pendente" },
  });
  if (priorPending) {
    throw new ApiError(409, "Existe uma etapa anterior ainda pendente de aprovação");
  }

  await db.approvalStep.update({
    where: { id: step.id },
    data: { status: input.decision, comment: input.comment, decidedAt: new Date() },
  });

  const request = await db.purchaseRequest.findUniqueOrThrow({ where: { id: input.requestId } });

  if (input.decision === "reprovado") {
    const updated = await db.purchaseRequest.update({
      where: { id: request.id },
      data: { status: "reprovado" },
    });

    await db.statusHistory.create({
      data: {
        requestId: request.id,
        fromStatus: request.status,
        toStatus: "reprovado",
        changedBy: input.actingUserId,
        note: input.comment ?? `Reprovado na etapa ${step.stepOrder}`,
      },
    });

    await notify(db, {
      userId: request.requesterId,
      requestId: request.id,
      message: `Seu pedido "${request.title}" foi reprovado.`,
    });

    return updated;
  }

  const nextPending = await db.approvalStep.findFirst({
    where: { requestId: request.id, status: "pendente" },
    orderBy: { stepOrder: "asc" },
  });

  if (nextPending) {
    await notify(db, {
      userId: nextPending.approverId,
      requestId: request.id,
      message: `Pedido de compra "${request.title}" aguardando sua aprovação.`,
    });
    return request;
  }

  const updated = await db.purchaseRequest.update({
    where: { id: request.id },
    data: { status: "aprovado" },
  });

  await db.statusHistory.create({
    data: {
      requestId: request.id,
      fromStatus: request.status,
      toStatus: "aprovado",
      changedBy: input.actingUserId,
      note: "Todas as etapas de aprovação foram concluídas",
    },
  });

  await notify(db, {
    userId: request.requesterId,
    requestId: request.id,
    message: `Seu pedido "${request.title}" foi totalmente aprovado.`,
  });

  return updated;
}
