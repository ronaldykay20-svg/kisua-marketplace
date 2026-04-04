import { useState } from "react";
import { X, Search, UserPlus, Trash2, Crown, Shield, Edit3, Eye } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

const roleInfo: Record<string, { label: string; icon: any; color: string }> = {
  owner: { label: "Dono", icon: Crown, color: "text-amber-500" },
  manager: { label: "Gestor", icon: Shield, color: "text-blue-500" },
  editor: { label: "Editor", icon: Edit3, color: "text-green-500" },
  viewer: { label: "Visualizador", icon: Eye, color: "text-muted-foreground" },
};

interface Props {
  companyId: string;
  companyName: string;
  onClose: () => void;
}

const AdminCompanyMembersModal = ({ companyId, companyName, onClose }: Props) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [selectedRole, setSelectedRole] = useState<string>("editor");
  const [filterRole, setFilterRole] = useState<string>("all");

  const { data: members = [], isLoading } = useQuery({
    queryKey: ["company_members", companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("company_members")
        .select("*")
        .eq("company_id", companyId)
        .order("created_at");
      if (error) throw error;
      if (!data || data.length === 0) return [];
      const userIds = [...new Set(data.map((m: any) => m.user_id))];
      const { data: profiles } = await supabase.from("profiles").select("id, full_name, phone, avatar_url").in("id", userIds);
      const pMap = Object.fromEntries((profiles || []).map((p: any) => [p.id, p]));
      return data.map((m: any) => ({ ...m, profiles: pMap[m.user_id] || null }));
    },
  });

  const { data: searchResults = [] } = useQuery({
    queryKey: ["search_users_for_company", search],
    queryFn: async () => {
      if (!search || search.length < 2) return [];
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, phone")
        .or(`full_name.ilike.%${search}%,phone.ilike.%${search}%`)
        .limit(10);
      if (error) throw error;
      return data;
    },
    enabled: search.length >= 2,
  });

  const memberUserIds = members.map((m: any) => m.user_id);
  const maxMembers = 11; // 10 members + 1 owner
  const addMember = useMutation({
    mutationFn: async (userId: string) => {
      if (members.length >= maxMembers) {
        throw new Error(`Limite de ${maxMembers} membros atingido (10 membros + dono)`);
      }
      const { error } = await supabase.from("company_members").insert({
        company_id: companyId,
        user_id: userId,
        role: selectedRole as any,
        added_by: user!.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["company_members", companyId] });
      toast.success("Membro adicionado");
      setSearch("");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const removeMember = useMutation({
    mutationFn: async (memberId: string) => {
      const { error } = await supabase.from("company_members").delete().eq("id", memberId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["company_members", companyId] });
      toast.success("Membro removido");
    },
  });

  const updateRole = useMutation({
    mutationFn: async ({ memberId, role }: { memberId: string; role: string }) => {
      const { error } = await supabase.from("company_members").update({ role: role as any }).eq("id", memberId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["company_members", companyId] });
      toast.success("Cargo atualizado");
    },
  });

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-card w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl border border-border max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div>
            <h2 className="text-sm font-bold text-foreground">Membros</h2>
            <p className="text-[10px] text-muted-foreground">{companyName}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-accent"><X className="w-4 h-4" /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Add member */}
          <div className="space-y-2">
            <p className="text-xs font-bold text-foreground flex items-center gap-1"><UserPlus className="w-3.5 h-3.5" /> Adicionar membro</p>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <input
                placeholder="Pesquisar por nome ou telefone..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-2 rounded-lg bg-muted border border-border text-xs text-foreground"
              />
            </div>

            {/* Role selector */}
            <div className="flex gap-1">
              {(["owner", "manager", "editor", "viewer"] as const).map(r => {
                const info = roleInfo[r];
                return (
                  <button
                    key={r}
                    onClick={() => setSelectedRole(r)}
                    className={`flex-1 py-1.5 text-[10px] font-bold rounded-lg border transition ${selectedRole === r ? "bg-primary/10 border-primary text-primary" : "border-border text-muted-foreground"}`}
                  >
                    {info.label}
                  </button>
                );
              })}
            </div>

            {/* Search results */}
            {search.length >= 2 && searchResults.length > 0 && (
              <div className="bg-muted rounded-lg border border-border max-h-32 overflow-y-auto">
                {searchResults.filter((u: any) => !memberUserIds.includes(u.id)).map((u: any) => (
                  <button
                    key={u.id}
                    onClick={() => addMember.mutate(u.id)}
                    className="w-full flex items-center justify-between px-3 py-2 text-xs hover:bg-accent transition"
                  >
                    <span className="text-foreground">{u.full_name || u.id.slice(0, 8)}</span>
                    <UserPlus className="w-3.5 h-3.5 text-primary" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Current members */}
          <div>
            <p className="text-xs font-bold text-foreground mb-2">Membros atuais ({members.length})</p>
            {/* Filter by role */}
            <div className="flex gap-1 mb-2">
              {[{ key: "all", label: "Todos" }, { key: "owner", label: "Dono" }, { key: "manager", label: "Gestor" }, { key: "editor", label: "Editor" }, { key: "viewer", label: "Visualizador" }].map(f => (
                <button key={f.key} onClick={() => setFilterRole(f.key)}
                  className={`flex-1 py-1 text-[10px] font-bold rounded-lg border transition ${filterRole === f.key ? "bg-primary/10 border-primary text-primary" : "border-border text-muted-foreground"}`}>
                  {f.label}
                </button>
              ))}
            </div>
            {isLoading ? (
              <div className="flex justify-center py-4">
                <div className="w-5 h-5 border-3 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <div className="space-y-1">
                {members.filter((m: any) => filterRole === "all" || m.role === filterRole).map((m: any) => {
                  const info = roleInfo[m.role] || roleInfo.viewer;
                  const Icon = info.icon;
                  return (
                    <div key={m.id} className="flex items-center justify-between bg-muted rounded-lg px-3 py-2">
                      <div className="flex items-center gap-2">
                        <Icon className={`w-3.5 h-3.5 ${info.color}`} />
                        <div>
                          <p className="text-xs font-medium text-foreground">{(m.profiles as any)?.full_name || m.user_id.slice(0, 8)}</p>
                          <p className="text-[9px] text-muted-foreground">{info.label}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <select
                          value={m.role}
                          onChange={e => updateRole.mutate({ memberId: m.id, role: e.target.value })}
                          className="text-[10px] bg-transparent border border-border rounded px-1 py-0.5 text-foreground"
                        >
                          <option value="owner">Dono</option>
                          <option value="manager">Gestor</option>
                          <option value="editor">Editor</option>
                          <option value="viewer">Visualizador</option>
                        </select>
                        <button onClick={() => removeMember.mutate(m.id)} className="p-1 rounded hover:bg-destructive/10 text-destructive"><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                    </div>
                  );
                })}
                {members.filter((m: any) => filterRole === "all" || m.role === filterRole).length === 0 && <p className="text-center py-4 text-xs text-muted-foreground">Nenhum membro{filterRole !== "all" ? ` com cargo "${roleInfo[filterRole]?.label || filterRole}"` : ""}.</p>}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminCompanyMembersModal;
