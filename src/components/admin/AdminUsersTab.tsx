import { useState } from "react";
import { Users, Search, Store, Mail, Phone, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

const AdminUsersTab = () => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");

  const { data: users = [], isLoading } = useQuery({
    queryKey: ["admin_all_users", search],
    queryFn: async () => {
      let q = supabase.from("profiles").select("id, full_name, phone, avatar_url, province, city, created_at").order("created_at", { ascending: false }).limit(50);
      if (search) {
        q = q.or(`full_name.ilike.%${search}%,phone.ilike.%${search}%,id.ilike.%${search}%,province.ilike.%${search}%,city.ilike.%${search}%`);
      }
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });

  // Check which users are already sellers
  const { data: sellerUserIds = [] } = useQuery({
    queryKey: ["admin_seller_user_ids"],
    queryFn: async () => {
      const { data, error } = await supabase.from("sellers").select("user_id");
      if (error) throw error;
      return (data || []).map((s: any) => s.user_id);
    },
  });

  const makeSeller = useMutation({
    mutationFn: async ({ userId, name }: { userId: string; name: string }) => {
      const slug = name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
      const { error } = await supabase.from("sellers").insert({
        user_id: userId,
        name,
        slug,
        type: "individual" as any,
        is_active: true,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin_seller_user_ids"] });
      queryClient.invalidateQueries({ queryKey: ["admin_sellers"] });
      toast.success("Utilizador agora é vendedor!");
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div>
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Pesquisar por nome ou telefone..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-card border border-border text-sm text-foreground"
        />
      </div>

      {isLoading && (
        <div className="flex justify-center py-8">
          <div className="w-6 h-6 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      <div className="space-y-2">
        {users.map((u: any) => {
          const isSeller = sellerUserIds.includes(u.id);
          return (
            <div key={u.id} className="bg-card rounded-xl border border-border p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Users className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-foreground">{u.full_name || "Sem nome"}</p>
                    <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                      {u.phone && <span className="flex items-center gap-0.5"><Phone className="w-3 h-3" />{u.phone}</span>}
                      {u.province && <span>• {u.province}</span>}
                    </div>
                    <p className="text-[9px] text-muted-foreground/60 font-mono">{u.id.slice(0, 16)}...</p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {isSeller ? (
                    <span className="flex items-center gap-1 text-[10px] font-bold text-green-500 bg-green-500/10 px-2 py-1 rounded-lg">
                      <Store className="w-3 h-3" /> Vendedor
                    </span>
                  ) : (
                    <button
                      onClick={() => makeSeller.mutate({ userId: u.id, name: u.full_name || `Vendedor ${u.id.slice(0, 6)}` })}
                      className="flex items-center gap-1 text-[10px] font-bold text-primary bg-primary/10 px-2 py-1.5 rounded-lg hover:bg-primary/20 transition"
                    >
                      <Store className="w-3 h-3" /> Tornar vendedor
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        {!isLoading && users.length === 0 && (
          <p className="text-center py-6 text-sm text-muted-foreground">Nenhum utilizador encontrado.</p>
        )}
      </div>
    </div>
  );
};

export default AdminUsersTab;
