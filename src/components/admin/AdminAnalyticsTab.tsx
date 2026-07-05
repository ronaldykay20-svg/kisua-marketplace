import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Users, Eye, ShoppingCart, CreditCard, Smartphone, Globe } from "lucide-react";
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  PieChart, Pie, Cell, Legend,
} from "recharts";

const COLORS = ["#a8722f", "#c0501f", "#7a3b1e", "#e0b98a", "#4a3527"];
const RANGES = [
  { label: "7 dias", value: 7 },
  { label: "30 dias", value: 30 },
  { label: "90 dias", value: 90 },
];

interface Overview {
  total_sessions: number;
  total_page_views: number;
  cart_adds: number;
  purchases: number;
  sessions_by_day: { day: string; sessions: number }[];
  device_breakdown: { device_type: string; sessions: number }[];
  referrer_breakdown: { referrer: string; sessions: number }[];
  top_pages: { page_path: string; views: number }[];
  top_products: { id: string; title: string; views: number }[];
}

const StatCard = ({ icon: Icon, label, value }: { icon: any; label: string; value: number | string }) => (
  <div className="bg-card rounded-xl border border-border p-3">
    <div className="flex items-center gap-2 mb-1">
      <Icon className="w-3.5 h-3.5 text-primary" />
      <span className="text-[11px] font-bold text-muted-foreground">{label}</span>
    </div>
    <span className="text-xl font-extrabold text-foreground">{value}</span>
  </div>
);

const AdminAnalyticsTab = () => {
  const [days, setDays] = useState(7);

  const { data, isLoading, error } = useQuery({
    queryKey: ["admin_analytics_overview", days],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_analytics_overview", { p_days: days });
      if (error) throw error;
      return data as Overview;
    },
  });

  const conversionRate =
    data && data.total_sessions > 0 ? ((data.purchases / data.total_sessions) * 100).toFixed(1) : "0";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold text-foreground">Rastreamento de Utilizadores</h2>
        <div className="flex gap-1">
          {RANGES.map((r) => (
            <button
              key={r.value}
              onClick={() => setDays(r.value)}
              className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold ${
                days === r.value ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {isLoading && <p className="text-xs text-muted-foreground text-center py-4">A carregar...</p>}
      {error && (
        <p className="text-xs text-destructive text-center py-4">
          Erro ao carregar dados (confirma que rodaste o SQL das funções de analytics).
        </p>
      )}

      {data && (
        <>
          <div className="grid grid-cols-2 gap-2">
            <StatCard icon={Users} label="Sessões" value={data.total_sessions} />
            <StatCard icon={Eye} label="Páginas vistas" value={data.total_page_views} />
            <StatCard icon={ShoppingCart} label="Adições ao carrinho" value={data.cart_adds} />
            <StatCard icon={CreditCard} label={`Compras (${conversionRate}%)`} value={data.purchases} />
          </div>

          <div className="bg-card rounded-xl border border-border p-3">
            <h3 className="text-xs font-bold text-foreground mb-2">Sessões por dia</h3>
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={data.sessions_by_day}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="day" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                <Tooltip />
                <Line type="monotone" dataKey="sessions" stroke="#a8722f" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="bg-card rounded-xl border border-border p-3">
              <h3 className="text-xs font-bold text-foreground mb-2 flex items-center gap-1">
                <Smartphone className="w-3.5 h-3.5" /> Dispositivos
              </h3>
              <ResponsiveContainer width="100%" height={140}>
                <PieChart>
                  <Pie data={data.device_breakdown} dataKey="sessions" nameKey="device_type" outerRadius={50}>
                    {data.device_breakdown.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-0.5 mt-1">
                {data.device_breakdown.map((d, i) => (
                  <div key={d.device_type} className="flex items-center justify-between text-[10px]">
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                      {d.device_type}
                    </span>
                    <span className="font-bold">{d.sessions}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-card rounded-xl border border-border p-3">
              <h3 className="text-xs font-bold text-foreground mb-2 flex items-center gap-1">
                <Globe className="w-3.5 h-3.5" /> Origem
              </h3>
              <div className="space-y-1.5">
                {data.referrer_breakdown.map((r) => (
                  <div key={r.referrer} className="flex items-center justify-between text-[11px]">
                    <span className="truncate text-muted-foreground max-w-[120px]">{r.referrer}</span>
                    <span className="font-bold text-foreground">{r.sessions}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="bg-card rounded-xl border border-border p-3">
            <h3 className="text-xs font-bold text-foreground mb-2">Páginas mais visitadas</h3>
            <div className="space-y-1.5">
              {data.top_pages.map((p) => (
                <div key={p.page_path} className="flex items-center justify-between text-[11px]">
                  <span className="truncate text-muted-foreground max-w-[200px]">{p.page_path}</span>
                  <span className="font-bold text-foreground">{p.views}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-card rounded-xl border border-border p-3">
            <h3 className="text-xs font-bold text-foreground mb-2">Produtos mais vistos</h3>
            <div className="space-y-1.5">
              {data.top_products.map((p) => (
                <div key={p.id} className="flex items-center justify-between text-[11px]">
                  <span className="truncate text-muted-foreground max-w-[200px]">{p.title}</span>
                  <span className="font-bold text-foreground">{p.views}</span>
                </div>
              ))}
              {data.top_products.length === 0 && (
                <p className="text-[11px] text-muted-foreground">Sem dados ainda.</p>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default AdminAnalyticsTab;
