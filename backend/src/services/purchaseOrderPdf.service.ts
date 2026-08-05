import PDFDocument from "pdfkit";
import type { Prisma } from "@prisma/client";

type Money = Prisma.Decimal | string | number | null;

type PdfRequest = {
  requestNumber: number | null;
  title: string;
  justification: string | null;
  urgency: string;
  estimatedTotal: Money;
  createdAt: Date;
  deliveryNotes: string | null;
  company: {
    name: string;
    cnpj: string | null;
    phone: string | null;
    email: string | null;
    addressStreet: string | null;
    addressNumber: string | null;
    addressComplement: string | null;
    addressNeighborhood: string | null;
    addressCity: string | null;
    addressState: string | null;
    addressZipCode: string | null;
  };
  items: { itemName: string; quantity: Money; unit: string | null; estimatedUnitPrice: Money }[];
  quotes: {
    selected: boolean;
    supplierName: string;
    totalPrice: Money;
    freightValue: Money;
    deliveryDays: number | null;
    notes: string | null;
    supplier: { cnpj: string | null; phone: string | null; email: string | null } | null;
  }[];
};

const MONTHS_PT = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];

const BLUE = "#1d4ed8";
const GREY_LABEL = "#6b7280";
const GREY_LINE = "#d1d5db";
const BLACK = "#111111";

const PAGE_LEFT = 36;
const PAGE_RIGHT = 806; // A4 paisagem (841.89pt de largura) menos a margem
const PAGE_WIDTH = PAGE_RIGHT - PAGE_LEFT;
const BOTTOM_LIMIT = 500; // A4 paisagem tem só 595.28pt de altura

function toNumber(value: Money) {
  return value === null ? 0 : Number(value.toString());
}

function money(value: Money) {
  return toNumber(value).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function fullDate(date: Date) {
  return `${date.getDate()} de ${MONTHS_PT[date.getMonth()]} de ${date.getFullYear()}`;
}

function companyAddressLine(c: PdfRequest["company"]) {
  const streetPart = c.addressStreet && c.addressNumber ? `${c.addressStreet}, ${c.addressNumber}` : c.addressStreet;
  return [streetPart, c.addressComplement, c.addressNeighborhood].filter(Boolean).join(" — ");
}

function companyCityLine(c: PdfRequest["company"]) {
  const cityUf = c.addressCity && c.addressState ? `${c.addressCity} - ${c.addressState}` : c.addressCity;
  return [cityUf, c.addressZipCode ? `CEP ${c.addressZipCode}` : null].filter(Boolean).join("  ");
}

/** Uma célula com rótulo pequeno em cima e valor embaixo, dentro de uma borda. */
function cell(
  doc: PDFKit.PDFDocument,
  x: number,
  y: number,
  w: number,
  h: number,
  label: string,
  value: string
) {
  doc.rect(x, y, w, h).strokeColor(GREY_LINE).lineWidth(0.75).stroke();
  doc.fillColor(GREY_LABEL).font("Helvetica").fontSize(6.5).text(label.toUpperCase(), x + 5, y + 4, {
    width: w - 10,
  });
  doc
    .fillColor(BLACK)
    .font("Helvetica")
    .fontSize(8.5)
    .text(value || "—", x + 5, y + 13, { width: w - 10, height: h - 16, ellipsis: true });
}

/** Uma linha da grade com N células dividindo a largura conforme os pesos informados. */
function gridRow(
  doc: PDFKit.PDFDocument,
  y: number,
  height: number,
  cells: { label: string; value: string; weight: number }[]
) {
  const totalWeight = cells.reduce((sum, c) => sum + c.weight, 0);
  let x = PAGE_LEFT;
  for (const c of cells) {
    const w = (PAGE_WIDTH * c.weight) / totalWeight;
    cell(doc, x, y, w, height, c.label, c.value);
    x += w;
  }
  return y + height;
}

export function generatePurchaseOrderPdf(request: PdfRequest): PDFKit.PDFDocument {
  const doc = new PDFDocument({ margin: 36, size: "A4", layout: "landscape" });
  const selectedQuote = request.quotes.find((q) => q.selected) ?? null;
  const now = new Date();

  // Cabeçalho: dados da empresa à esquerda, número do pedido em destaque à direita
  const headerTop = doc.y;
  doc.font("Helvetica-Bold").fontSize(13).fillColor(BLUE).text(request.company.name, PAGE_LEFT, headerTop, {
    width: 340,
  });
  doc.font("Helvetica").fontSize(8).fillColor(GREY_LABEL);
  const addressLine = companyAddressLine(request.company);
  if (addressLine) doc.text(addressLine, PAGE_LEFT, doc.y, { width: 340 });
  const cityLine = companyCityLine(request.company);
  if (cityLine) doc.text(cityLine, PAGE_LEFT, doc.y, { width: 340 });
  if (request.company.cnpj) doc.text(`CNPJ ${request.company.cnpj}`, PAGE_LEFT, doc.y, { width: 340 });

  doc
    .font("Helvetica-Bold")
    .fontSize(16)
    .fillColor(BLACK)
    .text(`Pedido nº ${request.requestNumber ?? "—"}`, PAGE_LEFT, headerTop, { width: PAGE_WIDTH, align: "right" });

  doc.fillColor(BLACK);
  doc.y = Math.max(doc.y, headerTop + 60) + 8;
  doc.moveTo(PAGE_LEFT, doc.y).lineTo(PAGE_RIGHT, doc.y).strokeColor(BLACK).lineWidth(1).stroke();
  doc.y += 10;

  // Grade de informações — fornecedor, condições, entrega
  const supplier = selectedQuote?.supplier ?? null;
  let y = doc.y;
  y = gridRow(doc, y, 26, [
    { label: "Fornecedor", value: selectedQuote?.supplierName ?? "Cotação ainda não selecionada", weight: 3 },
    { label: "CNPJ", value: supplier?.cnpj ?? "—", weight: 1.4 },
    { label: "Contato", value: [supplier?.phone, supplier?.email].filter(Boolean).join(" · ") || "—", weight: 1.6 },
  ]);
  y = gridRow(doc, y, 26, [
    { label: "Condição de pagamento", value: selectedQuote?.notes ?? "—", weight: 1 },
    {
      label: "Prazo de entrega",
      value: selectedQuote?.deliveryDays !== null && selectedQuote?.deliveryDays !== undefined
        ? `${selectedQuote.deliveryDays} dia(s)`
        : "—",
      weight: 1,
    },
    { label: "Data de emissão", value: now.toLocaleDateString("pt-BR"), weight: 1 },
  ]);
  y = gridRow(doc, y, 26, [
    {
      label: "Endereço de entrega",
      value: [companyAddressLine(request.company), companyCityLine(request.company)].filter(Boolean).join(" — ") || "—",
      weight: 1,
    },
  ]);
  doc.y = y + 12;

  // Tabela de itens — a descrição absorve a largura extra da página em paisagem
  const fixedCols = { qty: 55, unit: 55, unitPrice: 90, total: 90 };
  const cols = { desc: PAGE_WIDTH - fixedCols.qty - fixedCols.unit - fixedCols.unitPrice - fixedCols.total, ...fixedCols };
  const xDesc = PAGE_LEFT;
  const xQty = xDesc + cols.desc;
  const xUnit = xQty + cols.qty;
  const xUnitPrice = xUnit + cols.unit;
  const xTotal = xUnitPrice + cols.unitPrice;

  function itemsHeader() {
    const headerY = doc.y;
    doc.rect(PAGE_LEFT, headerY, PAGE_WIDTH, 18).fillColor("#f3f4f6").fill();
    doc.fillColor(GREY_LABEL).font("Helvetica-Bold").fontSize(7.5);
    doc.text("DESCRIÇÃO", xDesc + 5, headerY + 5);
    doc.text("QTD.", xQty, headerY + 5, { width: cols.qty, align: "right" });
    doc.text("UNID.", xUnit, headerY + 5, { width: cols.unit, align: "center" });
    doc.text("PREÇO UNIT.", xUnitPrice, headerY + 5, { width: cols.unitPrice - 5, align: "right" });
    doc.text("PREÇO TOTAL", xTotal, headerY + 5, { width: cols.total - 5, align: "right" });
    doc.fillColor(BLACK);
    doc.y = headerY + 18;
  }

  itemsHeader();
  let itemsTotal = 0;
  for (const item of request.items) {
    if (doc.y > BOTTOM_LIMIT) {
      doc.addPage();
      doc.y = 40;
      itemsHeader();
    }
    const rowY = doc.y;
    const qty = toNumber(item.quantity);
    const unitPrice = toNumber(item.estimatedUnitPrice);
    const lineTotal = qty * unitPrice;
    itemsTotal += lineTotal;

    doc.font("Helvetica").fontSize(8.5).fillColor(BLACK);
    doc.text(item.itemName, xDesc + 5, rowY + 4, { width: cols.desc - 10 });
    doc.text(item.quantity === null ? "—" : item.quantity.toString(), xQty, rowY + 4, {
      width: cols.qty,
      align: "right",
    });
    doc.text(item.unit ?? "—", xUnit, rowY + 4, { width: cols.unit, align: "center" });
    doc.text(money(item.estimatedUnitPrice), xUnitPrice, rowY + 4, { width: cols.unitPrice - 5, align: "right" });
    doc.text(money(lineTotal), xTotal, rowY + 4, { width: cols.total - 5, align: "right" });

    const rowHeight = Math.max(20, doc.y - rowY + 4);
    doc
      .moveTo(PAGE_LEFT, rowY + rowHeight)
      .lineTo(PAGE_RIGHT, rowY + rowHeight)
      .strokeColor(GREY_LINE)
      .lineWidth(0.5)
      .stroke();
    doc.y = rowY + rowHeight;
  }

  doc.y += 6;
  doc.font("Helvetica-Bold").fontSize(9);
  doc.text(`Total de itens: ${money(itemsTotal)}`, PAGE_LEFT, doc.y, { width: PAGE_WIDTH, align: "right" });

  if (selectedQuote) {
    doc.moveDown(0.3);
    const total = toNumber(selectedQuote.totalPrice) + toNumber(selectedQuote.freightValue);
    doc.fontSize(9).text(`Frete: ${money(selectedQuote.freightValue)}`, PAGE_LEFT, doc.y, {
      width: PAGE_WIDTH,
      align: "right",
    });
    doc.fontSize(11).fillColor(BLUE).text(`Total do pedido: ${money(total)}`, PAGE_LEFT, doc.y, {
      width: PAGE_WIDTH,
      align: "right",
    });
    doc.fillColor(BLACK);
  }

  doc.y += 20;

  // Observações / dados adicionais
  const footerY = doc.y;
  const footerHeight = 90;
  const halfWidth = PAGE_WIDTH / 2;

  doc.rect(PAGE_LEFT, footerY, halfWidth, footerHeight).strokeColor(GREY_LINE).lineWidth(0.75).stroke();
  doc.font("Helvetica-Bold").fontSize(8).fillColor(GREY_LABEL).text("OBSERVAÇÕES", PAGE_LEFT + 6, footerY + 6);
  doc
    .font("Helvetica")
    .fontSize(8.5)
    .fillColor(BLACK)
    .text(request.justification || request.deliveryNotes || "—", PAGE_LEFT + 6, footerY + 18, {
      width: halfWidth - 12,
      height: footerHeight - 24,
    });

  const rightX = PAGE_LEFT + halfWidth;
  doc.rect(rightX, footerY, halfWidth, footerHeight).strokeColor(GREY_LINE).lineWidth(0.75).stroke();
  doc.font("Helvetica-Bold").fontSize(8).fillColor(GREY_LABEL).text("DADOS ADICIONAIS", rightX + 6, footerY + 6);

  doc.y = footerY + footerHeight + 30;
  doc
    .fontSize(8.5)
    .fillColor(BLACK)
    .text("Fornecedor (de acordo): ____________________________________________", PAGE_LEFT, doc.y);

  doc.moveDown(2);
  doc
    .fontSize(8)
    .fillColor(GREY_LABEL)
    .text(`${request.company.addressCity ?? ""}, ${fullDate(now)}`, PAGE_LEFT, doc.y, {
      width: PAGE_WIDTH,
      align: "right",
    });

  return doc;
}
