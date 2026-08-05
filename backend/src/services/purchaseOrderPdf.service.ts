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
  requester: { name: string; email: string };
  department: { name: string } | null;
  items: { itemName: string; quantity: Money; unit: string | null; estimatedUnitPrice: Money }[];
  quotes: {
    selected: boolean;
    supplierName: string;
    totalPrice: Money;
    freightValue: Money;
    deliveryDays: number | null;
    notes: string | null;
  }[];
};

function toNumber(value: Money) {
  return value === null ? 0 : Number(value.toString());
}

function money(value: Money) {
  if (value === null) return "—";
  return toNumber(value).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function companyAddress(c: PdfRequest["company"]) {
  const parts = [
    c.addressStreet && c.addressNumber ? `${c.addressStreet}, ${c.addressNumber}` : c.addressStreet,
    c.addressComplement,
    c.addressNeighborhood,
    c.addressCity && c.addressState ? `${c.addressCity}/${c.addressState}` : c.addressCity,
    c.addressZipCode,
  ].filter(Boolean);
  return parts.join(" — ");
}

export function generatePurchaseOrderPdf(request: PdfRequest): PDFKit.PDFDocument {
  const doc = new PDFDocument({ margin: 50, size: "A4" });
  const selectedQuote = request.quotes.find((q) => q.selected) ?? null;

  doc
    .fontSize(18)
    .fillColor("#1d4ed8")
    .text(request.company.name, { continued: false })
    .fillColor("#000000");

  const address = companyAddress(request.company);
  doc.fontSize(9).fillColor("#555555");
  if (request.company.cnpj) doc.text(`CNPJ: ${request.company.cnpj}`);
  if (address) doc.text(address);
  const contact = [request.company.phone, request.company.email].filter(Boolean).join(" · ");
  if (contact) doc.text(contact);
  doc.fillColor("#000000");

  doc.moveDown(1.2);
  doc
    .fontSize(15)
    .text(`Pedido de Compra${request.requestNumber ? ` Nº ${request.requestNumber}` : ""}`, { underline: false });
  doc.fontSize(10).fillColor("#555555").text(`Emitido em ${request.createdAt.toLocaleDateString("pt-BR")}`);
  doc.fillColor("#000000");

  doc.moveDown(0.8);
  doc.font("Helvetica-Bold").fontSize(11).text(request.title);
  doc.font("Helvetica");
  if (request.justification) {
    doc.fontSize(9).fillColor("#444444").text(request.justification);
    doc.fillColor("#000000");
  }

  doc.moveDown(0.5);
  doc
    .fontSize(9)
    .text(
      `Solicitante: ${request.requester.name}   ·   Setor: ${request.department?.name ?? "—"}   ·   Urgência: ${request.urgency}`
    );

  doc.moveDown(1);
  doc.fontSize(12).text("Itens");
  doc.moveTo(50, doc.y + 2).lineTo(545, doc.y + 2).strokeColor("#dddddd").stroke();
  doc.moveDown(0.4);

  const colX = { item: 50, qty: 300, unit: 360, price: 430 };
  const headerY = doc.y;
  doc.fontSize(9).fillColor("#555555");
  doc.text("Item", colX.item, headerY);
  doc.text("Qtd", colX.qty, headerY);
  doc.text("Unid.", colX.unit, headerY);
  doc.text("Preço unit.", colX.price, headerY);
  doc.fillColor("#000000");
  doc.y = headerY + doc.currentLineHeight();
  doc.moveDown(0.3);

  for (const item of request.items) {
    const y = doc.y;
    doc.fontSize(9);
    doc.text(item.itemName, colX.item, y, { width: 240 });
    doc.text(item.quantity === null ? "—" : item.quantity.toString(), colX.qty, y);
    doc.text(item.unit ?? "—", colX.unit, y);
    doc.text(money(item.estimatedUnitPrice), colX.price, y);
    doc.moveDown(0.5);
  }

  doc.moveDown(0.3);
  doc.fontSize(10).text(`Total estimado: ${money(request.estimatedTotal)}`, { align: "right" });

  if (selectedQuote) {
    doc.moveDown(1);
    doc.fontSize(12).text("Fornecedor vencedor da cotação");
    doc.moveTo(50, doc.y + 2).lineTo(545, doc.y + 2).strokeColor("#dddddd").stroke();
    doc.moveDown(0.4);

    const total = toNumber(selectedQuote.totalPrice) + toNumber(selectedQuote.freightValue);
    doc.fontSize(10);
    doc.text(`Fornecedor: ${selectedQuote.supplierName}`);
    doc.text(
      `Valor: ${money(selectedQuote.totalPrice)}   ·   Frete: ${money(selectedQuote.freightValue)}   ·   Total: ${money(total)}`
    );
    if (selectedQuote.deliveryDays !== null) doc.text(`Prazo de entrega: ${selectedQuote.deliveryDays} dia(s)`);
    if (selectedQuote.notes) doc.text(`Condição: ${selectedQuote.notes}`);
  }

  if (request.deliveryNotes) {
    doc.moveDown(1);
    doc.fontSize(12).text("Observações de entrega/retirada");
    doc.moveTo(50, doc.y + 2).lineTo(545, doc.y + 2).strokeColor("#dddddd").stroke();
    doc.moveDown(0.4);
    doc.fontSize(10).text(request.deliveryNotes);
  }

  return doc;
}
