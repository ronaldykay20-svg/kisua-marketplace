import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";

export const useFeatureAccess = (feature: string) => {
  const { user } = useAuth();
  const { isAdmin } = useUserRole();

  const { data: isEnabledPublic = true, isLoading: loadingPublic } = useQuery({
    queryKey: ["feature_public_enabled", feature],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("site_settings")
        .select("value")
        .eq("key", `feature_${feature}_enabled`)
        .maybeSingle();
      if (error) throw error;
      return data?.value === "true" || data?.value === undefined;
    },
    staleTime: 60 * 1000,
  });

  const { data: isTester = false, isLoading: loadingTester } = useQuery({
    queryKey: ["feature_tester", feature, user?.id],
    queryFn: async () => {
      if (!user) return false;
      const { data } = await (supabase as any)
        .from("feature_testers")
        .select("id")
        .eq("feature", feature)
        .eq("user_id", user.id)
        .maybeSingle();
      return !!data;
    },
    enabled: !!user,
    staleTime: 60 * 1000,
  });

  const hasAccess = isEnabledPublic || isAdmin || isTester;

  return {
    isEnabledPublic,
    hasAccess,
    isLoading: loadingPublic || loadingTester,
  };
};
