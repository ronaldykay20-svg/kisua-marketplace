import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, useLocation, Outlet } from "react-router-dom";
import { useEffect } from "react";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import NewNavbar from "@/components/NewNavbar";
import DesktopNavbar from "@/components/DesktopNavbar";
import BottomNav from "@/components/BottomNav";
import Footer from "@/components/Footer";
import CookieConsentBanner from "@/components/CookieConsentBanner";
import WelcomeCouponPopup from "@/components/WelcomeCouponPopup";
import AbandonedCartPopup from "@/components/AbandonedCartPopup";
import ErrorBoundary from "@/components/ErrorBoundary";
import ScrollToTop from "@/components/ScrollToTop";
import { trackPageView } from "@/lib/analytics";
import Index from "./pages/Index.tsx";
import ProductDetail from "./pages/ProductDetail.tsx";
import NotFound from "./pages/NotFound.tsx";
import Ranking from "./pages/Ranking.tsx";
import Empresas from "./pages/Empresas.tsx";
import EmpresaPerfil from "./pages/EmpresaPerfil.tsx";
import SearchResults from "./pages/SearchResults.tsx";
import Leilao from "./pages/Leilao.tsx";
import Live from "./pages/Live.tsx";
import Vendedores from "./pages/Vendedores.tsx";
import VendedorPerfil from "./pages/VendedorPerfil.tsx";
import Categorias from "./pages/Categorias.tsx";
import CategoriaDetalhe from "./pages/CategoriaDetalhe.tsx";
import Promocoes from "./pages/Promocoes.tsx";
import MinhaConta from "./pages/MinhaConta.tsx";
import Pedidos from "./pages/Pedidos.tsx";
import Favoritos from "./pages/Favoritos.tsx";
import Ajuda from "./pages/Ajuda.tsx";
import ComoComprar from "./pages/ComoComprar.tsx";
import FormasPagamento from "./pages/FormasPagamento.tsx";
import EntregaFrete from "./pages/EntregaFrete.tsx";
import Devolucoes from "./pages/Devolucoes.tsx";
import ReportarProblema from "./pages/ReportarProblema.tsx";
import SobreNos from "./pages/SobreNos.tsx";
import TermosUso from "./pages/TermosUso.tsx";
import Privacidade from "./pages/Privacidade.tsx";
import Comissoes from "./pages/Comissoes.tsx";
import LojasVerificadas from "./pages/LojasVerificadas.tsx";
import VenderKwanza from "./pages/VenderKwanza.tsx";
import Auth from "./pages/Auth.tsx";
import AdminPanel from "./pages/AdminPanel.tsx";
import OperacoesDashboard from "./pages/team/OperacoesDashboard.tsx";
import FinanceiroDashboard from "./pages/team/FinanceiroDashboard.tsx";
import LogisticaDashboard from "./pages/team/LogisticaDashboard.tsx";
import ParceirosDashboard from "./pages/team/ParceirosDashboard.tsx";
import MarketingDashboard from "./pages/team/MarketingDashboard.tsx";
import AdminPaymentAccounts from "./pages/AdminPaymentAccounts.tsx";
import AdminFullOrders from "./pages/AdminFullOrders.tsx";
import CentralDePedidos from "./pages/CentralDePedidos.tsx";
import Enderecos from "./pages/Enderecos.tsx";
import Pagamentos from "./pages/Pagamentos.tsx";
import Notificacoes from "./pages/Notificacoes.tsx";
import Seguranca from "./pages/Seguranca.tsx";
import Definicoes from "./pages/Definicoes.tsx";
import SellerDashboard from "./pages/SellerDashboard.tsx";
import CompanyDashboard from "./pages/CompanyDashboard.tsx";
import ModeratorPanel from "./pages/ModeratorPanel.tsx";
import Carrinho from "./pages/Carrinho.tsx";
import Checkout from "./pages/Checkout.tsx";
import PedidoDetalhe from "./pages/PedidoDetalhe.tsx";
import ProtectedRoute from "./components/ProtectedRoute.tsx";
import SejFornecedor from "./pages/SejFornecedor.tsx";
import FornecedorDashboard from "./pages/FornecedorDashboard.tsx";
import CriarLoja from "./pages/CriarLoja.tsx";
import DropshipDashboard from "./pages/DropshipDashboard.tsx";
import CatalogoFornecedores from "./pages/CatalogoFornecedores.tsx";

const queryClient = new QueryClient();

const HIDE_BOTTOM_NAV_PATHS = [/^\/produto\/.+/, /^\/checkout/, /^\/carrinho/, /^\/equipa\//];
const HIDE_HEADER_PATHS = [/^\/produto\/.+/, /^\/checkout/, /^\/carrinho/, /^\/equipa\//];
const HIDE_FOOTER_PATHS = [
  /^\/produto\/.+/,
  /^\/checkout/,
  /^\/admin/,
  /^\/painel-/,
  /^\/central-pedidos/,
  /^\/carrinho/,
  /^\/equipa\//,
];

// ── Layout partilhado ────────────────────────────────────────────────────
// Este componente é montado UMA ÚNICA VEZ, como "pai" de todas as rotas
// (ver <Route element={<Layout />}> mais abaixo). Só o conteúdo dentro de
// <Outlet /> é que muda quando navegas — o BottomNav, o cabeçalho, o
// rodapé e os popups NUNCA são destruídos/recriados ao mudar de página.
//
// Antes, cada rota tinha o seu <Layout><Pagina /></Layout> próprio, o que
// fazia o React destruir e recriar o BottomNav em CADA navegação. Tocar
// num botão do bottomnav destruía esse mesmo botão a meio do toque — daí
// a sensação de os botões "ficarem presos" / não responderem bem.
const Layout = () => {
  const location = useLocation();
  const hideBottomNav = HIDE_BOTTOM_NAV_PATHS.some((pattern) =>
    pattern.test(location.pathname)
  );
  const hideHeader = HIDE_HEADER_PATHS.some((pattern) =>
    pattern.test(location.pathname)
  );
  const hideFooter = HIDE_FOOTER_PATHS.some((pattern) =>
    pattern.test(location.pathname)
  );

  useEffect(() => {
    trackPageView(location.pathname);
  }, [location.pathname]);

  return (
    <div className={`min-h-screen bg-background ${hideBottomNav ? "" : "pb-14 md:pb-0"}`}>
      {!hideHeader && (
        <>
          <div className="md:hidden"><NewNavbar /></div>
          <DesktopNavbar />
        </>
      )}
      <ErrorBoundary key={location.pathname}>
        <Outlet />
      </ErrorBoundary>
      {!hideFooter && <Footer />}
      {!hideBottomNav && <BottomNav />}
      <CookieConsentBanner />
      <WelcomeCouponPopup />
      <AbandonedCartPopup />
    </div>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <ScrollToTop />
          <Routes>
            <Route element={<Layout />}>
              <Route path="/" element={<Index />} />
              <Route path="/produto/:id" element={<ProductDetail />} />
              <Route path="/ranking" element={<Ranking />} />
              <Route path="/empresas" element={<Empresas />} />
              <Route path="/empresa/:id" element={<EmpresaPerfil />} />
              <Route path="/pesquisa" element={<SearchResults />} />
              <Route path="/leilao" element={<Leilao />} />
              <Route path="/live" element={<Live />} />
              <Route path="/vendedores" element={<Vendedores />} />
              <Route path="/vendedor/:id" element={<VendedorPerfil />} />
              <Route path="/categorias" element={<Categorias />} />
              <Route path="/categoria/:nome" element={<CategoriaDetalhe />} />
              <Route path="/promocoes" element={<Promocoes />} />
              <Route path="/conta" element={<ProtectedRoute><MinhaConta /></ProtectedRoute>} />
              <Route path="/pedidos" element={<ProtectedRoute><Pedidos /></ProtectedRoute>} />
              <Route path="/pedido/:id" element={<ProtectedRoute><PedidoDetalhe /></ProtectedRoute>} />
              <Route path="/favoritos" element={<ProtectedRoute><Favoritos /></ProtectedRoute>} />
              <Route path="/ajuda" element={<Ajuda />} />
              <Route path="/como-comprar" element={<ComoComprar />} />
              <Route path="/formas-pagamento" element={<FormasPagamento />} />
              <Route path="/entrega-frete" element={<EntregaFrete />} />
              <Route path="/devolucoes" element={<Devolucoes />} />
              <Route path="/reportar-problema" element={<ReportarProblema />} />
              <Route path="/sobre-nos" element={<SobreNos />} />
              <Route path="/termos-uso" element={<TermosUso />} />
              <Route path="/privacidade" element={<Privacidade />} />
              <Route path="/comissoes" element={<Comissoes />} />
              <Route path="/lojas-verificadas" element={<LojasVerificadas />} />
              <Route path="/vender" element={<ProtectedRoute><VenderKwanza /></ProtectedRoute>} />
              <Route path="/enderecos" element={<ProtectedRoute><Enderecos /></ProtectedRoute>} />
              <Route path="/pagamentos" element={<ProtectedRoute><Pagamentos /></ProtectedRoute>} />
              <Route path="/notificacoes" element={<ProtectedRoute><Notificacoes /></ProtectedRoute>} />
              <Route path="/seguranca" element={<ProtectedRoute><Seguranca /></ProtectedRoute>} />
              <Route path="/definicoes" element={<ProtectedRoute><Definicoes /></ProtectedRoute>} />
              <Route path="/admin" element={<ProtectedRoute requiredRole="admin"><AdminPanel /></ProtectedRoute>} />
              <Route path="/equipa/operacoes" element={<ProtectedRoute requiredRole={["admin", "operacoes"]}><OperacoesDashboard /></ProtectedRoute>} />
              <Route path="/equipa/financeiro" element={<ProtectedRoute requiredRole={["admin", "financeiro"]}><FinanceiroDashboard /></ProtectedRoute>} />
              <Route path="/equipa/logistica" element={<ProtectedRoute requiredRole={["admin", "logistica"]}><LogisticaDashboard /></ProtectedRoute>} />
              <Route path="/equipa/parceiros" element={<ProtectedRoute requiredRole={["admin", "parceiros"]}><ParceirosDashboard /></ProtectedRoute>} />
              <Route path="/equipa/marketing" element={<ProtectedRoute requiredRole={["admin", "marketing"]}><MarketingDashboard /></ProtectedRoute>} />
              <Route path="/admin/contas-pagamento" element={<ProtectedRoute requiredRole="moderator"><AdminPaymentAccounts /></ProtectedRoute>} />
              <Route path="/admin/encomendas" element={<ProtectedRoute requiredRole="admin"><AdminFullOrders /></ProtectedRoute>} />
              <Route path="/central-pedidos" element={<ProtectedRoute><CentralDePedidos /></ProtectedRoute>} />
              <Route path="/painel-moderador" element={<ProtectedRoute requiredRole="moderator"><ModeratorPanel /></ProtectedRoute>} />
              <Route path="/carrinho" element={<ProtectedRoute><Carrinho /></ProtectedRoute>} />
              <Route path="/checkout" element={<ProtectedRoute><Checkout /></ProtectedRoute>} />
              <Route path="/painel-vendedor" element={<ProtectedRoute><SellerDashboard /></ProtectedRoute>} />
              <Route path="/painel-empresa" element={<ProtectedRoute><CompanyDashboard /></ProtectedRoute>} />
              <Route path="/seja-fornecedor" element={<SejFornecedor />} />
              <Route path="/painel-fornecedor" element={<ProtectedRoute><FornecedorDashboard /></ProtectedRoute>} />
              <Route path="/criar-loja" element={<ProtectedRoute><CriarLoja /></ProtectedRoute>} />
              <Route path="/painel-dropship" element={<ProtectedRoute><DropshipDashboard /></ProtectedRoute>} />
              <Route path="/catalogo-fornecedores" element={<ProtectedRoute><CatalogoFornecedores /></ProtectedRoute>} />
              <Route path="*" element={<NotFound />} />
            </Route>
            <Route path="/auth" element={<Auth />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
