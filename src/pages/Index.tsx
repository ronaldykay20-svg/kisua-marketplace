import { useRef, useEffect, useState, memo } from "react";
import HomeBannerSlot from "@/components/HomeBannerSlot";
import FeaturedSellers from "@/components/FeaturedSellers";
import PromoProductCards from "@/components/PromoProductCards";
import GroupedVideoStories from "@/components/GroupedVideoStories";
import InfiniteProducts from "@/components/InfiniteProducts";
import FlashSaleBar from "@/components/FlashSaleBar";
import LiveActivityTicker from "@/components/LiveActivityTicker";
import { useDeviceLayout } from "@/hooks/useDeviceLayout";

// ─── LazySection ─────────────────────────────────────────────────────────────
// Adia o render dos filhos até o elemento estar a ~300px do viewport.
// Enquanto não está visível, reserva o espaço com um placeholder da altura estimada.
// Isto impede que todos os componentes disparem as suas queries ao mesmo tempo.
// Quando entra em cena, a secção aparece com um fade + subida suave (em vez de
// simplesmente "aparecer" de repente).
const LazySection = ({
  children,
  estimatedHeight = 200,
  rootMargin = "50px",
}: {
  children: React.ReactNode;
  estimatedHeight?: number;
  rootMargin?: string;
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [entered, setEntered] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          obs.disconnect();
        }
      },
      { rootMargin }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [rootMargin]);

  // Só liga a transição um frame depois de montar, para o CSS animar a entrada
  useEffect(() => {
    if (!visible) return;
    const raf = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(raf);
  }, [visible]);

  return (
    <div ref={ref}>
      {visible ? (
        <div
          style={{
            opacity: entered ? 1 : 0,
            transform: entered ? "translateY(0)" : "translateY(16px)",
            transition: "opacity 0.5s cubic-bezier(0.22,1,0.36,1), transform 0.5s cubic-bezier(0.22,1,0.36,1)",
          }}
        >
          {children}
        </div>
      ) : (
        <div style={{ minHeight: estimatedHeight }} />
      )}
    </div>
  );
};

// ─── Layouts ──────────────────────────────────────────────────────────────────
// Os primeiros slots (acima da dobra) carregam imediatamente — sem LazySection.
// Tudo abaixo da dobra usa LazySection com altura estimada realista.

const MobileLayout = () => (
  <>
    <FlashSaleBar />
    <LiveActivityTicker />
    {/* Acima da dobra — carrega imediatamente */}
    <HomeBannerSlot slot={1} device="mobile" />
    <HomeBannerSlot slot={2} device="mobile" />

    {/* Abaixo da dobra — carregamento adiado */}
    <LazySection estimatedHeight={280}>
      <HomeBannerSlot slot={3} device="mobile" />
    </LazySection>
    <LazySection estimatedHeight={280}>
      <HomeBannerSlot slot={4} device="mobile" />
    </LazySection>
    <LazySection estimatedHeight={280}>
      <HomeBannerSlot slot={5} device="mobile" />
    </LazySection>
    <LazySection estimatedHeight={420}>
      <FeaturedSellers />
    </LazySection>
    <LazySection estimatedHeight={280}>
      <HomeBannerSlot slot={6} device="mobile" />
    </LazySection>
    <LazySection estimatedHeight={280}>
      <HomeBannerSlot slot={7} device="mobile" />
    </LazySection>
    <LazySection estimatedHeight={340}>
      <PromoProductCards />
    </LazySection>
    <LazySection estimatedHeight={280}>
      <HomeBannerSlot slot={8} device="mobile" />
    </LazySection>
    <LazySection estimatedHeight={480}>
      <GroupedVideoStories />
    </LazySection>
    <LazySection estimatedHeight={280}>
      <HomeBannerSlot slot={9} device="mobile" />
    </LazySection>
    <LazySection estimatedHeight={280}>
      <HomeBannerSlot slot={10} device="mobile" />
    </LazySection>
    <LazySection estimatedHeight={280}>
      <HomeBannerSlot slot={11} device="mobile" />
    </LazySection>
    <LazySection estimatedHeight={280}>
      <HomeBannerSlot slot={12} device="mobile" />
    </LazySection>
    <LazySection estimatedHeight={280}>
      <HomeBannerSlot slot={13} device="mobile" />
    </LazySection>
    <LazySection estimatedHeight={280}>
      <HomeBannerSlot slot={14} device="mobile" />
    </LazySection>
    <LazySection estimatedHeight={280}>
      <HomeBannerSlot slot={15} device="mobile" />
    </LazySection>
    <LazySection estimatedHeight={280}>
      <HomeBannerSlot slot={16} device="mobile" />
    </LazySection>
    {/* InfiniteProducts tem o seu próprio lazy loading interno — sem wrapper */}
    <InfiniteProducts />
  </>
);

const TabletLayout = () => (
  <div className="max-w-screen-lg mx-auto px-4">
    <FlashSaleBar />
    <LiveActivityTicker />
    {/* Acima da dobra */}
    <HomeBannerSlot slot={201} device="tablet" />
    <HomeBannerSlot slot={202} device="tablet" />

    {/* Abaixo da dobra */}
    <LazySection estimatedHeight={280}>
      <HomeBannerSlot slot={203} device="tablet" />
    </LazySection>
    <LazySection estimatedHeight={480} rootMargin="80px">
      <div className="mt-4">
        <FeaturedSellers layout="tablet" />
      </div>
    </LazySection>
    <LazySection estimatedHeight={280}>
      <HomeBannerSlot slot={204} device="tablet" />
    </LazySection>
    <LazySection estimatedHeight={280}>
      <HomeBannerSlot slot={205} device="tablet" />
    </LazySection>
    <LazySection estimatedHeight={280}>
      <HomeBannerSlot slot={206} device="tablet" />
    </LazySection>
    <LazySection estimatedHeight={280}>
      <HomeBannerSlot slot={207} device="tablet" />
    </LazySection>
    <LazySection estimatedHeight={340} rootMargin="80px">
      <div className="mt-4">
        <PromoProductCards />
      </div>
    </LazySection>
    <LazySection estimatedHeight={480} rootMargin="80px">
      <div className="grid grid-cols-2 gap-3 mt-3">
        <HomeBannerSlot slot={208} device="tablet" compact />
        <GroupedVideoStories />
      </div>
    </LazySection>
    <LazySection estimatedHeight={280}>
      <HomeBannerSlot slot={209} device="tablet" />
    </LazySection>
    <LazySection estimatedHeight={280}>
      <HomeBannerSlot slot={210} device="tablet" />
    </LazySection>
    <LazySection estimatedHeight={280}>
      <div className="grid grid-cols-2 gap-3 mt-3">
        <HomeBannerSlot slot={211} device="tablet" compact />
        <HomeBannerSlot slot={212} device="tablet" compact />
      </div>
    </LazySection>
    <LazySection estimatedHeight={280}>
      <HomeBannerSlot slot={213} device="tablet" />
    </LazySection>
    <LazySection estimatedHeight={280}>
      <div className="grid grid-cols-3 gap-3 mt-3">
        <HomeBannerSlot slot={214} device="tablet" compact />
        <HomeBannerSlot slot={215} device="tablet" compact />
        <HomeBannerSlot slot={216} device="tablet" compact />
      </div>
    </LazySection>
    <InfiniteProducts />
  </div>
);

const DesktopLayout = () => (
  <div className="max-w-screen-xl mx-auto px-6">
    <FlashSaleBar />
    <LiveActivityTicker />
    {/* Acima da dobra */}
    <HomeBannerSlot slot={301} device="desktop" />

    <div className="grid grid-cols-[1fr_300px] gap-5 mt-4">
      <div>
        {/* Acima da dobra */}
        <HomeBannerSlot slot={302} device="desktop" />
        <HomeBannerSlot slot={303} device="desktop" />

        {/* Abaixo da dobra */}
        <LazySection estimatedHeight={480} rootMargin="80px">
          <div className="mt-4">
            <FeaturedSellers layout="desktop" />
          </div>
        </LazySection>
        <LazySection estimatedHeight={280}>
          <HomeBannerSlot slot={304} device="desktop" />
        </LazySection>
        <LazySection estimatedHeight={280}>
          <HomeBannerSlot slot={305} device="desktop" />
        </LazySection>
        <LazySection estimatedHeight={280}>
          <HomeBannerSlot slot={306} device="desktop" />
        </LazySection>
        <LazySection estimatedHeight={280}>
          <HomeBannerSlot slot={307} device="desktop" />
        </LazySection>
        <LazySection estimatedHeight={340} rootMargin="80px">
          <div className="mt-4">
            <PromoProductCards />
          </div>
        </LazySection>
        <LazySection estimatedHeight={280}>
          <HomeBannerSlot slot={308} device="desktop" />
        </LazySection>
        <LazySection estimatedHeight={480} rootMargin="80px">
          <div className="mt-4">
            <GroupedVideoStories />
          </div>
        </LazySection>
        <LazySection estimatedHeight={280}>
          <HomeBannerSlot slot={309} device="desktop" />
        </LazySection>
        <LazySection estimatedHeight={280}>
          <div className="grid grid-cols-2 gap-3 mt-3">
            <HomeBannerSlot slot={310} device="desktop" compact />
            <HomeBannerSlot slot={311} device="desktop" compact />
          </div>
        </LazySection>
        <LazySection estimatedHeight={280}>
          <HomeBannerSlot slot={312} device="desktop" />
        </LazySection>
        <LazySection estimatedHeight={280}>
          <div className="grid grid-cols-4 gap-3 mt-3">
            <HomeBannerSlot slot={313} device="desktop" compact />
            <HomeBannerSlot slot={314} device="desktop" compact />
            <HomeBannerSlot slot={315} device="desktop" compact />
            <HomeBannerSlot slot={316} device="desktop" compact />
          </div>
        </LazySection>
        <InfiniteProducts />
      </div>

      {/* Sidebar — carrega imediatamente pois está acima da dobra no desktop */}
      <aside className="space-y-4 self-start sticky top-[80px]">
        <HomeBannerSlot slot={101} device="desktop" sidebar />
        <LazySection estimatedHeight={300}>
          <HomeBannerSlot slot={102} device="desktop" sidebar />
        </LazySection>
        <LazySection estimatedHeight={300}>
          <HomeBannerSlot slot={103} device="desktop" sidebar />
        </LazySection>
      </aside>
    </div>
  </div>
);

// ─── Index ────────────────────────────────────────────────────────────────────
const Index = () => {
  const device = useDeviceLayout();
  if (device === "desktop") return <DesktopLayout />;
  if (device === "tablet")  return <TabletLayout />;
  return <MobileLayout />;
};

export default Index;
