import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./lib/auth";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { Layout } from "./components/Layout";
import { LandingPage } from "./pages/LandingPage";
import { LoginPage } from "./pages/LoginPage";
import { RegisterCompanyPage } from "./pages/RegisterCompanyPage";
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

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/registrar" element={<RegisterCompanyPage />} />

          <Route element={<ProtectedRoute />}>
            <Route element={<Layout />}>
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/pedidos" element={<RequestsListPage />} />
              <Route path="/pedidos/novo" element={<RequestCreatePage />} />
              <Route path="/pedidos/:id" element={<RequestDetailPage />} />

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
