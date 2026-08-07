import { Router } from "express";
import { prisma } from "../lib/prisma";
import { asyncHandler } from "../middleware/asyncHandler";
import { requireAuth } from "../middleware/auth";
import { ApiError } from "../middleware/errorHandler";

export const priceHistoryRouter = Router();

priceHistoryRouter.use(requireAuth);

type PurchaseEvent = {
  itemKey: string;
  itemName: string;
  price: number;
  quantity: number;
  unit: string | null;
  date: Date;
  departmentId: string | null;
  departmentName: string | null;
  supplierId: string | null;
  supplierName: string | null;
};

async function loadEvents(companyId: string): Promise<PurchaseEvent[]> {
  const rows = await prisma.purchaseRequestItem.findMany({
    where: {
      estimatedUnitPrice: { not: null },
      request: { companyId },
    },
    select: {
      itemName: true,
      quantity: true,
      unit: true,
      estimatedUnitPrice: true,
      request: {
        select: {
          createdAt: true,
          department: { select: { id: true, name: true } },
          quotes: {
            where: { selected: true },
            take: 1,
            select: { supplierId: true, supplierName: true },
          },
        },
      },
    },
  });

  return rows.map((row) => {
    const quote = row.request.quotes[0];
    return {
      itemKey: row.itemName.trim().toLowerCase(),
      itemName: row.itemName.trim(),
      price: Number(row.estimatedUnitPrice),
      quantity: Number(row.quantity),
      unit: row.unit,
      date: row.request.createdAt,
      departmentId: row.request.department?.id ?? null,
      departmentName: row.request.department?.name ?? null,
      supplierId: quote?.supplierId ?? null,
      supplierName: quote?.supplierName ?? null,
    };
  });
}

function priceStatus(lastPrice: number, avgPrice: number): "abaixo" | "medio" | "acima" {
  if (lastPrice < avgPrice * 0.95) return "abaixo";
  if (lastPrice > avgPrice * 1.05) return "acima";
  return "medio";
}

priceHistoryRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const { search, year, supplierId, departmentId } = req.query as Record<string, string | undefined>;

    const allEvents = await loadEvents(req.user!.companyId);
    const years = [...new Set(allEvents.map((e) => e.date.getFullYear()))].sort((a, b) => b - a);

    let events = allEvents;
    if (year) events = events.filter((e) => e.date.getFullYear() === Number(year));
    if (supplierId) events = events.filter((e) => e.supplierId === supplierId);
    if (departmentId) events = events.filter((e) => e.departmentId === departmentId);

    const grouped = new Map<string, PurchaseEvent[]>();
    for (const e of events) {
      const list = grouped.get(e.itemKey) ?? [];
      list.push(e);
      grouped.set(e.itemKey, list);
    }

    let items = [...grouped.entries()].map(([, evs]) => {
      const sorted = [...evs].sort((a, b) => a.date.getTime() - b.date.getTime());
      const prices = sorted.map((e) => e.price);
      const avgPrice = prices.reduce((s, p) => s + p, 0) / prices.length;
      const first = sorted[0];
      const last = sorted[sorted.length - 1];
      const samples = sorted.length;

      return {
        itemName: last.itemName,
        avgPrice,
        lastPrice: last.price,
        minPrice: Math.min(...prices),
        maxPrice: Math.max(...prices),
        lastPurchaseDate: last.date,
        lastSupplierName: last.supplierName,
        samples,
        savingsPct: samples > 1 && first.price > 0 ? ((first.price - last.price) / first.price) * 100 : null,
        priceStatus: samples > 1 ? priceStatus(last.price, avgPrice) : null,
      };
    });

    if (search) {
      const q = search.trim().toLowerCase();
      items = items.filter((i) => i.itemName.toLowerCase().includes(q));
    }

    items.sort((a, b) => a.itemName.localeCompare(b.itemName));

    res.json({ items, years });
  })
);

priceHistoryRouter.get(
  "/:itemName",
  asyncHandler(async (req, res) => {
    const key = req.params.itemName.trim().toLowerCase();
    const allEvents = await loadEvents(req.user!.companyId);
    const events = allEvents.filter((e) => e.itemKey === key).sort((a, b) => a.date.getTime() - b.date.getTime());

    if (events.length === 0) throw new ApiError(404, "Item não encontrado no histórico");

    const monthlyMap = new Map<string, { sum: number; count: number }>();
    for (const e of events) {
      const month = `${e.date.getFullYear()}-${String(e.date.getMonth() + 1).padStart(2, "0")}`;
      const entry = monthlyMap.get(month) ?? { sum: 0, count: 0 };
      entry.sum += e.price;
      entry.count += 1;
      monthlyMap.set(month, entry);
    }
    const monthly = [...monthlyMap.entries()]
      .map(([month, { sum, count }]) => ({ month, avgPrice: sum / count }))
      .sort((a, b) => a.month.localeCompare(b.month));

    res.json({
      itemName: events[events.length - 1].itemName,
      events: events
        .map((e) => ({
          date: e.date,
          price: e.price,
          quantity: e.quantity,
          unit: e.unit,
          supplierName: e.supplierName,
          departmentName: e.departmentName,
        }))
        .reverse(),
      monthly,
    });
  })
);
