import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { mcpPlugin } from "@lovable.dev/mcp-js/stacks/supabase/vite";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [react(), mode === "development" && componentTagger(), mcpPlugin()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime"],
  },
  build: {
    rollupOptions: {
      output: {
        // Antes, TODO o código de bibliotecas (React, Supabase, Radix, ícones,
        // etc.) ia misturado com o código da app num único ficheiro "index"
        // de 764 KB, carregado em TODAS as páginas. Como esse ficheiro mudava
        // a cada deploy (mesmo só alterando um botão), o telemóvel do
        // utilizador tinha de descarregar tudo de novo sempre — nunca
        // aproveitava o cache do browser.
        //
        // Agora separamos as bibliotecas (que quase nunca mudam) em
        // ficheiros próprios. Na primeira visita o total descarregado é
        // semelhante, mas em visitas seguintes e após cada novo deploy, o
        // telemóvel só descarrega o pequeno ficheiro de código da app —
        // React, Supabase, Radix e os ícones ficam em cache.
        manualChunks(id) {
          if (!id.includes("node_modules")) return undefined;
          // Só isolamos bibliotecas usadas na parte "sempre carregada" da
          // app (navbar, footer, home, auth). Tudo o resto fica como o Vite
          // já divide por rota — nunca metemos aqui bibliotecas pesadas de
          // páginas lazy (ex: xlsx, recharts), senão elas passam a carregar
          // em TODAS as páginas em vez de só na sua própria rota.
          if (id.includes("node_modules/react-dom") || id.includes("node_modules/scheduler")) return "vendor-react";
          if (id.includes("node_modules/react/")) return "vendor-react";
          if (id.includes("node_modules/react-router")) return "vendor-react";
          if (id.includes("@supabase")) return "vendor-supabase";
          if (id.includes("@radix-ui")) return "vendor-radix";
          if (id.includes("@tanstack")) return "vendor-query";
          if (id.includes("lucide-react")) return "vendor-icons";
          return undefined;
        },
      },
    },
  },
}));
