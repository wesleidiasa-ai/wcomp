import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { asyncHandler } from "../middleware/asyncHandler";
import { requireAuth, requireRole } from "../middleware/auth";
import { ApiError } from "../middleware/errorHandler";

export const supplierRouter = Router();

supplierRouter.use(requireAuth);

supplierRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const suppliers = await prisma.supplier.findMany({
      where: { companyId: req.user!.companyId },
      orderBy: { name: "asc" },
    });
    res.json(suppliers);
  })
);

supplierRouter.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const supplier = await prisma.supplier.findFirst({
      where: { id: req.params.id, companyId: req.user!.companyId },
    });
    if (!supplier) throw new ApiError(404, "Fornecedor não encontrado");

    const quotes = await prisma.quote.findMany({
      // supplierId já é escopado por empresa (supplier acima), mas filtramos de
      // novo pelo companyId via request como segunda camada de proteção.
      where: { supplierId: supplier.id, request: { companyId: req.user!.companyId } },
      select: {
        totalPrice: true,
        deliveryDays: true,
        selected: true,
        createdAt: true,
        request: {
          select: {
            id: true,
            title: true,
            status: true,
            createdAt: true,
            items: { select: { itemName: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const wonQuotes = quotes.filter((q) => q.selected);
    const avg = (values: number[]) => (values.length === 0 ? null : values.reduce((a, b) => a + b, 0) / values.length);

    const avgLeadDays = avg(quotes.filter((q) => q.deliveryDays !== null).map((q) => q.deliveryDays as number));
    const avgPrice = avg(quotes.map((q) => Number(q.totalPrice)));

    const productsSold = [...new Set(wonQuotes.flatMap((q) => q.request.items.map((i) => i.itemName)))];

    const purchaseHistory = wonQuotes.map((q) => ({
      requestId: q.request.id,
      title: q.request.title,
      status: q.request.status,
      value: q.totalPrice,
      decidedAt: q.createdAt,
    }));

    res.json({
      ...supplier,
      stats: {
        totalQuotes: quotes.length,
        wonQuotes: wonQuotes.length,
        avgLeadDays,
        avgPrice,
        productsSold,
      },
      purchaseHistory,
    });
  })
);

const supplierSchema = z.object({
  name: z.string().min(1),
  cnpj: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  rating: z.number().int().min(1).max(5).optional(),
  notes: z.string().optional(),
});

supplierRouter.post(
  "/",
  requireRole("comprador", "admin"),
  asyncHandler(async (req, res) => {
    const body = supplierSchema.parse(req.body);
    const supplier = await prisma.supplier.create({
      data: { ...body, companyId: req.user!.companyId },
    });
    res.status(201).json(supplier);
  })
);

supplierRouter.patch(
  "/:id",
  requireRole("comprador", "admin"),
  asyncHandler(async (req, res) => {
    const body = supplierSchema.partial().parse(req.body);

    const existing = await prisma.supplier.findFirst({
      where: { id: req.params.id, companyId: req.user!.companyId },
    });
    if (!existing) throw new ApiError(404, "Fornecedor não encontrado");

    const supplier = await prisma.supplier.update({ where: { id: existing.id }, data: body });
    res.json(supplier);
  })
);

supplierRouter.delete(
  "/:id",
  requireRole("admin"),
  asyncHandler(async (req, res) => {
    const existing = await prisma.supplier.findFirst({
      where: { id: req.params.id, companyId: req.user!.companyId },
    });
    if (!existing) throw new ApiError(404, "Fornecedor não encontrado");

    await prisma.supplier.delete({ where: { id: existing.id } });
    res.status(204).send();
  })
);
