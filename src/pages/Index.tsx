import NewNavbar from "@/components/NewNavbar";
import HeroBanner from "@/components/HeroBanner";
import BottomNav from "@/components/BottomNav";
import PromoCards from "@/components/PromoCards";
import BannerBlock from "@/components/BannerBlock";
import FeaturedSellers from "@/components/FeaturedSellers";
import PromoProductCards from "@/components/PromoProductCards";
import GroupedVideoStories from "@/components/GroupedVideoStories";
import InfiniteProducts from "@/components/InfiniteProducts";
import Footer from "@/components/Footer";

const Index = () => {
  return (
    <div className="min-h-screen bg-background pb-14 md:pb-0">
      <NewNavbar />

      {/* 1. Banner single (hero) */}
      <HeroBanner />

      {/* 2. Banner quad (4 promo cards) */}
      <PromoCards />

      {/* 3. Banner triple (3 images) - NEW */}
      <BannerBlock format="triple" />

      {/* 4. Banner single */}
      <BannerBlock format="single" offset={0} />

      {/* 5. Banner double */}
      <BannerBlock format="double" offset={0} />

      {/* 6. Featured seller/store with cover + products */}
      <FeaturedSellers />

      {/* 7. Banner single */}
      <BannerBlock format="single" offset={1} />

      {/* 8. Banner quad */}
      <BannerBlock format="quad" offset={1} />

      {/* 9. Promo product cards from DB */}
      <PromoProductCards />

      {/* 10. Banner publicidade */}
      <BannerBlock format="single" offset={2} />

      {/* 11. Video stories (24h, grouped by seller) */}
      <GroupedVideoStories />

      {/* 12. Banner publicidade */}
      <BannerBlock format="single" offset={3} />

      {/* 13. Banner double */}
      <BannerBlock format="double" offset={1} />

      {/* 14. Banner publicidade */}
      <BannerBlock format="single" offset={4} />

      {/* 15. Banner quad */}
      <BannerBlock format="quad" offset={2} />

      {/* 16. Banner double */}
      <BannerBlock format="double" offset={2} />

      {/* 17. Banner single */}
      <BannerBlock format="single" offset={5} />

      {/* 18. Banner triple */}
      <BannerBlock format="triple" offset={1} />

      {/* 19. Banner double */}
      <BannerBlock format="double" offset={3} />

      {/* 20. Infinite scroll products */}
      <InfiniteProducts />

      <Footer />
      <BottomNav />
    </div>
  );
};

export default Index;
