import fs from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { ALLOWED_MIME_TYPES, UPLOAD_DIR } from "../lib/storage";
import { asyncHandler } from "../middleware/asyncHandler";
import { requireAuth, requireRole } from "../middleware/auth";
import { ApiError } from "../middleware/errorHandler";
import { upload } from "../middleware/upload";
import { decideApprovalStep } from "../services/approvalEngine.service";
import { createPurchaseRequest } from "../services/purchaseRequest.service";

export const purchaseRequestRouter = Router();

purchaseRequestRouter.use(requireAuth);

const detailInclude = {
  requester: { select: { id: true, name: true, email: true } },
  department: true,
  items: true,
  approvalSteps: {
    orderBy: { stepOrder: "asc" as const },
    include: {
      approver: { select: { id: true, name: true, email: true } },
      decidedBy: { select: { id: true, name: true, email: true } },
    },
  },
  quotes: {
    orderBy: { createdAt: "asc" as const },
    include: {
      createdBy: { select: { id: true, name: true } },
      supplier: { select: { id: true, name: true, rating: true } },
      attachments: {
        orderBy: { createdAt: "asc" as const },
        select: {
          id: true,
          fileName: true,
          mimeType: true,
          sizeBytes: true,
          createdAt: true,
          uploadedBy: { select: { id: true, name: true } },
        },
      },
    },
  },
  statusHistory: { orderBy: { changedAt: "asc" as const } },
};

purchaseRequestRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const { status, departmentId } = req.query as { status?: string; departmentId?: string };

    const requests = await prisma.purchaseRequest.findMany({
      where: {
        companyId: req.user!.companyId,
        ...(status ? { status } : {}),
        ...(departmentId ? { departmentId } : {}),
        // solicitante só enxerga os próprios pedidos; demais papéis veem tudo da empresa
        ...(req.user!.role === "solicitante" ? { requesterId: req.user!.userId } : {}),
      },
      include: { requester: { select: { id: true, name: true } }, department: true, items: true },
      orderBy: { createdAt: "desc" },
    });

    res.json(requests);
  })
);

purchaseRequestRouter.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const request = await prisma.purchaseRequest.findFirst({
      where: { id: req.params.id, companyId: req.user!.companyId },
      include: detailInclude,
    });
    if (!request) throw new ApiError(404, "Pedido não encontrado");

    if (req.user!.role === "solicitante" && request.requesterId !== req.user!.userId) {
      throw new ApiError(403, "Você não tem acesso a este pedido");
    }

    res.json(request);
  })
);

const itemSchema = z.object({
  itemName: z.string().min(1),
  quantity: z.number().positive(),
  unit: z.string().optional(),
  estimatedUnitPrice: z.number().nonnegative().optional(),
  notes: z.string().optional(),
});

const createRequestSchema = z.object({
  title: z.string().min(1),
  justification: z.string().optional(),
  urgency: z.enum(["baixa", "normal", "alta", "urgente"]).default("normal"),
  departmentId: z.string().uuid().optional(),
  estimatedTotal: z.number().nonnegative().optional(),
  items: z.array(itemSchema).min(1),
});

purchaseRequestRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const body = createRequestSchema.parse(req.body);
    const departmentId = body.departmentId ?? req.user!.departmentId ?? undefined;

    const created = await createPurchaseRequest({
      companyId: req.user!.companyId,
      requesterId: req.user!.userId,
      departmentId,
      title: body.title,
      justification: body.justification,
      urgency: body.urgency,
      estimatedTotal: body.estimatedTotal,
      items: body.items,
    });

    const request = await prisma.purchaseRequest.findUniqueOrThrow({
      where: { id: created.id },
      include: detailInclude,
    });

    res.status(201).json(request);
  })
);

const updateRequestSchema = z.object({
  title: z.string().min(1).optional(),
  justification: z.string().optional(),
  urgency: z.enum(["baixa", "normal", "alta", "urgente"]).optional(),
});

purchaseRequestRouter.patch(
  "/:id",
  asyncHandler(async (req, res) => {
    const body = updateRequestSchema.parse(req.body);

    const existing = await prisma.purchaseRequest.findFirst({
      where: { id: req.params.id, companyId: req.user!.companyId },
    });
    if (!existing) throw new ApiError(404, "Pedido não encontrado");

    const isOwner = existing.requesterId === req.user!.userId;
    if (!isOwner && req.user!.role !== "admin") {
      throw new ApiError(403, "Você não tem permissão para editar este pedido");
    }
    if (existing.status !== "aguardando_aprovacao") {
      throw new ApiError(409, "Só é possível editar pedidos que ainda estão aguardando aprovação");
    }

    const updated = await prisma.purchaseRequest.update({ where: { id: existing.id }, data: body });
    res.json(updated);
  })
);

const decisionSchema = z.object({ comment: z.string().optional() });

purchaseRequestRouter.post(
  "/:id/approval-steps/:stepId/approve",
  requireRole("aprovador", "admin"),
  asyncHandler(async (req, res) => {
    const body = decisionSchema.parse(req.body ?? {});

    const request = await prisma.purchaseRequest.findFirst({
      where: { id: req.params.id, companyId: req.user!.companyId },
    });
    if (!request) throw new ApiError(404, "Pedido não encontrado");

    const updated = await prisma.$transaction((tx) =>
      decideApprovalStep(tx, {
        requestId: request.id,
        stepId: req.params.stepId,
        decision: "aprovado",
        comment: body.comment,
        actingUserId: req.user!.userId,
        actingUserRole: req.user!.role,
      })
    );

    res.json(updated);
  })
);

purchaseRequestRouter.post(
  "/:id/approval-steps/:stepId/reject",
  requireRole("aprovador", "admin"),
  asyncHandler(async (req, res) => {
    const body = decisionSchema.parse(req.body ?? {});

    const request = await prisma.purchaseRequest.findFirst({
      where: { id: req.params.id, companyId: req.user!.companyId },
    });
    if (!request) throw new ApiError(404, "Pedido não encontrado");

    const updated = await prisma.$transaction((tx) =>
      decideApprovalStep(tx, {
        requestId: request.id,
        stepId: req.params.stepId,
        decision: "reprovado",
        comment: body.comment,
        actingUserId: req.user!.userId,
        actingUserRole: req.user!.role,
      })
    );

    res.json(updated);
  })
);

const STATUS_TRANSITIONS: Record<string, string[]> = {
  aprovado: ["em_cotacao", "cancelado"],
  em_cotacao: ["pedido_enviado", "cancelado"],
  pedido_enviado: ["aguardando_entrega", "aguardando_retirada", "cancelado"],
  aguardando_entrega: ["recebido", "cancelado"],
  aguardando_retirada: ["recebido", "cancelado"],
};

const statusSchema = z.object({
  status: z.enum([
    "em_cotacao",
    "pedido_enviado",
    "aguardando_entrega",
    "aguardando_retirada",
    "recebido",
    "cancelado",
  ]),
  note: z.string().optional(),
});

purchaseRequestRouter.patch(
  "/:id/status",
  requireRole("comprador", "admin"),
  asyncHandler(async (req, res) => {
    const body = statusSchema.parse(req.body);

    const request = await prisma.purchaseRequest.findFirst({
      where: { id: req.params.id, companyId: req.user!.companyId },
    });
    if (!request) throw new ApiError(404, "Pedido não encontrado");

    const allowedTargets = STATUS_TRANSITIONS[request.status] ?? [];
    if (!allowedTargets.includes(body.status)) {
      throw new ApiError(409, `Não é possível mudar de "${request.status}" para "${body.status}"`);
    }

    if (request.status === "em_cotacao" && body.status === "pedido_enviado") {
      const selectedQuote = await prisma.quote.findFirst({
        where: { requestId: request.id, selected: true },
      });
      if (!selectedQuote) {
        throw new ApiError(409, "Selecione uma cotação vencedora antes de marcar o pedido como enviado");
      }
    }

    const updated = await prisma.$transaction(async (tx) => {
      const result = await tx.purchaseRequest.update({
        where: { id: request.id },
        data: { status: body.status },
      });

      await tx.statusHistory.create({
        data: {
          requestId: request.id,
          fromStatus: request.status,
          toStatus: body.status,
          changedBy: req.user!.userId,
          note: body.note,
        },
      });

      return result;
    });

    res.json(updated);
  })
);

const quoteDeadlineSchema = z.object({ quoteDeadline: z.string().datetime().nullable() });

purchaseRequestRouter.patch(
  "/:id/quote-deadline",
  requireRole("comprador", "admin"),
  asyncHandler(async (req, res) => {
    const body = quoteDeadlineSchema.parse(req.body);

    const existing = await prisma.purchaseRequest.findFirst({
      where: { id: req.params.id, companyId: req.user!.companyId },
    });
    if (!existing) throw new ApiError(404, "Pedido não encontrado");
    if (existing.status !== "em_cotacao") {
      throw new ApiError(409, "Só é possível definir prazo de cotação enquanto o pedido está em cotação");
    }

    const updated = await prisma.purchaseRequest.update({
      where: { id: existing.id },
      data: { quoteDeadline: body.quoteDeadline ? new Date(body.quoteDeadline) : null },
    });
    res.json(updated);
  })
);

const deliveryNotesSchema = z.object({ deliveryNotes: z.string().max(2000).nullable() });

purchaseRequestRouter.patch(
  "/:id/delivery-notes",
  requireRole("comprador", "admin"),
  asyncHandler(async (req, res) => {
    const body = deliveryNotesSchema.parse(req.body);

    const existing = await prisma.purchaseRequest.findFirst({
      where: { id: req.params.id, companyId: req.user!.companyId },
    });
    if (!existing) throw new ApiError(404, "Pedido não encontrado");
    if (!["aguardando_entrega", "aguardando_retirada"].includes(existing.status)) {
      throw new ApiError(
        409,
        "Só é possível registrar observações de entrega/retirada enquanto o pedido está aguardando entrega ou retirada"
      );
    }

    const updated = await prisma.purchaseRequest.update({
      where: { id: existing.id },
      data: { deliveryNotes: body.deliveryNotes },
    });
    res.json(updated);
  })
);

const quoteSchema = z.object({
  supplierId: z.string().uuid().optional(),
  supplierName: z.string().min(1).optional(),
  totalPrice: z.number().positive(),
  freightValue: z.number().nonnegative().optional(),
  deliveryDays: z.number().int().nonnegative().optional(),
  notes: z.string().optional(),
});

/**
 * Resolve o fornecedor da cotação: se vier supplierId usa o cadastro existente;
 * senão, casa por nome (case-insensitive) ou cria um fornecedor novo no catálogo
 * automaticamente — assim digitar um nome novo já alimenta o catálogo.
 */
async function resolveSupplier(companyId: string, input: { supplierId?: string; supplierName?: string }) {
  if (input.supplierId) {
    const supplier = await prisma.supplier.findFirst({ where: { id: input.supplierId, companyId } });
    if (!supplier) throw new ApiError(400, "Fornecedor inválido para esta empresa");
    return supplier;
  }

  if (!input.supplierName) {
    throw new ApiError(400, "Informe o fornecedor (supplierId ou supplierName)");
  }

  const existing = await prisma.supplier.findFirst({
    where: { companyId, name: { equals: input.supplierName, mode: "insensitive" } },
  });
  if (existing) return existing;

  return prisma.supplier.create({ data: { companyId, name: input.supplierName } });
}

purchaseRequestRouter.post(
  "/:id/quotes",
  requireRole("comprador", "admin"),
  asyncHandler(async (req, res) => {
    const body = quoteSchema.parse(req.body);

    const request = await prisma.purchaseRequest.findFirst({
      where: { id: req.params.id, companyId: req.user!.companyId },
    });
    if (!request) throw new ApiError(404, "Pedido não encontrado");
    if (request.status !== "em_cotacao") {
      throw new ApiError(409, "Só é possível registrar cotações enquanto o pedido está em cotação");
    }

    const supplier = await resolveSupplier(req.user!.companyId, body);

    const quote = await prisma.quote.create({
      data: {
        requestId: request.id,
        supplierId: supplier.id,
        supplierName: supplier.name,
        totalPrice: body.totalPrice,
        freightValue: body.freightValue,
        deliveryDays: body.deliveryDays,
        notes: body.notes,
        createdById: req.user!.userId,
      },
      include: { createdBy: { select: { id: true, name: true } } },
    });

    res.status(201).json(quote);
  })
);

purchaseRequestRouter.post(
  "/:id/quotes/:quoteId/select",
  requireRole("comprador", "admin"),
  asyncHandler(async (req, res) => {
    const request = await prisma.purchaseRequest.findFirst({
      where: { id: req.params.id, companyId: req.user!.companyId },
    });
    if (!request) throw new ApiError(404, "Pedido não encontrado");
    if (request.status !== "em_cotacao") {
      throw new ApiError(409, "Só é possível selecionar a cotação vencedora enquanto o pedido está em cotação");
    }

    const quote = await prisma.quote.findFirst({
      where: { id: req.params.quoteId, requestId: request.id },
    });
    if (!quote) throw new ApiError(404, "Cotação não encontrada");

    await prisma.$transaction([
      prisma.quote.updateMany({ where: { requestId: request.id }, data: { selected: false } }),
      prisma.quote.update({ where: { id: quote.id }, data: { selected: true } }),
    ]);

    const updatedRequest = await prisma.purchaseRequest.findUniqueOrThrow({
      where: { id: request.id },
      include: detailInclude,
    });
    res.json(updatedRequest);
  })
);

purchaseRequestRouter.delete(
  "/:id/quotes/:quoteId",
  requireRole("comprador", "admin"),
  asyncHandler(async (req, res) => {
    const request = await prisma.purchaseRequest.findFirst({
      where: { id: req.params.id, companyId: req.user!.companyId },
    });
    if (!request) throw new ApiError(404, "Pedido não encontrado");

    const quote = await prisma.quote.findFirst({
      where: { id: req.params.quoteId, requestId: request.id },
    });
    if (!quote) throw new ApiError(404, "Cotação não encontrada");
    if (request.status !== "em_cotacao") {
      throw new ApiError(409, "Só é possível remover cotações enquanto o pedido está em cotação");
    }

    await prisma.quote.delete({ where: { id: quote.id } });
    res.status(204).send();
  })
);

async function loadQuoteScoped(companyId: string, requestId: string, quoteId: string) {
  const request = await prisma.purchaseRequest.findFirst({ where: { id: requestId, companyId } });
  if (!request) throw new ApiError(404, "Pedido não encontrado");

  const quote = await prisma.quote.findFirst({ where: { id: quoteId, requestId: request.id } });
  if (!quote) throw new ApiError(404, "Cotação não encontrada");

  return { request, quote };
}

const attachmentSelect = {
  id: true,
  fileName: true,
  mimeType: true,
  sizeBytes: true,
  createdAt: true,
  uploadedBy: { select: { id: true, name: true } },
} as const;

purchaseRequestRouter.post(
  "/:id/quotes/:quoteId/attachments",
  requireRole("comprador", "admin"),
  upload.single("file"),
  asyncHandler(async (req, res) => {
    const { request, quote } = await loadQuoteScoped(req.user!.companyId, req.params.id, req.params.quoteId);
    if (request.status !== "em_cotacao") {
      throw new ApiError(409, "Só é possível anexar arquivos enquanto o pedido está em cotação");
    }
    if (!req.file) throw new ApiError(400, "Nenhum arquivo enviado");

    const extension = ALLOWED_MIME_TYPES[req.file.mimetype];
    const storageKey = path.join(request.companyId, quote.id, `${randomUUID()}${extension}`);
    const absolutePath = path.join(UPLOAD_DIR, storageKey);

    await fs.mkdir(path.dirname(absolutePath), { recursive: true });
    await fs.writeFile(absolutePath, req.file.buffer);

    const attachment = await prisma.quoteAttachment.create({
      data: {
        quoteId: quote.id,
        fileName: req.file.originalname,
        mimeType: req.file.mimetype,
        sizeBytes: req.file.size,
        storageKey,
        uploadedById: req.user!.userId,
      },
      select: attachmentSelect,
    });

    res.status(201).json(attachment);
  })
);

purchaseRequestRouter.get(
  "/:id/quotes/:quoteId/attachments/:attachmentId",
  asyncHandler(async (req, res) => {
    const { quote } = await loadQuoteScoped(req.user!.companyId, req.params.id, req.params.quoteId);

    const attachment = await prisma.quoteAttachment.findFirst({
      where: { id: req.params.attachmentId, quoteId: quote.id },
    });
    if (!attachment) throw new ApiError(404, "Anexo não encontrado");

    const absolutePath = path.join(UPLOAD_DIR, attachment.storageKey);
    const buffer = await fs.readFile(absolutePath).catch(() => {
      throw new ApiError(404, "Arquivo não encontrado no armazenamento");
    });

    res.setHeader("Content-Type", attachment.mimeType);
    res.setHeader("Content-Disposition", `inline; filename="${encodeURIComponent(attachment.fileName)}"`);
    res.send(buffer);
  })
);

purchaseRequestRouter.delete(
  "/:id/quotes/:quoteId/attachments/:attachmentId",
  requireRole("comprador", "admin"),
  asyncHandler(async (req, res) => {
    const { request, quote } = await loadQuoteScoped(req.user!.companyId, req.params.id, req.params.quoteId);
    if (request.status !== "em_cotacao") {
      throw new ApiError(409, "Só é possível remover anexos enquanto o pedido está em cotação");
    }

    const attachment = await prisma.quoteAttachment.findFirst({
      where: { id: req.params.attachmentId, quoteId: quote.id },
    });
    if (!attachment) throw new ApiError(404, "Anexo não encontrado");

    await prisma.quoteAttachment.delete({ where: { id: attachment.id } });
    await fs.unlink(path.join(UPLOAD_DIR, attachment.storageKey)).catch(() => {});

    res.status(204).send();
  })
);
