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
  "/cnpj/:cnpj",
  asyncHandler(async (req, res) => {
    const digits = req.params.cnpj.replace(/\D/g, "");
    if (digits.length !== 14) throw new ApiError(400, "CNPJ inválido");

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    let response: Response;
    try {
      response = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${digits}`, {
        signal: controller.signal,
        headers: { "User-Agent": "SupplyOR/1.0", Accept: "application/json" },
      });
    } catch {
      throw new ApiError(502, "Não foi possível consultar a Receita Federal no momento");
    } finally {
      clearTimeout(timeout);
    }

    if (response.status === 404) throw new ApiError(404, "CNPJ não encontrado na Receita Federal");
    if (response.status === 400) throw new ApiError(400, "CNPJ inválido");
    if (!response.ok) throw new ApiError(502, "Não foi possível consultar a Receita Federal no momento");

    const data = (await response.json()) as {
      razao_social?: string;
      nome_fantasia?: string;
      ddd_telefone_1?: string;
      email?: string;
      logradouro?: string;
      numero?: string;
      complemento?: string;
      bairro?: string;
      municipio?: string;
      uf?: string;
      cep?: string;
    };

    res.json({
      name: data.nome_fantasia?.trim() || data.razao_social?.trim() || "",
      phone: (data.ddd_telefone_1 ?? "").replace(/\D/g, ""),
      email: data.email?.trim() || "",
      addressStreet: data.logradouro?.trim() || "",
      addressNumber: data.numero?.trim() || "",
      addressComplement: data.complemento?.trim() || "",
      addressNeighborhood: data.bairro?.trim() || "",
      addressCity: data.municipio?.trim() || "",
      addressState: data.uf?.trim() || "",
      addressZipCode: (data.cep ?? "").replace(/\D/g, ""),
    });
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
  cnpj: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  email: z.string().email().nullable().optional(),
  addressStreet: z.string().nullable().optional(),
  addressNumber: z.string().nullable().optional(),
  addressComplement: z.string().nullable().optional(),
  addressNeighborhood: z.string().nullable().optional(),
  addressCity: z.string().nullable().optional(),
  addressState: z.string().nullable().optional(),
  addressZipCode: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
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
