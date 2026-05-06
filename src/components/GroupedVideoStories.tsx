import { useState, useRef, useEffect } from "react";
import {
  Eye, ChevronRight, CheckCircle, ChevronLeft,
  MoreVertical, Sparkles, Shield, Star, Play, Pause,
  User, Video, X, Package, Truck,
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
        .from("sellers")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();
      if (data) setSellerId(data.id);
    };
    load();
  }, []);
  return sellerId;
};

/* ── Modal: mais momentos do vendedor ── */
const MomentsModal = ({
  group,
  onClose,
}: {
  group: any;
  onClose: () => void;
}) => {
  const [idx, setIdx] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const story = group.stories[idx];
  const blockContext = (e: React.MouseEvent) => e.preventDefault();

  useEffect(() => {
    videoRef.current?.load();
  }, [idx]);

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      {/* Barras de progresso */}
      <div className="absolute top-3 left-4 right-4 z-10 flex gap-1">
        {group.stories.map((_: any, i: number) => (
          <div key={i} className="flex-1 h-0.5 rounded-full bg-white/30 overflow-hidden">
            <div className={`h-full bg-white ${i <= idx ? "w-full" : "w-0"} transition-all`} />
          </div>
        ))}
      </div>

      {/* Header */}
      <div className="absolute top-8 left-4 right-4 z-10 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full overflow-hidden border border-white/30">
            {group.seller?.logo_url
              ? <img src={group.seller.logo_url} alt="" className="w-full h-full object-cover" />
              : <div className="w-full h-full bg-white/20 flex items-center justify-center text-xs font-bold text-white">{group.seller?.name?.charAt(0)}</div>
            }
          </div>
          <p className="text-white text-sm font-bold">{group.seller?.name}</p>
        </div>
        <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
          <X className="w-4 h-4 text-white" />
        </button>
      </div>

      {/* Vídeo */}
      <video
        ref={videoRef}
        src={`${story.image_url}#t=0.001`}
        className="w-full h-full object-contain"
        autoPlay
        playsInline
        onContextMenu={blockContext}
        controlsList="nodownload nofullscreen noremoteplayback"
        disablePictureInPicture
        onEnded={() => idx < group.stories.length - 1 && setIdx(idx + 1)}
      />

      {/* Navegar */}
      {idx > 0 && (
        <button
          className="absolute left-2 top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full bg-white/20 flex items-center justify-center"
          onClick={() => setIdx(idx - 1)}
        ><ChevronLeft className="w-5 h-5 text-white" /></button>
      )}
      {idx < group.stories.length - 1 && (
        <button
          className="absolute right-2 top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full bg-white/20 flex items-center justify-center"
          onClick={() => setIdx(idx + 1)}
        ><ChevronRight className="w-5 h-5 text-white" /></button>
      )}

      {/* Produto no viewer */}
      {story.products && (
        <div className="absolute bottom-6 left-4 right-4 bg-black/70 backdrop-blur rounded-xl p-3 flex items-center gap-3">
          {story.product_cover && (
            <img src={story.product_cover} alt="" className="w-12 h-12 rounded-lg object-cover flex-shrink-0" />
          )}
          <div className="flex-1 min-w-0">
            <p className="text-white text-xs font-bold line-clamp-1">{story.products.title}</p>
            <p className="text-[13px] font-black" style={{ color: "#c8883a" }}>
              {Number(story.products.price).toLocaleString("pt-AO")} Kz
            </p>
          </div>
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
  const caption = firstStory.caption;

  const [playing, setPlaying] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showMoments, setShowMoments] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const isOwner = currentSellerId === seller?.id;
  const hasMoreStories = group.stories.length > 1;

  // Info extra do produto para encher o card
  const hasFreeShipping = product?.old_price && Number(product.old_price) > 0;

  const blockContext = (e: React.MouseEvent) => e.preventDefault();

  const handlePlay = () => {
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.play();
      setPlaying(true);
    }
  };

  const handlePause = () => {
    videoRef.current?.pause();
    setPlaying(false);
  };

  return (
    <>
      {showMoments && (
        <MomentsModal group={group} onClose={() => setShowMoments(false)} />
      )}

      {/* Card — flex-col com flex-1 nas secções para esticar */}
      <div className="w-full rounded-2xl overflow-hidden flex flex-col h-full" style={{ background: "#2e1608" }}>

        {/* ── Topo ── */}
        <div className="px-3 pt-3 pb-2 flex items-start gap-2 relative">
          <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0 border-2" style={{ borderColor: "rgba(255,255,255,0.25)" }}>
            {seller?.logo_url
              ? <img src={seller.logo_url} alt="" className="w-full h-full object-cover" />
              : <div className="w-full h-full flex items-center justify-center text-sm font-bold text-white bg-white/20">{seller?.name?.charAt(0)}</div>
            }
          </div>

          <div className="flex-1 min-w-0">
            <button className="flex items-center gap-1 text-left" onClick={() => setShowMenu(v => !v)}>
              <span className="text-white text-[13px] font-bold truncate leading-tight">{seller?.name}</span>
              {seller?.is_verified && <CheckCircle className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "#60a5fa" }} />}
              <svg className="w-3 h-3 flex-shrink-0" style={{ color: "rgba(255,255,255,0.4)" }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>
            {seller?.is_verified && (
              <span className="inline-block text-[9px] px-1.5 py-0.5 rounded font-semibold mt-0.5" style={{ background: "#7c4b1e", color: "#fff" }}>
                Verificado
              </span>
            )}
            <p className="text-[10px] mt-0.5" style={{ color: "rgba(255,255,255,0.45)" }}>{timeAgo(firstStory.created_at)}</p>
          </div>

          <button className="p-0.5 flex-shrink-0" style={{ color: "rgba(255,255,255,0.5)" }}>
            <MoreVertical className="w-5 h-5" />
          </button>

          {/* Menu dropdown — só "Ver perfil" se não tiver mais momentos */}
          {showMenu && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
              <div className="absolute top-14 left-3 z-50 rounded-xl overflow-hidden shadow-2xl" style={{ background: "#1a0d06", border: "1px solid rgba(255,255,255,0.12)", minWidth: 185 }}>
                <button
                  className="w-full flex items-center gap-3 px-4 py-3 text-left"
                  style={{ color: "rgba(255,255,255,0.9)" }}
                  onClick={() => { onViewProfile(seller); setShowMenu(false); }}
                >
                  <User className="w-4 h-4" style={{ color: "#c8883a" }} />
                  <span className="text-[13px] font-medium">Ver perfil</span>
                </button>

                {/* Só mostra "Ver mais momentos" se tiver mais de 1 story */}
                {hasMoreStories && (
                  <>
                    <div style={{ height: 1, background: "rgba(255,255,255,0.08)" }} />
                    <button
                      className="w-full flex items-center gap-3 px-4 py-3 text-left"
                      style={{ color: "rgba(255,255,255,0.9)" }}
                      onClick={() => { setShowMoments(true); setShowMenu(false); }}
                    >
                      <Video className="w-4 h-4" style={{ color: "#c8883a" }} />
                      <span className="text-[13px] font-medium">Ver mais momentos</span>
                    </button>
                  </>
                )}
              </div>
            </>
          )}
        </div>

        {/* ── Vídeo ── */}
        <div className="relative overflow-hidden bg-black" style={{ aspectRatio: "4/5" }} onContextMenu={blockContext}>
          {firstStory.thumbnail_url && !playing && (
            <img src={firstStory.thumbnail_url} alt="" className="absolute inset-0 w-full h-full object-cover z-10" />
          )}

          <video
            ref={videoRef}
            src={`${firstStory.image_url}#t=0.001`}
            className="w-full h-full object-cover"
            playsInline
            preload="auto"
            onEnded={() => setPlaying(false)}
            onPause={() => setPlaying(false)}
            onPlay={() => setPlaying(true)}
            onContextMenu={blockContext}
            controlsList="nodownload nofullscreen noremoteplayback"
            disablePictureInPicture
          />

          {!playing && (
            <button
              className="absolute inset-0 z-20 flex items-center justify-center"
              style={{ background: "rgba(0,0,0,0.28)" }}
              onClick={handlePlay}
            >
              <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ background: "rgba(255,255,255,0.22)", backdropFilter: "blur(6px)" }}>
                <Play className="w-8 h-8 text-white fill-white ml-1" />
              </div>
            </button>
          )}

          {playing && (
            <button
              className="absolute bottom-3 right-3 z-20 w-9 h-9 rounded-full flex items-center justify-center"
              style={{ background: "rgba(0,0,0,0.45)", backdropFilter: "blur(4px)" }}
              onClick={handlePause}
            >
              <Pause className="w-4 h-4 text-white fill-white" />
            </button>
          )}
        </div>

        {/* ── Legenda (caption) — aparece se existir ── */}
        {caption && (
          <div className="px-3 py-2" style={{ background: "#2e1608" }}>
            <p className="text-[11px] leading-relaxed" style={{ color: "rgba(255,255,255,0.75)" }}>
              {caption}
            </p>
          </div>
        )}

        {/* ── Produto ── */}
        {product ? (
          <div className="flex flex-col flex-1" style={{ background: "#3d1f0c" }}>
            {/* Info do produto */}
            <div
              className="px-3 py-2.5 flex items-center gap-3 cursor-pointer"
              onClick={() => onProductClick(product.id)}
            >
              {productCover && (
                <div className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0" style={{ background: "rgba(255,255,255,0.08)" }}>
                  <img src={productCover} alt="" className="w-full h-full object-cover" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-white text-[12px] font-semibold line-clamp-2 leading-tight">{product.title}</p>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <p className="text-[13px] font-black" style={{ color: "#c8883a" }}>
                    {Number(product.price).toLocaleString("pt-AO")} Kz
                  </p>
                  {product.old_price && Number(product.old_price) > 0 && (
                    <p className="text-[10px] line-through" style={{ color: "rgba(255,255,255,0.4)" }}>
                      {Number(product.old_price).toLocaleString("pt-AO")} Kz
                    </p>
                  )}
                </div>
              </div>
              <button className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: "#5a2d10" }}>
                <ChevronRight className="w-5 h-5 text-white" />
              </button>
            </div>

            {/* Badges de entrega e verificação */}
            <div className="px-3 pb-2.5 flex flex-col gap-1.5" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
              <div className="flex items-center gap-2 pt-2 flex-wrap">
                {seller?.is_verified && (
                  <>
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
                  </>
                )}
              </div>

              {/* Frete grátis se tiver preço antigo (promoção) */}
              {product.old_price && Number(product.old_price) > 0 && (
                <span className="flex items-center gap-1 text-[10px] font-semibold" style={{ color: "#4ade80" }}>
                  <Truck className="w-3 h-3" /> Frete grátis incluído
                </span>
              )}
            </div>
          </div>
        ) : (
          /* Sem produto — espaçador para o card não ficar curto */
          <div className="flex-1 px-3 py-3" style={{ background: "#2e1608", minHeight: 48 }}>
            {!caption && (
              <p className="text-[11px]" style={{ color: "rgba(255,255,255,0.3)" }}>
                Publicado por {seller?.name}
              </p>
            )}
          </div>
        )}

        {/* ── Rodapé: views só para o dono ── */}
        {isOwner && (
          <div className="px-3 py-2.5 flex items-center" style={{ background: "#2e1608", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
            <span className="flex items-center gap-1.5 text-[11px]" style={{ color: "rgba(255,255,255,0.55)" }}>
              <Eye className="w-3.5 h-3.5" /> {firstStory.views_count || 0} visualizações
            </span>
          </div>
        )}
      </div>
    </>
  );
};

/* ─────────────────────────────────────────────── */

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

  const handleViewProfile = (seller: any) => {
    if (!seller) return;
    const route = seller.type === "empresa" ? `/empresa/${seller.id}` : `/vendedor/${seller.id}`;
    navigate(route);
  };

  if (sellerGroups.length === 0) return null;

  return (
    <section className="px-4 pt-5 pb-3">
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="w-4 h-4" style={{ color: "#7c4b1e" }} />
        <h2 className="text-[15px] font-bold" style={{ color: "#1a0d06" }}>
          Momento de nossos parceiros
        </h2>
        <span className="text-[10px] px-2.5 py-0.5 rounded-full font-bold" style={{ background: "#e8d5be", color: "#7c4b1e" }}>
          24h
        </span>
      </div>

      {/* Carrossel responsivo: 1 mobile / 2 tablet / 3 desktop */}
      <div
        ref={carouselRef}
        onScroll={onScroll}
        className="flex gap-4 overflow-x-auto scrollbar-hide snap-x snap-mandatory items-stretch"
      >
        {sellerGroups.map((group: any) => (
          <div
            key={group.seller?.id}
            className="snap-start flex-shrink-0 w-full sm:w-[calc(50%-8px)] lg:w-[calc(33.333%-11px)] flex flex-col"
          >
            <StoryCard
              group={group}
              currentSellerId={currentSellerId}
              onProductClick={(id) => navigate(`/produto/${id}`)}
              onViewProfile={handleViewProfile}
            />
          </div>
        ))}
      </div>

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
