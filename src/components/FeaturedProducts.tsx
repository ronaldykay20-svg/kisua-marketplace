import { motion } from "framer-motion";
import { Heart, MapPin, Clock } from "lucide-react";

const products = [
  { id: 1, title: "Toyota Hilux 2022", price: "18.500.000 Kz", location: "Luanda", time: "2h", category: "Veículos", image: "https://images.unsplash.com/photo-1559416523-140ddc3d238c?w=400&h=300&fit=crop" },
  { id: 2, title: "Apartamento T3 Talatona", price: "45.000.000 Kz", location: "Luanda", time: "5h", category: "Imóveis", image: "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=400&h=300&fit=crop" },
  { id: 3, title: "iPhone 15 Pro Max", price: "650.000 Kz", location: "Benguela", time: "1h", category: "Electrónicos", image: "https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=400&h=300&fit=crop" },
  { id: 4, title: "MacBook Pro M3", price: "1.200.000 Kz", location: "Luanda", time: "30min", category: "Electrónicos", image: "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=400&h=300&fit=crop" },
  { id: 5, title: "Terreno 500m² Viana", price: "8.000.000 Kz", location: "Viana", time: "1d", category: "Imóveis", image: "https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=400&h=300&fit=crop" },
  { id: 6, title: "Samsung Galaxy S24", price: "480.000 Kz", location: "Huambo", time: "3h", category: "Electrónicos", image: "https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?w=400&h=300&fit=crop" },
  { id: 7, title: "Sofá Modular 5 Lugares", price: "320.000 Kz", location: "Luanda", time: "6h", category: "Casa", image: "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=400&h=300&fit=crop" },
  { id: 8, title: "Gerador 5000W", price: "450.000 Kz", location: "Cabinda", time: "4h", category: "Outros", image: "https://images.unsplash.com/photo-1621905252507-b35492cc74b4?w=400&h=300&fit=crop" },
];

const FeaturedProducts = () => {
  return (
    <section className="py-16 bg-muted/50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between mb-10">
          <div>
            <h2 className="text-3xl font-bold font-heading text-foreground">Anúncios em Destaque</h2>
            <p className="text-muted-foreground mt-1">Os mais recentes e populares</p>
          </div>
          <button className="text-sm font-semibold text-primary hover:underline">
            Ver todos →
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {products.map((product, i) => (
            <motion.div
              key={product.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.06 }}
              className="group bg-card rounded-2xl overflow-hidden border border-border hover:border-primary/30 transition-all cursor-pointer"
              style={{ boxShadow: 'var(--card-shadow)' }}
            >
              <div className="relative aspect-[4/3] overflow-hidden">
                <img
                  src={product.image}
                  alt={product.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <button className="absolute top-3 right-3 w-9 h-9 rounded-full bg-card/80 backdrop-blur-sm flex items-center justify-center hover:bg-card transition-colors">
                  <Heart className="w-4 h-4 text-foreground" />
                </button>
                <span className="absolute top-3 left-3 px-2.5 py-1 rounded-lg bg-primary text-primary-foreground text-xs font-semibold">
                  {product.category}
                </span>
              </div>

              <div className="p-4">
                <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-1">
                  {product.title}
                </h3>
                <p className="text-lg font-bold font-heading text-primary mt-1">
                  {product.price}
                </p>
                <div className="flex items-center justify-between mt-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3 h-3" /> {product.location}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" /> {product.time}
                  </span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturedProducts;
