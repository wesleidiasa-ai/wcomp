export type Role = "admin" | "comprador" | "solicitante" | "aprovador";

export type Urgency = "baixa" | "normal" | "alta" | "urgente";

export type RequestStatus =
  | "aguardando_aprovacao"
  | "aprovado"
  | "reprovado"
  | "em_cotacao"
  | "pedido_enviado"
  | "aguardando_entrega"
  | "aguardando_retirada"
  | "recebido"
  | "cancelado";

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  role: Role;
  companyId: string;
  departmentId: string | null;
};

export type Department = {
  id: string;
  companyId: string;
  name: string;
};

export type Company = {
  id: string;
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
  plan: string;
  whatsappPhoneNumberId: string | null;
  hasLogo: boolean;
  createdAt: string;
};

export type User = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: Role;
  companyId: string;
  departmentId: string | null;
  createdAt: string;
};

export type ApprovalRule = {
  id: string;
  companyId: string;
  departmentId: string | null;
  minValue: string;
  maxValue: string | null;
  stepOrder: number;
  approverId: string;
  approver: { id: string; name: string; email: string };
};

export type PurchaseRequestItem = {
  id: string;
  itemName: string;
  quantity: string;
  unit: string | null;
  estimatedUnitPrice: string | null;
  notes: string | null;
};

export type ApprovalStep = {
  id: string;
  stepOrder: number;
  approverId: string;
  status: "pendente" | "aprovado" | "reprovado";
  comment: string | null;
  decidedAt: string | null;
  approver: { id: string; name: string; email: string };
  decidedBy: { id: string; name: string; email: string } | null;
};

export type StatusHistoryEntry = {
  id: string;
  fromStatus: string | null;
  toStatus: string;
  note: string | null;
  changedAt: string;
};

export type QuoteAttachment = {
  id: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
  uploadedBy: { id: string; name: string } | null;
};

export type Quote = {
  id: string;
  supplierId: string | null;
  supplierName: string;
  supplier: { id: string; name: string; rating: number | null } | null;
  totalPrice: string;
  freightValue: string | null;
  deliveryDays: number | null;
  notes: string | null;
  selected: boolean;
  createdAt: string;
  createdBy: { id: string; name: string } | null;
  attachments: QuoteAttachment[];
};

export type PurchaseRequestSummary = {
  id: string;
  requestNumber: number | null;
  title: string;
  urgency: Urgency;
  status: RequestStatus;
  estimatedTotal: string | null;
  createdAt: string;
  requester: { id: string; name: string };
  department: Department | null;
  items: PurchaseRequestItem[];
};

export type PurchaseRequestDetail = PurchaseRequestSummary & {
  justification: string | null;
  quoteDeadline: string | null;
  deliveryNotes: string | null;
  items: PurchaseRequestItem[];
  approvalSteps: ApprovalStep[];
  quotes: Quote[];
  statusHistory: StatusHistoryEntry[];
};

export type Supplier = {
  id: string;
  companyId: string;
  name: string;
  cnpj: string | null;
  phone: string | null;
  email: string | null;
  rating: number | null;
  notes: string | null;
  createdAt: string;
};

export type SupplierDetail = Supplier & {
  stats: {
    totalQuotes: number;
    wonQuotes: number;
    avgLeadDays: number | null;
    avgPrice: number | null;
    productsSold: string[];
  };
  purchaseHistory: {
    requestId: string;
    title: string;
    status: RequestStatus;
    value: string;
    decidedAt: string;
  }[];
};

export type DashboardSummary = {
  pedidosEsteMes: number;
  aguardandoAprovacao: number;
  emCotacao: number;
  comprasRealizadas: number;
  comprasRealizadasCount: number;
  economiaObtida: number;
};

export type MonthlyStat = {
  month: string;
  label: string;
  total: number;
  economia: number;
  count: number;
};

export type DashboardIndicators = {
  gastoPorSetor: { name: string; total: number }[];
  topSolicitantes: { name: string; count: number }[];
  topFornecedores: { name: string; count: number; total: number }[];
  tempoMedioAprovacaoDias: number | null;
  tempoMedioCompraDias: number | null;
  economiaEmNegociacoes: number;
};

export type Insight = {
  icon: string;
  text: string;
};

export type PriceHistoryYear = {
  year: number;
  avgPrice: number;
  samples: number;
  variationPct: number | null;
};

export type PriceHistoryItem = {
  itemName: string;
  years: PriceHistoryYear[];
};

export type AccessRequest = {
  id: string;
  companyName: string;
  contactName: string;
  email: string;
  phone: string | null;
  message: string | null;
  createdAt: string;
};

export type PendingNotifications = {
  pendingApprovals: number;
  pendingQuotes: number;
  quotesDueSoon: { id: string; title: string; quoteDeadline: string }[];
  myPendingRequests: number;
  atrasados: number;
};
