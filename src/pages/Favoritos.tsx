import { Heart, ShoppingCart, ShieldCheck, Loader2, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useFavoritesPage } from "@/hooks/useFavorites";
import { useCart } from "@/hooks/useCart";
import { useState } from "react";

const Favoritos = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { favorites, isLoading, removeFavorite } = useFavoritesPage();
  const { addToCart } = useCart();

  // ── Sem login ─────────────────────────────────────────────────────────────
  if (!user) {
    return (
      <div className="min-h-screen pb-14 md:pb-0" style={{ background: "#f7f0ea" }}>
        <div className="container mx-auto px-4 py-16 flex flex-col items-center text-center gap-4">
          <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ background: "#f0e0d0" }}>
            <Heart className="w-7 h-7 text-[#c0522a]" />
          </div>
          <h2 className="text-base font-bold text-[#1a0f07]">Faça login para ver os seus favoritos</h2>
          <p className="text-xs text-[#9a7060]">Guarde os produtos que mais gosta num só lugar.</p>
          <button
            onClick={() => navigate("/auth")}
            className="px-8 py-2.5 text-xs font-bold text-white rounded-md"
            style={{ background: "#c0522a" }}
          >
            Entrar
          </button>
        </div>
      </div>
    );
  }

  // ── Loading ───────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="min-h-screen pb-14 md:pb-0" style={{ background: "#f7f0ea" }}>
        <div className="container mx-auto px-3 py-4">
          <div className="h-6 w-28 rounded mb-3" style={{ background: "#e8d5c4" }} />
          <div className="flex gap-2.5">
            <div className="flex-1 flex flex-col gap-2.5">
              {[0, 1].map(i => <SkeletonCard key={i} />)}
            </div>
            <div className="flex-1 flex flex-col gap-2.5">
              {[0, 1].map(i => <SkeletonCard key={i} />)}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Vazio ─────────────────────────────────────────────────────────────────
  if (favorites.length === 0) {
    return (
      <div className="min-h-screen pb-14 md:pb-0" style={{ background: "#f7f0ea" }}>
        <div className="container mx-auto px-4 py-16 flex flex-col items-center text-center gap-4">
          <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ background: "#f0e0d0" }}>
            <Heart className="w-7 h-7 text-[#c0522a]" />
          </div>
          <h3 className="text-sm font-bold text-[#1a0f07]">Nenhum favorito ainda</h3>
          <p className="text-xs text-[#9a7060]">Toque no coração dos produtos para os guardar aqui.</p>
          <button
            onClick={() => navigate("/")}
            className="px-8 py-2.5 text-xs font-bold text-white rounded-md"
            style={{ background: "#c0522a" }}
          >
            Explorar produtos
          </button>
        </div>
      </div>
    );
  }

  const col1 = favorites.filter((_: any, i: number) => i % 2 === 0);
  const col2 = favorites.filter((_: any, i: number) => i % 2 === 1);

  return (
    <div className="min-h-screen pb-14 md:pb-0" style={{ background: "#f7f0ea" }}>
      <div className="container mx-auto px-3 py-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-base font-bold text-[#1a0f07]">Favoritos</h1>
          <span
            className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
            style={{ background: "#f0e0d0", color: "#6b3a1f" }}
          >
            {favorites.length} {favorites.length === 1 ? "item" : "itens"}
          </span>
        </div>

        {/* Grid 2 colunas — mesmo layout do InfiniteProducts */}
        <div className="flex gap-2.5">
          <div className="flex-1">
            {col1.map((fav: any, i: number) => (
              <FavCard key={fav.id} fav={fav} globalIndex={i * 2} onRemove={removeFavorite} onCart={addToCart} />
            ))}
          </div>
          <div className="flex-1">
            {col2.map((fav: any, i: number) => (
              <FavCard key={fav.id} fav={fav} globalIndex={i * 2 + 1} onRemove={removeFavorite} onCart={addToCart} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// ── Skeleton ──────────────────────────────────────────────────────────────────
const SkeletonCard = () => (
  <div className="overflow-hidden animate-pulse" style={{ borderRadius: "5px", border: "1px solid #ede0d4", background: "#fdf8f4" }}>
    <div style={{ aspectRatio: "5/4", background: "#f0e0d0" }} />
    <div className="px-2 pt-1.5 pb-2 flex flex-col gap-1.5">
      <div className="h-3 rounded w-3/4" style={{ background: "#e8d5c4" }} />
      <div className="h-3 rounded w-1/2" style={{ background: "#e8d5c4" }} />
      <div className="h-3.5 rounded w-2/3" style={{ background: "#e8d5c4" }} />
      <div className="mt-1 pt-1.5 flex justify-end" style={{ borderTop: "1px solid #e8d5c4" }}>
        <div className="w-7 h-7 rounded-full" style={{ background: "#e8d5c4" }} />
      </div>
    </div>
  </div>
);

// ── Fav Card ──────────────────────────────────────────────────────────────────
const FavCard = ({
  fav, globalIndex, onRemove, onCart,
}: {
  fav: any; globalIndex: number;
  onRemove: (id: string) => void;
  onCart: (id: string) => void;
}) => {
  const navigate = useNavigate();
  const [pressed, setPressed] = useState(false);
  const [cartPop, setCartPop] = useState(false);
  const [removing, setRemoving] = useState(false);

  const p = fav.products;
  if (!p) return null;

  const coverMedia = p.product_media?.find((m: any) => m.is_cover) || p.product_media?.[0];
  const img = coverMedia?.url || p.image_url;

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    setRemoving(true);
    setTimeout(() => onRemove(fav.product_id), 250);
  };

  const handleCart = (e: React.MouseEvent) => {
    e.stopPropagation();
    onCart(p.id);
    setCartPop(true);
    setTimeout(() => setCartPop(false), 700);
  };

  return (
    <div
      onClick={() => navigate(`/produto/${p.id}`)}
      onPointerDown={() => setPressed(true)}
      onPointerUp={() => setPressed(false)}
      onPointerLeave={() => setPressed(false)}
      className="overflow-hidden cursor-pointer flex flex-col mb-2.5 select-none"
      style={{
        borderRadius: "5px",
        border: "1px solid #ede0d4",
        background: "#fdf8f4",
        boxShadow: pressed ? "0 1px 3px rgba(100,50,15,0.10)" : "0 2px 8px rgba(100,50,15,0.09)",
        transform: removing ? "scale(0.9)" : pressed ? "scale(0.975)" : "scale(1)",
        opacity: removing ? 0 : 1,
        transition: "transform 0.13s ease, box-shadow 0.13s ease, opacity 0.22s ease",
      }}
    >
      {/* Imagem quase quadrada */}
      <div className="relative w-full overflow-hidden" style={{ aspectRatio: "5/4", backgroundColor: "#f5ede4" }}>
        {img ? (
          <img src={img} alt={p.title} className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-[#c8a882]">
            <ShoppingCart className="w-6 h-6 opacity-20" />
          </div>
        )}

        {p.discount_percent > 0 && (
          <span className="absolute top-1.5 left-1.5 px-1.5 py-0.5 text-[10px] font-black text-white" style={{ background: "#c0522a", borderRadius: "3px" }}>
            -{p.discount_percent}%
          </span>
        )}
        {p.badge && (
          <span className="absolute top-1.5 right-8 px-1.5 py-0.5 text-[10px] font-black text-white" style={{ background: "rgba(18,8,2,0.72)", borderRadius: "3px" }}>
            {p.badge}
          </span>
        )}

        {/* Botão remover (coração preenchido) */}
        <button
          onClick={handleRemove}
          className="absolute bottom-1.5 right-1.5 w-7 h-7 rounded-full flex items-center justify-center transition-transform active:scale-90"
          style={{ background: "rgba(253,248,244,0.92)", boxShadow: "0 1px 4px rgba(0,0,0,0.12)" }}
          aria-label="Remover dos favoritos"
        >
          <Heart className="w-3.5 h-3.5 fill-[#c0522a] text-[#c0522a]" />
        </button>
      </div>

      {/* Rodapé */}
      <div className="flex flex-col px-2 pt-1.5 pb-0" style={{ background: "#fdf8f4" }}>
        {/* Título castanho */}
        <h3 className="text-[11px] font-semibold text-[#6b3a1f] line-clamp-2 leading-snug mb-1.5">
          {p.title}
        </h3>

        {/* Preço + rating estático (sem rotação nos favoritos — mais limpo) */}
        <div className="flex flex-col gap-0.5">
          <div className="flex items-baseline gap-1.5">
            <span className="text-[14px] font-black text-[#1a0f07] tracking-tight leading-none">
              {Number(p.price).toLocaleString("pt-AO")} Kz
            </span>
            {p.old_price && (
              <span className="text-[9px] text-[#b09080] line-through">
                {Number(p.old_price).toLocaleString("pt-AO")} Kz
              </span>
            )}
          </div>

          {/* Pill info — frete grátis > rating > stock */}
          {p.free_shipping ? (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-[#e8f4ef] text-[#1a5c3a] w-fit">
              <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 3h15v13H1zM16 8h4l3 3v5h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>
              Frete grátis
            </span>
          ) : p.rating >= 4 ? (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-[#fffbeb] text-[#7a5500] w-fit">
              ★ {Number(p.rating).toFixed(1)} ({p.total_reviews || 0})
            </span>
          ) : p.stock > 0 ? (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-[#f0f8ff] text-[#2a5080] w-fit">
              {p.stock} em stock
            </span>
          ) : null}
        </div>

        {/* Risco + acções */}
        <div
          className="flex items-center justify-between pt-1.5 pb-2 mt-1.5"
          style={{ borderTop: "1px solid #e8d5c4" }}
        >
          {/* Remover (lixo) */}
          <button
            onClick={handleRemove}
            className="flex items-center gap-1 text-[9px] font-semibold text-[#9a7060] active:scale-95 transition-transform"
            aria-label="Remover"
          >
            <Trash2 className="w-3 h-3" />
            Remover
          </button>

          {/* Carrinho */}
          <button
            onClick={handleCart}
            className="w-7 h-7 rounded-full flex items-center justify-center"
            style={{
              background: cartPop ? "#1a7a44" : "#c0522a",
              boxShadow: "0 1px 4px rgba(0,0,0,0.14)",
              transition: "background 0.22s ease, transform 0.13s ease",
              transform: cartPop ? "scale(1.13)" : "scale(1)",
            }}
            aria-label="Adicionar ao carrinho"
          >
            {cartPop
              ? <ShieldCheck className="w-3.5 h-3.5 text-white" />
              : <ShoppingCart className="w-3.5 h-3.5 text-white" />}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Favoritos;
