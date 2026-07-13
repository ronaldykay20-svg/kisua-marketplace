import { Truck, Gift, Building2 } from "lucide-react";
import { useState } from "react";
import TeamDashboardLayout from "@/components/team/TeamDashboardLayout";
import AdminFreightTab from "@/components/admin/AdminFreightTab";
import AdminFreeShippingTab from "@/components/admin/AdminFreeShippingTab";
import AdminFreightCompaniesTab from "@/components/admin/AdminFreightCompaniesTab";

const LogisticaDashboard = () => {
  const [subTab, setSubTab] = useState("frete");
  return (
    <TeamDashboardLayout
      roleLabel="Logística"
      roleIcon={Truck}
      accent="#0ea5e9"
      accentBg="#e6f6fd"
      gradient="linear-gradient(135deg, #0ea5e9 0%, #0369a1 100%)"
      subTabs={[
        { key: "frete", label: "Zonas de Frete", icon: Truck },
        { key: "frete_gratis", label: "Frete Grátis", icon: Gift },
        { key: "transportadoras", label: "Transportadoras", icon: Building2 },
      ]}
      activeSubTab={subTab}
      onSubTabChange={setSubTab}
    >
      {subTab === "frete" && <AdminFreightTab />}
      {subTab === "frete_gratis" && <AdminFreeShippingTab />}
      {subTab === "transportadoras" && <AdminFreightCompaniesTab />}
    </TeamDashboardLayout>
  );
};

export default LogisticaDashboard;
