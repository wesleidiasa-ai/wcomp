import cors from "cors";
import express from "express";
import { errorHandler } from "./middleware/errorHandler";
import { accessRequestRouter } from "./routes/accessRequest.routes";
import { adminCompanyRouter } from "./routes/adminCompany.routes";
import { adminDashboardRouter } from "./routes/adminDashboard.routes";
import { authRouter } from "./routes/auth.routes";
import { companyRouter } from "./routes/company.routes";
import { dashboardRouter } from "./routes/dashboard.routes";
import { departmentRouter } from "./routes/department.routes";
import { feedbackRouter } from "./routes/feedback.routes";
import { userRouter } from "./routes/user.routes";
import { approvalRuleRouter } from "./routes/approvalRule.routes";
import { notificationRouter } from "./routes/notification.routes";
import { priceHistoryRouter } from "./routes/priceHistory.routes";
import { purchaseRequestRouter } from "./routes/purchaseRequest.routes";
import { supplierRouter } from "./routes/supplier.routes";
import { whatsappWebhookRouter } from "./routes/whatsappWebhook.routes";

export const app = express();

app.use(cors());
app.use(
  express.json({
    // guarda o corpo bruto pra poder validar a assinatura HMAC do webhook da Meta
    verify: (req, _res, buf) => {
      (req as express.Request).rawBody = buf;
    },
  })
);

app.get("/health", (_req, res) => res.json({ ok: true }));

app.use("/auth", authRouter);
app.use("/access-requests", accessRequestRouter);
app.use("/admin/companies", adminCompanyRouter);
app.use("/admin/dashboard", adminDashboardRouter);
app.use("/companies", companyRouter);
app.use("/dashboard", dashboardRouter);
app.use("/departments", departmentRouter);
app.use("/feedback", feedbackRouter);
app.use("/users", userRouter);
app.use("/approval-rules", approvalRuleRouter);
app.use("/notifications", notificationRouter);
app.use("/price-history", priceHistoryRouter);
app.use("/purchase-requests", purchaseRequestRouter);
app.use("/suppliers", supplierRouter);
app.use("/webhooks/whatsapp", whatsappWebhookRouter);

app.use(errorHandler);
