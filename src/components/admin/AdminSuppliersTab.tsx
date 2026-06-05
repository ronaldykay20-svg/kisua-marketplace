import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Building2, Store, CheckCircle, XCircle, Clock,
  Ban, Search, Phone, Mail, MapPin, FileText,
} from "lucide-react";

type SubTab = "visao" | "fornecedores" | "dropshippers";

const attachUserProfiles = async (rows: any[]) => {
  const userIds = [...new Set(rows.map((row) => row.user_id).filter(Boolean))];
  if (userIds.length === 0) return rows;

  const { data: profiles } = await (supabase as any)
    .from("profiles")
    .select("id, full_name")
    .in("id", userIds);

  const profileByUser = (profiles || []).reduce((acc: Record<string, any>, profile: any) => {
    acc[profile.id] = profile;
    return acc;
  }, {});

  return rows.map((row) => ({
    ...row,
    profile: profileByUser[row.user_id] || null,
    profiles: profileByUser[row.user_id] || null,
  }));
};

export default function AdminSuppliersTab() {
  const queryClient = useQueryClient();
  const [subTab, setSubTab] = useState<SubTab>("visao");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const { data: suppliers = [], isLoading } = useQuery({
    queryKey: ["admin_suppliers"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("suppliers")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return attachUserProfiles(data || []);
    },
  });

  const { data: dropshippers = [] } = useQuery({
    queryKey: ["admin_dropship_stores"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("dropship_stores")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      const stores = await attachUserProfiles(data || []);
      const userIds = stores.map((d: any) => d.user_id).filter(Boolean);
      let sellerByUser: Record<string, any> = {};
      if (userIds.length) {
        const { data: sellersData } = await (supabase as any)
          .from("sellers")
          .select("id, user_id, name, logo_url, cover_url, is_active, is_verified, rating, total_reviews")
          .in("user_id", userIds);
        (sellersData || []).forEach((s: any) => { sellerByUser[s.user_id] = s; });
      }
      return stores.map((d: any) => ({ ...d, seller: sellerByUser[d.user_id] || null }));
    },
  });

  const approveSupplier = useMutation({
    mutationFn: async (id: string) => {
      const { data: supplier, error: fetchError } = await (supabase as any)
        .from("suppliers")
        .select("*")
        .eq("id", id)
        .single();
      if (fetchError) throw fetchError;

      const { error } = await (supabase as any)
        .from("suppliers")
        .update({ status: "approved", is_verified: true })
        .eq("id", id);
      if (error) throw error;

      const slug = `${supplier.company_name || "fornecedor"}`
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "")
        .slice(0, 60) + "-" + supplier.user_id.slice(0, 6);

      const { data: existingSeller } = await (supabase as any)
        .from("sellers")
        .select("id")
        .eq("user_id", supplier.user_id)
        .maybeSingle();

      const sellerPayload = {
        name: supplier.company_name,
        slug,
        type: "company",
        description: supplier.description || null,
        phone: supplier.phone || null,
        email: supplier.email || null,
        province: supplier.province || null,
        address: supplier.address || null,
        is_active: true,
        is_verified: true,
      };

      const sellerResult = existingSeller
        ? await (supabase as any).from("sellers").update(sellerPayload).eq("id", existingSeller.id)
        : await (supabase as any).from("sellers").insert({ ...sellerPayload, user_id: supplier.user_id });
      if (sellerResult.error) throw sellerResult.error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin_suppliers"] });
      toast.success("Fornecedor aprovado!");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const rejectSupplier = useMutation({
    mutationFn: async (id: string) => {
      const { data: supplier } = await (supabase as any).from("suppliers").select("user_id").eq("id", id).single();
      const { error } = await (supabase as any)
        .from("suppliers")
        .update({ status: "rejected" })
        .eq("id", id);
      if (error) throw error;
      if (supplier?.user_id) await (supabase as any).from("sellers").update({ is_active: false, is_verified: false }).eq("user_id", supplier.user_id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin_suppliers"] });
      toast.success("Fornecedor rejeitado");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const suspendSupplier = useMutation({
    mutationFn: async (id: string) => {
      const { data: supplier } = await (supabase as any).from("suppliers").select("user_id").eq("id", id).single();
      const { error } = await (supabase as any)
        .from("suppliers")
        .update({ status: "suspended" })
        .eq("id", id);
      if (error) throw error;
      if (supplier?.user_id) await (supabase as any).from("sellers").update({ is_active: false }).eq("user_id", supplier.user_id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin_suppliers"] });
      toast.success("Fornecedor suspenso");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const approveDropshipper = useMutation({
    mutationFn: async (store: any) => {
      const { error } = await (supabase as any).from("dropship_stores").update({ status: "active" }).eq("id", store.id);
      if (error) throw error;

      const slug = `${store.store_slug || store.store_name || "afiliado"}`
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "")
        .slice(0, 60) + "-" + store.user_id.slice(0, 6);
      const { data: existingSeller } = await (supabase as any).from("sellers").select("id").eq("user_id", store.user_id).maybeSingle();
      const payload = { name: store.store_name, slug, type: "individual", description: store.description || null, phone: store.phone || null, province: store.province || null, is_active: true };
      const sellerResult = existingSeller
        ? await (supabase as any).from("sellers").update(payload).eq("id", existingSeller.id)
        : await (supabase as any).from("sellers").insert({ ...payload, user_id: store.user_id });
      if (sellerResult.error) throw sellerResult.error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["admin_dropship_stores"] }); toast.success("Afiliado aprovado!"); },
    onError: (e: any) => toast.error(e.message),
  });

  const suspendDropshipper = useMutation({
    mutationFn: async (store: any) => {
      const { error } = await (supabase as any).from("dropship_stores").update({ status: "suspended" }).eq("id", store.id);
      if (error) throw error;
      await (supabase as any).from("sellers").update({ is_active: false }).eq("user_id", store.user_id);
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["admin_dropship_stores"] }); toast.success("Afiliado suspenso"); },
    onError: (e: any) => toast.error(e.message),
  });

  const formatKz = (v: number) => `${(v || 0).toLocaleString("pt-AO")} Kz`;

  const statusConfig: Record<string, { color: string; label: string }> = {
    pending:   { color: "bg-amber-500/10 text-amber-500",     label: "Pendente"  },
    approved:  { color: "bg-green-500/10 text-green-500",     label: "Aprovado"  },
    rejected:  { color: "bg-destructive/10 text-destructive", label: "Rejeitado" },
    suspended: { color: "bg-muted text-muted-foreground",     label: "Suspenso"  },
  };

  const stats = {
    total:    suppliers.length,
    pending:  suppliers.filter((s: any) => s.status === "pending").length,
    approved: suppliers.filter((s: any) => s.status === "approved").length,
    drops:    dropshippers.length,
  };

  const filtered = suppliers.filter((s: any) => {
    const matchSearch =
      !search ||
      s.company_name?.toLowerCase().includes(search.toLowerCase()) ||
      s.contact_name?.toLowerCase().includes(search.toLowerCase()) ||
      s.email?.toLowerCase().includes(search.toLowerCase()) ||
      // ✅ FIX 2: pesquisa também pelo nome do perfil do utilizador
      s.profile?.full_name?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = !statusFilter || s.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const subTabs: { key: SubTab; label: string }[] = [
    { key: "visao",        label: "Visão Geral" },
    { key: "fornecedores", label: `Fornecedores${stats.pending > 0 ? ` (${stats.pending})` : ""}` },
    { key: "dropshippers", label: "Afiliados" },
  ];

  return (
    <div className="space-y-4">

      {/* Sub-tabs */}
      <div className="flex gap-1 overflow-x-auto no-scrollbar">
        {subTabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setSubTab(t.key)}
            className={`px-3 py-2 text-xs font-bold rounded-lg border whitespace-nowrap flex-shrink-0 ${
              subTab === t.key
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-card text-foreground border-border"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── VISÃO GERAL ── */}
      {subTab === "visao" && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: "Fornecedores", value: stats.total,    icon: Building2,   color: "text-primary"     },
              { label: "Pendentes",    value: stats.pending,  icon: Clock,       color: "text-amber-500"   },
              { label: "Aprovados",    value: stats.approved, icon: CheckCircle, color: "text-green-500"   },
              { label: "Afiliados",    value: stats.drops,    icon: Store,       color: "text-blue-500"    },
            ].map((s) => (
              <div key={s.label} className="bg-card border border-border rounded-xl p-3">
                <s.icon className={`w-5 h-5 ${s.color} mb-1`} />
                <p className="text-lg font-bold text-foreground">{s.value}</p>
                <p className="text-[10px] text-muted-foreground">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Pendentes de aprovação */}
          {stats.pending > 0 && (
            <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-4">
              <p className="text-sm font-bold text-amber-500 mb-3 flex items-center gap-2">
                <Clock className="w-4 h-4" />
                {stats.pending} fornecedor(es) aguardam aprovação
              </p>
              <div className="space-y-2">
                {suppliers
                  .filter((s: any) => s.status === "pending")
                  .slice(0, 3)
                  .map((s: any) => (
                    <div key={s.id} className="flex items-center justify-between bg-card rounded-xl p-3 border border-border">
                      <div className="min-w-0 flex-1 pr-2">
                        <p className="text-sm font-bold text-foreground truncate">{s.company_name}</p>
                        {/* ✅ FIX 3: mostra contact_name E o nome do perfil do utilizador */}
                        <p className="text-[10px] text-muted-foreground truncate">
                          {s.contact_name}
                          {s.profile?.full_name && s.profile.full_name !== s.contact_name && (
                            <span className="opacity-60"> · conta: {s.profile.full_name}</span>
                          )}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          {s.province} · {new Date(s.created_at).toLocaleDateString("pt-AO")}
                        </p>
                      </div>
                      <div className="flex gap-2 flex-shrink-0">
                        <button
                          onClick={() => rejectSupplier.mutate(s.id)}
                          className="p-1.5 bg-destructive/10 text-destructive rounded-lg"
                        >
                          <XCircle className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => approveSupplier.mutate(s.id)}
                          className="p-1.5 bg-green-500/10 text-green-500 rounded-lg"
                        >
                          <CheckCircle className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
              {stats.pending > 3 && (
                <button
                  onClick={() => setSubTab("fornecedores")}
                  className="text-xs text-primary font-bold mt-2"
                >
                  Ver todos →
                </button>
              )}
            </div>
          )}

          {/* Top fornecedores */}
          <div className="bg-card border border-border rounded-xl p-4">
            <h3 className="font-bold text-foreground text-sm mb-3">Top Fornecedores</h3>
            <div className="space-y-2">
              {suppliers
                .filter((s: any) => s.status === "approved")
                .sort((a: any, b: any) => (b.total_revenue || 0) - (a.total_revenue || 0))
                .slice(0, 5)
                .map((s: any, i: number) => (
                  <div key={s.id} className="flex items-center gap-3 py-1.5 border-b border-border last:border-0">
                    <div className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center text-xs font-bold text-primary flex-shrink-0">
                      {i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{s.company_name}</p>
                      <p className="text-[10px] text-muted-foreground">{s.total_products || 0} produtos</p>
                    </div>
                    <p className="text-sm font-bold text-green-500">{formatKz(s.total_revenue || 0)}</p>
                  </div>
                ))}
              {suppliers.filter((s: any) => s.status === "approved").length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-3">Nenhum fornecedor aprovado ainda.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── FORNECEDORES ── */}
      {subTab === "fornecedores" && (
        <div className="space-y-3">
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Pesquisar fornecedores..."
                className="w-full pl-8 pr-3 py-2 bg-muted border border-border rounded-xl text-sm text-foreground focus:outline-none"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-card border border-border rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none"
            >
              <option value="">Todos</option>
              <option value="pending">Pendentes</option>
              <option value="approved">Aprovados</option>
              <option value="rejected">Rejeitados</option>
              <option value="suspended">Suspensos</option>
            </select>
          </div>

          {isLoading && (
            <div className="flex justify-center py-8">
              <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          )}

          <div className="space-y-3">
            {filtered.map((s: any) => {
              const sc = statusConfig[s.status] || statusConfig.pending;
              return (
                <div key={s.id} className="bg-card border border-border rounded-xl p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0 pr-2">
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-sm text-foreground truncate">{s.company_name}</p>
                        {s.is_verified && (
                          <span className="text-[10px] bg-blue-500/10 text-blue-500 px-1.5 py-0.5 rounded-full flex-shrink-0">✓</span>
                        )}
                      </div>
                      {/* ✅ FIX 4: mostra quem submeteu (conta registada) */}
                      {s.profile?.full_name && (
                        <p className="text-[10px] text-primary/70 mt-0.5">
                          Conta: {s.profile.full_name}
                        </p>
                      )}
                    </div>
                    <span className={`text-[10px] px-2 py-1 rounded-full font-bold flex-shrink-0 ${sc.color}`}>
                      {sc.label}
                    </span>
                  </div>

                  {/* Detalhes de contacto */}
                  <div className="space-y-1 mb-3">
                    {s.contact_name && (
                      <p className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                        <FileText className="w-3 h-3 flex-shrink-0" />
                        {s.contact_name}
                        {s.company_nif && <span className="opacity-60">· NIF: {s.company_nif}</span>}
                      </p>
                    )}
                    {s.phone && (
                      <p className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                        <Phone className="w-3 h-3 flex-shrink-0" /> {s.phone}
                      </p>
                    )}
                    {s.email && (
                      <p className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                        <Mail className="w-3 h-3 flex-shrink-0" /> {s.email}
                      </p>
                    )}
                    {(s.province || s.address) && (
                      <p className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                        <MapPin className="w-3 h-3 flex-shrink-0" />
                        {[s.province, s.address].filter(Boolean).join(" · ")}
                      </p>
                    )}
                    {s.description && (
                      <p className="text-[11px] text-muted-foreground italic mt-1 leading-relaxed">
                        "{s.description}"
                      </p>
                    )}
                  </div>

                  {/* Métricas */}
                  <div className="flex gap-2 text-center bg-muted rounded-xl p-2 mb-3">
                    {[
                      { label: "Produtos", value: s.total_products || 0 },
                      { label: "Pedidos",  value: s.total_orders   || 0 },
                      { label: "Receita",  value: formatKz(s.total_revenue || 0) },
                    ].map((item) => (
                      <div key={item.label} className="flex-1">
                        <p className="text-sm font-bold text-foreground">{item.value}</p>
                        <p className="text-[10px] text-muted-foreground">{item.label}</p>
                      </div>
                    ))}
                  </div>

                  {/* Ações */}
                  <div className="flex gap-2">
                    {s.status === "pending" && (
                      <>
                        <button
                          onClick={() => rejectSupplier.mutate(s.id)}
                          className="flex-1 py-2 bg-destructive/10 text-destructive text-xs font-bold rounded-xl flex items-center justify-center gap-1"
                        >
                          <XCircle className="w-3.5 h-3.5" /> Rejeitar
                        </button>
                        <button
                          onClick={() => approveSupplier.mutate(s.id)}
                          className="flex-1 py-2 bg-green-500/10 text-green-500 text-xs font-bold rounded-xl flex items-center justify-center gap-1"
                        >
                          <CheckCircle className="w-3.5 h-3.5" /> Aprovar
                        </button>
                      </>
                    )}
                    {s.status === "approved" && (
                      <button
                        onClick={() => suspendSupplier.mutate(s.id)}
                        className="flex-1 py-2 bg-destructive/10 text-destructive text-xs font-bold rounded-xl flex items-center justify-center gap-1"
                      >
                        <Ban className="w-3.5 h-3.5" /> Suspender
                      </button>
                    )}
                    {(s.status === "suspended" || s.status === "rejected") && (
                      <button
                        onClick={() => approveSupplier.mutate(s.id)}
                        className="flex-1 py-2 bg-primary text-primary-foreground text-xs font-bold rounded-xl flex items-center justify-center gap-1"
                      >
                        <CheckCircle className="w-3.5 h-3.5" /> Reativar
                      </button>
                    )}
                  </div>

                  <p className="text-[10px] text-muted-foreground mt-2">
                    Registado em {new Date(s.created_at).toLocaleDateString("pt-AO")}
                  </p>
                </div>
              );
            })}

            {!isLoading && filtered.length === 0 && (
              <div className="text-center py-10 text-muted-foreground">
                <Building2 className="w-10 h-10 mx-auto mb-2 opacity-20" />
                <p className="text-sm">Nenhum fornecedor encontrado</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── DROPSHIPPERS ── */}
      {subTab === "dropshippers" && (
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Pesquisar afiliados..."
              className="w-full pl-8 pr-3 py-2 bg-muted border border-border rounded-xl text-sm text-foreground focus:outline-none"
            />
          </div>

          <p className="text-[11px] text-muted-foreground">
            Estes afiliados aparecem na página pública de <strong>Vendedores</strong> (não em Empresas) assim que forem aprovados.
          </p>

          {dropshippers
            .filter((d: any) =>
              !search ||
              d.store_name?.toLowerCase().includes(search.toLowerCase()) ||
              d.seller?.name?.toLowerCase().includes(search.toLowerCase()) ||
              d.profiles?.full_name?.toLowerCase().includes(search.toLowerCase())
            )
            .map((store: any) => (
              <div key={store.id} className="bg-card border border-border rounded-xl p-4">
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-12 h-12 rounded-full bg-muted overflow-hidden flex-shrink-0 border border-border">
                    {store.seller?.logo_url ? (
                      <img src={store.seller.logo_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <Store className="w-5 h-5 m-3.5 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm text-foreground truncate">
                      {store.seller?.name || store.store_name}
                    </p>
                    <p className="text-[10px] text-muted-foreground truncate">
                      {store.province}
                      {store.profiles?.full_name && (
                        <span className="opacity-60"> · conta: {store.profiles.full_name}</span>
                      )}
                    </p>
                    {store.seller && (
                      <p className="text-[10px] text-primary mt-0.5">
                        ↪ Visível em /vendedores como “{store.seller.name}”
                      </p>
                    )}
                  </div>
                  <span className={`text-[10px] px-2 py-1 rounded-full font-bold flex-shrink-0 ${
                    store.status === "active"
                      ? "bg-green-500/10 text-green-500"
                      : store.status === "pending"
                      ? "bg-amber-500/10 text-amber-500"
                      : "bg-muted text-muted-foreground"
                  }`}>
                    {store.status === "active" ? "Activo" : store.status === "pending" ? "Pendente" : "Suspenso"}
                  </span>
                </div>
                <div className="flex gap-2 text-center bg-muted rounded-xl p-2">
                  {[
                    { label: "Produtos", value: store.total_products || 0 },
                    { label: "Pedidos",  value: store.total_orders   || 0 },
                    { label: "Receita",  value: formatKz(store.total_revenue || 0) },
                  ].map((item) => (
                    <div key={item.label} className="flex-1">
                      <p className="text-sm font-bold text-foreground">{item.value}</p>
                      <p className="text-[10px] text-muted-foreground">{item.label}</p>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2 mt-3">
                  {store.status !== "active" && (
                    <button onClick={() => approveDropshipper.mutate(store)} className="flex-1 py-2 bg-green-500/10 text-green-500 text-xs font-bold rounded-xl flex items-center justify-center gap-1">
                      <CheckCircle className="w-3.5 h-3.5" /> Aprovar afiliado
                    </button>
                  )}
                  {store.status === "active" && (
                    <button onClick={() => suspendDropshipper.mutate(store)} className="flex-1 py-2 bg-destructive/10 text-destructive text-xs font-bold rounded-xl flex items-center justify-center gap-1">
                      <Ban className="w-3.5 h-3.5" /> Suspender
                    </button>
                  )}
                </div>
              </div>
            ))}

          {dropshippers.length === 0 && (
            <div className="text-center py-10 text-muted-foreground">
              <Store className="w-10 h-10 mx-auto mb-2 opacity-20" />
              <p className="text-sm">Ainda não há afiliados registados</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
