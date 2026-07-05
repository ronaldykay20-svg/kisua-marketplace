import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Zap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getRemainingToMidnight } from "@/lib/flashTime";

const FlashSaleBar = () => {
  const [remaining, setRemaining] = useState(getRemainingToMidnight());

  useEffect(() => {
    const interval = setInterval(() => setRemaining(getRemainingToMidnight()), 1000);
    return () => clearInterval(interval);
  }, []);

  // Contagem real de produtos ativos em promoção hoje (nunca inventada)
  const { data: flashCount = 0 } = useQuery({
    queryKey: ["flash_sale_count"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("products")
        .select("id", { count: "exact", head: true })
        .eq("is_active", true)
        .gt("discount_percent", 0);
      if (error) throw error;
      return count || 0;
    },
    staleTime: 60000,
  });

  if (flashCount === 0) return null;

  return (
    <div
      className="flex items-center justify-between px-3 py-2 mx-2 md:mx-0 mb-2"
      style={{ background: "linear-gradient(90deg, #e53935, #f57c00)", borderRadius: "6px" }}
    >
      <div className="flex items-center gap-1.5">
        <Zap className="w-4 h-4 text-white" fill="white" />
        <span className="text-[12px] font-black text-white">
          {flashCount} produtos em promoção relâmpago
        </span>
      </div>
      <div className="flex items-center gap-1">
        <span className="text-[10px] text-white/80 font-semibold">termina em</span>
        <span
          className="text-[12px] font-black text-white px-1.5 py-0.5 font-mono"
          style={{ background: "rgba(0,0,0,0.2)", borderRadius: "4px" }}
        >
          {remaining}
        </span>
      </div>
    </div>
  );
};

export default FlashSaleBar;
