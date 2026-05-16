import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import ProtectedRoute from "./router/ProtectedRoute";
import DashboardLayout from "./components/DashboardLayout";
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import OrdersPage from "./pages/OrdersPage";
import DriversPage from "./pages/DriversPage";
import CreateDriverPage from "./pages/CreateDriverPage";
import CustomersPage from "./pages/CustomersPage";
import PricingPage from "./pages/PricingPage";
import DispatchMapPage from "./pages/DispatchMapPage";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<DashboardPage />} />
          <Route path="orders" element={<OrdersPage />} />
          <Route path="drivers" element={<DriversPage />} />
          <Route path="customers" element={<CustomersPage />} />
          <Route path="pricing" element={<PricingPage />} />
          <Route path="dispatch" element={<DispatchMapPage />} />
        </Route>
        {/* Full screen — outside layout */}
        <Route
          path="/drivers/create"
          element={
            <ProtectedRoute>
              <CreateDriverPage />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
