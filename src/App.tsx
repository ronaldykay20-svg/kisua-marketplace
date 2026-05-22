const Footer = () => {
  const whatsappPath = "M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z";

  return (
    <footer className="bg-[#5C3A1E] text-[#f5e6d3] mt-6">
      <div className="container mx-auto px-4 py-10">

        <div className="flex items-center gap-3 mb-6">
          <div>
            <div className="text-xl font-bold text-white">
              Ango<span className="text-[#F5A623]">Express</span>
            </div>
            <p className="text-xs text-[#c9a98a] mt-1">O marketplace de Angola</p>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-white/10 rounded-lg px-3 py-2 text-xs text-[#c9a98a] mb-6 w-fit">
          <span>📍</span>
          <span>Luanda, Angola · Entregas em todo o país</span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
          <div>
            <h4 className="text-xs font-bold text-[#F5A623] uppercase tracking-wide mb-3">Comprar</h4>
            <ul className="space-y-2 text-[13px]">
              <li><a href="#" className="text-[#d9bfa5] hover:text-white">Como comprar</a></li>
              <li><a href="#" className="text-[#d9bfa5] hover:text-white">Formas de pagamento</a></li>
              <li><a href="#" className="text-[#d9bfa5] hover:text-white">Entrega e frete</a></li>
              <li><a href="#" className="text-[#d9bfa5] hover:text-white">Devoluções</a></li>
            </ul>
          </div>
          <div>
            <h4 className="text-xs font-bold text-[#F5A623] uppercase tracking-wide mb-3">Vender</h4>
            <ul className="space-y-2 text-[13px]">
              <li><a href="#" className="text-[#d9bfa5] hover:text-white">Como vender</a></li>
              <li><a href="#" className="text-[#d9bfa5] hover:text-white">Comissões</a></li>
              <li><a href="#" className="text-[#d9bfa5] hover:text-white">Loja verificada</a></li>
              <li><a href="#" className="text-[#d9bfa5] hover:text-white">Dashboard vendedor</a></li>
            </ul>
          </div>
          <div>
            <h4 className="text-xs font-bold text-[#F5A623] uppercase tracking-wide mb-3">Suporte</h4>
            <ul className="space-y-2 text-[13px]">
              <li><a href="#" className="text-[#d9bfa5] hover:text-white">Central de ajuda</a></li>
              <li>
                
                  href="https://wa.me/244958348564"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#d9bfa5] hover:text-white"
                >
                  WhatsApp
                </a>
              </li>
              <li><a href="#" className="text-[#d9bfa5] hover:text-white">Reportar problema</a></li>
            </ul>
          </div>
          <div>
            <h4 className="text-xs font-bold text-[#F5A623] uppercase tracking-wide mb-3">Empresa</h4>
            <ul className="space-y-2 text-[13px]">
              <li><a href="#" className="text-[#d9bfa5] hover:text-white">Sobre nós</a></li>
              <li><a href="#" className="text-[#d9bfa5] hover:text-white">Termos de uso</a></li>
              <li><a href="#" className="text-[#d9bfa5] hover:text-white">Privacidade</a></li>
              <li><a href="#" className="text-[#d9bfa5] hover:text-white">Blog</a></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-white/10 pt-6 mb-4">
          <p className="text-xs text-[#c9a98a] mb-3">Siga-nos</p>
          <div className="flex gap-3">
            
              href="https://www.facebook.com/profile.php?id=61580887037719"
              target="_blank"
              rel="noopener noreferrer"
              className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
              aria-label="Facebook"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/>
              </svg>
            </a>
            
              href="https://www.instagram.com/ronaldo_nunes470"
              target="_blank"
              rel="noopener noreferrer"
              className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
              aria-label="Instagram"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
                <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
                <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/>
              </svg>
            </a>
            
              href="https://wa.me/244958348564"
              target="_blank"
              rel="noopener noreferrer"
              className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
              aria-label="WhatsApp"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d={whatsappPath}/>
              </svg>
            </a>
          </div>
        </div>

        <div className="text-center text-[11px] text-[#a07855]">
          <p>© 2026 AngoExpress · Todos os direitos reservados · 🇦🇴 Feito em Angola</p>
        </div>

      </div>
    </footer>
  );
};

export default Footer;
