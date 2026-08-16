import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, useLocation, Outlet } from "react-router-dom";
import { useEffect, lazy, Suspense } from "react";
import { TEAM_ROLES } from "@/hooks/useUserRole";
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
import ProtectedRoute from "./components/ProtectedRoute.tsx";

// A home continua no bundle principal (é a primeira coisa que se vê).
import Index from "./pages/Index.tsx";

// ── Code splitting ────────────────────────────────────────────────────────
// Antes, TODAS as páginas (admin, painéis, checkout, etc.) eram importadas de
// forma estática — o browser tinha de descarregar e executar megabytes de JS
// antes de mostrar a home, e daí a app "colar". Agora cada rota é um chunk
// separado, carregado só quando o utilizador vai lá.
const ProductDetail = lazy(() => import("./pages/ProductDetail.tsx"));
const NotFound = lazy(() => import("./pages/NotFound.tsx"));
const Ranking = lazy(() => import("./pages/Ranking.tsx"));
const Empresas = lazy(() => import("./pages/Empresas.tsx"));
const EmpresaPerfil = lazy(() => import("./pages/EmpresaPerfil.tsx"));
const SearchResults = lazy(() => import("./pages/SearchResults.tsx"));
const Leilao = lazy(() => import("./pages/Leilao.tsx"));
const Live = lazy(() => import("./pages/Live.tsx"));
const Vendedores = lazy(() => import("./pages/Vendedores.tsx"));
const VendedorPerfil = lazy(() => import("./pages/VendedorPerfil.tsx"));
const Categorias = lazy(() => import("./pages/Categorias.tsx"));
const CategoriaDetalhe = lazy(() => import("./pages/CategoriaDetalhe.tsx"));
const Promocoes = lazy(() => import("./pages/Promocoes.tsx"));
const MinhaConta = lazy(() => import("./pages/MinhaConta.tsx"));
const Pedidos = lazy(() => import("./pages/Pedidos.tsx"));
const Favoritos = lazy(() => import("./pages/Favoritos.tsx"));
const Ajuda = lazy(() => import("./pages/Ajuda.tsx"));
const ComoComprar = lazy(() => import("./pages/ComoComprar.tsx"));
const FormasPagamento = lazy(() => import("./pages/FormasPagamento.tsx"));
const EntregaFrete = lazy(() => import("./pages/EntregaFrete.tsx"));
const Devolucoes = lazy(() => import("./pages/Devolucoes.tsx"));
const ReportarProblema = lazy(() => import("./pages/ReportarProblema.tsx"));
const SobreNos = lazy(() => import("./pages/SobreNos.tsx"));
const TermosUso = lazy(() => import("./pages/TermosUso.tsx"));
const Privacidade = lazy(() => import("./pages/Privacidade.tsx"));
const Comissoes = lazy(() => import("./pages/Comissoes.tsx"));
const LojasVerificadas = lazy(() => import("./pages/LojasVerificadas.tsx"));
const VenderKwanza = lazy(() => import("./pages/VenderKwanza.tsx"));
const Auth = lazy(() => import("./pages/Auth.tsx"));
const AdminPanel = lazy(() => import("./pages/AdminPanel.tsx"));
const AmbienteTeste = lazy(() => import("./pages/AmbienteTeste.tsx"));
const OperacoesDashboard = lazy(() => import("./pages/team/OperacoesDashboard.tsx"));
const FinanceiroDashboard = lazy(() => import("./pages/team/FinanceiroDashboard.tsx"));
const LogisticaDashboard = lazy(() => import("./pages/team/LogisticaDashboard.tsx"));
const ParceirosDashboard = lazy(() => import("./pages/team/ParceirosDashboard.tsx"));
const MarketingDashboard = lazy(() => import("./pages/team/MarketingDashboard.tsx"));
const AdminPaymentAccounts = lazy(() => import("./pages/AdminPaymentAccounts.tsx"));
const AdminFullOrders = lazy(() => import("./pages/AdminFullOrders.tsx"));
const CentralDePedidos = lazy(() => import("./pages/CentralDePedidos.tsx"));
const Enderecos = lazy(() => import("./pages/Enderecos.tsx"));
const Pagamentos = lazy(() => import("./pages/Pagamentos.tsx"));
const Notificacoes = lazy(() => import("./pages/Notificacoes.tsx"));
const Seguranca = lazy(() => import("./pages/Seguranca.tsx"));
const Definicoes = lazy(() => import("./pages/Definicoes.tsx"));
const SellerDashboard = lazy(() => import("./pages/SellerDashboard.tsx"));
const CompanyDashboard = lazy(() => import("./pages/CompanyDashboard.tsx"));
const ModeratorPanel = lazy(() => import("./pages/ModeratorPanel.tsx"));
const Carrinho = lazy(() => import("./pages/Carrinho.tsx"));
const Checkout = lazy(() => import("./pages/Checkout.tsx"));
const PedidoDetalhe = lazy(() => import("./pages/PedidoDetalhe.tsx"));
const SejFornecedor = lazy(() => import("./pages/SejFornecedor.tsx"));
const FornecedorDashboard = lazy(() => import("./pages/FornecedorDashboard.tsx"));
const CriarLoja = lazy(() => import("./pages/CriarLoja.tsx"));
const DropshipDashboard = lazy(() => import("./pages/DropshipDashboard.tsx"));
const CatalogoFornecedores = lazy(() => import("./pages/CatalogoFornecedores.tsx"));

const PageFallback = () => (
  <div className="flex items-center justify-center py-24">
    <div className="h-8 w-8 animate-spin rounded-full border-2 border-muted border-t-primary" />
  </div>
);

// Guardar resultados em cache durante 5 min e não refazer queries só porque a
// janela ganhou foco — antes, cada regresso ao separador disparava dezenas de
// pedidos em simultâneo e travava a interface.
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});


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
        <Suspense fallback={<PageFallback />}>
          <Outlet />
        </Suspense>
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
              <Route path="/admin" element={<ProtectedRoute requiredRole={["admin", ...TEAM_ROLES]}><AdminPanel /></ProtectedRoute>} />
              <Route path="/admin/ambiente-teste" element={<ProtectedRoute requiredRole="admin"><AmbienteTeste /></ProtectedRoute>} />
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
            <Route path="/auth" element={<Suspense fallback={<PageFallback />}><Auth /></Suspense>} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
