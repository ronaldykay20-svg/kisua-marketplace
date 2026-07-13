import { Megaphone, ImageIcon, Ticket, Gavel, TrendingUp, MousePointerClick } from "lucide-react";
import { useState } from "react";
import TeamDashboardLayout from "@/components/team/TeamDashboardLayout";
import AdminBannersTab from "@/components/admin/AdminBannersTab";
import AdminAdsTab from "@/components/admin/AdminAdstab";
import CouponManagerTab from "@/components/coupons/CouponManagerTab";
import AdminLeiloesTab from "@/components/admin/AdminLeiloesTab";
import AdminAnalyticsTab from "@/components/admin/AdminAnalyticsTab";
import AdminPageInteractionsTab from "@/components/admin/AdminPageInteractionsTab";

const MarketingDashboard = () => {
  const [subTab, setSubTab] = useState("banners");
  return (
    <TeamDashboardLayout
      roleLabel="Marketing"
      roleIcon={Megaphone}
      accent="#ec4899"
      accentBg="#fdeef6"
      gradient="linear-gradient(135deg, #ec4899 0%, #be185d 100%)"
      subTabs={[
        { key: "banners", label: "Banners", icon: ImageIcon },
        { key: "publicidade", label: "Publicidade", icon: Megaphone },
        { key: "cupons", label: "Cupões", icon: Ticket },
        { key: "leiloes", label: "Leilões", icon: Gavel },
        { key: "analytics", label: "Analytics", icon: TrendingUp },
        { key: "interacoes", label: "Interações", icon: MousePointerClick },
      ]}
      activeSubTab={subTab}
      onSubTabChange={setSubTab}
    >
      {subTab === "banners" && <AdminBannersTab />}
      {subTab === "publicidade" && <AdminAdsTab />}
      {subTab === "cupons" && <CouponManagerTab scope="platform" ownerId={null} heading="Cupons da Plataforma" />}
      {subTab === "leiloes" && <AdminLeiloesTab />}
      {subTab === "analytics" && <AdminAnalyticsTab />}
      {subTab === "interacoes" && <AdminPageInteractionsTab />}
    </TeamDashboardLayout>
  );
};

export default MarketingDashboard;
