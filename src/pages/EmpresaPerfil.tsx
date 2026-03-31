import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, CheckCircle, Star, MapPin, Phone, Mail, Globe, Clock, Share2, ThumbsUp, ThumbsDown, Heart, MessageCircle, ShoppingCart, Users } from "lucide-react";
import { allProducts } from "@/data/products";
import ProductCard from "@/components/ProductCard";

const storeData: Record<string, {
  name: string; category: string; rating: number; reviews: number; followers: string; verified: boolean;
  cover: string; logo: string; description: string; email: string; phone: string; address: string; website: string; hours: string;
}> = {
  "1": {
    name: "TechZone Angola", category: "Electrónicos", rating: 4.8, reviews: 274, followers: "12.5k", verified: true,
    cover: "https://images.unsplash.com/photo-1531297484001-80022131f5a1?w=800&h=400&fit=crop",
    logo: "https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=200&h=200&fit=crop",
    description: "TechZone Angola é a loja líder em electrónicos e gadgets em Luanda. Oferecemos os melhores produtos das marcas mais conceituadas, com garantia e assistência técnica.",
    email: "contato@techzone.ao", phone: "+244 923 456 789", address: "Rua da Samba, 456, Luanda", website: "www.techzone.ao", hours: "Segunda a Sábado: 8h às 19h"
  },
};

const reviewsData = [
  { id: 1, name: "Maria Souza", avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop", rating: 5, date: "2 dias", text: "Os produtos são excelentes! Comprei um iPhone e chegou super rápido. Atendimento sempre simpático e atenciosos.", likes: 14 },
  { id: 2, name: "João Santos", avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop", rating: 5, date: "1 semana", text: "A melhor loja de electrónicos da região! Produtos sempre originais e com garantia. Recomendo muito!", likes: 5 },
  { id: 3, name: "Ana Costa", avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop", rating: 4, date: "2 semanas", text: "Bom atendimento e preços competitivos. A entrega demorou um pouco mas o produto é de qualidade.", likes: 3 },
];

const tabs = ["Início", "Produtos", "Promoções", "Avaliações", "Sobre", "Contatar"];

const EmpresaPerfil = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [activeTab, setActiveTab] = useState("Início");

  const store = storeData[id || "1"] || storeData["1"];
  const storeProducts = allProducts.slice(0, 8);
  const promoProducts = allProducts.filter(p => p.discount).slice(0, 4);

  const ratingBreakdown = [
    { stars: 5, pct: 85 },
    { stars: 4, pct: 10 },
    { stars: 3, pct: 3 },
    { stars: 2, pct: 1 },
    { stars: 1, pct: 1 },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-primary">
        <div className="container mx-auto px-4 h-14 flex items-center justify-between">
          <button onClick={() => navigate(-1)} className="text-primary-foreground">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-sm font-bold text-primary-foreground truncate max-w-[200px]">{store.name}</h1>
          <div className="flex items-center gap-3">
            <button className="text-primary-foreground"><Share2 className="w-5 h-5" /></button>
            <button className="text-primary-foreground relative">
              <ShoppingCart className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Cover + Logo */}
      <div className="relative">
        <div className="h-36 md:h-48 overflow-hidden">
          <img src={store.cover} alt={store.name} className="w-full h-full object-cover" />
        </div>
        <div className="container mx-auto px-4 relative">
          <div className="w-20 h-20 md:w-24 md:h-24 rounded-card border-4 border-card bg-card overflow-hidden -mt-10 md:-mt-12 relative z-10 shadow-md">
            <img src={store.logo} alt={store.name} className="w-full h-full object-cover" />
          </div>
        </div>
      </div>

      {/* Store info */}
      <div className="container mx-auto px-4 mt-2">
        <div className="flex items-center gap-1.5">
          <h2 className="text-xl font-black text-foreground">{store.name}</h2>
          {store.verified && <CheckCircle className="w-5 h-5 text-primary" />}
        </div>
        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
          <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {store.category}</span>
          <span className="flex items-center gap-1"><Star className="w-3.5 h-3.5 text-secondary fill-secondary" /> {store.reviews} Avaliações</span>
          <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" /> {store.followers}</span>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2 mt-3">
          <button className="px-5 py-2 rounded-card bg-primary text-primary-foreground text-xs font-bold hover:brightness-110 transition flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5" /> Seguir
          </button>
          <button className="px-5 py-2 rounded-card border border-border text-xs font-bold text-foreground hover:bg-muted transition flex items-center gap-1.5">
            <Mail className="w-3.5 h-3.5" /> Mensagem
          </button>
          <button className="px-5 py-2 rounded-card border border-border text-xs font-bold text-foreground hover:bg-muted transition flex items-center gap-1.5">
            <Phone className="w-3.5 h-3.5" /> Ligar
          </button>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 mt-4 overflow-x-auto scrollbar-hide border-b border-border">
          {tabs.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-shrink-0 px-3 py-2.5 text-xs font-semibold transition border-b-2 ${
                activeTab === tab
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div className="container mx-auto px-4 py-4">
        {activeTab === "Início" && (
          <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] gap-4">
            {/* About sidebar */}
            <div className="bg-card rounded-card border border-border p-4 h-fit">
              <h3 className="text-sm font-bold text-foreground mb-2">Sobre Nós</h3>
              <p className="text-xs text-muted-foreground leading-relaxed mb-3">{store.description}</p>
              <div className="space-y-2 text-xs text-muted-foreground">
                <div className="flex items-start gap-2"><Mail className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" /> {store.email}</div>
                <div className="flex items-start gap-2"><Phone className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" /> {store.phone}</div>
                <div className="flex items-start gap-2"><MapPin className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" /> {store.address}</div>
                <div className="flex items-start gap-2"><Globe className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" /> {store.website}</div>
                <div className="flex items-start gap-2"><Clock className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" /> {store.hours}</div>
              </div>
            </div>

            {/* Main content */}
            <div className="space-y-4">
              {/* Products */}
              <div className="bg-card rounded-card border border-border p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-bold text-foreground">Produtos</h3>
                  <button onClick={() => setActiveTab("Produtos")} className="text-xs font-semibold text-primary">Veja todos</button>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {storeProducts.slice(0, 4).map(p => (
                    <ProductCard key={p.id} product={p} />
                  ))}
                </div>
              </div>

              {/* Promo banner */}
              {promoProducts.length > 0 && (
                <div className="bg-card rounded-card border border-border overflow-hidden flex flex-col sm:flex-row">
                  <div className="h-32 sm:h-auto sm:w-1/2 overflow-hidden">
                    <img src={promoProducts[0].image} alt="Promoção" className="w-full h-full object-cover" />
                  </div>
                  <div className="p-4 flex flex-col justify-center items-start sm:w-1/2">
                    <h3 className="text-base font-bold text-foreground">Promoção Especial</h3>
                    <p className="text-2xl font-black text-walmart-red mt-1">20% OFF</p>
                    <button onClick={() => setActiveTab("Promoções")} className="mt-3 px-4 py-2 rounded-card border border-foreground text-xs font-bold text-foreground hover:bg-muted transition">
                      Ver Promoção
                    </button>
                  </div>
                </div>
              )}

              {/* Reviews summary */}
              <div className="bg-card rounded-card border border-border p-4">
                <h3 className="text-sm font-bold text-foreground mb-3">Avaliações</h3>
                <div className="flex items-start gap-4 mb-4">
                  <div className="text-center">
                    <p className="text-3xl font-black text-foreground">{store.rating}</p>
                    <div className="flex items-center gap-0.5 mt-1">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star key={i} className={`w-3.5 h-3.5 ${i < Math.floor(store.rating) ? "text-secondary fill-secondary" : "text-border"}`} />
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{store.reviews}</p>
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

                {/* Reviews list */}
                <div className="space-y-3">
                  {reviewsData.map(review => (
                    <div key={review.id} className="border-t border-border pt-3">
                      <div className="flex items-center gap-2">
                        <img src={review.avatar} alt={review.name} className="w-8 h-8 rounded-full object-cover" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-foreground">{review.name}</span>
                            <div className="flex items-center gap-0.5">
                              {Array.from({ length: 5 }).map((_, i) => (
                                <Star key={i} className={`w-2.5 h-2.5 ${i < review.rating ? "text-secondary fill-secondary" : "text-border"}`} />
                              ))}
                            </div>
                            <span className="text-[10px] text-muted-foreground">{review.date}</span>
                          </div>
                        </div>
                        <span className="text-[10px] text-muted-foreground flex items-center gap-0.5"><ThumbsUp className="w-3 h-3" /> {review.likes}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">{review.text}</p>
                      <div className="flex items-center gap-3 mt-2 text-[10px] text-muted-foreground">
                        <button className="flex items-center gap-1 hover:text-foreground"><ThumbsUp className="w-3 h-3" /> {review.likes}</button>
                        <button className="flex items-center gap-1 hover:text-foreground"><MessageCircle className="w-3 h-3" /></button>
                        <button className="flex items-center gap-1 hover:text-foreground"><ThumbsDown className="w-3 h-3" /></button>
                        <button className="ml-auto hover:text-destructive"><Heart className="w-3 h-3" /></button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "Produtos" && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
            {storeProducts.map(p => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        )}

        {activeTab === "Promoções" && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
            {promoProducts.map(p => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        )}

        {activeTab === "Avaliações" && (
          <div className="space-y-3 max-w-2xl">
            {reviewsData.map(review => (
              <div key={review.id} className="bg-card rounded-card border border-border p-4">
                <div className="flex items-center gap-2">
                  <img src={review.avatar} alt={review.name} className="w-10 h-10 rounded-full object-cover" />
                  <div>
                    <span className="text-sm font-bold text-foreground">{review.name}</span>
                    <div className="flex items-center gap-1 mt-0.5">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star key={i} className={`w-3 h-3 ${i < review.rating ? "text-secondary fill-secondary" : "text-border"}`} />
                      ))}
                      <span className="text-[10px] text-muted-foreground ml-1">{review.date}</span>
                    </div>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-2 leading-relaxed">{review.text}</p>
              </div>
            ))}
          </div>
        )}

        {activeTab === "Sobre" && (
          <div className="bg-card rounded-card border border-border p-4 max-w-lg">
            <h3 className="text-sm font-bold text-foreground mb-3">Sobre {store.name}</h3>
            <p className="text-xs text-muted-foreground leading-relaxed mb-4">{store.description}</p>
            <div className="space-y-2.5 text-xs text-muted-foreground">
              <div className="flex items-start gap-2"><Mail className="w-4 h-4 mt-0.5 text-primary flex-shrink-0" /> {store.email}</div>
              <div className="flex items-start gap-2"><Phone className="w-4 h-4 mt-0.5 text-primary flex-shrink-0" /> {store.phone}</div>
              <div className="flex items-start gap-2"><MapPin className="w-4 h-4 mt-0.5 text-primary flex-shrink-0" /> {store.address}</div>
              <div className="flex items-start gap-2"><Globe className="w-4 h-4 mt-0.5 text-primary flex-shrink-0" /> {store.website}</div>
              <div className="flex items-start gap-2"><Clock className="w-4 h-4 mt-0.5 text-primary flex-shrink-0" /> {store.hours}</div>
            </div>
          </div>
        )}

        {activeTab === "Contatar" && (
          <div className="bg-card rounded-card border border-border p-4 max-w-lg">
            <h3 className="text-sm font-bold text-foreground mb-3">Enviar Mensagem</h3>
            <div className="space-y-3">
              <input placeholder="Seu nome" className="w-full px-3 py-2.5 rounded-card border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" />
              <input placeholder="Seu email" className="w-full px-3 py-2.5 rounded-card border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" />
              <textarea placeholder="Sua mensagem..." rows={4} className="w-full px-3 py-2.5 rounded-card border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none" />
              <button className="w-full py-2.5 rounded-card bg-primary text-primary-foreground text-sm font-bold hover:brightness-110 transition">
                Enviar
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default EmpresaPerfil;
