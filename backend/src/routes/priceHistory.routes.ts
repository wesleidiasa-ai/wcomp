import { Router } from "express";
import { prisma } from "../lib/prisma";
import { asyncHandler } from "../middleware/asyncHandler";
import { requireAuth } from "../middleware/auth";

export const priceHistoryRouter = Router();

priceHistoryRouter.use(requireAuth);

priceHistoryRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const items = await prisma.purchaseRequestItem.findMany({
      where: {
        estimatedUnitPrice: { not: null },
        request: { companyId: req.user!.companyId },
      },
      select: {
        itemName: true,
        estimatedUnitPrice: true,
        request: { select: { createdAt: true } },
      },
    });

    // agrupa por nome do item (normalizado) + ano
    const grouped = new Map<string, Map<number, { sum: number; count: number }>>();
    const displayNames = new Map<string, string>();

    for (const item of items) {
      const key = item.itemName.trim().toLowerCase();
      displayNames.set(key, item.itemName.trim());

      const year = item.request.createdAt.getFullYear();
      const yearMap = grouped.get(key) ?? new Map<number, { sum: number; count: number }>();
      const entry = yearMap.get(year) ?? { sum: 0, count: 0 };
      entry.sum += Number(item.estimatedUnitPrice);
      entry.count += 1;
      yearMap.set(year, entry);
      grouped.set(key, yearMap);
    }

    const result = [...grouped.entries()]
      .map(([key, yearMap]) => {
        const years = [...yearMap.entries()]
          .map(([year, { sum, count }]) => ({ year, avgPrice: sum / count, samples: count }))
          .sort((a, b) => a.year - b.year);

        const yearsWithVariation = years.map((y, i) => ({
          ...y,
          variationPct: i === 0 ? null : ((y.avgPrice - years[i - 1].avgPrice) / years[i - 1].avgPrice) * 100,
        }));

        return { itemName: displayNames.get(key)!, years: yearsWithVariation };
      })
      .filter((entry) => entry.years.length > 0)
      .sort((a, b) => a.itemName.localeCompare(b.itemName));

    res.json(result);
  })
);
