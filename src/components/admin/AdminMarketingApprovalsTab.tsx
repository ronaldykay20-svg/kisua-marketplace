import { useState } from "react";
import { CheckCircle2, Clock, ChevronDown, ChevronUp, Lock } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import ConfirmPasswordModal from "./ConfirmPasswordModal";

const TABLE_LABELS: Record<string, string> = {
  banners: "Banners",
  ads: "Publicidade",
  coupons: "Cupões",
  coupon_settings: "Definições de Cupões",
  auction_payment_methods: "Pagamentos de Leilões",
  auctions: "Leilões",
};

const ACTION_LABELS: Record<string, string> = {
  INSERT: "Criou",
  UPDATE: "Editou",
  DELETE: "Apagou",
};

function diffFields(oldData: any, newData: any): { field: string; from: any; to: any }[] {
  if (!oldData || !newData) return [];
  const keys = new Set([...Object.keys(oldData), ...Object.keys(newData)]);
  const diffs: { field: string; from: any; to: any }[] = [];
  keys.forEach((k) => {
    if (k === "id" || k === "created_at" || k === "updated_at") return;
    const a = JSON.stringify(oldData[k]);
    const b = JSON.stringify(newData[k]);
    if (a !== b) diffs.push({ field: k, from: oldData[k], to: newData[k] });
  });
  return diffs;
}

export default function AdminMarketingApprovalsTab() {
  const queryClient = useQueryClient();
  const [expanded, setExpanded] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<string | null>(null);

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ["marketing_change_log"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("marketing_change_log")
        .select("*, profiles:changed_by(full_name)")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data;
    },
  });

  const confirmChange = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).rpc("confirm_marketing_change", { p_log_id: id });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["marketing_change_log"] });
      toast.success("Alteração confirmada");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const pending = logs.filter((l: any) => l.status === "pending");
  const confirmed = logs.filter((l: any) => l.status === "confirmed");

  const renderLog = (log: any) => {
    const diffs = log.action === "UPDATE" ? diffFields(log.old_data, log.new_data) : [];
    const isOpen = expanded === log.id;
    return (
      <div key={log.id} className="bg-card border border-border rounded-xl p-3">
        <button className="w-full flex items-center justify-between text-left" onClick={() => setExpanded(isOpen ? null : log.id)}>
          <div>
            <p className="text-sm font-bold text-foreground">
              {TABLE_LABELS[log.table_name] || log.table_name} — {ACTION_LABELS[log.action] || log.action}
            </p>
            <p className="text-[11px] text-muted-foreground">
              {log.profiles?.full_name || "Gestor de Marketing"} · {new Date(log.created_at).toLocaleString("pt-PT")}
            </p>
          </div>
          {isOpen ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
        </button>

        {isOpen && (
          <div className="mt-3 pt-3 border-t border-border space-y-2">
            {log.action === "INSERT" && (
              <pre className="text-[10px] bg-muted rounded-lg p-2 overflow-x-auto">{JSON.stringify(log.new_data, null, 2)}</pre>
            )}
            {log.action === "DELETE" && (
              <pre className="text-[10px] bg-muted rounded-lg p-2 overflow-x-auto">{JSON.stringify(log.old_data, null, 2)}</pre>
            )}
            {log.action === "UPDATE" && diffs.length > 0 && (
              <div className="space-y-1.5">
                {diffs.map((d) => (
                  <div key={d.field} className="text-[11px]">
                    <span className="font-bold text-foreground">{d.field}: </span>
                    <span className="text-destructive line-through">{String(d.from ?? "—")}</span>
                    {" → "}
                    <span className="text-emerald-600 font-bold">{String(d.to ?? "—")}</span>
                  </div>
                ))}
              </div>
            )}

            {log.status === "pending" ? (
              <button
                onClick={() => setConfirming(log.id)}
                className="mt-2 flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-bold"
              >
                <Lock className="w-3.5 h-3.5" /> Confirmar alteração
              </button>
            ) : (
              <p className="text-[11px] text-emerald-600 flex items-center gap-1 mt-2">
                <CheckCircle2 className="w-3.5 h-3.5" /> Confirmado em {new Date(log.reviewed_at).toLocaleString("pt-PT")}
              </p>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-sm font-black text-foreground mb-1">Alterações de Marketing</h2>
        <p className="text-xs text-muted-foreground">
          Tudo o que o Gestor de Marketing altera (banners, publicidade, cupões, leilões) fica aqui — já está ativo na app,
          isto é só para confirmares que viste.
        </p>
      </div>

      {isLoading && <p className="text-xs text-muted-foreground">A carregar...</p>}

      {!isLoading && pending.length === 0 && confirmed.length === 0 && (
        <p className="text-xs text-muted-foreground">Ainda não há nenhuma alteração registada.</p>
      )}

      {pending.length > 0 && (
        <div className="space-y-2">
          <p className="text-[11px] font-black text-amber-600 uppercase tracking-wide flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" /> Por confirmar ({pending.length})
          </p>
          {pending.map(renderLog)}
        </div>
      )}

      {confirmed.length > 0 && (
        <div className="space-y-2">
          <p className="text-[11px] font-black text-muted-foreground uppercase tracking-wide">Já confirmadas</p>
          {confirmed.slice(0, 20).map(renderLog)}
        </div>
      )}

      {confirming && (
        <ConfirmPasswordModal
          actionLabel="confirmar esta alteração de marketing"
          onConfirm={() => confirmChange.mutate(confirming)}
          onClose={() => setConfirming(null)}
        />
      )}
    </div>
  );
}
