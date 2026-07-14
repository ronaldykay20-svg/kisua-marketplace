import { useEffect, useState } from "react";

const STORAGE_KEY = "zg_cookie_consent";

interface ConsentPrefs {
  necessary: true;
  analytics: boolean;
  marketing: boolean;
}

const readStoredConsent = (): ConsentPrefs | null => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

const saveConsent = (prefs: ConsentPrefs) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    /* localStorage indisponível — não bloqueia a navegação */
  }
};

const CookieConsentBanner = () => {
  const [visible, setVisible] = useState(false);
  const [managing, setManaging] = useState(false);
  const [analytics, setAnalytics] = useState(true);
  const [marketing, setMarketing] = useState(true);

  useEffect(() => {
    if (!readStoredConsent()) setVisible(true);
  }, []);

  if (!visible) return null;

  const acceptAll = () => {
    saveConsent({ necessary: true, analytics: true, marketing: true });
    setVisible(false);
  };

  const rejectAll = () => {
    saveConsent({ necessary: true, analytics: false, marketing: false });
    setVisible(false);
  };

  const savePreferences = () => {
    saveConsent({ necessary: true, analytics, marketing });
    setVisible(false);
  };

  return (
    <div
      className="fixed bottom-14 md:bottom-0 left-0 right-0 z-[55] px-4 py-4"
      style={{ background: "#ffffff", borderTop: "1px solid #ecdfcf", boxShadow: "0 -4px 16px rgba(0,0,0,0.08)" }}
    >
      <div className="max-w-screen-md mx-auto">
        {!managing ? (
          <>
            <p className="text-[12px] leading-relaxed mb-3" style={{ color: "#4a3527" }}>
              Utilizamos cookies para o site funcionar bem e para melhorar a tua experiência de compra.
              Podes aceitar tudo, rejeitar tudo, ou escolher as tuas preferências.
            </p>
            <div className="flex flex-col gap-2">
              <button
                onClick={acceptAll}
                className="w-full py-2.5 rounded-full font-bold text-[13px] text-white"
                style={{ background: "#1a0f07" }}
              >
                Aceitar tudo
              </button>
              <button
                onClick={rejectAll}
                className="w-full py-2.5 rounded-full font-bold text-[13px] border"
                style={{ borderColor: "#1a0f07", color: "#1a0f07", background: "transparent" }}
              >
                Rejeitar tudo
              </button>
              <button
                onClick={() => setManaging(true)}
                className="w-full py-2 text-[12px] font-semibold underline"
                style={{ color: "#7a5a44" }}
              >
                Gerir cookies
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="text-[12px] leading-relaxed mb-3" style={{ color: "#4a3527" }}>
              Escolhe que tipos de cookies aceitas. Os necessários mantêm-se sempre ativos
              porque o site precisa deles para funcionar.
            </p>
            <div className="space-y-2 mb-3">
              <label className="flex items-center justify-between text-[12px] font-semibold" style={{ color: "#4a3527" }}>
                Necessários
                <input type="checkbox" checked disabled className="w-4 h-4" />
              </label>
              <label className="flex items-center justify-between text-[12px] font-semibold" style={{ color: "#4a3527" }}>
                Analíticos
                <input
                  type="checkbox"
                  checked={analytics}
                  onChange={(e) => setAnalytics(e.target.checked)}
                  className="w-4 h-4"
                />
              </label>
              <label className="flex items-center justify-between text-[12px] font-semibold" style={{ color: "#4a3527" }}>
                Marketing
                <input
                  type="checkbox"
                  checked={marketing}
                  onChange={(e) => setMarketing(e.target.checked)}
                  className="w-4 h-4"
                />
              </label>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setManaging(false)}
                className="flex-1 py-2.5 rounded-full font-bold text-[13px] border"
                style={{ borderColor: "#1a0f07", color: "#1a0f07", background: "transparent" }}
              >
                Voltar
              </button>
              <button
                onClick={savePreferences}
                className="flex-1 py-2.5 rounded-full font-bold text-[13px] text-white"
                style={{ background: "#1a0f07" }}
              >
                Guardar preferências
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default CookieConsentBanner;
