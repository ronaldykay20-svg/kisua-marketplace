import { useState } from "react";
import { Shield, Users, UserCheck, Search, ChevronDown, Plus, Trash2, Crown, Eye } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Navbar from "@/components/Navbar";
import BottomNav from "@/components/BottomNav";
import { toast } from "sonner";

const roleBadge: Record<string, { label: string; color: string; icon: any }> = {
  admin: { label: "Admin", color: "bg-red-500/10 text-red-500 border-red-500/20", icon: Crown },
  moderator: { label: "Moderador", color: "bg-amber-500/10 text-amber-500 border-amber-500/20", icon: Shield },
  user: { label: "Utilizador", color: "bg-primary/10 text-primary border-primary/20", icon: Users },
};

const AdminPanel = () => {
  const { user } = useAuth();
  const { isAdmin } = useUserRole();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  const { data: allRoles = [], isLoading } = useQuery({
    queryKey: ["admin_all_roles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_roles")
        .select("*, profiles(full_name)")
        .order("role");
      if (error) throw error;
      return data;
    },
    enabled: isAdmin,
  });

  const { data: profiles = [] } = useQuery({
    queryKey: ["admin_profiles", searchTerm],
    queryFn: async () => {
      let query = supabase.from("profiles").select("id, full_name").limit(20);
      if (searchTerm) query = query.ilike("full_name", `%${searchTerm}%`);
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: isAdmin,
  });

  const addRole = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      const { error } = await supabase
        .from("user_roles")
        .insert({ user_id: userId, role: role as any });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin_all_roles"] });
      toast.success("Cargo atribuído com sucesso");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const removeRole = useMutation({
    mutationFn: async (roleId: string) => {
      const { error } = await supabase.from("user_roles").delete().eq("id", roleId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin_all_roles"] });
      toast.success("Cargo removido");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const grouped = allRoles.reduce((acc: any, r: any) => {
    acc[r.role] = acc[r.role] || [];
    acc[r.role].push(r);
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-background pb-14 md:pb-0">
      <Navbar />
      <div className="container mx-auto px-3 py-4 max-w-2xl">
        <div className="flex items-center gap-2 mb-4">
          <Shield className="w-6 h-6 text-primary" />
          <h1 className="text-lg font-bold text-foreground">Painel de Administração</h1>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          {(["admin", "moderator", "user"] as const).map(role => {
            const info = roleBadge[role];
            const count = grouped[role]?.length || 0;
            return (
              <div key={role} className={`rounded-xl border p-3 text-center ${info.color}`}>
                <info.icon className="w-5 h-5 mx-auto mb-1" />
                <p className="text-lg font-bold">{count}</p>
                <p className="text-[10px]">{info.label}s</p>
              </div>
            );
          })}
        </div>

        {/* Add role */}
        <div className="bg-card rounded-xl border border-border p-4 mb-4">
          <h2 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
            <Plus className="w-4 h-4" /> Atribuir Cargo
          </h2>
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Procurar utilizador..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-lg bg-muted border border-border text-sm text-foreground"
            />
          </div>
          {searchTerm && profiles.length > 0 && (
            <div className="bg-muted rounded-lg border border-border mb-3 max-h-32 overflow-y-auto">
              {profiles.map((p: any) => (
                <button
                  key={p.id}
                  onClick={() => { setSelectedUserId(p.id); setSearchTerm(p.full_name || p.id.slice(0, 8)); }}
                  className={`w-full text-left px-3 py-2 text-sm hover:bg-accent transition ${selectedUserId === p.id ? "bg-accent" : ""}`}
                >
                  {p.full_name || p.id.slice(0, 8)}
                </button>
              ))}
            </div>
          )}
          {selectedUserId && (
            <div className="flex gap-2">
              {(["admin", "moderator", "user"] as const).map(role => (
                <button
                  key={role}
                  onClick={() => addRole.mutate({ userId: selectedUserId, role })}
                  className={`flex-1 py-2 rounded-lg text-xs font-bold border ${roleBadge[role].color}`}
                >
                  {roleBadge[role].label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Roles list */}
        {(["admin", "moderator", "user"] as const).map(role => {
          const items = grouped[role] || [];
          if (!items.length) return null;
          const info = roleBadge[role];
          return (
            <div key={role} className="mb-4">
              <h3 className={`text-sm font-bold mb-2 flex items-center gap-2 ${info.color.split(" ")[1]}`}>
                <info.icon className="w-4 h-4" /> {info.label}s ({items.length})
              </h3>
              <div className="bg-card rounded-xl border border-border divide-y divide-border">
                {items.map((r: any) => (
                  <div key={r.id} className="flex items-center justify-between px-4 py-3">
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {r.profiles?.full_name || r.user_id.slice(0, 8)}
                      </p>
                      <p className="text-[10px] text-muted-foreground">{r.user_id.slice(0, 12)}...</p>
                    </div>
                    {r.user_id !== user?.id && (
                      <button
                        onClick={() => removeRole.mutate(r.id)}
                        className="p-2 rounded-lg hover:bg-destructive/10 text-destructive transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })}

        {isLoading && (
          <div className="flex justify-center py-8">
            <div className="w-6 h-6 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </div>
      <BottomNav />
    </div>
  );
};

export default AdminPanel;
