import { useState } from "react";
import { Users, Search, Store, Phone, Crown, Shield } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

const AdminUsersTab = () => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");

  const { data: users = [], isLoading } = useQuery({
    queryKey: ["admin_all_users"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("id, full_name, phone, avatar_url, province, city, created_at").order("created_at", { ascending: false }).limit(200);
      if (error) throw error;
      return data;
    },
  });

  const filteredUsers = search
    ? users.filter((u: any) => {
        const s = search.toLowerCase();
        return (u.full_name?.toLowerCase().includes(s)) || (u.phone?.toLowerCase().includes(s)) || (u.id?.toLowerCase().includes(s)) || (u.province?.toLowerCase().includes(s)) || (u.city?.toLowerCase().includes(s));
      })
    : users;

  // Check which users are already sellers
  const { data: sellerUserIds = [] } = useQuery({
    queryKey: ["admin_seller_user_ids"],
    queryFn: async () => {
      const { data, error } = await supabase.from("sellers").select("user_id");
      if (error) throw error;
      return (data || []).map((s: any) => s.user_id);
    },
  });

  // Check existing roles per user
  const { data: userRolesMap = {} } = useQuery({
    queryKey: ["admin_user_roles_map"],
    queryFn: async () => {
      const { data, error } = await supabase.from("user_roles").select("user_id, role");
      if (error) throw error;
      const map: Record<string, string[]> = {};
      (data || []).forEach((r: any) => {
        if (!map[r.user_id]) map[r.user_id] = [];
        map[r.user_id].push(r.role);
      });
      return map;
    },
  });

  const makeSeller = useMutation({
    mutationFn: async ({ userId, name }: { userId: string; name: string }) => {
      const slug = name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
      const { error } = await supabase.from("sellers").insert({
        user_id: userId, name, slug, type: "individual" as any, is_active: true,
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

  const promoteRole = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      const { error } = await supabase.from("user_roles").insert({ user_id: userId, role: role as any });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin_user_roles_map"] });
      queryClient.invalidateQueries({ queryKey: ["admin_all_roles"] });
      toast.success("Cargo atribuído!");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const removeRole = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      const { error } = await supabase.from("user_roles").delete().eq("user_id", userId).eq("role", role as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin_user_roles_map"] });
      queryClient.invalidateQueries({ queryKey: ["admin_all_roles"] });
      toast.success("Cargo removido!");
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div>
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Pesquisar por nome, telefone, ID..."
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

      <p className="text-xs text-muted-foreground mb-2">{filteredUsers.length} utilizador(es)</p>
      <div className="space-y-2">
        {filteredUsers.map((u: any) => {
          const isSeller = sellerUserIds.includes(u.id);
          const roles = (userRolesMap as Record<string, string[]>)[u.id] || [];
          const isAdmin = roles.includes("admin");
          const isMod = roles.includes("moderator");

          return (
            <div key={u.id} className="bg-card rounded-xl border border-border p-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  {u.avatar_url ? (
                    <img src={u.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
                  ) : (
                    <Users className="w-5 h-5 text-primary" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-foreground truncate">{u.full_name || "Sem nome"}</p>
                  <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                    {u.phone && <span className="flex items-center gap-0.5"><Phone className="w-3 h-3" />{u.phone}</span>}
                    {u.province && <span>• {u.province}</span>}
                  </div>
                  {/* Role badges */}
                  <div className="flex flex-wrap gap-1 mt-1">
                    {isAdmin && <span className="text-[9px] font-bold text-red-500 bg-red-500/10 px-1.5 py-0.5 rounded">Admin</span>}
                    {isMod && <span className="text-[9px] font-bold text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded">Moderador</span>}
                    {isSeller && <span className="text-[9px] font-bold text-green-500 bg-green-500/10 px-1.5 py-0.5 rounded">Vendedor</span>}
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-wrap gap-1.5 mt-2 pt-2 border-t border-border">
                {/* Admin toggle */}
                {isAdmin ? (
                  <button onClick={() => removeRole.mutate({ userId: u.id, role: "admin" })} className="flex items-center gap-1 text-[10px] font-bold text-red-500 bg-red-500/10 px-2 py-1 rounded-lg hover:bg-red-500/20 transition">
                    <Crown className="w-3 h-3" /> Remover Admin
                  </button>
                ) : (
                  <button onClick={() => promoteRole.mutate({ userId: u.id, role: "admin" })} className="flex items-center gap-1 text-[10px] font-bold text-red-400 bg-red-400/10 px-2 py-1 rounded-lg hover:bg-red-400/20 transition">
                    <Crown className="w-3 h-3" /> Admin
                  </button>
                )}

                {/* Moderator toggle */}
                {isMod ? (
                  <button onClick={() => removeRole.mutate({ userId: u.id, role: "moderator" })} className="flex items-center gap-1 text-[10px] font-bold text-amber-500 bg-amber-500/10 px-2 py-1 rounded-lg hover:bg-amber-500/20 transition">
                    <Shield className="w-3 h-3" /> Remover Mod
                  </button>
                ) : (
                  <button onClick={() => promoteRole.mutate({ userId: u.id, role: "moderator" })} className="flex items-center gap-1 text-[10px] font-bold text-amber-400 bg-amber-400/10 px-2 py-1 rounded-lg hover:bg-amber-400/20 transition">
                    <Shield className="w-3 h-3" /> Moderador
                  </button>
                )}

                {/* Seller toggle */}
                {!isSeller && (
                  <button onClick={() => makeSeller.mutate({ userId: u.id, name: u.full_name || `Vendedor ${u.id.slice(0, 6)}` })} className="flex items-center gap-1 text-[10px] font-bold text-primary bg-primary/10 px-2 py-1 rounded-lg hover:bg-primary/20 transition">
                    <Store className="w-3 h-3" /> Vendedor
                  </button>
                )}
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
