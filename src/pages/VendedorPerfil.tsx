import { useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Star, MapPin, CheckCircle, ShoppingBag, MessageCircle, Phone, Clock, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { products } from "@/data/products";

const seller = {
  name: "Carlos Mendes",
  specialty: "Electrónicos & Tecnologia",
  location: "Luanda, Angola",
  rating: 4.9,
  reviews: 245,
  sales: 1240,
  since: "2023",
  verified: true,
  bio: "Especialista em produtos electrónicos importados com garantia. Entrega rápida em Luanda.",
  image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop",
  cover: "https://images.unsplash.com/photo-1556761175-b413da4baf72?w=800&h=300&fit=crop",
};

const tabs = ["Produtos", "Avaliações", "Sobre"];

const VendedorPerfil = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("Produtos");
  const sellerProducts = products.slice(0, 8);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Cover */}
      <div className="h-32 md:h-44 overflow-hidden relative">
        <img src={seller.cover} alt="" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
      </div>

      {/* Profile info */}
      <section className="container mx-auto px-3 -mt-10 relative z-10">
        <div className="bg-card rounded-card border border-border p-4 shadow-md">
          <div className="flex items-end gap-3 -mt-10">
            <img src={seller.image} alt={seller.name} className="w-20 h-20 rounded-card border-3 border-card object-cover" />
            <div className="flex-1 min-w-0 pb-1">
              <div className="flex items-center gap-1.5">
                <h1 className="text-base font-black text-foreground">{seller.name}</h1>
                {seller.verified && <CheckCircle className="w-4 h-4 text-primary" />}
              </div>
              <p className="text-xs text-muted-foreground">{seller.specialty}</p>
            </div>
          </div>

          <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <Star className="w-3.5 h-3.5 text-secondary fill-secondary" />
              <span className="font-bold text-foreground">{seller.rating}</span>
              <span>({seller.reviews})</span>
            </div>
            <div className="flex items-center gap-1">
              <ShoppingBag className="w-3.5 h-3.5" />
              <span>{seller.sales} vendas</span>
            </div>
            <div className="flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5" />
              <span>{seller.location}</span>
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
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
            {sellerProducts.map(p => (
              <div
                key={p.id}
                onClick={() => navigate(`/produto/${p.id}`)}
                className="bg-card rounded-card border border-border overflow-hidden cursor-pointer group hover:shadow-md transition-shadow"
              >
                <div className="aspect-square overflow-hidden bg-muted">
                  <img src={p.image} alt={p.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy" />
                </div>
                <div className="p-2.5">
                  <h3 className="text-xs font-semibold text-foreground line-clamp-2">{p.title}</h3>
                  <p className="text-sm font-black text-foreground mt-1">{p.price}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === "Avaliações" && (
          <div className="space-y-3">
            {[
              { user: "Ana M.", rating: 5, text: "Excelente vendedor! Entrega rápida e produto como descrito.", date: "Há 2 dias" },
              { user: "João R.", rating: 5, text: "Recomendo! Sempre com bons preços.", date: "Há 1 semana" },
              { user: "Maria S.", rating: 4, text: "Bom atendimento, mas a entrega demorou um pouco.", date: "Há 2 semanas" },
            ].map((review, i) => (
              <div key={i} className="bg-card rounded-card border border-border p-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-foreground">{review.user}</span>
                  <span className="text-[10px] text-muted-foreground">{review.date}</span>
                </div>
                <div className="flex gap-0.5 mt-1">
                  {Array.from({ length: review.rating }).map((_, j) => (
                    <Star key={j} className="w-3 h-3 text-secondary fill-secondary" />
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mt-1.5">{review.text}</p>
              </div>
            ))}
          </div>
        )}

        {activeTab === "Sobre" && (
          <div className="bg-card rounded-card border border-border p-4 space-y-3">
            <p className="text-sm text-foreground">{seller.bio}</p>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Clock className="w-3.5 h-3.5" />
              <span>Vendedor desde {seller.since}</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <MapPin className="w-3.5 h-3.5" />
              <span>{seller.location}</span>
            </div>
          </div>
        )}
      </section>

      <Footer />
    </div>
  );
};

export default VendedorPerfil;
