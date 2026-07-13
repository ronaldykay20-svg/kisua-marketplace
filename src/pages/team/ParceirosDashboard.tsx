import { Store, Building2, FolderTree } from "lucide-react";
import { useState } from "react";
import TeamDashboardLayout from "@/components/team/TeamDashboardLayout";
import AdminPartnersTab from "@/components/admin/AdminPartnersTab";
import AdminSuppliersTab from "@/components/admin/AdminSuppliersTab";
import AdminCategoriesTab from "@/components/admin/AdminCategoriesTab";

const ParceirosDashboard = () => {
  const [subTab, setSubTab] = useState("vendedores");
  return (
    <TeamDashboardLayout
      roleLabel="Parceiros"
      roleIcon={Store}
      accent="#a855f7"
      accentBg="#f6edfe"
      gradient="linear-gradient(135deg, #a855f7 0%, #7e22ce 100%)"
      subTabs={[
        { key: "vendedores", label: "Vendedores & Empresas", icon: Store },
        { key: "fornecedores", label: "Fornecedores", icon: Building2 },
        { key: "categorias", label: "Categorias", icon: FolderTree },
      ]}
      activeSubTab={subTab}
      onSubTabChange={setSubTab}
    >
      {subTab === "vendedores" && <AdminPartnersTab />}
      {subTab === "fornecedores" && <AdminSuppliersTab />}
      {subTab === "categorias" && <AdminCategoriesTab />}
    </TeamDashboardLayout>
  );
};

export default ParceirosDashboard;
