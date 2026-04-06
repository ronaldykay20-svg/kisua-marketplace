import { useState, useRef } from "react";
import { Play, Eye, X, ChevronRight, CheckCircle, ShoppingCart } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

const VideoStories = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeStory, setActiveStory] = useState<any>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const { data: stories = [] } = useQuery({
    queryKey: ["video_stories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("seller_stories")
        .select("*, sellers(id, name, logo_url, is_verified, type), products(id, title, price, old_price, image_url)")
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(10);
      if (error) throw error;

      // Get cover images for linked products
      const productIds = (data || []).filter((s: any) => s.product_id).map((s: any) => s.product_id);
      let coverMap: Record<string, string> = {};
      if (productIds.length > 0) {
        const { data: media } = await supabase
          .from("product_media")
          .select("product_id, url")
          .in("product_id", productIds)
          .eq("is_cover", true);
        (media || []).forEach((m: any) => { coverMap[m.product_id] = m.url; });
      }

      return (data || []).map((s: any) => ({
        ...s,
        product_cover: s.product_id ? coverMap[s.product_id] : null,
      }));
    },
  });

  const incrementView = useMutation({
    mutationFn: async (storyId: string) => {
      await supabase.rpc("increment_story_views", { story_id: storyId });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["video_stories"] }),
  });

  const openStory = (story: any) => {
    setActiveStory(story);
    incrementView.mutate(story.id);
  };

  if (stories.length === 0) return null;

  return (
    <>
      <section className="container mx-auto px-4 py-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-base font-bold text-foreground">Destaque em vídeos</h2>
            <p className="text-[11px] text-muted-foreground">Veja o que os vendedores estão a partilhar</p>
          </div>
        </div>

        <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2">
          {stories.map((story: any) => {
            const product = story.products;
            const seller = story.sellers;
            const productImage = story.product_cover || product?.image_url;

            return (
              <div key={story.id} className="flex-shrink-0 w-[160px] sm:w-[200px]">
                {/* Video thumbnail */}
                <div
                  className="relative aspect-[9/14] rounded-card overflow-hidden bg-muted cursor-pointer group"
                  onClick={() => openStory(story)}
                >
                  {story.thumbnail_url ? (
                    <img src={story.thumbnail_url} alt="" className="w-full h-full object-cover" loading="lazy" />
                  ) : (
                    <video
                      src={story.video_url}
                      className="w-full h-full object-cover"
                      muted
                      preload="metadata"
                    />
                  )}

                  {/* Play overlay */}
                  <div className="absolute inset-0 bg-black/20 group-hover:bg-black/30 transition flex items-center justify-center">
                    <Play className="w-8 h-8 text-white fill-white opacity-80" />
                  </div>

                  {/* Views */}
                  <div className="absolute bottom-2 left-2 flex items-center gap-1 text-white text-[10px] font-bold">
                    <Eye className="w-3 h-3" /> {story.views_count || 0}
                  </div>

                  {/* Seller avatar */}
                  <div className="absolute top-2 left-2 flex items-center gap-1">
                    <div className="w-6 h-6 rounded-full overflow-hidden border-2 border-white bg-muted">
                      {seller?.logo_url ? (
                        <img src={seller.logo_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-[8px] font-bold text-primary bg-primary/10">
                          {seller?.name?.charAt(0)}
                        </div>
                      )}
                    </div>
                    <span className="text-[9px] text-white font-bold drop-shadow truncate max-w-[80px]">
                      {seller?.name}
                    </span>
                    {seller?.is_verified && <CheckCircle className="w-3 h-3 text-white flex-shrink-0" />}
                  </div>
                </div>

                {/* Product card below video */}
                {product && (
                  <div
                    className="mt-1.5 flex gap-2 items-start cursor-pointer"
                    onClick={() => navigate(`/produto/${product.id}`)}
                  >
                    {productImage && (
                      <div className="w-10 h-10 rounded-md overflow-hidden bg-muted flex-shrink-0 border border-border">
                        <img src={productImage} alt="" className="w-full h-full object-cover" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] font-semibold text-foreground line-clamp-2 leading-tight">{product.title}</p>
                      <p className="text-[11px] font-black text-primary">
                        {Number(product.price).toLocaleString("pt-AO")} Kz
                      </p>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Fullscreen video modal */}
      {activeStory && (
        <div className="fixed inset-0 z-50 bg-black flex flex-col" onClick={() => setActiveStory(null)}>
          <div className="absolute top-4 right-4 z-50">
            <button onClick={() => setActiveStory(null)} className="p-2 rounded-full bg-white/20 text-white">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Seller info */}
          <div className="absolute top-4 left-4 z-50 flex items-center gap-2">
            <div className="w-8 h-8 rounded-full overflow-hidden border-2 border-white bg-muted">
              {activeStory.sellers?.logo_url ? (
                <img src={activeStory.sellers.logo_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-xs font-bold text-white bg-white/20">
                  {activeStory.sellers?.name?.charAt(0)}
                </div>
              )}
            </div>
            <div>
              <p className="text-white text-sm font-bold">{activeStory.sellers?.name}</p>
              <p className="text-white/60 text-[10px]">{activeStory.views_count || 0} visualizações</p>
            </div>
          </div>

          <video
            ref={videoRef}
            src={activeStory.video_url}
            className="w-full h-full object-contain"
            controls
            autoPlay
            onClick={(e) => e.stopPropagation()}
          />

          {/* Product card overlay */}
          {activeStory.products && (
            <div
              className="absolute bottom-6 left-4 right-4 bg-card/95 backdrop-blur rounded-xl p-3 flex items-center gap-3 cursor-pointer border border-border"
              onClick={(e) => {
                e.stopPropagation();
                setActiveStory(null);
                navigate(`/produto/${activeStory.products.id}`);
              }}
            >
              {(activeStory.product_cover || activeStory.products.image_url) && (
                <div className="w-12 h-12 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                  <img src={activeStory.product_cover || activeStory.products.image_url} alt="" className="w-full h-full object-cover" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-foreground line-clamp-1">{activeStory.products.title}</p>
                <p className="text-sm font-black text-primary">{Number(activeStory.products.price).toLocaleString("pt-AO")} Kz</p>
              </div>
              <button className="p-2 rounded-lg bg-primary text-primary-foreground flex-shrink-0">
                <ShoppingCart className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      )}
    </>
  );
};

export default VideoStories;
