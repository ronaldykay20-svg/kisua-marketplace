import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Facebook, Instagram, Youtube, Twitter, Linkedin, MessageCircle, Music2, MapPin, ShieldCheck } from "lucide-react";

const SOCIAL_DEFS = [
  { key: "social_facebook_url", label: "Facebook", Icon: Facebook },
  { key: "social_instagram_url", label: "Instagram", Icon: Instagram },
  { key: "social_whatsapp_url", label: "WhatsApp", Icon: MessageCircle },
  { key: "social_tiktok_url", label: "TikTok", Icon: Music2 },
  { key: "social_youtube_url", label: "YouTube", Icon: Youtube },
  { key: "social_twitter_url", label: "X", Icon: Twitter },
  { key: "social_linkedin_url", label: "LinkedIn", Icon: Linkedin },
] as const;

const useSocials = () => {
  return useQuery({
    queryKey: ["site_settings_socials"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("site_settings")
        .select("key, value")
        .in("key", SOCIAL_DEFS.map((s) => s.key));
      if (error) throw error;
      const map: Record<string, string> = {};
      (data || []).forEach((r: any) => { if (r.value) map[r.key] = r.value; });
      return map;
    },
    staleTime: 5 * 60 * 1000,
  });
};

const Footer = () => {
  const { data: socials = {} } = useSocials();
  const active = SOCIAL_DEFS.filter((s) => socials[s.key]);

  return (
    <footer className="mt-8 bg-gradient-to-b from-[#5C3A1E] to-[#3a2412] text-[#f5e6d3]">
      <div className="container mx-auto px-4 py-10">

        {/* Brand */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8">
          <div>
            <div className="text-2xl font-extrabold tracking-tight text-white">
              Ango<span className="text-secondary">Express</span>
            </div>
            <p className="text-xs text-[#d9bfa5] mt-1">O marketplace de Angola.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-1.5 bg-white/10 rounded-full px-3 py-1.5 text-[11px] text-[#f0d6b8]">
              <MapPin className="w-3.5 h-3.5" /> Luanda · Entregas em todo o país
            </span>
            <span className="inline-flex items-center gap-1.5 bg-white/10 rounded-full px-3 py-1.5 text-[11px] text-[#f0d6b8]">
              <ShieldCheck className="w-3.5 h-3.5 text-secondary" /> Compra segura
            </span>
          </div>
        </div>

        {/* Links */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
          <div>
            <h4 className="text-[11px] font-bold text-secondary uppercase tracking-wider mb-3">Comprar</h4>
            <ul className="space-y-2 text-[13px]">
              <li><a href="/como-comprar" className="text-[#d9bfa5] hover:text-white transition-colors">Como comprar</a></li>
              <li><a href="/formas-pagamento" className="text-[#d9bfa5] hover:text-white transition-colors">Formas de pagamento</a></li>
              <li><a href="/entrega-frete" className="text-[#d9bfa5] hover:text-white transition-colors">Entrega e frete</a></li>
              <li><a href="/devolucoes" className="text-[#d9bfa5] hover:text-white transition-colors">Devoluções</a></li>
            </ul>
          </div>
          <div>
            <h4 className="text-[11px] font-bold text-secondary uppercase tracking-wider mb-3">Vender</h4>
            <ul className="space-y-2 text-[13px]">
              <li><a href="/seja-fornecedor" className="text-[#d9bfa5] hover:text-white transition-colors">Como vender</a></li>
              <li><a href="#" className="text-[#d9bfa5] hover:text-white transition-colors">Comissões</a></li>
              <li><a href="#" className="text-[#d9bfa5] hover:text-white transition-colors">Loja verificada</a></li>
              <li><a href="#" className="text-[#d9bfa5] hover:text-white transition-colors">Painel do vendedor</a></li>
            </ul>
          </div>
          <div>
            <h4 className="text-[11px] font-bold text-secondary uppercase tracking-wider mb-3">Suporte</h4>
            <ul className="space-y-2 text-[13px]">
              <li><a href="/ajuda" className="text-[#d9bfa5] hover:text-white transition-colors">Central de ajuda</a></li>
              {socials.social_whatsapp_url && (
                <li><a href={socials.social_whatsapp_url} target="_blank" rel="noopener noreferrer" className="text-[#d9bfa5] hover:text-white transition-colors">WhatsApp</a></li>
              )}
              <li><a href="/reportar-problema" className="text-[#d9bfa5] hover:text-white transition-colors">Reportar problema</a></li>
            </ul>
          </div>
          <div>
            <h4 className="text-[11px] font-bold text-secondary uppercase tracking-wider mb-3">Empresa</h4>
            <ul className="space-y-2 text-[13px]">
              <li><a href="/sobre-nos" className="text-[#d9bfa5] hover:text-white transition-colors">Sobre nós</a></li>
              <li><a href="#" className="text-[#d9bfa5] hover:text-white transition-colors">Termos de uso</a></li>
              <li><a href="#" className="text-[#d9bfa5] hover:text-white transition-colors">Privacidade</a></li>
              <li><a href="#" className="text-[#d9bfa5] hover:text-white transition-colors">Blog</a></li>
            </ul>
          </div>
        </div>

        {/* Socials */}
        {active.length > 0 && (
          <div className="border-t border-white/10 pt-6 mb-6">
            <p className="text-[11px] font-bold text-secondary uppercase tracking-wider mb-3">Siga-nos</p>
            <div className="flex flex-wrap gap-2">
              {active.map(({ key, label, Icon }) => (
                <a
                  key={key}
                  href={socials[key]}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}
                  className="group w-10 h-10 rounded-xl bg-white/10 hover:bg-secondary hover:text-[#3a2412] flex items-center justify-center transition-all hover:-translate-y-0.5"
                >
                  <Icon className="w-4 h-4" />
                </a>
              ))}
            </div>
          </div>
        )}

        <div className="border-t border-white/10 pt-5 flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between text-[11px] text-[#a07855]">
          <p>© 2026 AngoExpress · Todos os direitos reservados</p>
          <p className="flex items-center gap-1">🇦🇴 Feito em Angola com orgulho</p>
        </div>

      </div>
    </footer>
  );
};

export default Footer;
