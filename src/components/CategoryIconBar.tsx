import { useNavigate } from "react-router-dom";
import { useCategories } from "@/hooks/useSupabaseData";

// ─────────────────────────────────────────────────────────────────────────
// Faixa de categorias — ícones em scroll horizontal, logo abaixo do
// cabeçalho. Usa a foto real de cada categoria (display_image_url, já
// vem pronta do RPC get_categories_with_products — ou a imagem da
// categoria em si, ou a do produto mais popular dela). É o mesmo padrão
// que Shein/AliExpress usam: fotos reais nos círculos, não ícones
// genéricos — dá contexto visual imediato do que tem ali dentro.
// ─────────────────────────────────────────────────────────────────────────

const FALLBACK_IMG = "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=200&h=200&fit=crop";

const staticImages: Record<string, string> = {
  "Electrónicos":     "https://images.unsplash.com/photo-1498049794561-7780e7231661?w=200&h=200&fit=crop",
  "Veículos":         "https://images.unsplash.com/photo-1494976388531-d1058494cdd8?w=200&h=200&fit=crop",
  "Imóveis":          "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=200&h=200&fit=crop",
  "Moda":             "https://images.unsplash.com/photo-1483985988355-763728e1935b?w=200&h=200&fit=crop",
  "Casa & Jardim":    "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=200&h=200&fit=crop",
  "Desporto":         "https://images.unsplash.com/photo-1461896836934-bd45ba8a0a42?w=200&h=200&fit=crop",
  "Bebé & Criança":   "https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4?w=200&h=200&fit=crop",
  "Saúde":            "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=200&h=200&fit=crop",
  "Saúde & Beleza":   "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=200&h=200&fit=crop",
  "Informática":      "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=200&h=200&fit=crop",
  "Gaming":           "https://images.unsplash.com/photo-1612287230202-1ff1d85d1bdf?w=200&h=200&fit=crop",
  "Jóias":            "https://images.unsplash.com/photo-1515562141589-67f0d569b6fc?w=200&h=200&fit=crop",
  "Jóias & Relógios": "https://images.unsplash.com/photo-1515562141589-67f0d569b6fc?w=200&h=200&fit=crop",
  "Viagens":          "https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=200&h=200&fit=crop",
  "Alimentação":      "https://images.unsplash.com/photo-1506617420156-8e4536971650?w=200&h=200&fit=crop",
  "Empregos":         "https://images.unsplash.com/photo-1521737711867-e3b97375f902?w=200&h=200&fit=crop",
  "Educação":         "https://images.unsplash.com/photo-1427504494785-3a9ca7044f45?w=200&h=200&fit=crop",
  "Animais":          "https://images.unsplash.com/photo-1450778869180-41d0601e046e?w=200&h=200&fit=crop",
};

const staticCategories = Object.keys(staticImages);

const CategoryIconBar = () => {
  const navigate = useNavigate();
  const { data: dbCategories } = useCategories();

  const categories = dbCategories && dbCategories.length > 0
    ? dbCategories.map((c: any) => ({
        name: c.name,
        image: c.display_image_url || staticImages[c.name] || FALLBACK_IMG,
      }))
    : staticCategories.map((name) => ({ name, image: staticImages[name] }));

  return (
    <section className="bg-white">
      <div className="flex gap-4 overflow-x-auto scrollbar-hide px-3 pt-3 pb-2 snap-x">
        {categories.map(({ name, image }) => (
          <button
            key={name}
            onClick={() => navigate(`/categoria/${encodeURIComponent(name)}`)}
            className="flex flex-col items-center gap-1.5 shrink-0 w-[64px] snap-start active:opacity-60 transition-opacity"
          >
            <div
              className="w-14 h-14 rounded-full overflow-hidden bg-muted"
              style={{ border: "1px solid rgba(74,46,10,0.12)" }}
            >
              <img src={image} alt={name} className="w-full h-full object-cover" loading="lazy" />
            </div>
            <span
              className="text-[10.5px] font-semibold text-center leading-tight line-clamp-2"
              style={{ color: "#4A2E0A" }}
            >
              {name}
            </span>
          </button>
        ))}
      </div>
    </section>
  );
};

export default CategoryIconBar;
