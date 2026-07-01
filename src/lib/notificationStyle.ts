import {
  XCircle, CheckCircle2, AlertTriangle, ShoppingBag, Tag, Bell, Package, Truck,
} from "lucide-react";

export type NotificationTone = "red" | "green" | "amber" | "blue" | "purple" | "slate";

export interface NotificationStyle {
  tone: NotificationTone;
  Icon: any;
  label: string;
  bg: string;          // fundo do card
  border: string;       // borda esquerda de destaque
  iconBg: string;       // fundo do círculo do ícone
  iconText: string;     // cor do ícone
  titleText: string;    // cor do título quando não lida
  dot: string;           // cor do ponto "não lida"
}

// Classifica a notificação por cor/ícone, com base no tipo e em palavras-chave
// no título/mensagem. Mantém a mesma lógica em toda a app (sino do cabeçalho,
// página de Notificações, Central de Pedidos) para nunca haver cores diferentes
// para o mesmo tipo de aviso.
export const classifyNotification = (n: { type?: string; title?: string; message?: string }): NotificationStyle => {
  const text = `${n.title || ""} ${n.message || ""}`.toLowerCase();

  // Vermelho — problemas graves: cancelamento, rejeição, pagamento não confirmado
  if (
    text.includes("cancelad") || text.includes("rejeitad") ||
    text.includes("não confirmada") || text.includes("nao confirmada") ||
    text.includes("problema") || text.includes("não compat")
  ) {
    return {
      tone: "red", Icon: XCircle, label: "Urgente",
      bg: "bg-red-500/5", border: "border-l-red-500", iconBg: "bg-red-500/10",
      iconText: "text-red-500", titleText: "text-red-600", dot: "bg-red-500",
    };
  }

  // Verde — confirmações positivas: pagamento aprovado, entrega concluída
  if (
    text.includes("confirmado") || text.includes("aprovado") ||
    text.includes("entregue") || text.includes("sucesso")
  ) {
    return {
      tone: "green", Icon: CheckCircle2, label: "Confirmado",
      bg: "bg-green-500/5", border: "border-l-green-500", iconBg: "bg-green-500/10",
      iconText: "text-green-600", titleText: "text-green-700", dot: "bg-green-500",
    };
  }

  // Âmbar — avisos da administração / algo pendente de ação
  if (
    text.includes("aviso da administra") || text.includes("reenvie") ||
    text.includes("pendente") || text.includes("atenção") || text.includes("atencao")
  ) {
    return {
      tone: "amber", Icon: AlertTriangle, label: "Aviso",
      bg: "bg-amber-500/5", border: "border-l-amber-500", iconBg: "bg-amber-500/10",
      iconText: "text-amber-600", titleText: "text-amber-700", dot: "bg-amber-500",
    };
  }

  // Azul — novo pedido / nova venda recebida
  if (text.includes("novo pedido") || text.includes("recebido") || text.includes("nova venda")) {
    return {
      tone: "blue", Icon: ShoppingBag, label: "Pedido",
      bg: "bg-blue-500/5", border: "border-l-blue-500", iconBg: "bg-blue-500/10",
      iconText: "text-blue-600", titleText: "text-blue-700", dot: "bg-blue-500",
    };
  }

  // Roxo — promoções e marketing
  if (n.type === "promo" || n.type === "marketing" || text.includes("promo")) {
    return {
      tone: "purple", Icon: Tag, label: "Promoção",
      bg: "bg-purple-500/5", border: "border-l-purple-500", iconBg: "bg-purple-500/10",
      iconText: "text-purple-600", titleText: "text-purple-700", dot: "bg-purple-500",
    };
  }

  // Envio/entrega (fallback para tipo "order" genérico não coberto acima)
  if (n.type === "order") {
    return {
      tone: "blue", Icon: Package, label: "Pedido",
      bg: "bg-blue-500/5", border: "border-l-blue-500", iconBg: "bg-blue-500/10",
      iconText: "text-blue-600", titleText: "text-blue-700", dot: "bg-blue-500",
    };
  }

  // Cinza — sistema/genérico
  return {
    tone: "slate", Icon: Bell, label: "Sistema",
    bg: "bg-slate-500/5", border: "border-l-slate-400", iconBg: "bg-slate-500/10",
    iconText: "text-slate-500", titleText: "text-foreground", dot: "bg-slate-400",
  };
};
