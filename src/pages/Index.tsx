import Navbar from "@/components/Navbar";
import HeroBanner from "@/components/HeroBanner";
import PromoCards from "@/components/PromoCards";
import SellerStories from "@/components/SellerStories";
import BenefitsBanner from "@/components/BenefitsBanner";
import PromoSection from "@/components/PromoSection";
import FreeShippingSection from "@/components/FreeShippingSection";
import LowPriceSection from "@/components/LowPriceSection";
import RankingSection from "@/components/RankingSection";
import VerifiedStores from "@/components/VerifiedStores";
import RecentProducts from "@/components/RecentProducts";
import ForYouSection from "@/components/ForYouSection";
import Footer from "@/components/Footer";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <HeroBanner />
      <PromoCards />
      <SellerStories />
      <BenefitsBanner />
      <PromoSection />
      <FreeShippingSection />
      <LowPriceSection />
      <RankingSection />
      <VerifiedStores />
      <RecentProducts />
      <ForYouSection />
      <Footer />
    </div>
  );
};

export default Index;
