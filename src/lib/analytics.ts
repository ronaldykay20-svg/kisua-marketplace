import { supabase } from "@/integrations/supabase/client";

const SESSION_KEY = "zg_session_id";
const CONSENT_KEY = "zg_cookie_consent";

function hasAnalyticsConsent(): boolean {
  try {
    const raw = localStorage.getItem(CONSENT_KEY);
    if (!raw) return false;
    const prefs = JSON.parse(raw);
    return !!prefs.analytics;
  } catch {
    return false;
  }
}

function detectDevice(ua: string): string {
  if (/tablet|ipad/i.test(ua)) return "tablet";
  if (/mobile|android|iphone/i.test(ua)) return "mobile";
  return "desktop";
}

function detectOS(ua: string): string {
  if (/android/i.test(ua)) return "Android";
  if (/iphone|ipad|ipod/i.test(ua)) return "iOS";
  if (/windows/i.test(ua)) return "Windows";
  if (/mac os/i.test(ua)) return "macOS";
  if (/linux/i.test(ua)) return "Linux";
  return "Outro";
}

function detectBrowser(ua: string): string {
  if (/edg\//i.test(ua)) return "Edge";
  if (/chrome\//i.test(ua) && !/edg\//i.test(ua)) return "Chrome";
  if (/safari\//i.test(ua) && !/chrome\//i.test(ua)) return "Safari";
  if (/firefox\//i.test(ua)) return "Firefox";
  return "Outro";
}

let sessionPromise: Promise<string | null> | null = null;

async function ensureSession(): Promise<string | null> {
  if (!hasAnalyticsConsent()) return null;

  const existing = localStorage.getItem(SESSION_KEY);
  if (existing) return existing;

  if (!sessionPromise) {
    sessionPromise = (async () => {
      try {
        const id = crypto.randomUUID();
        const ua = navigator.userAgent;
        const params = new URLSearchParams(window.location.search);
        const { data: userData } = await supabase.auth.getUser();

        const { error } = await supabase.from("analytics_sessions").insert({
          id,
          user_id: userData?.user?.id ?? null,
          entry_page: window.location.pathname,
          referrer: document.referrer || null,
          device_type: detectDevice(ua),
          browser: detectBrowser(ua),
          os: detectOS(ua),
          language: navigator.language,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          utm_source: params.get("utm_source"),
          utm_medium: params.get("utm_medium"),
          utm_campaign: params.get("utm_campaign"),
        });

        if (error) {
          console.error("Erro ao criar sessão de analytics:", error);
          return null;
        }
        localStorage.setItem(SESSION_KEY, id);
        return id;
      } catch (err) {
        console.error("Erro ao iniciar analytics:", err);
        return null;
      }
    })();
  }
  return sessionPromise;
}

export async function trackEvent(
  eventType: string,
  opts: { pagePath?: string; productId?: string; metadata?: Record<string, any> } = {}
) {
  try {
    const sessionId = await ensureSession();
    if (!sessionId) return; // sem consentimento — não rastreia nada

    const { data: userData } = await supabase.auth.getUser();

    await supabase.from("analytics_events").insert({
      session_id: sessionId,
      user_id: userData?.user?.id ?? null,
      event_type: eventType,
      page_path: opts.pagePath ?? window.location.pathname,
      product_id: opts.productId ?? null,
      metadata: opts.metadata ?? {},
    });

    await supabase
      .from("analytics_sessions")
      .update({ last_seen_at: new Date().toISOString() })
      .eq("id", sessionId);
  } catch (err) {
    console.error("Erro ao registar evento de analytics:", err);
  }
}

export function trackPageView(pagePath: string) {
  void trackEvent("page_view", { pagePath });
}
