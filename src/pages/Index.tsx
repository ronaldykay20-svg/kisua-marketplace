import HomeBannerSlot from "@/components/HomeBannerSlot";
import FeaturedSellers from "@/components/FeaturedSellers";
import PromoProductCards from "@/components/PromoProductCards";
import GroupedVideoStories from "@/components/GroupedVideoStories";
import InfiniteProducts from "@/components/InfiniteProducts";
import Footer from "@/components/Footer";
import { useDeviceLayout } from "@/hooks/useDeviceLayout";

/* ─────────────────────────────────────────────
   Layout Mobile
───────────────────────────────────────────── */
const MobileLayout = () => (
  <>
    <HomeBannerSlot slot={1} device="mobile" />
    <HomeBannerSlot slot={2} device="mobile" />
    <HomeBannerSlot slot={3} device="mobile" />
    <HomeBannerSlot slot={4} device="mobile" />
    <HomeBannerSlot slot={5} device="mobile" />
    <FeaturedSellers />
    <HomeBannerSlot slot={6} device="mobile" />
    <HomeBannerSlot slot={7} device="mobile" />
    <PromoProductCards />
    <HomeBannerSlot slot={8} device="mobile" />
    <GroupedVideoStories />
    <HomeBannerSlot slot={9} device="mobile" />
    <HomeBannerSlot slot={10} device="mobile" />
    <HomeBannerSlot slot={11} device="mobile" />
    <HomeBannerSlot slot={12} device="mobile" />
    <HomeBannerSlot slot={13} device="mobile" />
    <HomeBannerSlot slot={14} device="mobile" />
    <HomeBannerSlot slot={15} device="mobile" />
    <HomeBannerSlot slot={16} device="mobile" />
    <InfiniteProducts />
    <Footer />
  </>
);

/* ─────────────────────────────────────────────
   Layout Tablet — slots 201–216
───────────────────────────────────────────── */
const TabletLayout = () => (
  <div className="max-w-screen-lg mx-auto px-4">

    <HomeBannerSlot slot={201} device="tablet" />
    <HomeBannerSlot slot={202} device="tablet" />
    <HomeBannerSlot slot={203} device="tablet" />

    <div className="mt-4">
      <FeaturedSellers layout="tablet" />
    </div>

    <HomeBannerSlot slot={204} device="tablet" />
    <HomeBannerSlot slot={205} device="tablet" />
    <HomeBannerSlot slot={206} device="tablet" />
    <HomeBannerSlot slot={207} device="tablet" />

    <div className="mt-4">
      <PromoProductCards />
    </div>

    <div className="grid grid-cols-2 gap-3 mt-3">
      <HomeBannerSlot slot={208} device="tablet" compact />
      <GroupedVideoStories />
    </div>

    <HomeBannerSlot slot={209} device="tablet" />
    <HomeBannerSlot slot={210} device="tablet" />

    <div className="grid grid-cols-2 gap-3 mt-3">
      <HomeBannerSlot slot={211} device="tablet" compact />
      <HomeBannerSlot slot={212} device="tablet" compact />
    </div>

    <HomeBannerSlot slot={213} device="tablet" />

    <div className="grid grid-cols-3 gap-3 mt-3">
      <HomeBannerSlot slot={214} device="tablet" compact />
      <HomeBannerSlot slot={215} device="tablet" compact />
      <HomeBannerSlot slot={216} device="tablet" compact />
    </div>

    <InfiniteProducts />
    <Footer />
  </div>
);

/* ─────────────────────────────────────────────
   Layout Desktop — slots 301–316 + sidebar 101–103
───────────────────────────────────────────── */
const DesktopLayout = () => (
  <div className="max-w-screen-xl mx-auto px-6">

    <HomeBannerSlot slot={301} device="desktop" />

    <div className="grid grid-cols-[1fr_300px] gap-5 mt-4">

      <div>
        <HomeBannerSlot slot={302} device="desktop" />
        <HomeBannerSlot slot={303} device="desktop" />

        <div className="mt-4">
          <FeaturedSellers layout="desktop" />
        </div>

        <HomeBannerSlot slot={304} device="desktop" />
        <HomeBannerSlot slot={305} device="desktop" />
        <HomeBannerSlot slot={306} device="desktop" />
        <HomeBannerSlot slot={307} device="desktop" />

        <div className="mt-4">
          <PromoProductCards />
        </div>

        <HomeBannerSlot slot={308} device="desktop" />

        <div className="mt-4">
          <GroupedVideoStories />
        </div>

        <HomeBannerSlot slot={309} device="desktop" />

        <div className="grid grid-cols-2 gap-3 mt-3">
          <HomeBannerSlot slot={310} device="desktop" compact />
          <HomeBannerSlot slot={311} device="desktop" compact />
        </div>

        <HomeBannerSlot slot={312} device="desktop" />

        <div className="grid grid-cols-4 gap-3 mt-3">
          <HomeBannerSlot slot={313} device="desktop" compact />
          <HomeBannerSlot slot={314} device="desktop" compact />
          <HomeBannerSlot slot={315} device="desktop" compact />
          <HomeBannerSlot slot={316} device="desktop" compact />
        </div>

        <InfiniteProducts />
      </div>

      <aside className="space-y-4 self-start sticky top-[80px]">
        <HomeBannerSlot slot={101} device="desktop" sidebar />
        <HomeBannerSlot slot={102} device="desktop" sidebar />
        <HomeBannerSlot slot={103} device="desktop" sidebar />
      </aside>
    </div>

    <Footer />
  </div>
);

/* ─────────────────────────────────────────────
   Página principal
───────────────────────────────────────────── */
const Index = () => {
  const device = useDeviceLayout();

  if (device === "desktop") return <DesktopLayout />;
  if (device === "tablet")  return <TabletLayout />;
  return <MobileLayout />;
};

export default Index;
