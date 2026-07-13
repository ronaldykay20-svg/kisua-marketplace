import { Banknote } from "lucide-react";
import { useState } from "react";
import TeamDashboardLayout from "@/components/team/TeamDashboardLayout";
import AdminPaymentReviewTab from "@/components/admin/AdminPaymentReviewTab";

const FinanceiroDashboard = () => {
  const [subTab, setSubTab] = useState("pagamentos");
  return (
    <TeamDashboardLayout
      roleLabel="Financeiro"
      roleIcon={Banknote}
      accent="#10b981"
      accentBg="#e6f9f1"
      gradient="linear-gradient(135deg, #10b981 0%, #047857 100%)"
      subTabs={[{ key: "pagamentos", label: "Pagamentos", icon: Banknote }]}
      activeSubTab={subTab}
      onSubTabChange={setSubTab}
    >
      <AdminPaymentReviewTab />
    </TeamDashboardLayout>
  );
};

export default FinanceiroDashboard;
