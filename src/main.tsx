import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// NOTA: já não é preciso pré-carregar os botões-imagem da página de produto
// aqui — deixaram de ser ficheiros à parte. Agora vêm embutidos directamente
// dentro do JavaScript da própria página de produto (ver import "?inline"
// em src/pages/ProductDetail.tsx), por isso chegam sempre juntos com o
// resto do código, sem pedido de rede separado nem necessidade de preload.

createRoot(document.getElementById("root")!).render(<App />);
