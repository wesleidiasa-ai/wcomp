import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./lib/auth";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { Layout } from "./components/Layout";
import { LandingPage } from "./pages/LandingPage";
import { LoginPage } from "./pages/LoginPage";
import { RegisterCompanyPage } from "./pages/RegisterCompanyPage";
import { AdminWaitlistPage } from "./pages/AdminWaitlistPage";
import { AdminCreateCompanyPage } from "./pages/AdminCreateCompanyPage";
import { AdminFeedbackPage } from "./pages/AdminFeedbackPage";
import { AdminCompaniesPage } from "./pages/AdminCompaniesPage";
import { ForgotPasswordPage } from "./pages/ForgotPasswordPage";
import { ResetPasswordPage } from "./pages/ResetPasswordPage";
import { RequestsListPage } from "./pages/RequestsListPage";
import { RequestDetailPage } from "./pages/RequestDetailPage";
import { RequestCreatePage } from "./pages/RequestCreatePage";
import { DepartmentsPage } from "./pages/DepartmentsPage";
import { UsersPage } from "./pages/UsersPage";
import { ApprovalRulesPage } from "./pages/ApprovalRulesPage";
import { CompanySettingsPage } from "./pages/CompanySettingsPage";
import { DashboardPage } from "./pages/DashboardPage";
import { SuppliersPage } from "./pages/SuppliersPage";
import { SupplierDetailPage } from "./pages/SupplierDetailPage";
import { PriceHistoryPage } from "./pages/PriceHistoryPage";
import { ChangePasswordPage } from "./pages/ChangePasswordPage";
import { FeedbackPage } from "./pages/FeedbackPage";

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/registrar" element={<RegisterCompanyPage />} />
          <Route path="/esqueci-senha" element={<ForgotPasswordPage />} />
          <Route path="/redefinir-senha" element={<ResetPasswordPage />} />
          <Route path="/admin/waitlist" element={<AdminWaitlistPage />} />
          <Route path="/admin/criar-empresa" element={<AdminCreateCompanyPage />} />
          <Route path="/admin/feedback" element={<AdminFeedbackPage />} />
          <Route path="/admin/empresas" element={<AdminCompaniesPage />} />

          <Route element={<ProtectedRoute />}>
            <Route element={<Layout />}>
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/pedidos" element={<RequestsListPage />} />
              <Route path="/pedidos/novo" element={<RequestCreatePage />} />
              <Route path="/pedidos/:id" element={<RequestDetailPage />} />
              <Route path="/minha-conta/senha" element={<ChangePasswordPage />} />
              <Route path="/feedback" element={<FeedbackPage />} />

              <Route element={<ProtectedRoute roles={["admin", "comprador"]} />}>
                <Route path="/fornecedores" element={<SuppliersPage />} />
                <Route path="/fornecedores/:id" element={<SupplierDetailPage />} />
                <Route path="/historico-precos" element={<PriceHistoryPage />} />
              </Route>

              <Route element={<ProtectedRoute roles={["admin"]} />}>
                <Route path="/setores" element={<DepartmentsPage />} />
                <Route path="/usuarios" element={<UsersPage />} />
                <Route path="/regras-aprovacao" element={<ApprovalRulesPage />} />
                <Route path="/empresa" element={<CompanySettingsPage />} />
              </Route>
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
