const Footer = () => {
  return (
    <footer className="bg-foreground text-primary-foreground/70 py-16">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center font-heading font-bold text-primary-foreground text-lg"
                style={{ background: 'var(--hero-gradient)' }}>
                K
              </div>
              <span className="font-heading font-bold text-xl text-primary-foreground">
                KwanzaMarket
              </span>
            </div>
            <p className="text-sm leading-relaxed">
              O melhor marketplace de Angola. Compre e venda de forma simples e segura.
            </p>
          </div>

          <div>
            <h4 className="font-heading font-semibold text-primary-foreground mb-4">Categorias</h4>
            <ul className="space-y-2 text-sm">
              <li><a href="#" className="hover:text-primary-foreground transition-colors">Veículos</a></li>
              <li><a href="#" className="hover:text-primary-foreground transition-colors">Imóveis</a></li>
              <li><a href="#" className="hover:text-primary-foreground transition-colors">Electrónicos</a></li>
              <li><a href="#" className="hover:text-primary-foreground transition-colors">Moda</a></li>
            </ul>
          </div>

          <div>
            <h4 className="font-heading font-semibold text-primary-foreground mb-4">Suporte</h4>
            <ul className="space-y-2 text-sm">
              <li><a href="#" className="hover:text-primary-foreground transition-colors">Centro de ajuda</a></li>
              <li><a href="#" className="hover:text-primary-foreground transition-colors">Segurança</a></li>
              <li><a href="#" className="hover:text-primary-foreground transition-colors">Contacto</a></li>
              <li><a href="#" className="hover:text-primary-foreground transition-colors">FAQ</a></li>
            </ul>
          </div>

          <div>
            <h4 className="font-heading font-semibold text-primary-foreground mb-4">Empresa</h4>
            <ul className="space-y-2 text-sm">
              <li><a href="#" className="hover:text-primary-foreground transition-colors">Sobre nós</a></li>
              <li><a href="#" className="hover:text-primary-foreground transition-colors">Blog</a></li>
              <li><a href="#" className="hover:text-primary-foreground transition-colors">Carreiras</a></li>
              <li><a href="#" className="hover:text-primary-foreground transition-colors">Termos</a></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-primary-foreground/10 pt-8 text-center text-sm">
          <p>© 2026 Kwanza Market. Todos os direitos reservados. Feito com ❤️ em Angola.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
