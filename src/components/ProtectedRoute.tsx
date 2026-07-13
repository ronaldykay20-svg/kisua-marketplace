import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole, AppRole } from "@/hooks/useUserRole";

interface ProtectedRouteProps {
  children: ReactNode;
  // Aceita um único cargo (como antes) ou uma lista — usado em /admin para
  // deixar entrar tanto o admin como qualquer um dos 5 cargos de equipa.
  requiredRole?: AppRole | AppRole[];
  requireAuth?: boolean;
}

const ProtectedRoute = ({ children, requiredRole, requireAuth = true }: ProtectedRouteProps) => {
  const { user, loading: authLoading } = useAuth();
  const { hasRole, loading: roleLoading } = useUserRole();

  if (authLoading || (user && roleLoading)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (requireAuth && !user) {
    return <Navigate to="/auth" replace />;
  }

  if (requiredRole) {
    const required = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
    const allowed = required.some((r) => hasRole(r)) || hasRole("admin");
    if (!allowed) return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
