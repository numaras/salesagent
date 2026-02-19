import { Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import ProductsPage from "./pages/ProductsPage";
import PrincipalsPage from "./pages/PrincipalsPage";
import MediaBuysPage from "./pages/MediaBuysPage";
import UsersPage from "./pages/UsersPage";
import SettingsPage from "./pages/SettingsPage";
import WorkflowsPage from "./pages/WorkflowsPage";
import CreativesPage from "./pages/CreativesPage";
import PropertiesPage from "./pages/PropertiesPage";
import CreativeAgentsPage from "./pages/CreativeAgentsPage";
import InventoryPage from "./pages/InventoryPage";
import PolicyPage from "./pages/PolicyPage";
import OperationsPage from "./pages/OperationsPage";
import OnboardingPage from "./pages/OnboardingPage";

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/onboarding" element={<OnboardingPage />} />
      <Route element={<Layout />}>
        <Route index element={<DashboardPage />} />
        <Route path="products" element={<ProductsPage />} />
        <Route path="principals" element={<PrincipalsPage />} />
        <Route path="media-buys" element={<MediaBuysPage />} />
        <Route path="workflows" element={<WorkflowsPage />} />
        <Route path="creatives" element={<CreativesPage />} />
        <Route path="properties" element={<PropertiesPage />} />
        <Route path="creative-agents" element={<CreativeAgentsPage />} />
        <Route path="inventory" element={<InventoryPage />} />
        <Route path="operations" element={<OperationsPage />} />
        <Route path="policy" element={<PolicyPage />} />
        <Route path="users" element={<UsersPage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>
    </Routes>
  );
}
