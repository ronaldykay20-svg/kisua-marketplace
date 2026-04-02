import { Package, ChevronRight, Truck } from "lucide-react";
import Navbar from "@/components/Navbar";
import BottomNav from "@/components/BottomNav";

const tabs = ["Todos", "Pendentes", "Enviados", "Entregues", "Cancelados"];

const Pedidos = () => {
  return (
    <div className="min-h-screen bg-background pb-14 md:pb-0">
      <Navbar />
      <div className="container mx-auto px-3 py-4 max-w-2xl">
        <h1 className="text-lg font-bold text-foreground mb-3">Meus Pedidos</h1>

        <div className="flex gap-2 overflow-x-auto scrollbar-hide mb-4 pb-1">
          {tabs.map((t, i) => (
            <button key={t} className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition ${i === 0 ? "bg-primary text-primary-foreground border-primary" : "border-border text-foreground"}`}>
              {t}
            </button>
          ))}
        </div>

        {/* Empty state */}
        <div className="bg-card rounded-lg border border-border p-8 text-center">
          <Package className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <h3 className="text-sm font-bold text-foreground mb-1">Nenhum pedido ainda</h3>
          <p className="text-xs text-muted-foreground mb-4">Quando fizer uma compra, os seus pedidos aparecerão aqui.</p>
          <button className="px-6 py-2 bg-primary text-primary-foreground text-xs font-bold rounded-lg">Começar a comprar</button>
        </div>
      </div>
      <BottomNav />
    </div>
  );
};

export default Pedidos;
