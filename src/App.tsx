import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import Auth from "./pages/Auth";
import CheckInOut from "./pages/employee/CheckInOut";
import History from "./pages/employee/History";
import AdminDashboard from "./pages/admin/Dashboard";
import AdminEmployees from "./pages/admin/Employees";
import AdminAttendance from "./pages/admin/Attendance";
import AdminSettings from "./pages/admin/Settings";
import NotFound from "./pages/NotFound";
import { Loader2 } from "lucide-react";

const queryClient = new QueryClient();

function ProtectedRoute({ children, requireAdmin = false }: { children: React.ReactNode; requireAdmin?: boolean }) {
  const { user, profile, loading, isAdmin } = useAuth();
  
  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  if (!user) return <Navigate to="/auth" replace />;
  if (requireAdmin && !isAdmin) return <Navigate to="/employee" replace />;
  if (!requireAdmin && isAdmin && !window.location.pathname.startsWith('/admin')) return <Navigate to="/admin" replace />;
  
  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/auth" element={<Auth />} />
      <Route path="/" element={<Navigate to="/auth" replace />} />
      <Route path="/employee" element={<ProtectedRoute><CheckInOut /></ProtectedRoute>} />
      <Route path="/employee/history" element={<ProtectedRoute><History /></ProtectedRoute>} />
      <Route path="/admin" element={<ProtectedRoute requireAdmin><AdminDashboard /></ProtectedRoute>} />
      <Route path="/admin/employees" element={<ProtectedRoute requireAdmin><AdminEmployees /></ProtectedRoute>} />
      <Route path="/admin/attendance" element={<ProtectedRoute requireAdmin><AdminAttendance /></ProtectedRoute>} />
      <Route path="/admin/settings" element={<ProtectedRoute requireAdmin><AdminSettings /></ProtectedRoute>} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
