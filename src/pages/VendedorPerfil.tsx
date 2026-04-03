import { useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Star, MapPin, CheckCircle, ShoppingBag, MessageCircle, Phone, Clock, Loader2, Send, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useNavigate, useParams } from "react-router-dom";
import { useSeller } from "@/hooks/useSupabaseData";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const tabs = ["Produtos", "Avaliações", "Sobre"];

const VendedorPerfil = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [activeTab, setActiveTab] = useState("Produtos");
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const { user } = useAuth();

  const { data: seller, isLoading } = useSeller(id || "");

  // Real review stats
  const { data: reviewStats } = useQuery({
    queryKey: ["seller_review_stats", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("seller_reviews")
        .select("rating")
        .eq("seller_id", id!);
      if (error) throw error;
      if (!data || data.length === 0) return { avg: 0, total: 0 };
      const avg = data.reduce((s: number, r: any) => s + r.rating, 0) / data.length;
      return { avg: Math.round(avg * 10) / 10, total: data.length };
    },
    enabled: !!id,
  });

  // Real product count
  const { data: productCount } = useQuery({
    queryKey: ["seller_product_count", id],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("products")
        .select("id", { count: "exact", head: true })
        .eq("seller_id", id!)
        .eq("is_active", true);
      if (error) throw error;
      return count || 0;
    },
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!seller) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-3 py-20 text-center">
          <p className="text-muted-foreground">Vendedor não encontrado.</p>
        </div>
        <Footer />
      </div>
    );
  }

  const coverImg = seller.cover_url || "https://images.unsplash.com/photo-1556761175-b413da4baf72?w=800&h=300&fit=crop";
  const logoImg = seller.logo_url || "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop";
  const location = [seller.province, seller.city].filter(Boolean).join(", ") || "Angola";
  const createdYear = seller.created_at ? new Date(seller.created_at).getFullYear().toString() : "2024";

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="h-32 md:h-44 overflow-hidden relative">
        <img src={coverImg} alt="" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
      </div>

      <section className="container mx-auto px-3 -mt-10 relative z-10">
        <div className="bg-card rounded-card border border-border p-4 shadow-md">
          <div className="flex items-end gap-3 -mt-10">
            <img src={logoImg} alt={seller.name} className="w-20 h-20 rounded-card border-3 border-card object-cover" />
            <div className="flex-1 min-w-0 pb-1">
              <div className="flex items-center gap-1.5">
                <h1 className="text-base font-black text-foreground">{seller.name}</h1>
                {seller.is_verified && <CheckCircle className="w-4 h-4 text-primary" />}
              </div>
              <p className="text-xs text-muted-foreground">{seller.description || "Vendedor"}</p>
            </div>
          </div>

          <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <Star className="w-3.5 h-3.5 text-secondary fill-secondary" />
              <span className="font-bold text-foreground">{reviewStats?.avg || 0}</span>
              <span>({reviewStats?.total || 0})</span>
            </div>
            <div className="flex items-center gap-1">
              <ShoppingBag className="w-3.5 h-3.5" />
              <span>{productCount || 0} produtos</span>
            </div>
            <div className="flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5" />
              <span>{location}</span>
            </div>
          </div>

          <div className="flex gap-2 mt-3">
            <button className="flex-1 py-2 rounded-card text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90 transition flex items-center justify-center gap-1">
              <Plus className="w-3.5 h-3.5" /> Seguir
            </button>
            <button className="flex-1 py-2 rounded-card text-xs font-bold border border-border text-foreground hover:bg-muted transition flex items-center justify-center gap-1">
              <Phone className="w-3.5 h-3.5" /> Contactar
            </button>
            <button
              onClick={() => {
                if (!user) { window.location.href = "/auth"; return; }
                setReviewDialogOpen(true);
              }}
              className="flex-1 py-2 rounded-card text-xs font-bold bg-secondary text-secondary-foreground hover:bg-secondary/90 transition flex items-center justify-center gap-1"
            >
              <Star className="w-3.5 h-3.5" /> Avaliar
            </button>
          </div>
        </div>
      </section>

      <section className="container mx-auto px-3 mt-4">
        <div className="flex border-b border-border">
          {tabs.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-2.5 text-xs font-bold text-center transition border-b-2 ${activeTab === tab ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
            >
              {tab}
            </button>
          ))}
        </div>
      </section>

      <section className="container mx-auto px-3 mt-4 mb-6">
        {activeTab === "Produtos" && <SellerProductsTab sellerId={seller.id} />}
        {activeTab === "Avaliações" && <SellerReviewsTab sellerId={seller.id} sellerUserId={seller.user_id} />}
        {activeTab === "Sobre" && (
          <div className="bg-card rounded-card border border-border p-4 space-y-3">
            <p className="text-sm text-foreground">{seller.bio || seller.description || "Sem descrição."}</p>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Clock className="w-3.5 h-3.5" />
              <span>Vendedor desde {createdYear}</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <MapPin className="w-3.5 h-3.5" />
              <span>{location}</span>
            </div>
            {seller.phone && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Phone className="w-3.5 h-3.5" />
                <span>{seller.phone}</span>
              </div>
            )}
          </div>
        )}
      </section>

      {/* Review Dialog */}
      {seller && (
        <ReviewDialog
          open={reviewDialogOpen}
          onOpenChange={setReviewDialogOpen}
          sellerId={seller.id}
          sellerUserId={seller.user_id}
        />
      )}

      <Footer />
    </div>
  );
};

// ── Review Dialog ──
const ReviewDialog = ({ open, onOpenChange, sellerId, sellerUserId }: { open: boolean; onOpenChange: (v: boolean) => void; sellerId: string; sellerUserId: string }) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [hoverRating, setHoverRating] = useState(0);

  const { data: myReview } = useQuery({
    queryKey: ["my_seller_review", sellerId, user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("seller_reviews").select("*").eq("seller_id", sellerId).eq("user_id", user!.id).maybeSingle();
      return data;
    },
    enabled: !!user && open,
  });

  const submitReview = useMutation({
    mutationFn: async () => {
      if (myReview) {
        const { error } = await supabase.from("seller_reviews").update({ rating, comment }).eq("id", myReview.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("seller_reviews").insert({ seller_id: sellerId, user_id: user!.id, rating, comment });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["seller_reviews", sellerId] });
      queryClient.invalidateQueries({ queryKey: ["my_seller_review", sellerId] });
      toast.success(myReview ? "Avaliação atualizada!" : "Avaliação enviada!");
      setComment("");
      onOpenChange(false);
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-sm font-bold">{myReview ? "Atualizar avaliação" : "Avaliar vendedor"}</DialogTitle>
        </DialogHeader>
        <div className="flex gap-1 justify-center my-3">
          {[1, 2, 3, 4, 5].map(s => (
            <button key={s} onMouseEnter={() => setHoverRating(s)} onMouseLeave={() => setHoverRating(0)} onClick={() => setRating(s)}>
              <Star className={`w-7 h-7 transition ${s <= (hoverRating || rating) ? "text-secondary fill-secondary" : "text-muted-foreground/30"}`} />
            </button>
          ))}
        </div>
        <textarea
          value={comment}
          onChange={e => setComment(e.target.value)}
          placeholder="Escreve um comentário (opcional)..."
          className="w-full rounded-xl bg-muted border border-border p-3 text-sm text-foreground resize-none h-20"
        />
        <button
          onClick={() => submitReview.mutate()}
          disabled={submitReview.isPending}
          className="w-full py-2.5 rounded-card bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center gap-1 hover:bg-primary/90 disabled:opacity-50"
        >
          <Send className="w-3.5 h-3.5" /> {myReview ? "Atualizar" : "Enviar"}
        </button>
      </DialogContent>
    </Dialog>
  );
};

// ── Reviews Tab (display only) ──
const SellerReviewsTab = ({ sellerId, sellerUserId }: { sellerId: string; sellerUserId: string }) => {
  const { data: reviews = [], isLoading } = useQuery({
    queryKey: ["seller_reviews", sellerId],
    queryFn: async () => {
      // Fetch reviews
      const { data: revData, error } = await supabase
        .from("seller_reviews")
        .select("*")
        .eq("seller_id", sellerId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      if (!revData || revData.length === 0) return [];
      // Fetch profile names for each reviewer
      const userIds = [...new Set(revData.map((r: any) => r.user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url")
        .in("id", userIds);
      const profileMap = Object.fromEntries((profiles || []).map((p: any) => [p.id, p]));
      return revData.map((r: any) => ({ ...r, profile: profileMap[r.user_id] || null }));
    },
  });

  const avgRating = reviews.length > 0 ? (reviews.reduce((s: number, r: any) => s + r.rating, 0) / reviews.length).toFixed(1) : "0";

  return (
    <div className="space-y-4">
      <div className="bg-card rounded-card border border-border p-4 text-center">
        <p className="text-3xl font-black text-foreground">{avgRating}</p>
        <div className="flex justify-center gap-0.5 mt-1">
          {[1, 2, 3, 4, 5].map(s => (
            <Star key={s} className={`w-4 h-4 ${s <= Math.round(Number(avgRating)) ? "text-secondary fill-secondary" : "text-muted-foreground/30"}`} />
          ))}
        </div>
        <p className="text-xs text-muted-foreground mt-1">{reviews.length} avaliação(ões)</p>
      </div>

      {isLoading ? (
        <div className="text-center py-6"><Loader2 className="w-5 h-5 animate-spin mx-auto text-primary" /></div>
      ) : reviews.length === 0 ? (
        <p className="text-center py-6 text-xs text-muted-foreground">Ainda sem avaliações.</p>
      ) : (
        <div className="space-y-2">
          {reviews.map((r: any) => (
            <div key={r.id} className="bg-card rounded-card border border-border p-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                  {(r.profile?.full_name || "U").charAt(0).toUpperCase()}
                </div>
                <div className="flex-1">
                  <p className="text-xs font-bold text-foreground">{r.profile?.full_name || "Utilizador"}</p>
                  <div className="flex gap-0.5">
                    {[1, 2, 3, 4, 5].map(s => (
                      <Star key={s} className={`w-3 h-3 ${s <= r.rating ? "text-secondary fill-secondary" : "text-muted-foreground/30"}`} />
                    ))}
                  </div>
                </div>
                <span className="text-[10px] text-muted-foreground">{new Date(r.created_at).toLocaleDateString("pt-AO")}</span>
              </div>
              {r.comment && <p className="text-xs text-muted-foreground mt-2">{r.comment}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ── Products Tab ──
const SellerProductsTab = ({ sellerId }: { sellerId: string }) => {
  const navigate = useNavigate();
  const { data: products, isLoading } = useQuery({
    queryKey: ["seller-products", sellerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*, product_media(url, is_cover)")
        .eq("seller_id", sellerId)
        .eq("is_active", true)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!sellerId,
  });

  if (isLoading) return <div className="text-center py-8"><Loader2 className="w-5 h-5 animate-spin mx-auto text-primary" /></div>;

  if (!products || products.length === 0) {
    return <div className="text-center py-8 text-xs text-muted-foreground">Nenhum produto ainda.</div>;
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
      {products.map((p: any) => {
        const cover = p.product_media?.find((m: any) => m.is_cover)?.url || "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&h=600&fit=crop";
        const price = p.price?.toLocaleString("pt-AO").replace(/,/g, ".") + " Kz";
        return (
          <div
            key={p.id}
            onClick={() => navigate(`/produto/${p.id}`)}
            className="bg-card rounded-card border border-border overflow-hidden cursor-pointer group hover:shadow-md transition-shadow"
          >
            <div className="aspect-square overflow-hidden bg-muted">
              <img src={cover} alt={p.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy" />
            </div>
            <div className="p-2.5">
              <h3 className="text-xs font-semibold text-foreground line-clamp-2">{p.title}</h3>
              <p className="text-sm font-black text-foreground mt-1">{price}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default VendedorPerfil;
