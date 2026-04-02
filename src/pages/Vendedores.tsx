import { useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Search, Star, MapPin, CheckCircle, ChevronRight, Users, ShoppingBag } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useSellers } from "@/hooks/useSupabaseData";

const staticSellers = [
  { id: "1", name: "Carlos Mendes", specialty: "Electrónicos", location: "Luanda", rating: 4.9, sales: 1240, verified: true, image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop", cover: "https://images.unsplash.com/photo-1556761175-b413da4baf72?w=600&h=200&fit=crop" },
  { id: "2", name: "Ana Ferreira", specialty: "Moda & Acessórios", location: "Benguela", rating: 4.8, sales: 980, verified: true, image: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop", cover: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=600&h=200&fit=crop" },
  { id: "3", name: "Ricardo Santos", specialty: "Veículos", location: "Luanda", rating: 4.7, sales: 560, verified: true, image: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&h=200&fit=crop", cover: "https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=600&h=200&fit=crop" },
  { id: "4", name: "Maria João", specialty: "Casa & Jardim", location: "Huambo", rating: 4.6, sales: 430, verified: false, image: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200&h=200&fit=crop", cover: "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=600&h=200&fit=crop" },
  { id: "5", name: "Pedro Alves", specialty: "Desporto", location: "Cabinda", rating: 4.5, sales: 320, verified: true, image: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&h=200&fit=crop", cover: "https://images.unsplash.com/photo-1461896836934-bd45ba8a0a42?w=600&h=200&fit=crop" },
  { id: "6", name: "Sofia Nunes", specialty: "Beleza & Saúde", location: "Luanda", rating: 4.8, sales: 870, verified: true, image: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=200&h=200&fit=crop", cover: "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=600&h=200&fit=crop" },
];

const filtersList = ["Todos", "Verificados", "Mais Vendidos", "Melhor Avaliação", "Luanda", "Benguela"];

const Vendedores = () => {
  const navigate = useNavigate();
  const [activeFilter, setActiveFilter] = useState("Todos");
  const [search, setSearch] = useState("");
  const { data: dbSellers } = useSellers({ type: "individual" });

  const sellers = dbSellers && dbSellers.length > 0
    ? dbSellers.map((s: any) => ({
        id: s.id,
        name: s.name,
        specialty: s.description || "Vendedor",
        location: s.province || "Angola",
        rating: s.rating,
        sales: s.total_sales,
        verified: s.is_verified,
        image: s.logo_url || "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop",
        cover: s.cover_url || "https://images.unsplash.com/photo-1556761175-b413da4baf72?w=600&h=200&fit=crop",
      }))
    : staticSellers;

  const filtered = sellers.filter((s: any) => {
    if (search && !s.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (activeFilter === "Verificados") return s.verified;
    if (activeFilter === "Mais Vendidos") return s.sales > 500;
    if (activeFilter === "Melhor Avaliação") return s.rating >= 4.8;
    if (activeFilter === "Luanda" || activeFilter === "Benguela") return s.location === activeFilter;
    return true;
  });

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <section className="bg-primary py-6">
        <div className="container mx-auto px-3 text-center">
          <Users className="w-8 h-8 text-secondary mx-auto mb-2" />
          <h1 className="text-xl md:text-2xl font-black text-primary-foreground">Vendedores</h1>
          <p className="text-xs text-primary-foreground/70 mt-1">Encontre os melhores vendedores de Angola</p>
        </div>
      </section>

      <section className="container mx-auto px-3 -mt-4 relative z-10">
        <div className="bg-card rounded-card border border-border p-3 shadow-md">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Pesquisar vendedores..."
              className="w-full pl-9 pr-3 py-2 rounded-card bg-muted text-sm text-foreground placeholder:text-muted-foreground focus:outline-none" />
          </div>
        </div>
      </section>

      <section className="container mx-auto px-3 mt-3">
        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
          {filtersList.map(f => (
            <button key={f} onClick={() => setActiveFilter(f)}
              className={`px-3 py-1.5 rounded-card text-xs font-semibold whitespace-nowrap border transition ${activeFilter === f ? "bg-primary text-primary-foreground border-primary" : "bg-card text-foreground border-border hover:bg-muted"}`}>
              {f}
            </button>
          ))}
        </div>
      </section>

      <section className="container mx-auto px-3 mt-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((seller: any) => (
            <div key={seller.id} onClick={() => navigate(`/vendedor/${seller.id}`)}
              className="bg-card rounded-card border border-border overflow-hidden hover:shadow-lg transition-shadow cursor-pointer">
              <div className="h-24 overflow-hidden relative">
                <img src={seller.cover} alt="" className="w-full h-full object-cover" loading="lazy" />
                <div className="absolute inset-0 bg-gradient-to-t from-foreground/30 to-transparent" />
              </div>
              <div className="p-3 -mt-6 relative">
                <div className="flex items-end gap-3">
                  <img src={seller.image} alt={seller.name} className="w-14 h-14 rounded-card border-2 border-card object-cover" />
                  <div className="flex-1 min-w-0 pb-1">
                    <div className="flex items-center gap-1">
                      <h3 className="text-sm font-bold text-foreground truncate">{seller.name}</h3>
                      {seller.verified && <CheckCircle className="w-3.5 h-3.5 text-primary flex-shrink-0" />}
                    </div>
                    <p className="text-[10px] text-muted-foreground">{seller.specialty}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between mt-3 text-[10px] text-muted-foreground">
                  <div className="flex items-center gap-1"><MapPin className="w-3 h-3" /><span>{seller.location}</span></div>
                  <div className="flex items-center gap-1"><Star className="w-3 h-3 text-secondary fill-secondary" /><span className="font-bold text-foreground">{seller.rating}</span></div>
                  <div className="flex items-center gap-1"><ShoppingBag className="w-3 h-3" /><span>{seller.sales} vendas</span></div>
                </div>
                <button className="w-full mt-3 py-2 rounded-card text-[11px] font-bold border border-primary/20 text-primary hover:bg-primary/5 transition flex items-center justify-center gap-1">
                  Ver perfil <ChevronRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>
      <Footer />
    </div>
  );
};

export default Vendedores;
