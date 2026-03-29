import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import Stories from "@/components/Stories";
import ProductGrid from "@/components/ProductGrid";
import VerifiedStores from "@/components/VerifiedStores";
import Footer from "@/components/Footer";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <Hero />
      <Stories />
      <ProductGrid />
      <VerifiedStores />
      <Footer />
    </div>
  );
};

export default Index;
