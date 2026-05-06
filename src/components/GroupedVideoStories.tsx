import { useState, useRef, useEffect } from "react";
import {
  Eye, ChevronRight, CheckCircle,
  MoreVertical, Sparkles, Shield, Star, Play, Pause,
  User, Video,
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

/* ── Hook: devolve o seller_id do utilizador autenticado (se for vendedor) ── */
const useCurrentSellerId = () => {
  const [sellerId, setSellerId] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      // Tenta encontrar o seller ligado ao user autenticado
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

/* ── Mini menu do vendedor ── */
const SellerMenu = ({
  seller,
  hasMoreStories,
  onClose,
  onViewProfile,
  onViewMoments,
}: {
  seller: any;
  hasMoreStories: boolean;
  onClose: () => void;
  onViewProfile: () => void;
  onViewMoments: () => void;
}) => (
  <>
    <div className="fixed inset-0 z-40" onClick={onClose} />
    <div
      className="absolute top-14 left-3 z-50 rounded-xl overflow-hidden shadow-2xl"
      style={{ background: "#1a0d06", border: "1px solid rgba(255,255,255,0.12)", minWidth: 185 }}
    >
      <button
        className="w-full flex items-center gap-3 px-4 py-3 text-left"
        style={{ color: "rgba(255,255,255,0.9)" }}
        onClick={() => { onViewProfile(); onClose(); }}
      >
        <User className="w-4 h-4" style={{ color: "#c8883a" }} />
        <span className="text-[13px] font-medium">Ver perfil</span>
      </button>

      {/* "Ver mais momentos" só aparece se o vendedor tiver mais de 1 story */}
      {hasMoreStories && (
        <>
          <div style={{ height: 1, background: "rgba(255,255,255,0.08)" }} />
          <button
            className="w-full flex items-center gap-3 px-4 py-3 text-left"
            style={{ color: "rgba(255,255,255,0.9)" }}
            onClick={() => { onViewMoments(); onClose(); }}
          >
            <Video className="w-4 h-4" style={{ color: "#c8883a" }} />
            <span className="text-[13px] font-medium">Ver mais momentos</span>
          </button>
        </>
      )}
    </div>
  </>
);

/* ── Card individual ── */
const StoryCard = ({
  group,
  currentSellerId,
  onProductClick,
  onViewProfile,
  onViewMoments,
}: {
  group: any;
  currentSellerId: string | null;
  onProductClick: (id: string) => void;
  onViewProfile: (seller: any) => void;
  onViewMoments: (seller: any) => void;
}) => {
  const firstStory = group.stories[0];
  const seller = group.seller;
  const storyWithProduct = group.stories.find((s: any) => s.products);
  const product = storyWithProduct?.products;
  const productCover = storyWithProduct?.product_cover;

  const [playing, setPlaying] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Só mostra views se for o próprio vendedor que publicou
  const isOwner = currentSellerId === seller?.id;
  // "Ver mais momentos" só aparece se tiver mais de 1 story
  const hasMoreStories = group.stories.length > 1;

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
    <div className="w-full rounded-2xl overflow-hidden flex flex-col relative" style={{ background: "#2e1608" }}>

      {/* ── Topo ── */}
      <div className="px-3 pt-3 pb-2 flex items-start gap-2 relative">
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

        {showMenu && (
          <SellerMenu
            seller={seller}
            hasMoreStories={hasMoreStories}
            onClose={() => setShowMenu(false)}
            onViewProfile={() => onViewProfile(seller)}
            onViewMoments={() => onViewMoments(seller)}
          />
        )}
      </div>

      {/* ── Área do vídeo ── */}
      <div
        className="relative overflow-hidden bg-black"
        style={{ aspectRatio: "4/5" }}
        onContextMenu={blockContext}
      >
        {/* Thumbnail estática se existir (sobreposta ao vídeo quando parado) */}
        {firstStory.thumbnail_url && !playing && (
          <img
            src={firstStory.thumbnail_url}
            alt=""
            className="absolute inset-0 w-full h-full object-cover z-10"
          />
        )}

        {/*
          Vídeo sempre montado com preload="auto".
          Quando está parado fica no frame actual (não fica preto).
          O browser mobile mostra o primeiro frame carregado como poster natural.
        */}
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

        {/* Overlay + botão play quando parado */}
        {!playing && (
          <button
            className="absolute inset-0 z-20 flex items-center justify-center"
            style={{ background: "rgba(0,0,0,0.28)" }}
            onClick={handlePlay}
          >
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center"
              style={{ background: "rgba(255,255,255,0.22)", backdropFilter: "blur(6px)" }}
            >
              <Play className="w-8 h-8 text-white fill-white ml-1" />
            </div>
          </button>
        )}

        {/* Botão pausa */}
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

      {/* ── Produto ── */}
      {product && (
        <>
          <div
            className="px-3 py-2.5 flex items-center gap-3 cursor-pointer"
            style={{ background: "#3d1f0c" }}
            onClick={() => onProductClick(product.id)}
          >
            {productCover && (
              <div className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0" style={{ background: "rgba(255,255,255,0.08)" }}>
                <img src={productCover} alt="" className="w-full h-full object-cover" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-white text-[12px] font-semibold line-clamp-1 leading-tight">{product.title}</p>
              <p className="text-[13px] font-black mt-0.5" style={{ color: "#c8883a" }}>
                {Number(product.price).toLocaleString("pt-AO")} Kz
              </p>
            </div>
            <button className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: "#5a2d10" }}>
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

      {/* ── Rodapé: só mostra views se for o dono ── */}
      {isOwner && (
        <div className="px-3 py-2.5 flex items-center" style={{ background: "#2e1608" }}>
          <span className="flex items-center gap-1 text-[11px]" style={{ color: "rgba(255,255,255,0.55)" }}>
            <Eye className="w-3.5 h-3.5" /> {firstStory.views_count || 0} visualizações
          </span>
        </div>
      )}
    </div>
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
    // Calcula página baseado na largura de cada card (responsivo)
    const cardWidth = carouselRef.current.querySelector("div")?.clientWidth || clientWidth;
    setCurrentPage(Math.round(scrollLeft / (cardWidth + 16)));
  };

  // Navega para o perfil correcto conforme o tipo de seller
  const handleViewProfile = (seller: any) => {
    if (!seller) return;
    const route = seller.type === "empresa" ? `/empresa/${seller.id}` : `/vendedor/${seller.id}`;
    navigate(route);
  };

  const handleViewMoments = (seller: any) => {
    if (!seller) return;
    navigate(`/momentos/${seller.id}`);
  };

  if (sellerGroups.length === 0) return null;

  return (
    <section className="px-4 pt-5 pb-3">
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

      {/*
        Carrossel responsivo:
        - Mobile  (<640px): 1 card por vez, largura total
        - Tablet  (640-1024px): 2 cards por vez
        - Desktop (>1024px): 3 cards por vez
        Usa CSS custom properties para o tamanho do card via classes Tailwind
      */}
      <div
        ref={carouselRef}
        onScroll={onScroll}
        className="flex gap-4 overflow-x-auto scrollbar-hide snap-x snap-mandatory"
      >
        {sellerGroups.map((group: any) => (
          <div
            key={group.seller?.id}
            className="snap-start flex-shrink-0 w-full sm:w-[calc(50%-8px)] lg:w-[calc(33.333%-11px)]"
          >
            <StoryCard
              group={group}
              currentSellerId={currentSellerId}
              onProductClick={(id) => navigate(`/produto/${id}`)}
              onViewProfile={handleViewProfile}
              onViewMoments={handleViewMoments}
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
