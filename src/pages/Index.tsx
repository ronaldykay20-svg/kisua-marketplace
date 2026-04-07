import NewNavbar from "@/components/NewNavbar";
import BottomNav from "@/components/BottomNav";
import HomeBannerSlot from "@/components/HomeBannerSlot";
import FeaturedSellers from "@/components/FeaturedSellers";
import PromoProductCards from "@/components/PromoProductCards";
import GroupedVideoStories from "@/components/GroupedVideoStories";
import InfiniteProducts from "@/components/InfiniteProducts";
import Footer from "@/components/Footer";

const Index = () => {
  return (
    <div className="min-h-screen bg-background pb-14 md:pb-0">
      <NewNavbar />

      <HomeBannerSlot slot={1} />
      <HomeBannerSlot slot={2} />
      <HomeBannerSlot slot={3} />
      <HomeBannerSlot slot={4} />
      <HomeBannerSlot slot={5} />

      {/* 6. Vendedores em destaque com capa + 3 produtos */}
      <FeaturedSellers />

      <HomeBannerSlot slot={6} />
      <HomeBannerSlot slot={7} />

      {/* 9. Cards de promoção */}
      <PromoProductCards />

      <HomeBannerSlot slot={8} />

      {/* 11. Stories de vídeo */}
      <GroupedVideoStories />

      <HomeBannerSlot slot={9} />
      <HomeBannerSlot slot={10} />
      <HomeBannerSlot slot={11} />
      <HomeBannerSlot slot={12} />
      <HomeBannerSlot slot={13} />
      <HomeBannerSlot slot={14} />
      <HomeBannerSlot slot={15} />
      <HomeBannerSlot slot={16} />

      {/* 20. Scroll infinito de produtos */}
      <InfiniteProducts />

      <Footer />
      <BottomNav />
    </div>
  );
};

export default Index;
