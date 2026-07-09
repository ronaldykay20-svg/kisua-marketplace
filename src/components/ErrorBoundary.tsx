import { Component, ErrorInfo, ReactNode } from "react";
import { RefreshCw, Home } from "lucide-react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

// Apanha qualquer erro de render não tratado em qualquer página do site
// (ex: dados inesperados vindos do Supabase, bugs futuros, etc.) e mostra
// um ecrã de recuperação em vez de deixar o utilizador com uma tela branca.
class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Erro não tratado apanhado pelo ErrorBoundary:", error, errorInfo);
  }

  handleReload = () => {
    this.setState({ hasError: false });
    window.location.reload();
  };

  handleGoHome = () => {
    this.setState({ hasError: false });
    window.location.href = "/";
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          className="flex min-h-screen flex-col items-center justify-center px-6 text-center"
          style={{ background: "#f7f0ea" }}
        >
          <h1 className="mb-2 text-2xl font-bold text-[#1a0f07]">
            Algo correu mal
          </h1>
          <p className="mb-6 max-w-sm text-sm text-[#6b3a1f]">
            Ocorreu um erro inesperado nesta página. Podes tentar recarregar
            ou voltar ao início.
          </p>
          <div className="flex gap-3">
            <button
              onClick={this.handleReload}
              className="flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold text-white"
              style={{ background: "#6b3a1f" }}
            >
              <RefreshCw size={16} />
              Recarregar página
            </button>
            <button
              onClick={this.handleGoHome}
              className="flex items-center gap-2 rounded-full border px-5 py-2.5 text-sm font-semibold text-[#6b3a1f]"
              style={{ borderColor: "#6b3a1f" }}
            >
              <Home size={16} />
              Ir para o início
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
