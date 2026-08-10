import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import carrinhoBtnImg from "@/assets/product-buttons/carrinho-btn.webp";
import comprarBtnImg from "@/assets/product-buttons/comprar-btn.webp";

createRoot(document.getElementById("root")!).render(<App />);

// ─── Pré-carrega os botões-imagem da página de produto ─────────────────────
// São só 22KB no total e aparecem em quase todas as visitas (qualquer
// produto). Sem isto, a imagem só começa a ser pedida quando a pessoa chega
// à página — e como o resto do conteúdo já está pronto nesse momento, cria
// um "pop" visível a meio segundo depois. Pré-carregando aqui, em segundo
// plano e só quando o browser está ocioso (não disputa banda com o que é
// crítico para o primeiro ecrã), garante que já estão em cache do browser
// muito antes de serem precisas.
const preloadProductButtons = () => {
  [carrinhoBtnImg, comprarBtnImg].forEach((src) => {
    const img = new Image();
    img.src = src;
  });
};
if ("requestIdleCallback" in window) {
  (window as any).requestIdleCallback(preloadProductButtons, { timeout: 3000 });
} else {
  setTimeout(preloadProductButtons, 1500);
}
