import { useNavigate } from "react-router-dom";
import { ArrowLeft, Minus, Plus, Trash2, ShoppingCart, Loader2 } from "lucide-react";
import { useCart } from "@/hooks/useSupabaseData";
import { useUpdateCartItem, useRemoveCartItem } from "@/hooks/useCartActions";
import { useAuth } from "@/contexts/AuthContext";
import BottomNav from "@/components/BottomNav";

const formatPrice = (price: number) =>
  price.toLocaleString("pt-AO").replace(/,/g, ".") + " Kz";

const Carrinho = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: cartItems = [], isLoading } = useCart();
  const updateItem = useUpdateCartItem();
  const removeItem = useRemoveCartItem();

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center pb-14">
        <div className="text-center">
          <ShoppingCart className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <h2 className="text-lg font-bold text-foreground mb-2">Inicie sessão para ver o carrinho</h2>
          <button onClick={() => navigate("/auth")} className="px-6 py-2 rounded-full bg-primary text-primary-foreground text-sm font-bold">
            Entrar
          </button>
        </div>
      </div>
    );
  }

  const total = cartItems.reduce((sum: number, item: any) => {
    const price = item.products?.price || 0;
    return sum + price * item.quantity;
  }, 0);

  return (
    <div className="min-h-screen bg-background pb-40 md:pb-20">
      <div className="container mx-auto px-3 pt-3 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="text-foreground"><ArrowLeft className="w-5 h-5" /></button>
        <span className="text-base font-bold text-foreground">Carrinho ({cartItems.length})</span>
      </div>

      <div className="container mx-auto px-3 py-4 max-w-2xl">
        {isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : cartItems.length === 0 ? (
          <div className="text-center py-20">
            <ShoppingCart className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-lg font-bold text-foreground mb-2">Carrinho vazio</h2>
            <p className="text-sm text-muted-foreground mb-4">Adicione produtos para começar</p>
            <button onClick={() => navigate("/")} className="px-6 py-2 rounded-full bg-primary text-primary-foreground text-sm font-bold">
              Explorar produtos
            </button>
          </div>
        ) : (
          <>
            <div className="space-y-3">
              {cartItems.map((item: any) => {
                const product = item.products;
                if (!product) return null;
                const coverUrl = product.image_url || "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=200&h=200&fit=crop";
                return (
                  <div key={item.id} className="bg-card rounded-card border border-border p-3 flex gap-3">
                    <img
                      src={coverUrl}
                      alt={product.title}
                      className="w-20 h-20 rounded-lg object-cover flex-shrink-0 cursor-pointer"
                      onClick={() => navigate(`/produto/${product.id}`)}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-foreground line-clamp-2">{product.title}</p>
                      <p className="text-base font-black text-foreground mt-1">{formatPrice(product.price)}</p>
                      {product.free_shipping && (
                        <p className="text-[10px] text-primary font-semibold">Frete grátis</p>
                      )}
                      <div className="flex items-center justify-between mt-2">
                        <div className="flex items-center border border-border rounded-lg">
                          <button
                            onClick={() => updateItem.mutate({ id: item.id, quantity: item.quantity - 1 })}
                            className="w-7 h-7 flex items-center justify-center text-muted-foreground hover:bg-muted"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="w-7 text-center text-xs font-bold text-foreground">{item.quantity}</span>
                          <button
                            onClick={() => updateItem.mutate({ id: item.id, quantity: item.quantity + 1 })}
                            className="w-7 h-7 flex items-center justify-center text-muted-foreground hover:bg-muted"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                        <button
                          onClick={() => removeItem.mutate(item.id)}
                          className="text-muted-foreground hover:text-destructive transition"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Summary */}
            <div className="bg-card rounded-card border border-border p-4 mt-4">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-muted-foreground">Subtotal ({cartItems.length} itens)</span>
                <span className="font-bold text-foreground">{formatPrice(total)}</span>
              </div>
              <div className="flex justify-between text-sm mb-3">
                <span className="text-muted-foreground">Frete</span>
                <span className="font-semibold text-primary">Grátis</span>
              </div>
              <div className="border-t border-border pt-3 flex justify-between">
                <span className="text-base font-black text-foreground">Total</span>
                <span className="text-base font-black text-foreground">{formatPrice(total)}</span>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Fixed bottom CTA */}
      {cartItems.length > 0 && (
        <div className="fixed bottom-14 md:bottom-0 left-0 right-0 bg-card border-t border-border p-3 z-50">
          <div className="container mx-auto max-w-2xl flex items-center justify-between gap-3">
            <div>
              <p className="text-xs text-muted-foreground">Total</p>
              <p className="text-lg font-black text-foreground">{formatPrice(total)}</p>
            </div>
            <button
              onClick={() => navigate("/checkout")}
              className="px-8 py-3 rounded-full bg-primary text-primary-foreground font-bold text-sm hover:brightness-110 transition"
            >
              Finalizar compra
            </button>
          </div>
        </div>
      )}
      <BottomNav />
    </div>
  );
};

export default Carrinho;
