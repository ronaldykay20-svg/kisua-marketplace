import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQueryClient } from "@tanstack/react-query";

export const useFavorites = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) { setFavoriteIds([]); return; }
    fetchFavoriteIds();
  }, [user]);

  const fetchFavoriteIds = async () => {
    const { data } = await supabase
      .from("favorites")
      .select("product_id")
      .eq("user_id", user!.id);
    if (data) setFavoriteIds(data.map((f) => f.product_id));
  };

  const isFavorite = (productId: string) => favoriteIds.includes(productId);

  const toggleFavorite = async (productId: string) => {
    if (!user) return;
    setLoading(true);
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
    queryClient.invalidateQueries({ queryKey: ["favorites"] });
    setLoading(false);
  };

  return { favoriteIds, isFavorite, toggleFavorite, loading };
};

export const useFavoritesPage = () => {
  const { user } = useAuth();
  const [favorites, setFavorites] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) { setIsLoading(false); return; }
    fetchFavorites();
  }, [user]);

  const fetchFavorites = async () => {
    setIsLoading(true);
    const { data } = await supabase
      .from("favorites")
      .select(`
        id,
        product_id,
        created_at,
        products (
          id, title, price, old_price, discount_percent,
          free_shipping, badge, rating, total_reviews,
          product_media (url, is_cover, sort_order)
        )
      `)
      .eq("user_id", user!.id)
      .order("created_at", { ascending: false });
    
    if (data) setFavorites(data);
    setIsLoading(false);
  };

  const removeFavorite = async (productId: string) => {
    await supabase
      .from("favorites")
      .delete()
      .eq("user_id", user!.id)
      .eq("product_id", productId);
    setFavorites((prev) => prev.filter((f) => f.product_id !== productId));
  };

  return { favorites, isLoading, removeFavorite, refetch: fetchFavorites };
};
