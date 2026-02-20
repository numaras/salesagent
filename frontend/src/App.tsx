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
import WorkflowReviewPage from "./pages/WorkflowReviewPage";
import CreativesPage from "./pages/CreativesPage";
import CreativeReviewPage from "./pages/CreativeReviewPage";
import PropertiesPage from "./pages/PropertiesPage";
import CreativeAgentsPage from "./pages/CreativeAgentsPage";
import SignalsAgentsPage from "./pages/SignalsAgentsPage";
import InventoryPage from "./pages/InventoryPage";
import PolicyPage from "./pages/PolicyPage";
import OperationsPage from "./pages/OperationsPage";
import OnboardingPage from "./pages/OnboardingPage";
import SsoConfigPage from "./pages/SsoConfigPage";
import GamConfigPage from "./pages/GamConfigPage";
import GamReportingPage from "./pages/GamReportingPage";
import LineItemViewerPage from "./pages/LineItemViewerPage";
import InventoryBrowserPage from "./pages/InventoryBrowserPage";
import TargetingBrowserPage from "./pages/TargetingBrowserPage";
import InventoryProfilesPage from "./pages/InventoryProfilesPage";

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
        <Route path="workflows/:id" element={<WorkflowReviewPage />} />
        <Route path="creatives" element={<CreativesPage />} />
        <Route path="creatives/:id" element={<CreativeReviewPage />} />
        <Route path="properties" element={<PropertiesPage />} />
        <Route path="creative-agents" element={<CreativeAgentsPage />} />
        <Route path="signals-agents" element={<SignalsAgentsPage />} />
        <Route path="inventory" element={<InventoryPage />} />
        <Route path="inventory/browser" element={<InventoryBrowserPage />} />
        <Route path="inventory/targeting" element={<TargetingBrowserPage />} />
        <Route path="inventory-profiles" element={<InventoryProfilesPage />} />
        <Route path="operations" element={<OperationsPage />} />
        <Route path="policy" element={<PolicyPage />} />
        <Route path="users" element={<UsersPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="sso" element={<SsoConfigPage />} />
        <Route path="gam-config" element={<GamConfigPage />} />
        <Route path="gam/reporting" element={<GamReportingPage />} />
        <Route path="gam/line-item/:id" element={<LineItemViewerPage />} />
      </Route>
    </Routes>
  );
}
