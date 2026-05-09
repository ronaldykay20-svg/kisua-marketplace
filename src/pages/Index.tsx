import HomeBannerSlot from "@/components/HomeBannerSlot";
import FeaturedSellers from "@/components/FeaturedSellers";
import PromoProductCards from "@/components/PromoProductCards";
import GroupedVideoStories from "@/components/GroupedVideoStories";
import InfiniteProducts from "@/components/InfiniteProducts";
import Footer from "@/components/Footer";
import { useDeviceLayout } from "@/hooks/useDeviceLayout";

/* ─────────────────────────────────────────────
   Layout Mobile  — igual ao que já existia
───────────────────────────────────────────── */
const MobileLayout = () => (
  <>
    <HomeBannerSlot slot={1} />
    <HomeBannerSlot slot={2} />
    <HomeBannerSlot slot={3} />
    <HomeBannerSlot slot={4} />
    <HomeBannerSlot slot={5} />
    <FeaturedSellers />
    <HomeBannerSlot slot={6} />
    <HomeBannerSlot slot={7} />
    <PromoProductCards />
    <HomeBannerSlot slot={8} />
    <GroupedVideoStories />
    <HomeBannerSlot slot={9} />
    <HomeBannerSlot slot={10} />
    <HomeBannerSlot slot={11} />
    <HomeBannerSlot slot={12} />
    <HomeBannerSlot slot={13} />
    <HomeBannerSlot slot={14} />
    <HomeBannerSlot slot={15} />
    <HomeBannerSlot slot={16} />
    <InfiniteProducts />
    <Footer />
  </>
);

/* ─────────────────────────────────────────────
   Layout Tablet  — grid 2 colunas + secções
   reorganizadas para aproveitar o espaço
───────────────────────────────────────────── */
const TabletLayout = () => (
  <div className="max-w-screen-lg mx-auto px-4">

    {/* Hero full-width */}
    <HomeBannerSlot slot={1} device="tablet" />

    {/* Linha de 2 banners lado a lado */}
    <div className="grid grid-cols-2 gap-3 mt-3">
      <HomeBannerSlot slot={2} device="tablet" compact />
      <HomeBannerSlot slot={3} device="tablet" compact />
    </div>

    {/* Vendedores em destaque — 2 lado a lado */}
    <div className="mt-4">
      <FeaturedSellers layout="tablet" />
    </div>

    {/* Banner wide */}
    <HomeBannerSlot slot={4} device="tablet" />

    {/* Grid 3 colunas — banners pequenos */}
    <div className="grid grid-cols-3 gap-3 mt-3">
      <HomeBannerSlot slot={5} device="tablet" compact />
      <HomeBannerSlot slot={6} device="tablet" compact />
      <HomeBannerSlot slot={7} device="tablet" compact />
    </div>

    {/* Promoções */}
    <div className="mt-4">
      <PromoProductCards />
    </div>

    {/* Banner + vídeo lado a lado */}
    <div className="grid grid-cols-2 gap-3 mt-3">
      <HomeBannerSlot slot={8} device="tablet" compact />
      <GroupedVideoStories />
    </div>

    {/* Banners sequenciais */}
    <HomeBannerSlot slot={9} device="tablet" />
    <HomeBannerSlot slot={10} device="tablet" />

    {/* Grid 2 colunas */}
    <div className="grid grid-cols-2 gap-3 mt-3">
      <HomeBannerSlot slot={11} device="tablet" compact />
      <HomeBannerSlot slot={12} device="tablet" compact />
    </div>

    <HomeBannerSlot slot={13} device="tablet" />

    {/* Grid 3 colunas */}
    <div className="grid grid-cols-3 gap-3 mt-3">
      <HomeBannerSlot slot={14} device="tablet" compact />
      <HomeBannerSlot slot={15} device="tablet" compact />
      <HomeBannerSlot slot={16} device="tablet" compact />
    </div>

    <InfiniteProducts />
    <Footer />
  </div>
);

/* ─────────────────────────────────────────────
   Layout Desktop — sidebar esquerda fixa +
   conteúdo central + coluna direita
───────────────────────────────────────────── */
const DesktopLayout = () => (
  <div className="max-w-screen-xl mx-auto px-6">

    {/* Hero full-width */}
    <HomeBannerSlot slot={1} device="desktop" />

    {/* Corpo principal: conteúdo (3fr) + sidebar direita (1fr) */}
    <div className="grid grid-cols-[1fr_300px] gap-5 mt-4">

      {/* Coluna principal */}
      <div>
        {/* Linha de 2 banners */}
        <div className="grid grid-cols-2 gap-3">
          <HomeBannerSlot slot={2} device="desktop" compact />
          <HomeBannerSlot slot={3} device="desktop" compact />
        </div>

        <div className="mt-4">
          <FeaturedSellers layout="desktop" />
        </div>

        <HomeBannerSlot slot={4} device="desktop" />

        {/* Grid 3 colunas */}
        <div className="grid grid-cols-3 gap-3 mt-3">
          <HomeBannerSlot slot={5} device="desktop" compact />
          <HomeBannerSlot slot={6} device="desktop" compact />
          <HomeBannerSlot slot={7} device="desktop" compact />
        </div>

        <div className="mt-4">
          <PromoProductCards />
        </div>

        <HomeBannerSlot slot={8} device="desktop" />

        <div className="mt-4">
          <GroupedVideoStories />
        </div>

        <HomeBannerSlot slot={9} device="desktop" />

        {/* Grid 2 colunas */}
        <div className="grid grid-cols-2 gap-3 mt-3">
          <HomeBannerSlot slot={10} device="desktop" compact />
          <HomeBannerSlot slot={11} device="desktop" compact />
        </div>

        <HomeBannerSlot slot={12} device="desktop" />

        {/* Grid 4 colunas — banners pequenos */}
        <div className="grid grid-cols-4 gap-3 mt-3">
          <HomeBannerSlot slot={13} device="desktop" compact />
          <HomeBannerSlot slot={14} device="desktop" compact />
          <HomeBannerSlot slot={15} device="desktop" compact />
          <HomeBannerSlot slot={16} device="desktop" compact />
        </div>

        <InfiniteProducts />
      </div>

      {/* Sidebar direita — sticky, banners verticais */}
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
   Página principal — selecciona o layout certo
───────────────────────────────────────────── */
const Index = () => {
  const device = useDeviceLayout();

  if (device === "desktop") return <DesktopLayout />;
  if (device === "tablet")  return <TabletLayout />;
  return <MobileLayout />;
};

export default Index;
