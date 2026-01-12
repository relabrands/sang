import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

interface ProtectedRouteProps {
    children: React.ReactNode;
    requireAdmin?: boolean;
}

export default function ProtectedRoute({ children, requireAdmin = false }: ProtectedRouteProps) {
    const { currentUser, isAdmin, loading } = useAuth();

    if (loading) {
        // You could replace this with a proper loading spinner component
        return <div className="flex items-center justify-center min-h-screen">Cargando...</div>;
    }

    if (!currentUser) {
        return <Navigate to="/login" replace />;
    }

    if (requireAdmin && !isAdmin) {
        // Redirect non-admins to dashboard if they try to access admin routes
        return <Navigate to="/dashboard" replace />;
    }

    return <>{children}</>;
}
