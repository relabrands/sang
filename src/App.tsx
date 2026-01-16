import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import CreateSANG from "./pages/CreateSANG";
import JoinSANG from "./pages/JoinSANG";
import SANGDetail from "./pages/SANGDetail";
import SANGList from "./pages/SANGList";
import Profile from "./pages/Profile";
import Notifications from "./pages/Notifications";
import Security from "./pages/Security";
import Help from "./pages/Help";
import AdminDashboard from "./pages/AdminDashboard";
import NotFound from "./pages/NotFound";

import { TutorialProvider } from "@/components/Tutorial/TutorialProvider";
import InviteHandler from "@/components/InviteHandler";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthProvider>
        <BrowserRouter>
          <TutorialProvider>
            <Routes>
              <Route path="/" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/invite/:code" element={<InviteHandler />} />
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <Dashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/create-sang"
                element={
                  <ProtectedRoute>
                    <CreateSANG />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/join-sang"
                element={
                  <ProtectedRoute>
                    <JoinSANG />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/sang/:id"
                element={
                  <ProtectedRoute>
                    <SANGDetail />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/sangs"
                element={
                  <ProtectedRoute>
                    <SANGList />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/profile"
                element={
                  <ProtectedRoute>
                    <Profile />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/notifications"
                element={
                  <ProtectedRoute>
                    <Notifications />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/security"
                element={
                  <ProtectedRoute>
                    <Security />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/help"
                element={
                  <ProtectedRoute>
                    <Help />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin"
                element={
                  <ProtectedRoute requireAdmin={true}>
                    <AdminDashboard />
                  </ProtectedRoute>
                }
              />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </TutorialProvider>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
