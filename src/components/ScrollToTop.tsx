import { useEffect } from "react";
import { useLocation } from "react-router-dom";

/**
 * React Router (SPA) não repõe o scroll ao mudar de rota — ao contrário de
 * um site tradicional, onde cada página nova recomeça no topo. Sem isto,
 * navegar a partir de uma página com scroll (ex: tocar num link do rodapé
 * a meio da Home) faz a página nova carregar já scrollada, parecendo que
 * "não foi lá".
 *
 * Corre em toda a app porque está montado uma única vez dentro do
 * <BrowserRouter>, acima de <Routes> — não precisa de ser repetido em
 * cada página.
 */
const ScrollToTop = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" as ScrollBehavior });
  }, [pathname]);

  return null;
};

export default ScrollToTop;
