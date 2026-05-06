import { useState, useRef, useEffect } from "react";
import {
  Play, Eye, X, ChevronLeft, ChevronRight, CheckCircle,
  ShoppingCart, Heart, Send, MoreVertical, Sparkles, Shield, Star,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

/** Helper de tempo relativo */
const timeAgo = (dateStr: string) => {
  const diff = Date.now() - new Date(dateStr).getTime();
  const h = Math.floor(diff / 3_600_000);
  const m = Math.floor(diff / 60_000);
  if (h > 0) return `há ${h}h`;
  return `há ${m}m`;
};

/** Capa automática do primeiro frame do vídeo */
const VideoCover = ({ src, className }: { src: string; className?: string }) => {
  const [poster, setPoster] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const v = document.createElement("video");
    v.crossOrigin = "anonymous";
    v.muted = true;
    v.preload = "metadata";
    v.src = src;
    v.currentTime = 0.1;
    const onLoaded = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = v.videoWidth || 360;
        canvas.height = v.videoHeight || 640;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(v, 0, 0, canvas.width, canvas.height);
          setPoster(canvas.toDataURL("image/jpeg", 0.7));
        }
      } catch { /* CORS bloqueado */ }
    };
    v.addEventListener("loadeddata", onLoaded, { once: true });
    return () => v.removeEventListener("loadeddata", onLoaded);
  }, [src]);

  if (poster) return <img src={poster} alt="" className={className} loading="lazy" />;
  return <video ref={videoRef} src={src} className={className} muted playsInline preload="metadata" />;
};

/* ─────────────────────────────────────────────── */

const GroupedVideoStories = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeGroup, setActiveGroup] = useState<any>(null);
  const [storyIdx, setStoryIdx] = useState(0);
  const [currentPage, setCurrentPage] = useState(0);
  const carouselRef = useRef<HTMLDivElement>(null);

  /* ── Query (inalterada) ── */
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

  /* Rastreia página actual pelo scroll */
  const onScroll = () => {
    if (!carouselRef.current) return;
    const { scrollLeft, clientWidth } = carouselRef.current;
    setCurrentPage(Math.round(scrollLeft / (clientWidth / 2 + 6)));
  };

  if (sellerGroups.length === 0) return null;

  const totalDots = Math.ceil(sellerGroups.length / 2);

  /* ═══════════════════════════════════════════════ RENDER */
  return (
    <>
      <section className="px-4 pt-5 pb-3">

        {/* ── Cabeçalho ── */}
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="w-4 h-4" style={{ color: "#7c4b1e" }} />
          <h2 className="text-[15px] font-bold" style={{ color: "#1a0d06" }}>
            Momento de nossos parceiros
          </h2>
          <span
            className="text-[10px] px-2.5 py-0.5 rounded-full font-bold"
            style={{ background: "#e8d5be", color: "#7c4b1e" }}
          >
            24h
          </span>
        </div>

        {/* ── Carrossel ── */}
        <div
          ref={carouselRef}
          onScroll={onScroll}
          className="flex gap-3 overflow-x-auto scrollbar-hide snap-x snap-mandatory"
        >
          {sellerGroups.map((group: any) => {
            const firstStory = group.stories[0];
            const seller = group.seller;
            const product = firstStory.products;

            return (
              <div
                key={seller?.id}
                className="snap-start flex-shrink-0 rounded-2xl overflow-hidden flex flex-col"
                style={{
                  width: "calc(50% - 6px)",
                  background: "#2e1608",
                }}
              >
                {/* ── Topo: info do vendedor ── */}
                <div className="px-2.5 pt-2.5 pb-1.5 flex items-start gap-2">
                  {/* Avatar */}
                  <div
                    className="w-9 h-9 rounded-full overflow-hidden flex-shrink-0 border-2"
                    style={{ borderColor: "rgba(255,255,255,0.25)" }}
                  >
                    {seller?.logo_url ? (
                      <img src={seller.logo_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-xs font-bold text-white bg-white/20">
                        {seller?.name?.charAt(0)}
                      </div>
                    )}
                  </div>

                  {/* Nome + badge + tempo */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1">
                      <span className="text-white text-[11px] font-bold truncate leading-tight">
                        {seller?.name}
                      </span>
                      {seller?.is_verified && (
                        <CheckCircle className="w-3 h-3 flex-shrink-0" style={{ color: "#60a5fa" }} />
                      )}
                    </div>
                    {seller?.is_verified && (
                      <span
                        className="inline-block text-[8px] px-1.5 py-0.5 rounded font-semibold mt-0.5"
                        style={{ background: "#7c4b1e", color: "#fff" }}
                      >
                        Verificado
                      </span>
                    )}
                    <p className="text-[9px] mt-0.5" style={{ color: "rgba(255,255,255,0.45)" }}>
                      {timeAgo(firstStory.created_at)}
                    </p>
                  </div>

                  {/* 3 pontos */}
                  <button className="p-0.5 flex-shrink-0" style={{ color: "rgba(255,255,255,0.5)" }}>
                    <MoreVertical className="w-4 h-4" />
                  </button>
                </div>

                {/* ── Vídeo / Imagem ── */}
                <div
                  className="relative cursor-pointer overflow-hidden"
                  style={{ aspectRatio: "3/4" }}
                  onClick={() => openGroup(group)}
                >
                  {firstStory.thumbnail_url ? (
                    <img
                      src={firstStory.thumbnail_url}
                      alt=""
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <VideoCover src={firstStory.image_url} className="w-full h-full object-cover" />
                  )}
                </div>

                {/* ── Produto ── */}
                {product && (
                  <>
                    <div
                      className="px-2.5 py-2 flex items-center gap-2 cursor-pointer"
                      style={{ background: "#3d1f0c" }}
                      onClick={() => navigate(`/produto/${product.id}`)}
                    >
                      {firstStory.product_cover && (
                        <div
                          className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0"
                          style={{ background: "rgba(255,255,255,0.08)" }}
                        >
                          <img
                            src={firstStory.product_cover}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-[10px] font-semibold line-clamp-1 leading-tight">
                          {product.title}
                        </p>
                        <p className="text-[11px] font-black mt-0.5" style={{ color: "#c8883a" }}>
                          {Number(product.price).toLocaleString("pt-AO")} Kz
                        </p>
                      </div>
                      <button
                        className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
                        style={{ background: "#5a2d10" }}
                      >
                        <ChevronRight className="w-4 h-4 text-white" />
                      </button>
                    </div>

                    {/* Badges extras (vendedores verificados) */}
                    {seller?.is_verified && (
                      <div
                        className="px-2.5 py-1.5 flex items-center gap-1.5 flex-wrap"
                        style={{ background: "#3d1f0c", borderTop: "1px solid rgba(255,255,255,0.06)" }}
                      >
                        <span className="flex items-center gap-0.5 text-[8px]" style={{ color: "rgba(255,255,255,0.6)" }}>
                          <Shield className="w-2.5 h-2.5" style={{ color: "#c8883a" }} /> Entrega rápida
                        </span>
                        <span style={{ color: "rgba(255,255,255,0.2)", fontSize: 8 }}>|</span>
                        <span className="flex items-center gap-0.5 text-[8px]" style={{ color: "rgba(255,255,255,0.6)" }}>
                          <Star className="w-2.5 h-2.5 fill-amber-400" style={{ color: "#facc15" }} /> 4.9
                        </span>
                        <span style={{ color: "rgba(255,255,255,0.2)", fontSize: 8 }}>|</span>
                        <span className="flex items-center gap-0.5 text-[8px]" style={{ color: "rgba(255,255,255,0.6)" }}>
                          <CheckCircle className="w-2.5 h-2.5" style={{ color: "#60a5fa" }} /> Parceiro certificado
                        </span>
                      </div>
                    )}
                  </>
                )}

                {/* ── Rodapé: views + coração + partilha ── */}
                <div className="px-3 py-2 flex items-center justify-between" style={{ background: "#2e1608" }}>
                  <span className="flex items-center gap-1 text-[10px]" style={{ color: "rgba(255,255,255,0.55)" }}>
                    <Eye className="w-3 h-3" /> {firstStory.views_count || 0}
                  </span>
                  <div className="flex items-center gap-3">
                    <Heart className="w-4 h-4" style={{ color: "rgba(255,255,255,0.55)" }} />
                    <Send className="w-4 h-4" style={{ color: "rgba(255,255,255,0.55)" }} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* ── Dots de paginação ── */}
        {totalDots > 1 && (
          <div className="flex justify-center gap-2 mt-4">
            {Array.from({ length: totalDots }).map((_, i) => (
              <div
                key={i}
                className="rounded-full transition-all duration-300"
                style={{
                  width: i === currentPage ? 8 : 6,
                  height: i === currentPage ? 8 : 6,
                  background: i === currentPage ? "#7c4b1e" : "#d1bfae",
                }}
              />
            ))}
          </div>
        )}
      </section>

      {/* ══════════════════════════ Viewer fullscreen (inalterado) ══════════════════════════ */}
      {activeGroup && (
        <div
          className="fixed inset-0 z-50 bg-black flex flex-col"
          onClick={() => setActiveGroup(null)}
        >
          {/* Barra de progresso */}
          <div className="absolute top-2 left-4 right-4 z-50 flex gap-1">
            {activeGroup.stories.map((_: any, i: number) => (
              <div key={i} className="flex-1 h-0.5 rounded-full bg-white/30 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    i <= storyIdx ? "bg-white w-full" : "w-0"
                  }`}
                />
              </div>
            ))}
          </div>

          {/* Fechar */}
          <div className="absolute top-6 right-4 z-50">
            <button
              onClick={() => setActiveGroup(null)}
              className="p-2 rounded-full bg-white/20 text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Info vendedor */}
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

          {/* Navegar anterior */}
          {storyIdx > 0 && (
            <button
              className="absolute left-2 top-1/2 -translate-y-1/2 z-50 p-2 rounded-full bg-white/20 text-white"
              onClick={(e) => { e.stopPropagation(); setStoryIdx(storyIdx - 1); }}
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          )}

          {/* Navegar próximo */}
          {storyIdx < activeGroup.stories.length - 1 && (
            <button
              className="absolute right-2 top-1/2 -translate-y-1/2 z-50 p-2 rounded-full bg-white/20 text-white"
              onClick={(e) => { e.stopPropagation(); setStoryIdx(storyIdx + 1); }}
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          )}

          <video
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
                <img
                  src={activeGroup.stories[storyIdx].product_cover || ""}
                  alt=""
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-foreground line-clamp-1">
                  {activeGroup.stories[storyIdx].products.title}
                </p>
                <p className="text-sm font-black text-primary">
                  {Number(activeGroup.stories[storyIdx].products.price).toLocaleString("pt-AO")} Kz
                </p>
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
