import { motion } from "framer-motion";
import { Heart, MapPin } from "lucide-react";

const products = [
  { id: 1, title: "Toyota Hilux 2022", price: "18.500.000 Kz", location: "Luanda", image: "https://images.unsplash.com/photo-1559416523-140ddc3d238c?w=400&h=400&fit=crop" },
  { id: 2, title: "Apartamento T3 Talatona", price: "45.000.000 Kz", location: "Luanda", image: "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=400&h=400&fit=crop" },
  { id: 3, title: "iPhone 15 Pro Max", price: "650.000 Kz", location: "Benguela", image: "https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=400&h=400&fit=crop" },
  { id: 4, title: "MacBook Pro M3", price: "1.200.000 Kz", location: "Luanda", image: "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=400&h=400&fit=crop" },
  { id: 5, title: "Samsung Galaxy S24", price: "480.000 Kz", location: "Huambo", image: "https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?w=400&h=400&fit=crop" },
  { id: 6, title: "Sofá Modular 5 Lugares", price: "320.000 Kz", location: "Luanda", image: "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=400&h=400&fit=crop" },
];

const ProductCard = ({ product, size = "normal" }: { product: typeof products[0]; size?: "normal" | "large" }) => (
  <motion.div
    initial={{ opacity: 0, y: 15 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    className={`group bg-card rounded-2xl overflow-hidden border border-border hover:border-primary/30 transition-all cursor-pointer ${
      size === "large" ? "row-span-2" : ""
    }`}
    style={{ boxShadow: "var(--card-shadow)" }}
  >
    <div className={`relative overflow-hidden ${size === "large" ? "aspect-[3/4]" : "aspect-square"}`}>
      <img
        src={product.image}
        alt={product.title}
        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        loading="lazy"
      />
      <button className="absolute top-2.5 right-2.5 w-8 h-8 rounded-full bg-card/80 backdrop-blur-sm flex items-center justify-center hover:bg-card transition-colors">
        <Heart className="w-4 h-4 text-foreground" />
      </button>
    </div>
    <div className="p-3">
      <h3 className="text-sm font-semibold text-foreground line-clamp-1">{product.title}</h3>
      <p className="text-sm font-bold font-heading text-primary mt-0.5">{product.price}</p>
      <span className="flex items-center gap-1 text-[11px] text-muted-foreground mt-1">
        <MapPin className="w-3 h-3" /> {product.location}
      </span>
    </div>
  </motion.div>
);

const ProductGrid = () => {
  return (
    <section className="py-6">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold font-heading text-foreground">Destaques</h2>
          <button className="text-xs font-semibold text-primary">Ver todos →</button>
        </div>

        {/* Row 1: 2 products */}
        <div className="grid grid-cols-2 gap-3 mb-3">
          <ProductCard product={products[0]} />
          <ProductCard product={products[1]} />
        </div>

        {/* Row 2: 3 products */}
        <div className="grid grid-cols-3 gap-3 mb-3">
          <ProductCard product={products[2]} />
          <ProductCard product={products[3]} />
          <ProductCard product={products[4]} />
        </div>

        {/* Row 3: 1 product full width */}
        <div className="grid grid-cols-1 gap-3">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="group bg-card rounded-2xl overflow-hidden border border-border hover:border-primary/30 transition-all cursor-pointer flex relative"
            style={{ boxShadow: "var(--card-shadow)" }}
          >
            <div className="relative w-1/3 overflow-hidden">
              <img
                src={products[5].image}
                alt={products[5].title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                loading="lazy"
              />
            </div>
            <div className="flex-1 p-4 flex flex-col justify-center">
              <h3 className="text-sm font-semibold text-foreground">{products[5].title}</h3>
              <p className="text-base font-bold font-heading text-primary mt-1">{products[5].price}</p>
              <span className="flex items-center gap-1 text-[11px] text-muted-foreground mt-2">
                <MapPin className="w-3 h-3" /> {products[5].location}
              </span>
            </div>
            <button className="absolute top-2.5 right-2.5 w-8 h-8 rounded-full bg-card/80 backdrop-blur-sm flex items-center justify-center hover:bg-card transition-colors">
              <Heart className="w-4 h-4 text-foreground" />
            </button>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default ProductGrid;
