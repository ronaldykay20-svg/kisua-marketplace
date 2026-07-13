import { ShieldCheck } from "lucide-react";
import { useState } from "react";
import TeamDashboardLayout from "@/components/team/TeamDashboardLayout";
import AdminOrdersTab from "@/components/admin/AdminOrdersTab";

const OperacoesDashboard = () => {
  const [subTab, setSubTab] = useState("encomendas");
  return (
    <TeamDashboardLayout
      roleLabel="Operações"
      roleIcon={ShieldCheck}
      accent="#f97316"
      accentBg="#fff1e6"
      gradient="linear-gradient(135deg, #f97316 0%, #c2410c 100%)"
      subTabs={[{ key: "encomendas", label: "Encomendas", icon: ShieldCheck }]}
      activeSubTab={subTab}
      onSubTabChange={setSubTab}
    >
      <AdminOrdersTab />
    </TeamDashboardLayout>
  );
};

export default OperacoesDashboard;
