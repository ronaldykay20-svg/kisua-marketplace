import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export const useFavorites = () => {
  const { user } = useAuth();
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);

  useEffect(() => {
    if (!user) { setFavoriteIds([]); return; }
    supabase
      .from("favorites")
      .select("product_id")
      .eq("user_id", user.id)
      .then(({ data }) => {
        if (data) setFavoriteIds(data.map((f) => f.product_id));
      });
  }, [user]);

  const isFavorite = useCallback(
    (productId: string) => favoriteIds.includes(productId),
    [favoriteIds]
  );

  const toggleFavorite = useCallback(
    async (productId: string) => {
      if (!user) return;
      if (isFavorite(productId)) {
        await supabase
          .from("favorites")
          .delete()
          .eq("user_id", user.id)
          .eq("product_id", productId);
        setFavoriteIds((prev) => prev.filter((id) => id !== productId));
      } else {
        await supabase
          .from("favorites")
          .insert({ user_id: user.id, product_id: productId });
        setFavoriteIds((prev) => [...prev, productId]);
      }
    },
    [user, isFavorite]
  );

  return { isFavorite, toggleFavorite };
};

export const useFavoritesPage = () => {
  const { user } = useAuth();
  const [favorites, setFavorites] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) { setIsLoading(false); return; }
    setIsLoading(true);
    supabase
      .from("favorites")
      .select(`
        id, product_id, created_at,
        products (
          id, title, price, old_price, discount_percent,
          free_shipping, badge, rating, total_reviews,
          product_media (url, is_cover, sort_order)
        )
      `)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        if (data) setFavorites(data);
        setIsLoading(false);
      });
  }, [user]);

  const removeFavorite = async (productId: string) => {
    await supabase
      .from("favorites")
      .delete()
      .eq("user_id", user!.id)
      .eq("product_id", productId);
    setFavorites((prev) => prev.filter((f) => f.product_id !== productId));
  };

  return { favorites, isLoading, removeFavorite };
};
