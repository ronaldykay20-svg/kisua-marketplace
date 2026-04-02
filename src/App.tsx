import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
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
import VenderKwanza from "./pages/VenderKwanza.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
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
          <Route path="/conta" element={<MinhaConta />} />
          <Route path="/pedidos" element={<Pedidos />} />
          <Route path="/favoritos" element={<Favoritos />} />
          <Route path="/ajuda" element={<Ajuda />} />
          <Route path="/vender" element={<VenderKwanza />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
