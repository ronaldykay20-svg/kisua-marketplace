import { useState, useRef, useEffect } from "react";
import {
  Eye, X, ChevronLeft, ChevronRight, CheckCircle,
  ShoppingCart, Heart, Send, MoreVertical, Sparkles, Shield, Star, Play,
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

/** Card individual com vídeo inline */
const StoryCard = ({
  group,
  onProductClick,
}: {
  group: any;
  onProductClick: (id: string) => void;
}) => {
  const firstStory = group.stories[0];
  const seller = group.seller;
  const storyWithProduct = group.stories.find((s: any) => s.products);
  const product = storyWithProduct?.products;
  const productCover = storyWithProduct?.product_cover;

  const [playing, setPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const handlePlay = () => {
    setPlaying(true);
    setTimeout(() => videoRef.current?.play(), 50);
  };

  const handleVideoPause = () => setPlaying(false);

  // Previne menu de contexto (download) no vídeo
  const blockContext = (e: React.MouseEvent) => e.preventDefault();

  return (
    <div
      className="w-full rounded-2xl overflow-hidden flex flex-col"
      style={{ background: "#2e1608" }}
    >
      {/* ── Topo: info do vendedor ── */}
      <div className="px-3 pt-3 pb-2 flex items-start gap-2">
        <div
          className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0 border-2"
          style={{ borderColor: "rgba(255,255,255,0.25)" }}
        >
          {seller?.logo_url ? (
            <img src={seller.logo_url} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-sm font-bold text-white bg-white/20">
              {seller?.name?.charAt(0)}
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1">
            <span className="text-white text-[13px] font-bold truncate leading-tight">
              {seller?.name}
            </span>
            {seller?.is_verified && (
              <CheckCircle className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "#60a5fa" }} />
            )}
          </div>
          {seller?.is_verified && (
            <span
              className="inline-block text-[9px] px-1.5 py-0.5 rounded font-semibold mt-0.5"
              style={{ background: "#7c4b1e", color: "#fff" }}
            >
              Verificado
            </span>
          )}
          <p className="text-[10px] mt-0.5" style={{ color: "rgba(255,255,255,0.45)" }}>
            {timeAgo(firstStory.created_at)}
          </p>
        </div>
        <button className="p-0.5 flex-shrink-0" style={{ color: "rgba(255,255,255,0.5)" }}>
          <MoreVertical className="w-5 h-5" />
        </button>
      </div>

      {/* ── Média: vídeo inline ── */}
      <div
        className="relative overflow-hidden bg-black"
        style={{ aspectRatio: "4/5" }}
        onContextMenu={blockContext}
      >
        {/* Thumbnail / poster enquanto não reproduz */}
        {!playing && (
          <>
            {firstStory.thumbnail_url ? (
              <img
                src={firstStory.thumbnail_url}
                alt=""
                className="w-full h-full object-cover"
                loading="lazy"
              />
            ) : (
              <video
                src={firstStory.image_url}
                className="w-full h-full object-cover"
                muted
                playsInline
                preload="metadata"
                onContextMenu={blockContext}
              />
            )}
            {/* Botão play central */}
            <button
              className="absolute inset-0 flex items-center justify-center"
              onClick={handlePlay}
              style={{ background: "rgba(0,0,0,0.25)" }}
            >
              <div
                className="w-14 h-14 rounded-full flex items-center justify-center"
                style={{ background: "rgba(255,255,255,0.25)", backdropFilter: "blur(4px)" }}
              >
                <Play className="w-7 h-7 text-white fill-white ml-1" />
              </div>
            </button>
          </>
        )}

        {/* Vídeo real — sem controlos nativos, sem download */}
        <video
          ref={videoRef}
          src={firstStory.image_url}
          className={`w-full h-full object-cover ${playing ? "block" : "hidden"}`}
          playsInline
          muted={false}
          onPause={handleVideoPause}
          onEnded={handleVideoPause}
          onContextMenu={blockContext}
          controlsList="nodownload nofullscreen noremoteplayback"
          disablePictureInPicture
          // sem controls — usa barra personalizada abaixo
        />

        {/* Barra personalizada visível só durante reprodução */}
        {playing && (
          <div className="absolute bottom-0 left-0 right-0 flex items-center gap-2 px-3 py-2"
            style={{ background: "linear-gradient(transparent, rgba(0,0,0,0.6))" }}
          >
            <button
              className="text-white"
              onClick={() => {
                videoRef.current?.pause();
                setPlaying(false);
              }}
            >
              <svg className="w-5 h-5 fill-white" viewBox="0 0 24 24">
                <rect x="6" y="4" width="4" height="16" /><rect x="14" y="4" width="4" height="16" />
              </svg>
            </button>
            <div className="flex-1 h-1 rounded-full bg-white/30 overflow-hidden">
              <div className="h-full bg-white w-0 transition-all" />
            </div>
          </div>
        )}
      </div>

      {/* ── Produto ── */}
      {product && (
        <>
          <div
            className="px-3 py-2.5 flex items-center gap-3 cursor-pointer"
            style={{ background: "#3d1f0c" }}
            onClick={() => onProductClick(product.id)}
          >
            {productCover && (
              <div
                className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0"
                style={{ background: "rgba(255,255,255,0.08)" }}
              >
                <img src={productCover} alt="" className="w-full h-full object-cover" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-white text-[12px] font-semibold line-clamp-1 leading-tight">
                {product.title}
              </p>
              <p className="text-[13px] font-black mt-0.5" style={{ color: "#c8883a" }}>
                {Number(product.price).toLocaleString("pt-AO")} Kz
              </p>
            </div>
            <button
              className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ background: "#5a2d10" }}
            >
              <ChevronRight className="w-5 h-5 text-white" />
            </button>
          </div>

          {seller?.is_verified && (
            <div
              className="px-3 py-2 flex items-center gap-2 flex-wrap"
              style={{ background: "#3d1f0c", borderTop: "1px solid rgba(255,255,255,0.06)" }}
            >
              <span className="flex items-center gap-1 text-[10px]" style={{ color: "rgba(255,255,255,0.6)" }}>
                <Shield className="w-3 h-3" style={{ color: "#c8883a" }} /> Entrega rápida
              </span>
              <span style={{ color: "rgba(255,255,255,0.2)", fontSize: 10 }}>|</span>
              <span className="flex items-center gap-1 text-[10px]" style={{ color: "rgba(255,255,255,0.6)" }}>
                <Star className="w-3 h-3 fill-amber-400" style={{ color: "#facc15" }} /> 4.9
              </span>
              <span style={{ color: "rgba(255,255,255,0.2)", fontSize: 10 }}>|</span>
              <span className="flex items-center gap-1 text-[10px]" style={{ color: "rgba(255,255,255,0.6)" }}>
                <CheckCircle className="w-3 h-3" style={{ color: "#60a5fa" }} /> Parceiro certificado
              </span>
            </div>
          )}
        </>
      )}

      {/* ── Rodapé ── */}
      <div className="px-3 py-2.5 flex items-center justify-between" style={{ background: "#2e1608" }}>
        <span className="flex items-center gap-1 text-[11px]" style={{ color: "rgba(255,255,255,0.55)" }}>
          <Eye className="w-3.5 h-3.5" /> {firstStory.views_count || 0}
        </span>
        <div className="flex items-center gap-4">
          <Heart className="w-5 h-5" style={{ color: "rgba(255,255,255,0.55)" }} />
          <Send className="w-5 h-5" style={{ color: "rgba(255,255,255,0.55)" }} />
        </div>
      </div>
    </div>
  );
};

/* ─────────────────────────────────────────────── */

const GroupedVideoStories = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [currentPage, setCurrentPage] = useState(0);
  const carouselRef = useRef<HTMLDivElement>(null);

  const { data: stories = [] } = useQuery({
    queryKey: ["video_stories_grouped"],
    queryFn: async () => {
      // ✅ usa expires_at em vez de filtro fixo de 24h
      const now = new Date().toISOString();
      const { data, error } = await supabase
        .from("seller_stories")
        .select("*, sellers(id, name, logo_url, is_verified, type), products(id, title, price, old_price)")
        .eq("is_active", true)
        .or(`expires_at.is.null,expires_at.gte.${now}`)
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

  const onScroll = () => {
    if (!carouselRef.current) return;
    const { scrollLeft, clientWidth } = carouselRef.current;
    setCurrentPage(Math.round(scrollLeft / clientWidth));
  };

  if (sellerGroups.length === 0) return null;

  return (
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

      {/* ── Carrossel fullwidth (1 card por vez) ── */}
      <div
        ref={carouselRef}
        onScroll={onScroll}
        className="flex gap-4 overflow-x-auto scrollbar-hide snap-x snap-mandatory"
      >
        {sellerGroups.map((group: any) => (
          <div
            key={group.seller?.id}
            className="snap-start flex-shrink-0 w-full"
          >
            <StoryCard
              group={group}
              onProductClick={(id) => navigate(`/produto/${id}`)}
            />
          </div>
        ))}
      </div>

      {/* ── Dots de paginação ── */}
      {sellerGroups.length > 1 && (
        <div className="flex justify-center gap-2 mt-4">
          {sellerGroups.map((_, i) => (
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
  );
};

export default GroupedVideoStories;
