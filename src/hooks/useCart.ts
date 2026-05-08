import { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export const useCart = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const addToCart = useCallback(
    async (productId: string, quantity = 1) => {
      if (!user) {
        navigate("/auth");
        return;
      }

      // Verifica se o item já existe no carrinho
      const { data: existing } = await supabase
        .from("cart_items")
        .select("id, quantity")
        .eq("user_id", user.id)
        .eq("product_id", productId)
        .maybeSingle();

      if (existing) {
        await supabase
          .from("cart_items")
          .update({ quantity: existing.quantity + quantity })
          .eq("id", existing.id);
      } else {
        await supabase
          .from("cart_items")
          .insert({ user_id: user.id, product_id: productId, quantity });
      }

      // Invalida o cache do carrinho para que a página Carrinho
      // reflicta imediatamente o novo item (useCart de useSupabaseData)
      queryClient.invalidateQueries({ queryKey: ["cart"] });

      // Navega para o carrinho
      navigate("/carrinho");
    },
    [user, navigate, queryClient]
  );

  return { addToCart };
};
