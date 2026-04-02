import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type AppRole = "admin" | "moderator" | "user";

export const useUserRole = () => {
  const { user } = useAuth();

  const { data: roles = [], isLoading } = useQuery({
    queryKey: ["user_roles", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user!.id);
      if (error) throw error;
      return (data || []).map((r: any) => r.role as AppRole);
    },
    enabled: !!user,
  });

  return {
    roles,
    isAdmin: roles.includes("admin"),
    isModerator: roles.includes("moderator"),
    isUser: roles.includes("user"),
    hasRole: (role: AppRole) => roles.includes(role),
    canManageProducts: roles.includes("admin") || roles.includes("moderator"),
    canManageUsers: roles.includes("admin"),
    loading: isLoading,
  };
};
