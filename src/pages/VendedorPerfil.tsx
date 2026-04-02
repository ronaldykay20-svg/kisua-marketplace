import { useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Star, MapPin, CheckCircle, ShoppingBag, MessageCircle, Phone, Clock, Loader2 } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { useSeller, useProducts } from "@/hooks/useSupabaseData";

const tabs = ["Produtos", "Avaliações", "Sobre"];

const VendedorPerfil = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [activeTab, setActiveTab] = useState("Produtos");

  const { data: seller, isLoading } = useSeller(id || "");
  const { data: sellerProducts } = useProducts({ categoryId: undefined, limit: 20 });

  // Filter products by this seller
  const filteredProducts = (sellerProducts || []).filter((p: any) => {
    // Products from useProducts are mapped, but we need raw seller_id
    // We'll use a separate query instead
    return true;
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

      {/* Cover */}
      <div className="h-32 md:h-44 overflow-hidden relative">
        <img src={coverImg} alt="" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
      </div>

      {/* Profile info */}
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
              <span className="font-bold text-foreground">{seller.rating || 0}</span>
              <span>({seller.total_reviews || 0})</span>
            </div>
            <div className="flex items-center gap-1">
              <ShoppingBag className="w-3.5 h-3.5" />
              <span>{seller.total_sales || 0} vendas</span>
            </div>
            <div className="flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5" />
              <span>{location}</span>
            </div>
          </div>

          <div className="flex gap-2 mt-3">
            <button className="flex-1 py-2 rounded-card text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90 transition flex items-center justify-center gap-1">
              <MessageCircle className="w-3.5 h-3.5" /> Mensagem
            </button>
            <button className="flex-1 py-2 rounded-card text-xs font-bold border border-border text-foreground hover:bg-muted transition flex items-center justify-center gap-1">
              <Phone className="w-3.5 h-3.5" /> Contactar
            </button>
          </div>
        </div>
      </section>

      {/* Tabs */}
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

      {/* Content */}
      <section className="container mx-auto px-3 mt-4 mb-6">
        {activeTab === "Produtos" && (
          <SellerProductsTab sellerId={seller.id} />
        )}

        {activeTab === "Avaliações" && (
          <div className="text-center py-8 text-xs text-muted-foreground">
            Ainda sem avaliações.
          </div>
        )}

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

      <Footer />
    </div>
  );
};

// Sub-component to fetch seller's products
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

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
        const cover = p.product_media?.find((m: any) => m.is_cover)?.url || p.image_url || "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&h=600&fit=crop";
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
