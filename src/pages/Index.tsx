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

      {/* 1. Hero banner (single) */}
      <HeroBanner />

      {/* 2. Banner de 4 (promo cards) */}
      <PromoCards />

      {/* 3. Banner de 3 (mosaic: 1 grande à esquerda + 2 à direita) */}
      <BannerBlock format="triple" />

      {/* 4. Banner de 1 (publicidade) */}
      <BannerBlock format="single" offset={0} />

      {/* 5. Banner de 2 */}
      <BannerBlock format="double" offset={0} />

      {/* 6. Vendedores em destaque com capa + 3 produtos */}
      <FeaturedSellers />

      {/* 7. Banner de 1 (publicidade) */}
      <BannerBlock format="single" offset={1} />

      {/* 8. Banner de 4 */}
      <BannerBlock format="quad" offset={0} />

      {/* 9. Cards de promoção */}
      <PromoProductCards />

      {/* 10. Banner de 1 (publicidade) */}
      <BannerBlock format="single" offset={2} />

      {/* 11. Stories de vídeo */}
      <GroupedVideoStories />

      {/* 12. Banner de 1 (publicidade) */}
      <BannerBlock format="single" offset={3} />

      {/* 13. Banner de 2 */}
      <BannerBlock format="double" offset={1} />

      {/* 14. Banner de 1 (publicidade) */}
      <BannerBlock format="single" offset={4} />

      {/* 15. Banner de 4 */}
      <BannerBlock format="quad" offset={1} />

      {/* 16. Banner de 2 */}
      <BannerBlock format="double" offset={2} />

      {/* 17. Banner de 1 */}
      <BannerBlock format="single" offset={5} />

      {/* 18. Banner de 3 (mosaic) */}
      <BannerBlock format="triple" offset={1} />

      {/* 19. Banner de 2 */}
      <BannerBlock format="double" offset={3} />

      {/* 20. Scroll infinito de produtos */}
      <InfiniteProducts />

      <Footer />
      <BottomNav />
    </div>
  );
};

export default Index;
