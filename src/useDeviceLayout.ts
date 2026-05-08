import { useState, useEffect } from "react";

export type DeviceLayout = "mobile" | "tablet" | "desktop";

/**
 * Devolve o layout activo com base na largura da janela.
 * mobile  → < 768px
 * tablet  → 768px – 1279px
 * desktop → ≥ 1280px
 */
export const useDeviceLayout = (): DeviceLayout => {
  const getLayout = (): DeviceLayout => {
    if (typeof window === "undefined") return "mobile";
    if (window.innerWidth >= 1280) return "desktop";
    if (window.innerWidth >= 768)  return "tablet";
    return "mobile";
  };

  const [layout, setLayout] = useState<DeviceLayout>(getLayout);

  useEffect(() => {
    const handler = () => setLayout(getLayout());
    window.addEventListener("resize", handler, { passive: true });
    return () => window.removeEventListener("resize", handler);
  }, []);

  return layout;
};
