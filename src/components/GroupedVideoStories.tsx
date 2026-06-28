import { useState, useRef, useEffect } from "react";
import {
  Eye, ChevronRight, CheckCircle,
  Play, X, User, Video, MoreVertical,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

const timeAgo = (dateStr: string) => {
  const diff = Date.now() - new Date(dateStr).getTime();
  const h = Math.floor(diff / 3_600_000);
  const m = Math.floor(diff / 60_000);
  if (h > 0) return `há ${h}h`;
  return `há ${m}m`;
};

/* ── Hook: seller autenticado ── */
const useCurrentSellerId = () => {
  const [sellerId, setSellerId] = useState<string | null>(null);
  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from("sellers").select("id").eq("user_id", user.id).maybeSingle();
      if (data) setSellerId(data.id);
    };
    load();
  }, []);
  return sellerId;
};

/* ── Modal fullscreen (múltiplos momentos) ── */
const MomentsModal = ({ group, onClose }: { group: any; onClose: () => void }) => {
  const [idx, setIdx] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const story = group.stories[idx];
  const navigate = useNavigate();

  useEffect(() => { videoRef.current?.load(); }, [idx]);

  return (
    <div className="fixed inset-0 z-[100] bg-black flex flex-col">
      {/* Barra de progresso */}
      <div className="absolute top-3 left-4 right-4 z-10 flex gap-1">
        {group.stories.map((_: any, i: number) => (
          <div key={i} className="flex-1 h-0.5 rounded-full bg-white/30">
            <div className={`h-full bg-white rounded-full ${i <= idx ? "w-full" : "w-0"} transition-all`} />
          </div>
        ))}
      </div>

      {/* Header */}
      <div className="absolute top-8 left-4 right-4 z-10 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full overflow-hidden border-2 border-white/40">
            {group.seller?.logo_url
              ? <img src={group.seller.logo_url} className="w-full h-full object-cover" alt="" />
              : <div className="w-full h-full bg-white/20 flex items-center justify-center text-xs font-bold text-white">{group.seller?.name?.charAt(0)}</div>}
          </div>
          <p className="text-white text-sm font-bold drop-shadow">{group.seller?.name}</p>
        </div>
        <button onClick={onClose} className="w-8 h-8 rounded-full bg-black/40 flex items-center justify-center">
          <X className="w-4 h-4 text-white" />
        </button>
      </div>

      {/* Vídeo */}
      <video
        ref={videoRef}
        src={`${story.image_url}#t=0.001`}
        className="w-full h-full object-contain"
        autoPlay playsInline
        controlsList="nodownload nofullscreen noremoteplayback"
        disablePictureInPicture
        onContextMenu={e => e.preventDefault()}
        onEnded={() => idx < group.stories.length - 1 && setIdx(idx + 1)}
      />

      {/* Navegar lateral */}
      {idx > 0 && (
        <button onClick={() => setIdx(idx - 1)}
          className="absolute left-3 top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full bg-black/40 flex items-center justify-center">
          <ChevronRight className="w-5 h-5 text-white rotate-180" />
        </button>
      )}
      {idx < group.stories.length - 1 && (
        <button onClick={() => setIdx(idx + 1)}
          className="absolute right-3 top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full bg-black/40 flex items-center justify-center">
          <ChevronRight className="w-5 h-5 text-white" />
        </button>
      )}

      {/* Produto sobreposto */}
      {story.products && (
        <div
          className="absolute bottom-8 left-4 right-4 flex items-center gap-3 cursor-pointer rounded-2xl px-3 py-3"
          style={{ background: "rgba(0,0,0,0.72)", backdropFilter: "blur(12px)" }}
          onClick={() => { onClose(); navigate(`/produto/${story.products.id}`); }}
        >
          {story.product_cover && (
            <img src={story.product_cover} alt="" className="w-12 h-12 rounded-xl object-cover flex-shrink-0" />
          )}
          <div className="flex-1 min-w-0">
            <p className="text-white text-xs font-semibold line-clamp-1">{story.products.title}</p>
            <p className="text-sm font-black" style={{ color: "#f4a85d" }}>
              {Number(story.products.price).toLocaleString("pt-AO")} Kz
            </p>
          </div>
          <ChevronRight className="w-5 h-5 text-white/60 flex-shrink-0" />
        </div>
      )}
    </div>
  );
};

/* ── Card individual ── */
const StoryCard = ({
  group,
  currentSellerId,
  onProductClick,
  onViewProfile,
}: {
  group: any;
  currentSellerId: string | null;
  onProductClick: (id: string) => void;
  onViewProfile: (seller: any) => void;
}) => {
  const firstStory = group.stories[0];
  const seller = group.seller;
  const storyWithProduct = group.stories.find((s: any) => s.products);
  const product = storyWithProduct?.products;
  const productCover = storyWithProduct?.product_cover;

  const [showMenu, setShowMenu] = useState(false);
  const [showMoments, setShowMoments] = useState(false);
  const isOwner = currentSellerId === seller?.id;
  const hasMoreStories = group.stories.length > 1;

  return (
    <>
      {showMoments && <MomentsModal group={group} onClose={() => setShowMoments(false)} />}

      {/* Card limpo, fundo branco/neutro */}
      <div className="w-full rounded-2xl overflow-hidden bg-white" style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.08)" }}>

        {/* ── Vídeo com overlays ── */}
        <div className="relative w-full overflow-hidden" style={{ aspectRatio: "9/14", background: "#111" }}>
          {/* Thumbnail ou vídeo */}
          {firstStory.thumbnail_url ? (
            <img src={firstStory.thumbnail_url} alt="" className="absolute inset-0 w-full h-full object-cover" />
          ) : (
            <video
              src={`${firstStory.image_url}#t=0.001`}
              className="absolute inset-0 w-full h-full object-cover"
              muted playsInline preload="metadata"
              onContextMenu={e => e.preventDefault()}
            />
          )}

          {/* Gradiente topo */}
          <div className="absolute inset-x-0 top-0 h-24 z-10"
            style={{ background: "linear-gradient(to bottom, rgba(0,0,0,0.55) 0%, transparent 100%)" }} />

          {/* Gradiente base */}
          <div className="absolute inset-x-0 bottom-0 h-32 z-10"
            style={{ background: "linear-gradient(to top, rgba(0,0,0,0.70) 0%, transparent 100%)" }} />

          {/* Info vendedor — topo */}
          <div className="absolute top-3 left-3 right-3 z-20 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <div className="w-7 h-7 rounded-full overflow-hidden border border-white/50 flex-shrink-0">
                {seller?.logo_url
                  ? <img src={seller.logo_url} alt="" className="w-full h-full object-cover" />
                  : <div className="w-full h-full bg-white/20 flex items-center justify-center text-[10px] font-bold text-white">{seller?.name?.charAt(0)}</div>}
              </div>
              <span className="text-white text-[12px] font-bold drop-shadow truncate max-w-[100px]">{seller?.name}</span>
              {seller?.is_verified && <CheckCircle className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "#60a5fa" }} />}
            </div>

            {/* Menu */}
            <div className="relative">
              <button
                onClick={() => setShowMenu(v => !v)}
                className="w-7 h-7 rounded-full flex items-center justify-center"
                style={{ background: "rgba(0,0,0,0.35)" }}>
                <MoreVertical className="w-4 h-4 text-white" />
              </button>
              {showMenu && (
                <>
                  <div className="fixed inset-0 z-30" onClick={() => setShowMenu(false)} />
                  <div className="absolute top-8 right-0 z-40 rounded-xl overflow-hidden shadow-2xl"
                    style={{ background: "#1a0d06", border: "1px solid rgba(255,255,255,0.12)", minWidth: 175 }}>
                    <button className="w-full flex items-center gap-2.5 px-4 py-3 text-left"
                      style={{ color: "rgba(255,255,255,0.9)" }}
                      onClick={() => { onViewProfile(seller); setShowMenu(false); }}>
                      <User className="w-4 h-4" style={{ color: "#c8883a" }} />
                      <span className="text-[13px] font-medium">Ver perfil</span>
                    </button>
                    {hasMoreStories && (
                      <>
                        <div style={{ height: 1, background: "rgba(255,255,255,0.08)" }} />
                        <button className="w-full flex items-center gap-2.5 px-4 py-3 text-left"
                          style={{ color: "rgba(255,255,255,0.9)" }}
                          onClick={() => { setShowMoments(true); setShowMenu(false); }}>
                          <Video className="w-4 h-4" style={{ color: "#c8883a" }} />
                          <span className="text-[13px] font-medium">Ver mais momentos</span>
                        </button>
                      </>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Botão play central */}
          <div className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none">
            <div className="w-14 h-14 rounded-full flex items-center justify-center"
              style={{ background: "rgba(255,255,255,0.20)", backdropFilter: "blur(6px)" }}>
              <Play className="w-7 h-7 text-white fill-white ml-0.5" />
            </div>
          </div>

          {/* Tap area para abrir fullscreen */}
          <button
            className="absolute inset-0 z-20"
            style={{ background: "transparent" }}
            onClick={() => setShowMoments(true)}
            aria-label="Ver vídeo"
          />

          {/* Views — dono apenas, canto inferior esquerdo */}
          {isOwner && (
            <div className="absolute bottom-3 left-3 z-30 flex items-center gap-1"
              style={{ color: "rgba(255,255,255,0.8)" }}>
              <Eye className="w-3 h-3" />
              <span className="text-[10px] font-semibold">{firstStory.views_count || 0}</span>
            </div>
          )}

          {/* Tempo — canto inferior direito */}
          <span className="absolute bottom-3 right-3 z-30 text-[10px]" style={{ color: "rgba(255,255,255,0.6)" }}>
            {timeAgo(firstStory.created_at)}
          </span>
        </div>

        {/* ── Produto em baixo (fora do vídeo) — estilo balão Walmart ── */}
        {product ? (
          <button
            className="w-full flex items-center gap-3 px-3 py-3 text-left active:bg-gray-50 transition-colors"
            onClick={() => onProductClick(product.id)}
          >
            {productCover && (
              <img src={productCover} alt="" className="w-11 h-11 rounded-xl object-cover flex-shrink-0 border border-gray-100" />
            )}
            <div className="flex-1 min-w-0">
              <p className="text-[12px] font-semibold text-gray-900 line-clamp-2 leading-tight">{product.title}</p>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[13px] font-black" style={{ color: "#b85c1e" }}>
                  {Number(product.price).toLocaleString("pt-AO")} Kz
                </span>
                {product.old_price && Number(product.old_price) > 0 && (
                  <span className="text-[10px] line-through text-gray-400">
                    {Number(product.old_price).toLocaleString("pt-AO")} Kz
                  </span>
                )}
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
          </button>
        ) : (
          /* Sem produto — só o nome do vendedor discreto */
          <div className="px-3 py-2.5">
            <p className="text-[11px] text-gray-400">Por {seller?.name}</p>
          </div>
        )}
      </div>
    </>
  );
};

/* ── Principal ── */
const GroupedVideoStories = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [currentPage, setCurrentPage] = useState(0);
  const carouselRef = useRef<HTMLDivElement>(null);
  const currentSellerId = useCurrentSellerId();

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
          .from("product_media").select("product_id, url")
          .in("product_id", productIds).eq("is_cover", true);
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

  useMutation({
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

  const handleViewProfile = (seller: any) => {
    if (!seller) return;
    navigate(seller.type === "empresa" ? `/empresa/${seller.id}` : `/vendedor/${seller.id}`);
  };

  if (sellerGroups.length === 0) return null;

  return (
    <section className="py-4">
      {/* Título */}
      <div className="flex items-center justify-between px-4 mb-3">
        <div>
          <h2 className="text-[15px] font-bold text-gray-900">Em destaque</h2>
          <p className="text-[11px] text-gray-400 mt-0.5">Vídeos dos nossos parceiros</p>
        </div>
        <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-gray-100 text-gray-500">24h</span>
      </div>

      {/* Carrossel */}
      <div
        ref={carouselRef}
        onScroll={onScroll}
        className="flex gap-3 overflow-x-auto scrollbar-hide snap-x snap-mandatory px-4"
      >
        {sellerGroups.map((group: any) => (
          <div
            key={group.seller?.id}
            className="snap-start flex-shrink-0 w-[72vw] sm:w-[46vw] lg:w-[30vw] max-w-[280px]"
          >
            <StoryCard
              group={group}
              currentSellerId={currentSellerId}
              onProductClick={id => navigate(`/produto/${id}`)}
              onViewProfile={handleViewProfile}
            />
          </div>
        ))}
      </div>

      {/* Paginação */}
      {sellerGroups.length > 1 && (
        <div className="flex justify-center gap-1.5 mt-4">
          {sellerGroups.map((_, i) => (
            <div key={i} className="rounded-full transition-all duration-300"
              style={{
                width: i === currentPage ? 20 : 6,
                height: 6,
                background: i === currentPage ? "#b85c1e" : "#e0d0c4",
              }}
            />
          ))}
        </div>
      )}
    </section>
  );
};

export default GroupedVideoStories;
