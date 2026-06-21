import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, useLocation } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import NewNavbar from "@/components/NewNavbar";
import DesktopNavbar from "@/components/DesktopNavbar";
import BottomNav from "@/components/BottomNav";
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
import VenderKwanza from "./pages/VenderKwanza.tsx";
import Auth from "./pages/Auth.tsx";
import AdminPanel from "./pages/AdminPanel.tsx";
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

// Rotas onde o BottomNav não deve aparecer
const HIDE_BOTTOM_NAV_PATHS = [/^\/produto\/.+/];

// Layout global — navbar mobile + navbar tablet/desktop + conteúdo + bottom nav
const Layout = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();
  const hideBottomNav = HIDE_BOTTOM_NAV_PATHS.some((pattern) =>
    pattern.test(location.pathname)
  );

  return (
    <div className={`min-h-screen bg-background ${hideBottomNav ? "" : "pb-14 md:pb-0"}`}>
      {/* Mobile: NewNavbar (visível só em ecrãs < md) */}
      <div className="md:hidden">
        <NewNavbar />
      </div>
      {/* Tablet + Desktop: DesktopNavbar (visível só em ecrãs ≥ md) */}
      <DesktopNavbar />
      {children}
      {!hideBottomNav && <BottomNav />}
    </div>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Layout><Index /></Layout>} />
            <Route path="/produto/:id" element={<Layout><ProductDetail /></Layout>} />
            <Route path="/ranking" element={<Layout><Ranking /></Layout>} />
            <Route path="/empresas" element={<Layout><Empresas /></Layout>} />
            <Route path="/empresa/:id" element={<Layout><EmpresaPerfil /></Layout>} />
            <Route path="/pesquisa" element={<Layout><SearchResults /></Layout>} />
            <Route path="/leilao" element={<Layout><Leilao /></Layout>} />
            <Route path="/live" element={<Layout><Live /></Layout>} />
            <Route path="/vendedores" element={<Layout><Vendedores /></Layout>} />
            <Route path="/vendedor/:id" element={<Layout><VendedorPerfil /></Layout>} />
            <Route path="/categorias" element={<Layout><Categorias /></Layout>} />
            <Route path="/categoria/:nome" element={<Layout><CategoriaDetalhe /></Layout>} />
            <Route path="/promocoes" element={<Layout><Promocoes /></Layout>} />
            <Route path="/conta" element={<Layout><ProtectedRoute><MinhaConta /></ProtectedRoute></Layout>} />
            <Route path="/pedidos" element={<Layout><ProtectedRoute><Pedidos /></ProtectedRoute></Layout>} />
            <Route path="/pedido/:id" element={<Layout><ProtectedRoute><PedidoDetalhe /></ProtectedRoute></Layout>} />
            <Route path="/favoritos" element={<Layout><ProtectedRoute><Favoritos /></ProtectedRoute></Layout>} />
            <Route path="/ajuda" element={<Layout><Ajuda /></Layout>} />
            <Route path="/como-comprar" element={<Layout><ComoComprar /></Layout>} />
            <Route path="/formas-pagamento" element={<Layout><FormasPagamento /></Layout>} />
            <Route path="/entrega-frete" element={<Layout><EntregaFrete /></Layout>} />
            <Route path="/devolucoes" element={<Layout><Devolucoes /></Layout>} />
            <Route path="/vender" element={<Layout><ProtectedRoute><VenderKwanza /></ProtectedRoute></Layout>} />
            <Route path="/enderecos" element={<Layout><ProtectedRoute><Enderecos /></ProtectedRoute></Layout>} />
            <Route path="/pagamentos" element={<Layout><ProtectedRoute><Pagamentos /></ProtectedRoute></Layout>} />
            <Route path="/notificacoes" element={<Layout><ProtectedRoute><Notificacoes /></ProtectedRoute></Layout>} />
            <Route path="/seguranca" element={<Layout><ProtectedRoute><Seguranca /></ProtectedRoute></Layout>} />
            <Route path="/definicoes" element={<Layout><ProtectedRoute><Definicoes /></ProtectedRoute></Layout>} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/admin" element={<Layout><ProtectedRoute requiredRole="admin"><AdminPanel /></ProtectedRoute></Layout>} />
            <Route path="/painel-vendedor" element={<Layout><ProtectedRoute><SellerDashboard /></ProtectedRoute></Layout>} />
            <Route path="/painel-empresa" element={<Layout><ProtectedRoute><CompanyDashboard /></ProtectedRoute></Layout>} />
            <Route path="/painel-moderador" element={<Layout><ProtectedRoute requiredRole="moderator"><ModeratorPanel /></ProtectedRoute></Layout>} />
            <Route path="/carrinho" element={<Layout><Carrinho /></Layout>} />
            <Route path="/checkout" element={<Layout><ProtectedRoute><Checkout /></ProtectedRoute></Layout>} />
            <Route path="/seja-fornecedor" element={<Layout><ProtectedRoute><SejFornecedor /></ProtectedRoute></Layout>} />
            <Route path="/painel-fornecedor" element={<Layout><ProtectedRoute><FornecedorDashboard /></ProtectedRoute></Layout>} />
            <Route path="/criar-loja" element={<Layout><ProtectedRoute><CriarLoja /></ProtectedRoute></Layout>} />
            <Route path="/painel-dropship" element={<Layout><ProtectedRoute><DropshipDashboard /></ProtectedRoute></Layout>} />
            <Route path="/catalogo-fornecedores" element={<Layout><ProtectedRoute><CatalogoFornecedores /></ProtectedRoute></Layout>} />
            <Route path="*" element={<Layout><NotFound /></Layout>} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
