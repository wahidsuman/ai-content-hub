import { Router, Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import NewsHome from "@/pages/news-home";
import Dashboard from "@/pages/dashboard";
import Content from "@/pages/content";
import Approvals from "@/pages/approvals-new";
import AdminLogin from "@/pages/admin-login";
import AIManager from "@/pages/ai-manager";
import SeoManager from "@/pages/seo-manager";
import Analytics from "@/pages/analytics";
import Settings from "@/pages/settings";
import Automation from "@/pages/automation";
import DeploymentPage from "@/pages/deployment";
import SearchConsolePage from "@/pages/search-console";
import Sidebar from "@/components/layout/sidebar";

function AppContent() {
  const [location] = useLocation();
  
  // Check if this is an admin route
  const isAdminRoute = location.startsWith('/dashboard') ||
                       location.startsWith('/content') ||
                       location.startsWith('/approvals') ||
                       location.startsWith('/ai-manager') ||
                       location.startsWith('/seo-manager') ||
                       location.startsWith('/analytics') ||
                       location.startsWith('/automation') ||
                       location.startsWith('/deployment') ||
                       location.startsWith('/search-console') ||
                       location.startsWith('/settings') ||
                       location.startsWith('/admin');

  // For admin routes, show the dashboard layout
  if (isAdminRoute) {
    return (
      <div className="min-h-screen flex bg-gray-50">
        <Sidebar />
        <main className="flex-1 ml-64">
          <Switch>
            <Route path="/admin" component={AdminLogin} />
            <Route path="/dashboard" component={Dashboard} />
            <Route path="/content" component={Content} />
            <Route path="/approvals" component={Approvals} />
            <Route path="/ai-manager" component={AIManager} />
            <Route path="/seo-manager" component={SeoManager} />
            <Route path="/analytics" component={Analytics} />
            <Route path="/automation" component={Automation} />
            <Route path="/deployment" component={DeploymentPage} />
            <Route path="/search-console" component={SearchConsolePage} />
            <Route path="/settings" component={Settings} />
            <Route component={NotFound} />
          </Switch>
        </main>
      </div>
    );
  }

  // For public routes, show the news website
  return (
    <Switch>
      <Route path="/" component={NewsHome} />
      <Route path="/admin" component={AdminLogin} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Router>
          <AppContent />
        </Router>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
