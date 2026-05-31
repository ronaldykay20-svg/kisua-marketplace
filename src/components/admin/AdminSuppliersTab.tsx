import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  CheckCircle,
  XCircle,
  Clock,
  Building2,
  Package,
  Store,
  Eye,
  Ban,
  Search,
  TrendingUp,
  Users,
  DollarSign,
  Filter,
} from "lucide-react";

type SubTab = "suppliers" | "dropshippers" | "overview";

interface Supplier {
  id: string;
  company_name: string;
  contact_name: string;
  email: string;
  phone: string;
  province: string;
  status: string;
  total_products: number;
  total_orders: number;
  total_revenue: number;
  created_at: string;
  is_verified: boolean;
}

export default function AdminSuppliersTab() {
  const [subTab, setSubTab] = useState<SubTab>("overview");
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [dropshippers, setDropshippers] = useState<any[]>([]);
  const [stats, setStats] = useState({
    total_suppliers: 0,
    pending_suppliers: 0,
    total_dropshippers: 0,
    total_revenue: 0,
  });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [suppliersRes, dropshippersRes] = await Promise.all([
        supabase.from("suppliers").select("*").order("created_at", { ascending: false }),
        supabase.from("dropship_stores").select("*").order("created_at", { ascending: false }),
      ]);

      const suppliersData = suppliersRes.data || [];
      const dropshippersData = dropshippersRes.data || [];

      setSuppliers(suppliersData);
      setDropshippers(dropshippersData);

      setStats({
        total_suppliers: suppliersData.length,
        pending_suppliers: suppliersData.filter(s => s.status === "pending").length,
        total_dropshippers: dropshippersData.length,
        total_revenue: suppliersData.reduce((sum, s) => sum + (s.total_revenue || 0), 0),
      });
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleApproveSupplier = async (id: string) => {
    const { error } = await supabase
      .from("suppliers")
      .update({ status: "approved", is_verified: true })
      .eq("id", id);

    if (!error) {
      toast.success("Fornecedor aprovado!");
      fetchData();
      setSelectedSupplier(null);
    }
  };

  const handleRejectSupplier = async (id: string) => {
    const reason = prompt("Motivo da rejeição (será enviado ao fornecedor):");
    if (!reason) return;

    const { error } = await supabase
      .from("suppliers")
      .update({ status: "rejected" })
      .eq("id", id);

    if (!error) {
      toast.success("Fornecedor rejeitado");
      fetchData();
      setSelectedSupplier(null);
    }
  };

  const handleSuspendSupplier = async (id: string) => {
    const { error } = await supabase
      .from("suppliers")
      .update({ status: "suspended" })
      .eq("id", id);

    if (!error) {
      toast.success("Fornecedor suspenso");
      fetchData();
    }
  };

  const formatKz = (v: number) => `${(v || 0).toLocaleString("pt-AO")} Kz`;

  const statusConfig: Record<string, { color: string; label: string; icon: any }> = {
    pending: { color: "bg-yellow-100 text-yellow-700", label: "Pendente", icon: Clock },
    approved: { color: "bg-green-100 text-green-700", label: "Aprovado", icon: CheckCircle },
    rejected: { color: "bg-red-100 text-red-700", label: "Rejeitado", icon: XCircle },
    suspended: { color: "bg-gray-100 text-gray-600", label: "Suspenso", icon: Ban },
  };

  const filteredSuppliers = suppliers.filter(s => {
    const matchSearch = !search ||
      s.company_name?.toLowerCase().includes(search.toLowerCase()) ||
      s.contact_name?.toLowerCase().includes(search.toLowerCase()) ||
      s.email?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = !statusFilter || s.status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <div className="space-y-4">
      {/* Sub tabs */}
      <div className="flex gap-2 border-b overflow-x-auto">
        {[
          { key: "overview", label: "Visão Geral", icon: TrendingUp },
          { key: "suppliers", label: `Fornecedores ${stats.pending_suppliers > 0 ? `(${stats.pending_suppliers} pendentes)` : ""}`, icon: Building2 },
          { key: "dropshippers", label: "Dropshippers", icon: Store },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setSubTab(t.key as SubTab)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
              subTab === t.key
                ? "border-amber-700 text-amber-700"
                : "border-transparent text-gray-500"
            }`}
          >
            <t.icon size={14} />
            {t.label}
          </button>
        ))}
      </div>

      {/* OVERVIEW */}
      {subTab === "overview" && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "Fornecedores", value: stats.total_suppliers, icon: Building2, color: "text-amber-700 bg-amber-50" },
              { label: "Pendentes", value: stats.pending_suppliers, icon: Clock, color: "text-yellow-700 bg-yellow-50" },
              { label: "Dropshippers", value: stats.total_dropshippers, icon: Store, color: "text-blue-700 bg-blue-50" },
              { label: "Receita Total", value: formatKz(stats.total_revenue), icon: DollarSign, color: "text-green-700 bg-green-50" },
            ].map((s) => (
              <div key={s.label} className="bg-white border rounded-2xl p-4">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${s.color} mb-2`}>
                  <s.icon size={18} />
                </div>
                <p className="font-bold text-gray-800 text-lg">{s.value}</p>
                <p className="text-xs text-gray-500">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Pedidos pendentes de aprovação */}
          {stats.pending_suppliers > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-4">
              <p className="font-semibold text-yellow-800 mb-3 flex items-center gap-2">
                <Clock size={16} />
                {stats.pending_suppliers} fornecedor(es) aguardam aprovação
              </p>
              <div className="space-y-2">
                {suppliers.filter(s => s.status === "pending").slice(0, 3).map(s => (
                  <div key={s.id} className="flex items-center justify-between bg-white rounded-xl p-3">
                    <div>
                      <p className="font-medium text-sm">{s.company_name}</p>
                      <p className="text-xs text-gray-500">{s.province} • {new Date(s.created_at).toLocaleDateString("pt-AO")}</p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleRejectSupplier(s.id)}
                        className="p-1.5 bg-red-50 text-red-500 rounded-lg hover:bg-red-100"
                      >
                        <XCircle size={16} />
                      </button>
                      <button
                        onClick={() => handleApproveSupplier(s.id)}
                        className="p-1.5 bg-green-50 text-green-600 rounded-lg hover:bg-green-100"
                      >
                        <CheckCircle size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              {stats.pending_suppliers > 3 && (
                <button
                  onClick={() => setSubTab("suppliers")}
                  className="text-xs text-amber-700 font-medium mt-2"
                >
                  Ver todos →
                </button>
              )}
            </div>
          )}

          {/* Top fornecedores */}
          <div className="bg-white border rounded-2xl p-4">
            <h3 className="font-bold text-gray-800 mb-3">Top Fornecedores</h3>
            <div className="space-y-2">
              {suppliers
                .filter(s => s.status === "approved")
                .sort((a, b) => (b.total_revenue || 0) - (a.total_revenue || 0))
                .slice(0, 5)
                .map((s, i) => (
                  <div key={s.id} className="flex items-center gap-3 py-2 border-b last:border-0">
                    <div className="w-7 h-7 bg-amber-100 rounded-full flex items-center justify-center text-xs font-bold text-amber-700">
                      {i + 1}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-800">{s.company_name}</p>
                      <p className="text-xs text-gray-500">{s.total_products || 0} produtos</p>
                    </div>
                    <p className="text-sm font-bold text-green-600">{formatKz(s.total_revenue || 0)}</p>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* SUPPLIERS */}
      {subTab === "suppliers" && (
        <div className="space-y-4">
          {/* Search e filtros */}
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Pesquisar fornecedores..."
                className="w-full pl-8 pr-4 py-2 bg-gray-100 rounded-xl text-sm focus:outline-none"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="border border-gray-200 rounded-xl px-3 py-2 text-sm"
            >
              <option value="">Todos</option>
              <option value="pending">Pendentes</option>
              <option value="approved">Aprovados</option>
              <option value="rejected">Rejeitados</option>
              <option value="suspended">Suspensos</option>
            </select>
          </div>

          <div className="space-y-3">
            {filteredSuppliers.map((supplier) => {
              const sc = statusConfig[supplier.status] || statusConfig.pending;
              const StatusIcon = sc.icon;

              return (
                <div key={supplier.id} className="bg-white border rounded-2xl p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-gray-800">{supplier.company_name}</p>
                        {supplier.is_verified && (
                          <span className="text-xs bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full">✓ Verificado</span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">{supplier.contact_name} • {supplier.province}</p>
                      <p className="text-xs text-gray-400">{supplier.email} • {supplier.phone}</p>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full font-medium flex items-center gap-1 ${sc.color}`}>
                      <StatusIcon size={10} />
                      {sc.label}
                    </span>
                  </div>

                  <div className="flex gap-4 text-xs text-gray-500 mb-3 bg-gray-50 rounded-xl p-2">
                    <div className="text-center flex-1">
                      <p className="font-bold text-gray-800">{supplier.total_products || 0}</p>
                      <p>Produtos</p>
                    </div>
                    <div className="text-center flex-1">
                      <p className="font-bold text-gray-800">{supplier.total_orders || 0}</p>
                      <p>Pedidos</p>
                    </div>
                    <div className="text-center flex-1">
                      <p className="font-bold text-green-600">{formatKz(supplier.total_revenue || 0)}</p>
                      <p>Receita</p>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    {supplier.status === "pending" && (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleRejectSupplier(supplier.id)}
                          className="flex-1 rounded-xl text-xs text-red-500 border-red-200 hover:bg-red-50"
                        >
                          <XCircle size={12} className="mr-1" />
                          Rejeitar
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleApproveSupplier(supplier.id)}
                          className="flex-1 bg-green-600 hover:bg-green-700 text-white rounded-xl text-xs"
                        >
                          <CheckCircle size={12} className="mr-1" />
                          Aprovar
                        </Button>
                      </>
                    )}

                    {supplier.status === "approved" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleSuspendSupplier(supplier.id)}
                        className="flex-1 rounded-xl text-xs text-red-500 border-red-200"
                      >
                        <Ban size={12} className="mr-1" />
                        Suspender
                      </Button>
                    )}

                    {supplier.status === "suspended" && (
                      <Button
                        size="sm"
                        onClick={() => handleApproveSupplier(supplier.id)}
                        className="flex-1 bg-amber-700 hover:bg-amber-800 text-white rounded-xl text-xs"
                      >
                        <CheckCircle size={12} className="mr-1" />
                        Reativar
                      </Button>
                    )}

                    <button className="p-2 border rounded-xl hover:bg-gray-50">
                      <Eye size={14} className="text-gray-500" />
                    </button>
                  </div>

                  <p className="text-xs text-gray-400 mt-2">
                    Registado em {new Date(supplier.created_at).toLocaleDateString("pt-AO")}
                  </p>
                </div>
              );
            })}

            {filteredSuppliers.length === 0 && (
              <div className="text-center py-12 text-gray-400">
                <Building2 size={40} className="mx-auto mb-3 opacity-20" />
                <p className="text-sm">Nenhum fornecedor encontrado</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* DROPSHIPPERS */}
      {subTab === "dropshippers" && (
        <div className="space-y-3">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Pesquisar dropshippers..."
              className="w-full pl-8 pr-4 py-2 bg-gray-100 rounded-xl text-sm focus:outline-none"
            />
          </div>

          {dropshippers
            .filter(d => !search || d.store_name?.toLowerCase().includes(search.toLowerCase()))
            .map((store) => (
              <div key={store.id} className="bg-white border rounded-2xl p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold text-gray-800">{store.store_name}</p>
                    <p className="text-xs text-gray-500">{store.province}</p>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                    store.status === "active" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"
                  }`}>
                    {store.status === "active" ? "Activa" : "Suspensa"}
                  </span>
                </div>

                <div className="flex gap-4 text-xs text-gray-500 mt-3 bg-gray-50 rounded-xl p-2">
                  <div className="text-center flex-1">
                    <p className="font-bold text-gray-800">{store.total_products || 0}</p>
                    <p>Produtos</p>
                  </div>
                  <div className="text-center flex-1">
                    <p className="font-bold text-gray-800">{store.total_orders || 0}</p>
                    <p>Pedidos</p>
                  </div>
                  <div className="text-center flex-1">
                    <p className="font-bold text-green-600">{formatKz(store.total_revenue || 0)}</p>
                    <p>Receita</p>
                  </div>
                </div>
              </div>
            ))}

          {dropshippers.length === 0 && (
            <div className="text-center py-12 text-gray-400">
              <Store size={40} className="mx-auto mb-3 opacity-20" />
              <p className="text-sm">Ainda não há dropshippers registados</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
