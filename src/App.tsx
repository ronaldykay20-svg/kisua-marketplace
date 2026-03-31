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
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
