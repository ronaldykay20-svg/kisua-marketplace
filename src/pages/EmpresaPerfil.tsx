import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, CheckCircle, Star, MapPin, Phone, Mail, Globe, Clock, Share2, ThumbsUp, Heart, ShoppingCart, Users, Eye, UserPlus, UserCheck, Send, Loader2, Package, ShoppingBag } from "lucide-react";
import ProductCard from "@/components/ProductCard";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useCompanySalesCount } from "@/hooks/useSalesCount";

const tabs = ["Início", "Produtos", "Avaliações", "Sobre"];

const EmpresaPerfil = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [activeTab, setActiveTab] = useState("Início");
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: companySales = 0 } = useCompanySalesCount(id);

  // Load company from DB
  const { data: company, isLoading } = useQuery({
    queryKey: ["company_profile", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("companies").select("*").eq("id", id!).single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  // Increment visits
  useEffect(() => {
    if (!id) return;
    supabase.rpc("increment_company_visits", { company_id_input: id }).then(({ error }) => {
      if (error) console.error("Company visit error:", error.message);
    });
  }, [id]);

  // Reviews
  const { data: reviews = [] } = useQuery({
    queryKey: ["company_reviews", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("company_reviews").select("*").eq("company_id", id!).order("created_at", { ascending: false });
      if (error) throw error;
      const userIds = [...new Set((data || []).map((r: any) => r.user_id))];
      const { data: profiles } = await supabase.from("profiles").select("id, full_name, avatar_url").in("id", userIds);
      const pMap = Object.fromEntries((profiles || []).map((p: any) => [p.id, p]));
      return (data || []).map((r: any) => ({ ...r, profile: pMap[r.user_id] || null }));
    },
    enabled: !!id,
  });

  const avgRating = reviews.length > 0 ? (reviews.reduce((s: number, r: any) => s + r.rating, 0) / reviews.length) : 0;
  const avgRatingRound = Math.round(avgRating * 10) / 10;

  // Follow
  const { data: isFollowing, refetch: refetchFollow } = useQuery({
    queryKey: ["company_follow", id, user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("company_follows").select("id").eq("company_id", id!).eq("user_id", user!.id).maybeSingle();
      return !!data;
    },
    enabled: !!id && !!user,
  });

  const toggleFollow = useMutation({
    mutationFn: async () => {
      if (!user) { window.location.href = "/auth"; return; }
      if (isFollowing) {
        await supabase.from("company_follows").delete().eq("company_id", id!).eq("user_id", user.id);
      } else {
        await supabase.from("company_follows").insert({ company_id: id!, user_id: user.id });
      }
    },
    onSuccess: () => {
      refetchFollow();
      queryClient.invalidateQueries({ queryKey: ["company_profile", id] });
      toast.success(isFollowing ? "Deixou de seguir" : "A seguir!");
    },
  });

  // Products
  const { data: products = [] } = useQuery({
    queryKey: ["company_products_profile", id],
    queryFn: async () => {
      // Find sellers linked to this company
      const { data: sellers } = await supabase.from("sellers").select("id").eq("company_id", id!);
      const sellerIds = (sellers || []).map((s: any) => s.id);
      
      // Also get products directly linked
      let allProducts: any[] = [];
      
      const { data: directProducts } = await supabase.from("products").select("*, product_media(url, is_cover)").eq("company_id", id!).eq("is_active", true);
      if (directProducts) allProducts = [...allProducts, ...directProducts];
      
      if (sellerIds.length > 0) {
        const { data: sellerProducts } = await supabase.from("products").select("*, product_media(url, is_cover)").in("seller_id", sellerIds).eq("is_active", true);
        if (sellerProducts) {
          const existingIds = new Set(allProducts.map(p => p.id));
          allProducts = [...allProducts, ...sellerProducts.filter((p: any) => !existingIds.has(p.id))];
        }
      }
      
      return allProducts;
    },
    enabled: !!id,
  });

  // Followers count
  const { data: followersCount = 0 } = useQuery({
    queryKey: ["company_followers_count", id],
    queryFn: async () => {
      const { count } = await supabase.from("company_follows").select("id", { count: "exact", head: true }).eq("company_id", id!);
      return count || 0;
    },
    enabled: !!id,
  });

  if (isLoading) {
    return <div className="min-h-screen bg-background flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  if (!company) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">Empresa não encontrada.</p>
          <button onClick={() => navigate(-1)} className="text-primary text-sm font-bold mt-2">Voltar</button>
        </div>
      </div>
    );
  }

  const ratingBreakdown = [5, 4, 3, 2, 1].map(s => ({
    stars: s,
    pct: reviews.length > 0 ? Math.round((reviews.filter((r: any) => r.rating === s).length / reviews.length) * 100) : 0,
  }));

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-primary">
        <div className="container mx-auto px-4 h-14 flex items-center justify-between">
          <button onClick={() => navigate(-1)} className="text-primary-foreground"><ArrowLeft className="w-5 h-5" /></button>
          <h1 className="text-sm font-bold text-primary-foreground truncate max-w-[200px]">{company.name}</h1>
          <div className="flex items-center gap-3">
            <button className="text-primary-foreground"><Share2 className="w-5 h-5" /></button>
            <button className="text-primary-foreground relative"><ShoppingCart className="w-5 h-5" /></button>
          </div>
        </div>
      </div>

      <div className="relative">
        <div className="h-36 md:h-48 overflow-hidden">
          <img src={company.banner_url || "https://images.unsplash.com/photo-1531297484001-80022131f5a1?w=800&h=400&fit=crop"} alt={company.name} className="w-full h-full object-cover" />
        </div>
        <div className="container mx-auto px-4 relative">
          <div className="w-20 h-20 md:w-24 md:h-24 rounded-card border-4 border-card bg-card overflow-hidden -mt-10 md:-mt-12 relative z-10 shadow-md">
            {company.logo_url ? (
              <img src={company.logo_url} alt={company.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-primary/10 flex items-center justify-center"><Package className="w-8 h-8 text-primary" /></div>
            )}
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 mt-2">
        <div className="flex items-center gap-1.5">
          <h2 className="text-xl font-black text-foreground">{company.name}</h2>
          {company.is_verified && <CheckCircle className="w-5 h-5 text-primary" />}
        </div>
        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
          <span className="flex items-center gap-1"><Star className="w-3.5 h-3.5 text-secondary fill-secondary" /> {avgRatingRound} ({reviews.length})</span>
          <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" /> {followersCount} seguidores</span>
          <span className="flex items-center gap-1"><Eye className="w-3.5 h-3.5" /> {company.visits_count || 0} visitas</span>
          <span className="flex items-center gap-1"><Package className="w-3.5 h-3.5" /> {products.length} produtos</span>
        </div>

        <div className="flex items-center gap-2 mt-3">
          <button onClick={() => toggleFollow.mutate()} className={`px-5 py-2 rounded-card text-xs font-bold transition flex items-center gap-1.5 ${isFollowing ? "bg-muted text-foreground border border-border" : "bg-primary text-primary-foreground"}`}>
            {isFollowing ? <UserCheck className="w-3.5 h-3.5" /> : <UserPlus className="w-3.5 h-3.5" />}
            {isFollowing ? "A seguir" : "Seguir"}
          </button>
          <button onClick={() => { if (!user) { window.location.href = "/auth"; return; } setReviewDialogOpen(true); }}
            className="px-5 py-2 rounded-card border border-border text-xs font-bold text-foreground hover:bg-muted transition flex items-center gap-1.5">
            <Star className="w-3.5 h-3.5" /> Avaliar
          </button>
        </div>

        <div className="flex items-center gap-1 mt-4 overflow-x-auto scrollbar-hide border-b border-border">
          {tabs.map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`flex-shrink-0 px-3 py-2.5 text-xs font-semibold transition border-b-2 ${activeTab === tab ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
              {tab}
            </button>
          ))}
        </div>
      </div>

      <div className="container mx-auto px-4 py-4">
        {activeTab === "Início" && (
          <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] gap-4">
            <div className="bg-card rounded-card border border-border p-4 h-fit">
              <h3 className="text-sm font-bold text-foreground mb-2">Sobre Nós</h3>
              <p className="text-xs text-muted-foreground leading-relaxed mb-3">{company.description || "Sem descrição."}</p>
              <div className="space-y-2 text-xs text-muted-foreground">
                {company.email && <div className="flex items-start gap-2"><Mail className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" /> {company.email}</div>}
                {company.phone && <div className="flex items-start gap-2"><Phone className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" /> {company.phone}</div>}
                {company.address && <div className="flex items-start gap-2"><MapPin className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" /> {company.address}</div>}
                {company.website && <div className="flex items-start gap-2"><Globe className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" /> {company.website}</div>}
              </div>
            </div>

            <div className="space-y-4">
              <div className="bg-card rounded-card border border-border p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-bold text-foreground">Produtos</h3>
                  <button onClick={() => setActiveTab("Produtos")} className="text-xs font-semibold text-primary">Veja todos</button>
                </div>
                {products.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {products.slice(0, 4).map((p: any) => {
                      const cover = p.product_media?.find((m: any) => m.is_cover)?.url || p.image_url || "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&h=600&fit=crop";
                      return (
                        <div key={p.id} onClick={() => navigate(`/produto/${p.id}`)} className="bg-card rounded-card border border-border overflow-hidden cursor-pointer group hover:shadow-md transition">
                          <div className="aspect-square overflow-hidden"><img src={cover} alt={p.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" loading="lazy" /></div>
                          <div className="p-2">
                            <p className="text-xs font-medium text-foreground line-clamp-2">{p.title}</p>
                            <p className="text-sm font-bold text-foreground mt-1">{Number(p.price).toLocaleString("pt-AO")} Kz</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground text-center py-4">Sem produtos ainda.</p>
                )}
              </div>

              {/* Reviews summary */}
              <div className="bg-card rounded-card border border-border p-4">
                <h3 className="text-sm font-bold text-foreground mb-3">Avaliações</h3>
                <div className="flex items-start gap-4 mb-4">
                  <div className="text-center">
                    <p className="text-3xl font-black text-foreground">{avgRatingRound}</p>
                    <div className="flex items-center gap-0.5 mt-1">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star key={i} className={`w-3.5 h-3.5 ${i < Math.floor(avgRating) ? "text-secondary fill-secondary" : "text-border"}`} />
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{reviews.length} avaliações</p>
                  </div>
                  <div className="flex-1 space-y-1">
                    {ratingBreakdown.map(r => (
                      <div key={r.stars} className="flex items-center gap-2 text-xs">
                        <span className="w-3 text-muted-foreground">{r.stars}</span>
                        <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                          <div className="h-full bg-secondary rounded-full" style={{ width: `${r.pct}%` }} />
                        </div>
                        <span className="w-8 text-right text-muted-foreground">{r.pct}%</span>
                      </div>
                    ))}
                  </div>
                </div>
                {reviews.slice(0, 3).map((r: any) => (
                  <div key={r.id} className="border-t border-border pt-3 mt-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                        {(r.profile?.full_name || "U").charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1">
                        <span className="text-xs font-bold text-foreground">{r.profile?.full_name || "Utilizador"}</span>
                        <div className="flex gap-0.5">
                          {[1, 2, 3, 4, 5].map(s => (
                            <Star key={s} className={`w-2.5 h-2.5 ${s <= r.rating ? "text-secondary fill-secondary" : "text-muted-foreground/30"}`} />
                          ))}
                        </div>
                      </div>
                      <span className="text-[10px] text-muted-foreground">{new Date(r.created_at).toLocaleDateString("pt-AO")}</span>
                    </div>
                    {r.comment && <p className="text-xs text-muted-foreground mt-1.5">{r.comment}</p>}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === "Produtos" && (
          products.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
              {products.map((p: any) => {
                const cover = p.product_media?.find((m: any) => m.is_cover)?.url || p.image_url || "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&h=600&fit=crop";
                return (
                  <div key={p.id} onClick={() => navigate(`/produto/${p.id}`)} className="bg-card rounded-card border border-border overflow-hidden cursor-pointer group hover:shadow-md transition">
                    <div className="aspect-square overflow-hidden"><img src={cover} alt={p.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" loading="lazy" /></div>
                    <div className="p-2">
                      <p className="text-xs font-medium text-foreground line-clamp-2">{p.title}</p>
                      <p className="text-sm font-bold text-foreground mt-1">{Number(p.price).toLocaleString("pt-AO")} Kz</p>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-center py-8 text-xs text-muted-foreground">Sem produtos.</p>
          )
        )}

        {activeTab === "Avaliações" && (
          <div className="space-y-4 max-w-2xl">
            <div className="bg-card rounded-card border border-border p-4 text-center">
              <p className="text-3xl font-black text-foreground">{avgRatingRound}</p>
              <div className="flex justify-center gap-0.5 mt-1">
                {[1, 2, 3, 4, 5].map(s => (
                  <Star key={s} className={`w-4 h-4 ${s <= Math.round(avgRating) ? "text-secondary fill-secondary" : "text-muted-foreground/30"}`} />
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-1">{reviews.length} avaliações</p>
            </div>
            {reviews.length === 0 ? (
              <p className="text-center py-6 text-xs text-muted-foreground">Ainda sem avaliações.</p>
            ) : (
              reviews.map((r: any) => (
                <div key={r.id} className="bg-card rounded-card border border-border p-4">
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
                      {(r.profile?.full_name || "U").charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <span className="text-sm font-bold text-foreground">{r.profile?.full_name || "Utilizador"}</span>
                      <div className="flex items-center gap-1 mt-0.5">
                        {[1, 2, 3, 4, 5].map(s => (
                          <Star key={s} className={`w-3 h-3 ${s <= r.rating ? "text-secondary fill-secondary" : "text-muted-foreground/30"}`} />
                        ))}
                        <span className="text-[10px] text-muted-foreground ml-1">{new Date(r.created_at).toLocaleDateString("pt-AO")}</span>
                      </div>
                    </div>
                  </div>
                  {r.comment && <p className="text-xs text-muted-foreground mt-2 leading-relaxed">{r.comment}</p>}
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === "Sobre" && (
          <div className="bg-card rounded-card border border-border p-4 max-w-lg">
            <h3 className="text-sm font-bold text-foreground mb-3">Sobre {company.name}</h3>
            <p className="text-xs text-muted-foreground leading-relaxed mb-4">{company.description || "Sem descrição."}</p>
            <div className="space-y-2.5 text-xs text-muted-foreground">
              {company.email && <div className="flex items-start gap-2"><Mail className="w-4 h-4 mt-0.5 text-primary flex-shrink-0" /> {company.email}</div>}
              {company.phone && <div className="flex items-start gap-2"><Phone className="w-4 h-4 mt-0.5 text-primary flex-shrink-0" /> {company.phone}</div>}
              {company.address && <div className="flex items-start gap-2"><MapPin className="w-4 h-4 mt-0.5 text-primary flex-shrink-0" /> {company.address}</div>}
              {company.website && <div className="flex items-start gap-2"><Globe className="w-4 h-4 mt-0.5 text-primary flex-shrink-0" /> {company.website}</div>}
              {company.province && <div className="flex items-start gap-2"><MapPin className="w-4 h-4 mt-0.5 text-primary flex-shrink-0" /> {company.province}</div>}
            </div>
          </div>
        )}
      </div>

      {/* Review Dialog */}
      <CompanyReviewDialog open={reviewDialogOpen} onOpenChange={setReviewDialogOpen} companyId={id || ""} />
    </div>
  );
};

const CompanyReviewDialog = ({ open, onOpenChange, companyId }: { open: boolean; onOpenChange: (v: boolean) => void; companyId: string }) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [hoverRating, setHoverRating] = useState(0);

  const { data: myReview } = useQuery({
    queryKey: ["my_company_review", companyId, user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("company_reviews").select("*").eq("company_id", companyId).eq("user_id", user!.id).maybeSingle();
      return data;
    },
    enabled: !!user && open,
  });

  const submitReview = useMutation({
    mutationFn: async () => {
      if (myReview) {
        const { error } = await supabase.from("company_reviews").update({ rating, comment }).eq("id", myReview.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("company_reviews").insert({ company_id: companyId, user_id: user!.id, rating, comment });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["company_reviews", companyId] });
      queryClient.invalidateQueries({ queryKey: ["my_company_review", companyId] });
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
          <DialogTitle className="text-sm font-bold">{myReview ? "Atualizar avaliação" : "Avaliar empresa"}</DialogTitle>
        </DialogHeader>
        <div className="flex gap-1 justify-center my-3">
          {[1, 2, 3, 4, 5].map(s => (
            <button key={s} onMouseEnter={() => setHoverRating(s)} onMouseLeave={() => setHoverRating(0)} onClick={() => setRating(s)}>
              <Star className={`w-7 h-7 transition ${s <= (hoverRating || rating) ? "text-secondary fill-secondary" : "text-muted-foreground/30"}`} />
            </button>
          ))}
        </div>
        <textarea value={comment} onChange={e => setComment(e.target.value)} placeholder="Escreve um comentário (opcional)..."
          className="w-full rounded-xl bg-muted border border-border p-3 text-sm text-foreground resize-none h-20" />
        <button onClick={() => submitReview.mutate()} disabled={submitReview.isPending}
          className="w-full py-2.5 rounded-card bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center gap-1 hover:bg-primary/90 disabled:opacity-50">
          <Send className="w-3.5 h-3.5" /> {myReview ? "Atualizar" : "Enviar"}
        </button>
      </DialogContent>
    </Dialog>
  );
};

export default EmpresaPerfil;
