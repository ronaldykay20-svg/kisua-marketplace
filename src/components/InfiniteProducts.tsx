import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { getRatingImage, freteGratisImg } from "@/lib/ratingImage";

// ─────────────────────────────────────────────────────────────────────────
// Ambiente de teste — pré-visualização automática do card de produto.
// Só acessível por link direto (não está em nenhum menu do site).
// ─────────────────────────────────────────────────────────────────────────

interface TestProduct {
  id: string;
  title: string;
  description: string | null;
  price: number;
  old_price: number | null;
  image_url: string | null;
  rating: number | null;
  total_reviews: number | null;
  free_shipping: boolean | null;
  images: string[];
}

const PAGE_SIZE = 12;
const BROWN = "#5a2f16";
const FALLBACK_IMG = "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&h=400&fit=crop";

const fmt = (n: number) =>
  new Intl.NumberFormat("pt-AO", { style: "currency", currency: "AOA", maximumFractionDigits: 0 }).format(n);

// Baralha uma cópia do array (Fisher-Yates) — usado para que a ordem das
// fotos de cada produto não seja sempre a mesma.
const shuffle = <T,>(arr: T[]): T[] => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

// ─────────────────────────────────────────────────────────────────────────
// Card — imagem (com crossfade lento e aleatório se houver mais do que uma
// foto), depois [estrelas | preço em círculo], depois título/descrição.
// ─────────────────────────────────────────────────────────────────────────
const ProductCard = ({ p, index }: { p: TestProduct; index: number }) => {
  const [imgIndex, setImgIndex] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    if (p.images.length <= 1) return;
    let timer: ReturnType<typeof setTimeout>;
    // Atraso inicial aleatório + intervalo lento (5–9s) — garante que os
    // cards nunca trocam de foto todos ao mesmo tempo (fica leve e discreto,
    // só 1 ou 2 cards a mudar de cada vez, nunca a grelha toda a piscar).
    const schedule = (delay: number) => {
      timer = setTimeout(() => {
        setImgIndex((i) => (i + 1) % p.images.length);
        schedule(5000 + Math.random() * 4000);
      }, delay);
    };
    schedule(1500 + Math.random() * 4000);
    return () => clearTimeout(timer);
  }, [p.images.length]);

  const openProduct = () => {
    const url = `/produto/${p.id}`;
    // Crossfade nativo do browser entre páginas — leve, sem biblioteca extra.
    // Em browsers sem suporte (ex.: Firefox), cai para navegação normal.
    if ((document as any).startViewTransition) {
      (document as any).startViewTransition(() => navigate(url));
    } else {
      navigate(url);
    }
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={openProduct}
      onKeyDown={(e) => { if (e.key === "Enter") openProduct(); }}
      className="at-card-enter bg-card overflow-hidden cursor-pointer transition-transform duration-150 ease-out active:scale-[0.97]"
      style={{ animationDelay: `${(index % PAGE_SIZE) * 35}ms` }}
    >
      <div className="relative aspect-square bg-muted overflow-hidden">
        {p.images.map((src, i) => (
          <img
            key={src}
            src={src}
            alt={p.title}
            loading="lazy"
            className="absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ease-in-out"
            style={{ opacity: i === imgIndex ? 1 : 0 }}
          />
        ))}
      </div>

      <div className="px-2 pt-2 pb-1">
        {/* Estrelas à esquerda, preço num círculo à direita */}
        <div className="flex items-center justify-between gap-1.5 mb-1.5">
          <div className="flex items-center gap-1 min-w-0">
            <img src={getRatingImage(p.rating)} alt={`${p.rating ?? 0} estrelas`} className="h-4 flex-shrink-0" />
            {!!p.total_reviews && (
              <span className="text-[10px] text-muted-foreground truncate">({p.total_reviews})</span>
            )}
          </div>

          <span className="relative inline-block flex-shrink-0">
            <span
              className="absolute"
              style={{
                left: "-4px",
                right: "-4px",
                top: "22%",
                bottom: "18%",
                background: "#ffd166",
                transform: "rotate(-1.5deg)",
                borderRadius: "2px",
              }}
            />
            <span
              className="relative whitespace-nowrap"
              style={{ color: "#1a1a1a", fontWeight: 800, fontSize: "14px" }}
            >
              {fmt(p.price)}
            </span>
          </span>
        </div>

        <h3 className="text-[14px] font-bold line-clamp-2 leading-snug mb-1 text-center" style={{ color: BROWN }}>
          {p.title}
        </h3>

        {p.description && (
          <p
            className="font-normal text-muted-foreground line-clamp-3 text-center"
            style={{ fontSize: "13px", lineHeight: 1.25, letterSpacing: "-0.1px", marginBottom: "4px" }}
          >
            {p.description}
          </p>
        )}

        {p.old_price && (
          <p className="text-[11px] text-muted-foreground line-through text-center mb-1">
            {fmt(p.old_price)}
          </p>
        )}

        {p.free_shipping && (
          <div className="flex justify-start pt-1 pb-1.5">
            <img src={freteGratisImg} alt="Frete grátis" className="h-5 w-auto" />
          </div>
        )}
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────
// Página — carrega produtos automaticamente, mais entram ao chegar perto
// do fim da lista (scroll infinito, estilo Amazon), com fade-in em cascata.
// ─────────────────────────────────────────────────────────────────────────
const AmbienteTeste = () => {
  const [products, setProducts] = useState<TestProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const pageRef = useRef(0);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const loadNextPage = useCallback(async () => {
    setLoading(true);
    const from = pageRef.current * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    const { data, error } = await supabase
      .from("products")
      .select("id, title, description, price, old_price, image_url, rating, total_reviews, free_shipping")
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .range(from, to);

    const list = (data as Omit<TestProduct, "images">[]) || [];

    // Todas as fotos do produto (não só a capa) vivem em product_media.
    const ids = list.map((p) => p.id);
    const imagesByProduct: Record<string, string[]> = {};
    if (ids.length) {
      const { data: media } = await supabase
        .from("product_media")
        .select("product_id, url, is_cover")
        .in("product_id", ids);
      (media || []).forEach((m: any) => {
        (imagesByProduct[m.product_id] ??= []).push(m.url);
      });
    }

    if (!error) {
      setProducts((prev) => [
        ...prev,
        ...list.map((p) => {
          const gallery = imagesByProduct[p.id] || [];
          const images = gallery.length ? shuffle(gallery) : [p.image_url || FALLBACK_IMG];
          return { ...p, images };
        }),
      ]);
      if (list.length < PAGE_SIZE) setHasMore(false);
      pageRef.current += 1;
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadNextPage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading) loadNextPage();
      },
      { rootMargin: "400px" }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [hasMore, loading, loadNextPage]);

  return (
    <div className="min-h-screen bg-white px-4 pt-5 pb-8">
      <style>{`
        @keyframes at-fadeInUp {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .at-card-enter { animation: at-fadeInUp 0.45s cubic-bezier(0.22, 1, 0.36, 1) both; }
      `}</style>

      <div className="max-w-md sm:max-w-xl mx-auto">
        <h2
          className="text-center font-extrabold mb-4"
          style={{ color: BROWN, fontSize: "20px", letterSpacing: "-0.2px" }}
        >
          Produtos Zangu
        </h2>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-0">
          {products.map((p, i) => (
            <ProductCard key={p.id} p={p} index={i} />
          ))}
        </div>

        {products.length === 0 && !loading && (
          <p className="text-sm text-muted-foreground mt-8 text-center">Nenhum produto encontrado.</p>
        )}
        {loading && (
          <p className="text-center text-xs text-muted-foreground mt-4">A carregar mais produtos…</p>
        )}

        <div ref={sentinelRef} className="h-2" />
      </div>
    </div>
  );
};

export default AmbienteTeste;
