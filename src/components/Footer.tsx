const Footer = () => {
  return (
    <footer className="bg-foreground text-primary-foreground/70 mt-6">
      <div className="container mx-auto px-4 py-10">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-1.5 mb-3">
              <span className="text-lg font-black text-primary-foreground">Kwanza</span>
              <span className="text-lg font-black text-secondary">Market</span>
            </div>
            <p className="text-xs leading-relaxed">
              O maior marketplace de Angola. Compre e venda de forma simples, segura e rápida.
            </p>
          </div>

          <div>
            <h4 className="text-xs font-bold text-primary-foreground mb-3">Comprar</h4>
            <ul className="space-y-1.5 text-[11px]">
              <li><a href="#" className="hover:text-primary-foreground">Como comprar</a></li>
              <li><a href="#" className="hover:text-primary-foreground">Formas de pagamento</a></li>
              <li><a href="#" className="hover:text-primary-foreground">Entrega e frete</a></li>
              <li><a href="#" className="hover:text-primary-foreground">Devoluções</a></li>
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-bold text-primary-foreground mb-3">Vender</h4>
            <ul className="space-y-1.5 text-[11px]">
              <li><a href="#" className="hover:text-primary-foreground">Como vender</a></li>
              <li><a href="#" className="hover:text-primary-foreground">Taxas e comissões</a></li>
              <li><a href="#" className="hover:text-primary-foreground">Verificar página</a></li>
              <li><a href="#" className="hover:text-primary-foreground">Central do vendedor</a></li>
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-bold text-primary-foreground mb-3">Empresa</h4>
            <ul className="space-y-1.5 text-[11px]">
              <li><a href="#" className="hover:text-primary-foreground">Sobre nós</a></li>
              <li><a href="#" className="hover:text-primary-foreground">Blog</a></li>
              <li><a href="#" className="hover:text-primary-foreground">Termos</a></li>
              <li><a href="#" className="hover:text-primary-foreground">Privacidade</a></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-primary-foreground/10 pt-6 text-center text-[10px]">
          <p>© 2026 Kwanza Market. Todos os direitos reservados. 🇦🇴 Feito em Angola.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
