import Navbar from "@/components/Navbar";
import HeroBanner from "@/components/HeroBanner";
import QuickAccessSection from "@/components/QuickAccessSection";
import PromoCards from "@/components/PromoCards";
import SellerStories from "@/components/SellerStories";
import BenefitsBanner from "@/components/BenefitsBanner";
import PromoSection from "@/components/PromoSection";
import AdBanner from "@/components/AdBanner";
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
      <AdBanner variant="wide-1" />
      <FreeShippingSection />
      <AdBanner variant="double" />
      <LowPriceSection />
      <RankingSection />
      <AdBanner variant="wide-2" />
      <VerifiedStores />
      <RecentProducts />
      <AdBanner variant="double" />
      <ForYouSection />
      <Footer />
    </div>
  );
};

export default Index;
