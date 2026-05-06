import { useState, useRef, useEffect, useCallback } from "react";
import {
  Eye, ChevronRight, CheckCircle,
  Heart, Send, MoreVertical, Sparkles, Shield, Star, Play, Pause,
  User, Video,
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

/* ── Mini menu do vendedor ── */
const SellerMenu = ({
  seller,
  onClose,
  onViewProfile,
  onViewMoments,
}: {
  seller: any;
  onClose: () => void;
  onViewProfile: () => void;
  onViewMoments: () => void;
}) => (
  <>
    {/* Overlay invisível para fechar */}
    <div className="fixed inset-0 z-40" onClick={onClose} />
    <div
      className="absolute top-14 left-3 z-50 rounded-xl overflow-hidden shadow-2xl"
      style={{ background: "#1a0d06", border: "1px solid rgba(255,255,255,0.12)", minWidth: 180 }}
    >
      <button
        className="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors"
        style={{ color: "rgba(255,255,255,0.9)" }}
        onClick={() => { onViewProfile(); onClose(); }}
      >
        <User className="w-4 h-4" style={{ color: "#c8883a" }} />
        <span className="text-[13px] font-medium">Ver perfil</span>
      </button>
      <div style={{ height: 1, background: "rgba(255,255,255,0.08)" }} />
      <button
        className="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors"
        style={{ color: "rgba(255,255,255,0.9)" }}
        onClick={() => { onViewMoments(); onClose(); }}
      >
        <Video className="w-4 h-4" style={{ color: "#c8883a" }} />
        <span className="text-[13px] font-medium">Ver mais momentos</span>
      </button>
    </div>
  </>
);

/* ── Card individual ── */
const StoryCard = ({
  group,
  onProductClick,
  onViewProfile,
  onViewMoments,
}: {
  group: any;
  onProductClick: (id: string) => void;
  onViewProfile: (sellerId: string) => void;
  onViewMoments: (sellerId: string) => void;
}) => {
  const firstStory = group.stories[0];
  const seller = group.seller;
  const storyWithProduct = group.stories.find((s: any) => s.products);
  const product = storyWithProduct?.products;
  const productCover = storyWithProduct?.product_cover;

  const [poster, setPoster] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const thumbRef = useRef<HTMLVideoElement>(null);

  /* ── Captura frame do vídeo para usar como capa ── */
  useEffect(() => {
    if (firstStory.thumbnail_url) return; // já tem thumbnail, não precisa
    const video = thumbRef.current;
    if (!video) return;

    const capture = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = video.videoWidth || 480;
        canvas.height = video.videoHeight || 600;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const dataUrl = canvas.toDataURL("image/jpeg", 0.8);
          // Valida que não é frame em branco (todos pretos)
          if (dataUrl.length > 5000) setPoster(dataUrl);
        }
      } catch {
        // CORS bloqueado — deixa o vídeo servir de poster
      }
    };

    const onSeeked = () => capture();
    video.addEventListener("seeked", onSeeked);
    video.addEventListener("loadeddata", () => {
      video.currentTime = 0.5; // vai para 0.5s para ter frame com conteúdo
    });

    return () => video.removeEventListener("seeked", onSeeked);
  }, [firstStory.thumbnail_url, firstStory.image_url]);

  const blockContext = (e: React.MouseEvent) => e.preventDefault();

  const handlePlay = () => {
    setPlaying(true);
    setTimeout(() => {
      if (videoRef.current) {
        videoRef.current.currentTime = 0;
        videoRef.current.play();
      }
    }, 30);
  };

  const handlePause = () => {
    videoRef.current?.pause();
    setPlaying(false);
  };

  return (
    <div className="w-full rounded-2xl overflow-hidden flex flex-col relative" style={{ background: "#2e1608" }}>

      {/* ── Topo: info do vendedor ── */}
      <div className="px-3 pt-3 pb-2 flex items-start gap-2 relative">
        {/* Avatar */}
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

        {/* Nome — clicável */}
        <div className="flex-1 min-w-0">
          <button
            className="flex items-center gap-1 text-left"
            onClick={() => setShowMenu((v) => !v)}
          >
            <span className="text-white text-[13px] font-bold truncate leading-tight">
              {seller?.name}
            </span>
            {seller?.is_verified && (
              <CheckCircle className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "#60a5fa" }} />
            )}
            {/* Pequena seta indicadora */}
            <svg className="w-3 h-3 flex-shrink-0" style={{ color: "rgba(255,255,255,0.4)" }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>

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

        {/* Menu dropdown */}
        {showMenu && (
          <SellerMenu
            seller={seller}
            onClose={() => setShowMenu(false)}
            onViewProfile={() => onViewProfile(seller?.id)}
            onViewMoments={() => onViewMoments(seller?.id)}
          />
        )}
      </div>

      {/* ── Área do vídeo ── */}
      <div
        className="relative overflow-hidden bg-black"
        style={{ aspectRatio: "4/5" }}
        onContextMenu={blockContext}
      >
        {/* Vídeo oculto usado só para capturar o frame de capa */}
        {!firstStory.thumbnail_url && (
          <video
            ref={thumbRef}
            src={firstStory.image_url}
            className="absolute opacity-0 pointer-events-none w-0 h-0"
            muted
            playsInline
            preload="metadata"
            crossOrigin="anonymous"
            onContextMenu={blockContext}
          />
        )}

        {/* Estado: parado — mostra capa */}
        {!playing && (
          <>
            {firstStory.thumbnail_url ? (
              <img
                src={firstStory.thumbnail_url}
                alt=""
                className="w-full h-full object-cover"
                loading="lazy"
              />
            ) : poster ? (
              <img
                src={poster}
                alt=""
                className="w-full h-full object-cover"
              />
            ) : (
              /* Fallback: mostra vídeo estático no frame 0 enquanto captura */
              <video
                src={firstStory.image_url}
                className="w-full h-full object-cover"
                muted
                playsInline
                preload="metadata"
                onContextMenu={blockContext}
              />
            )}

            {/* Botão play */}
            <button
              className="absolute inset-0 flex items-center justify-center"
              style={{ background: "rgba(0,0,0,0.3)" }}
              onClick={handlePlay}
            >
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center"
                style={{ background: "rgba(255,255,255,0.22)", backdropFilter: "blur(6px)" }}
              >
                <Play className="w-8 h-8 text-white fill-white ml-1" />
              </div>
            </button>
          </>
        )}

        {/* Vídeo a reproduzir */}
        <video
          ref={videoRef}
          src={firstStory.image_url}
          className={`w-full h-full object-cover ${playing ? "block" : "hidden"}`}
          playsInline
          onEnded={() => setPlaying(false)}
          onPause={() => setPlaying(false)}
          onContextMenu={blockContext}
          controlsList="nodownload nofullscreen noremoteplayback"
          disablePictureInPicture
        />

        {/* Botão pausa sobre o vídeo */}
        {playing && (
          <button
            className="absolute bottom-3 right-3 w-9 h-9 rounded-full flex items-center justify-center"
            style={{ background: "rgba(0,0,0,0.45)", backdropFilter: "blur(4px)" }}
            onClick={handlePause}
          >
            <Pause className="w-4 h-4 text-white fill-white" />
          </button>
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
      // ✅ 24h reais baseadas no created_at
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

      {/* ── Carrossel ── */}
      <div
        ref={carouselRef}
        onScroll={onScroll}
        className="flex gap-4 overflow-x-auto scrollbar-hide snap-x snap-mandatory"
      >
        {sellerGroups.map((group: any) => (
          <div key={group.seller?.id} className="snap-start flex-shrink-0 w-full">
            <StoryCard
              group={group}
              onProductClick={(id) => navigate(`/produto/${id}`)}
              onViewProfile={(sellerId) => navigate(`/loja/${sellerId}`)}
              onViewMoments={(sellerId) => navigate(`/momentos/${sellerId}`)}
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
