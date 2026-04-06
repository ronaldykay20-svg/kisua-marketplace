import { useState, useRef } from "react";
import { Play, Eye, X, ChevronLeft, ChevronRight, CheckCircle, ShoppingCart } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

const GroupedVideoStories = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeGroup, setActiveGroup] = useState<any>(null);
  const [storyIdx, setStoryIdx] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);

  const { data: stories = [] } = useQuery({
    queryKey: ["video_stories_grouped"],
    queryFn: async () => {
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { data, error } = await supabase
        .from("seller_stories")
        .select("*, sellers(id, name, logo_url, is_verified, type), products(id, title, price, old_price)")
        .eq("is_active", true)
        .gte("created_at", twentyFourHoursAgo)
        .order("created_at", { ascending: false });
      if (error) throw error;

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

  // Group by seller
  const grouped = stories.reduce((acc: Record<string, any>, story: any) => {
    const sid = story.seller_id;
    if (!acc[sid]) acc[sid] = { seller: story.sellers, stories: [] };
    acc[sid].stories.push(story);
    return acc;
  }, {});
  const sellerGroups = Object.values(grouped) as any[];

  const incrementView = useMutation({
    mutationFn: async (storyId: string) => {
      await supabase.rpc("increment_story_views", { story_id: storyId });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["video_stories_grouped"] }),
  });

  const openGroup = (group: any, idx = 0) => {
    setActiveGroup(group);
    setStoryIdx(idx);
    incrementView.mutate(group.stories[idx].id);
  };

  if (sellerGroups.length === 0) return null;

  return (
    <>
      <section className="container mx-auto px-3 pt-4">
        <div className="flex items-center gap-2 mb-3">
          <h2 className="text-sm font-bold text-foreground">Momentos dos vendedores</h2>
          <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-destructive/10 text-destructive font-bold">24h</span>
        </div>

        {/* 1 on mobile, 2 on tablet */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {sellerGroups.map((group: any) => {
            const firstStory = group.stories[0];
            const seller = group.seller;
            const product = firstStory.products;
            const storyCount = group.stories.length;

            return (
              <div key={seller?.id} className="rounded-card overflow-hidden border border-border bg-card">
                <div
                  className="relative aspect-[9/14] max-h-[400px] cursor-pointer group"
                  onClick={() => openGroup(group)}
                >
                  {firstStory.thumbnail_url ? (
                    <img src={firstStory.thumbnail_url} alt="" className="w-full h-full object-cover" loading="lazy" />
                  ) : (
                    <video src={firstStory.image_url} className="w-full h-full object-cover" muted preload="metadata" />
                  )}
                  <div className="absolute inset-0 bg-black/20 group-hover:bg-black/30 transition flex items-center justify-center">
                    <Play className="w-10 h-10 text-white fill-white opacity-80" />
                  </div>

                  {/* Seller info */}
                  <div className="absolute top-2 left-2 flex items-center gap-1.5">
                    <div className="w-7 h-7 rounded-full overflow-hidden border-2 border-white bg-muted">
                      {seller?.logo_url ? (
                        <img src={seller.logo_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-[9px] font-bold text-primary bg-primary/10">
                          {seller?.name?.charAt(0)}
                        </div>
                      )}
                    </div>
                    <span className="text-[10px] text-white font-bold drop-shadow truncate max-w-[100px]">{seller?.name}</span>
                    {seller?.is_verified && <CheckCircle className="w-3 h-3 text-white" />}
                  </div>

                  {/* Story count & views */}
                  <div className="absolute bottom-2 left-2 flex items-center gap-2">
                    <span className="flex items-center gap-1 text-white text-[10px] font-bold">
                      <Eye className="w-3 h-3" /> {firstStory.views_count || 0}
                    </span>
                    {storyCount > 1 && (
                      <span className="text-[9px] text-white/80 bg-white/20 px-1.5 py-0.5 rounded-full backdrop-blur-sm">
                        +{storyCount - 1} stories
                      </span>
                    )}
                  </div>
                </div>

                {/* Product link */}
                {product && (
                  <div className="p-2 flex items-center gap-2 cursor-pointer hover:bg-muted/50 transition"
                    onClick={() => navigate(`/produto/${product.id}`)}>
                    {firstStory.product_cover && (
                      <div className="w-9 h-9 rounded-md overflow-hidden bg-muted flex-shrink-0 border border-border">
                        <img src={firstStory.product_cover} alt="" className="w-full h-full object-cover" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] font-semibold text-foreground line-clamp-1">{product.title}</p>
                      <p className="text-[11px] font-black text-primary">{Number(product.price).toLocaleString("pt-AO")} Kz</p>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Fullscreen story viewer */}
      {activeGroup && (
        <div className="fixed inset-0 z-50 bg-black flex flex-col" onClick={() => setActiveGroup(null)}>
          {/* Progress bars */}
          <div className="absolute top-2 left-4 right-4 z-50 flex gap-1">
            {activeGroup.stories.map((_: any, i: number) => (
              <div key={i} className="flex-1 h-0.5 rounded-full bg-white/30 overflow-hidden">
                <div className={`h-full rounded-full transition-all ${i <= storyIdx ? "bg-white w-full" : "w-0"}`} />
              </div>
            ))}
          </div>

          <div className="absolute top-6 right-4 z-50">
            <button onClick={() => setActiveGroup(null)} className="p-2 rounded-full bg-white/20 text-white">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="absolute top-6 left-4 z-50 flex items-center gap-2">
            <div className="w-8 h-8 rounded-full overflow-hidden border-2 border-white bg-muted">
              {activeGroup.seller?.logo_url ? (
                <img src={activeGroup.seller.logo_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-xs font-bold text-white bg-white/20">
                  {activeGroup.seller?.name?.charAt(0)}
                </div>
              )}
            </div>
            <p className="text-white text-sm font-bold">{activeGroup.seller?.name}</p>
          </div>

          {/* Navigation arrows */}
          {storyIdx > 0 && (
            <button className="absolute left-2 top-1/2 -translate-y-1/2 z-50 p-2 rounded-full bg-white/20 text-white"
              onClick={(e) => { e.stopPropagation(); setStoryIdx(storyIdx - 1); }}>
              <ChevronLeft className="w-5 h-5" />
            </button>
          )}
          {storyIdx < activeGroup.stories.length - 1 && (
            <button className="absolute right-2 top-1/2 -translate-y-1/2 z-50 p-2 rounded-full bg-white/20 text-white"
              onClick={(e) => { e.stopPropagation(); setStoryIdx(storyIdx + 1); }}>
              <ChevronRight className="w-5 h-5" />
            </button>
          )}

          <video
            ref={videoRef}
            src={activeGroup.stories[storyIdx]?.image_url}
            className="w-full h-full object-contain"
            controls
            autoPlay
            onClick={(e) => e.stopPropagation()}
          />

          {activeGroup.stories[storyIdx]?.products && (
            <div
              className="absolute bottom-6 left-4 right-4 bg-card/95 backdrop-blur rounded-xl p-3 flex items-center gap-3 cursor-pointer border border-border"
              onClick={(e) => {
                e.stopPropagation();
                setActiveGroup(null);
                navigate(`/produto/${activeGroup.stories[storyIdx].products.id}`);
              }}
            >
              <div className="w-12 h-12 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                <img src={activeGroup.stories[storyIdx].product_cover || ""} alt="" className="w-full h-full object-cover" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-foreground line-clamp-1">{activeGroup.stories[storyIdx].products.title}</p>
                <p className="text-sm font-black text-primary">{Number(activeGroup.stories[storyIdx].products.price).toLocaleString("pt-AO")} Kz</p>
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

export default GroupedVideoStories;
