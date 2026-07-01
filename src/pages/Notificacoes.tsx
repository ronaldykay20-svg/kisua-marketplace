import { Bell, ChevronLeft, Check, Loader2 } from "lucide-react";
import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { classifyNotification, NotificationTone } from "@/lib/notificationStyle";

const FILTERS: { key: NotificationTone | "all"; label: string; dot: string }[] = [
  { key: "all",    label: "Todas",     dot: "bg-muted-foreground" },
  { key: "red",    label: "Urgentes",  dot: "bg-red-500" },
  { key: "amber",  label: "Avisos",    dot: "bg-amber-500" },
  { key: "blue",   label: "Pedidos",   dot: "bg-blue-500" },
  { key: "green",  label: "Confirmados", dot: "bg-green-500" },
];

const Notificacoes = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<NotificationTone | "all">("all");

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ["notifications", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const markRead = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from("notifications").update({ is_read: true }).eq("id", id);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const markAllRead = useMutation({
    mutationFn: async () => {
      await supabase.from("notifications").update({ is_read: true }).eq("user_id", user!.id).eq("is_read", false);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const unreadCount = notifications.filter((n: any) => !n.is_read).length;
  const urgentUnreadCount = notifications.filter((n: any) => !n.is_read && classifyNotification(n).tone === "red").length;

  const filtered = useMemo(() => {
    if (filter === "all") return notifications;
    return notifications.filter((n: any) => classifyNotification(n).tone === filter);
  }, [notifications, filter]);

  if (!user) {
    return (
      <div className="min-h-screen bg-background pb-14 md:pb-0">
        <div className="container mx-auto px-3 py-8 text-center">
          <Bell className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Faça login para ver notificações.</p>
          <button onClick={() => navigate("/auth")} className="mt-3 px-6 py-2 bg-primary text-primary-foreground text-xs font-bold rounded-card">Entrar</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-14 md:pb-0">
      <div className="container mx-auto px-3 py-4 max-w-lg">
        <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-sm text-muted-foreground mb-4">
          <ChevronLeft className="w-4 h-4" /> Voltar
        </button>

        <div className="flex items-center justify-between mb-1">
          <h1 className="text-lg font-bold text-foreground flex items-center gap-2">
            <Bell className="w-5 h-5 text-primary" /> Notificações
            {unreadCount > 0 && (
              <span className="bg-primary text-primary-foreground text-[10px] font-bold px-1.5 py-0.5 rounded-full">{unreadCount}</span>
            )}
          </h1>
          {unreadCount > 0 && (
            <button
              onClick={() => markAllRead.mutate()}
              className="text-[11px] text-primary font-semibold flex items-center gap-1"
            >
              <Check className="w-3.5 h-3.5" /> Marcar tudo como lido
            </button>
          )}
        </div>

        {urgentUnreadCount > 0 && (
          <div className="flex items-center gap-2 rounded-lg px-3 py-2 mb-3 bg-red-500/10 border border-red-500/25">
            <span className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0" />
            <p className="text-[11px] font-bold text-red-600">
              {urgentUnreadCount} {urgentUnreadCount === 1 ? "aviso urgente" : "avisos urgentes"} por ler — requer atenção imediata.
            </p>
          </div>
        )}

        {/* Filtros por cor/tipo */}
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-3 mb-1">
          {FILTERS.map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap border transition ${
                filter === f.key ? "bg-foreground text-background border-foreground" : "bg-card text-muted-foreground border-border"
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${f.dot}`} />
              {f.label}
            </button>
          ))}
        </div>

        {isLoading && (
          <div className="text-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-primary mx-auto" />
          </div>
        )}

        {!isLoading && filtered.length === 0 && (
          <div className="text-center py-12">
            <Bell className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">
              {filter === "all" ? "Nenhuma notificação ainda" : "Nada nesta categoria"}
            </p>
          </div>
        )}

        <div className="space-y-2">
          {filtered.map((n: any) => {
            const style = classifyNotification(n);
            return (
              <button
                key={n.id}
                onClick={() => {
                  if (!n.is_read) markRead.mutate(n.id);
                  if (n.link_url) navigate(n.link_url);
                }}
                className={`w-full text-left p-3 rounded-xl border border-l-4 transition ${style.border} ${
                  n.is_read ? "bg-card border-border" : `${style.bg} border-border shadow-sm`
                }`}
              >
                <div className="flex gap-3">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${style.iconBg}`}>
                    <style.Icon className={`w-4 h-4 ${style.iconText}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded ${style.iconBg} ${style.iconText}`}>
                        {style.label}
                      </span>
                      {!n.is_read && <span className={`w-2 h-2 rounded-full flex-shrink-0 ${style.dot}`} />}
                    </div>
                    <p className={`text-xs font-bold truncate mt-1 ${!n.is_read ? style.titleText : "text-foreground"}`}>{n.title}</p>
                    {n.message && <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">{n.message}</p>}
                    <p className="text-[10px] text-muted-foreground mt-1">
                      {new Date(n.created_at).toLocaleDateString("pt-AO")} • {new Date(n.created_at).toLocaleTimeString("pt-AO", { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default Notificacoes;
