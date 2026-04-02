import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Search, CheckCircle, Star, ShoppingCart, Camera, ShoppingBag, UtensilsCrossed, Leaf, Dumbbell, Wrench, Palette, Music, MapPin, Users } from "lucide-react";
import { useSellers } from "@/hooks/useSupabaseData";

// Static fallback
const staticEmpresas = [
  { id: "1", name: "Foto Studio", category: "Fotografia", icon: Camera, rating: 4.8, visits: "12K", followers: "8K", cover: "https://images.unsplash.com/photo-1471341971476-ae15ff5dd4ea?w=600&h=300&fit=crop", verified: true },
  { id: "2", name: "Loja Bella", category: "Moda", icon: ShoppingBag, rating: 4.2, visits: "8K", followers: "4.5K", cover: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=600&h=300&fit=crop", verified: false },
  { id: "3", name: "Doce Sabor", category: "Confeitaria", icon: UtensilsCrossed, rating: 5.0, visits: "15K", followers: "12K", cover: "https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=600&h=300&fit=crop", verified: true },
  { id: "4", name: "Eco Verde", category: "Produtos Sustentáveis", icon: Leaf, rating: 4.5, visits: "9K", followers: "5K", cover: "https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=600&h=300&fit=crop", verified: false },
  { id: "5", name: "Fit Center", category: "Academia", icon: Dumbbell, rating: 4.7, visits: "20K", followers: "14K", cover: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=600&h=300&fit=crop", verified: true },
  { id: "6", name: "Tech Repairs", category: "Assistência Técnica", icon: Wrench, rating: 3.9, visits: "6K", followers: "2K", cover: "https://images.unsplash.com/photo-1581092921461-eab62e97a780?w=600&h=300&fit=crop", verified: false },
  { id: "7", name: "Galpão Arte", category: "Artesanato", icon: Palette, rating: 4.6, visits: "11K", followers: "7K", cover: "https://images.unsplash.com/photo-1460661419201-fd4cecdf8a8b?w=600&h=300&fit=crop", verified: true },
  { id: "8", name: "Bistrô Sabor", category: "Restaurante", icon: UtensilsCrossed, rating: 4.4, visits: "18K", followers: "9.5K", cover: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=600&h=300&fit=crop", verified: false },
  { id: "9", name: "Sound Wave", category: "Música & Áudio", icon: Music, rating: 4.3, visits: "7K", followers: "3.2K", cover: "https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=600&h=300&fit=crop", verified: true },
];

const filters = ["Categoria", "Localização", "Avaliação", "Mais Visitas", "Mais Seguidores"];

const Empresas = () => {
  const navigate = useNavigate();
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const { data: dbSellers } = useSellers({ type: "company" });

  // Map DB sellers to display format, fallback to static
  const empresas = dbSellers && dbSellers.length > 0
    ? dbSellers.map((s: any) => ({
        id: s.id,
        name: s.name,
        category: s.description || "Empresa",
        icon: ShoppingBag,
        rating: s.rating,
        visits: s.visits_count > 1000 ? `${(s.visits_count / 1000).toFixed(0)}K` : String(s.visits_count),
        followers: s.followers_count > 1000 ? `${(s.followers_count / 1000).toFixed(1)}K` : String(s.followers_count),
        cover: s.cover_url || "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=600&h=300&fit=crop",
        verified: s.is_verified,
      }))
    : staticEmpresas;

  const filtered = empresas.filter((e: any) =>
    e.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    e.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-primary">
        <div className="container mx-auto px-4 h-14 flex items-center justify-between">
          <button onClick={() => navigate(-1)} className="text-primary-foreground"><ArrowLeft className="w-5 h-5" /></button>
          <h1 className="text-lg font-black text-primary-foreground tracking-tight">EMPRESAS</h1>
          <button className="text-primary-foreground relative"><ShoppingCart className="w-5 h-5" /></button>
        </div>
      </div>

      <div className="container mx-auto px-4 py-4 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <h2 className="text-xl font-black text-foreground">Empresas</h2>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input type="text" placeholder="Buscar..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full sm:w-64 pl-9 pr-4 py-2.5 rounded-card border border-border bg-card text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide pb-1">
          {filters.map(f => (
            <button key={f} onClick={() => setActiveFilter(activeFilter === f ? null : f)}
              className={`flex-shrink-0 px-4 py-2 rounded-full border text-xs font-semibold transition ${activeFilter === f ? "bg-primary text-primary-foreground border-primary" : "border-border text-foreground hover:bg-muted"}`}>
              {f}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((empresa: any) => {
            const Icon = empresa.icon;
            return (
              <div key={empresa.id} onClick={() => navigate(`/empresa/${empresa.id}`)}
                className="bg-card rounded-card border border-border overflow-hidden cursor-pointer hover:shadow-lg transition group">
                <div className="h-28 overflow-hidden relative">
                  <img src={empresa.cover} alt={empresa.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy" />
                </div>
                <div className="p-3 pt-0 relative">
                  <div className="w-14 h-14 rounded-full bg-card border-2 border-border flex items-center justify-center -mt-7 relative z-10 shadow-sm">
                    <Icon className="w-6 h-6 text-muted-foreground" />
                  </div>
                  <div className="mt-1.5">
                    <div className="flex items-center gap-1.5">
                      <h3 className="text-sm font-bold text-foreground">{empresa.name}</h3>
                      {empresa.verified && <CheckCircle className="w-4 h-4 text-primary flex-shrink-0" />}
                    </div>
                    <p className="text-xs text-muted-foreground">{empresa.category}</p>
                  </div>
                  <div className="flex items-center gap-2 mt-2.5 text-xs text-muted-foreground">
                    <span className="flex items-center gap-0.5"><Star className="w-3 h-3 text-secondary fill-secondary" /> {empresa.rating}</span>
                    <span className="text-border">|</span>
                    <span className="flex items-center gap-0.5"><MapPin className="w-3 h-3" /> {empresa.visits} visitas</span>
                    <span className="text-border">|</span>
                    <span className="flex items-center gap-0.5"><Users className="w-3 h-3" /> {empresa.followers} seguidores</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default Empresas;
