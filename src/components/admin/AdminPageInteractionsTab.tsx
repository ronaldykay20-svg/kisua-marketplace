import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { MousePointerClick, Users2, ListChecks } from "lucide-react";
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  BarChart, Bar, Cell,
} from "recharts";

const COLORS = ["#a8722f", "#c0501f", "#7a3b1e", "#e0b98a", "#4a3527"];
const RANGES = [
  { label: "7 dias", value: 7 },
  { label: "30 dias", value: 30 },
  { label: "90 dias", value: 90 },
];

const EVENT_LABELS: Record<string, string> = {
  view: "Abriu o produto",
  card_tap: "Clicou no card",
  add_to_cart: "Pôs no carrinho",
  buy_now: "Comprar agora",
  favorite: "Favoritou",
  share: "Partilhou",
  image_zoom: "Deu zoom na foto",
  variant_select: "Escolheu variante",
  review_read: "Leu avaliações",
  seller_view: "Viu o vendedor",
};

interface Overview {
  total_events: number;
  unique_sessions: number;
  events_by_type: { event_type: string; count: number }[];
  events_by_day: { day: string; count: number }[];
  top_products: { id: string; title: string; event_count: number }[];
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

const AdminPageInteractionsTab = () => {
  const [days, setDays] = useState(7);

  const { data, isLoading, error } = useQuery({
    queryKey: ["admin_page_interactions_overview", days],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_page_interactions_overview", { p_days: days });
      if (error) throw error;
      return data as Overview;
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold text-foreground">Interações de Página</h2>
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

      <p className="text-[11px] text-muted-foreground">
        Só visível para administradores. Só conta visitas de pessoas que aceitaram cookies de analytics.
      </p>

      {isLoading && <p className="text-xs text-muted-foreground text-center py-4">A carregar...</p>}
      {error && (
        <p className="text-xs text-destructive text-center py-4">
          Erro ao carregar dados (confirma que rodaste o SQL de product_tracking_events).
        </p>
      )}

      {data && (
        <>
          <div className="grid grid-cols-2 gap-2">
            <StatCard icon={MousePointerClick} label="Interações totais" value={data.total_events} />
            <StatCard icon={Users2} label="Sessões únicas" value={data.unique_sessions} />
          </div>

          <div className="bg-card rounded-xl border border-border p-3">
            <h3 className="text-xs font-bold text-foreground mb-2">Interações por dia</h3>
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={data.events_by_day}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="day" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                <Tooltip />
                <Line type="monotone" dataKey="count" stroke="#a8722f" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-card rounded-xl border border-border p-3">
            <h3 className="text-xs font-bold text-foreground mb-2 flex items-center gap-1">
              <ListChecks className="w-3.5 h-3.5" /> Tipo de interação
            </h3>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={data.events_by_type} layout="vertical" margin={{ left: 8 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis type="number" tick={{ fontSize: 10 }} allowDecimals={false} />
                <YAxis
                  type="category"
                  dataKey="event_type"
                  tick={{ fontSize: 10 }}
                  width={110}
                  tickFormatter={(v: string) => EVENT_LABELS[v] || v}
                />
                <Tooltip formatter={(value: number, _name, props) => [value, EVENT_LABELS[props.payload.event_type] || props.payload.event_type]} />
                <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                  {data.events_by_type.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            {data.events_by_type.length === 0 && (
              <p className="text-[11px] text-muted-foreground">Sem dados ainda.</p>
            )}
          </div>

          <div className="bg-card rounded-xl border border-border p-3">
            <h3 className="text-xs font-bold text-foreground mb-2">Produtos com mais interações</h3>
            <div className="space-y-1.5">
              {data.top_products.map((p) => (
                <div key={p.id} className="flex items-center justify-between text-[11px]">
                  <span className="truncate text-muted-foreground max-w-[200px]">{p.title}</span>
                  <span className="font-bold text-foreground">{p.event_count}</span>
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

export default AdminPageInteractionsTab;
