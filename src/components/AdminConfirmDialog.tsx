import { useState } from "react";
import { AlertTriangle, Lock, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface AdminConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Título curto da ação, ex: "Eliminar conta" */
  title: string;
  /** Explicação do que vai acontecer */
  description: string;
  /**
   * Se definido, exige que o admin reescreva exactamente este texto no 1º passo
   * (nome do utilizador, da empresa, etc). Se omitido, salta directo para a senha.
   */
  confirmText?: string;
  /** Rótulo do campo de reescrita, ex: "nome do utilizador" */
  confirmLabel?: string;
  /** Texto do botão final de confirmação */
  actionLabel?: string;
  /** Estilo perigoso (vermelho) ou neutro */
  variant?: "danger" | "default";
  onConfirm: () => Promise<void> | void;
}

const AdminConfirmDialog = ({
  open,
  onOpenChange,
  title,
  description,
  confirmText,
  confirmLabel = "nome",
  actionLabel = "Confirmar",
  variant = "danger",
  onConfirm,
}: AdminConfirmDialogProps) => {
  const { user } = useAuth();
  const [step, setStep] = useState<1 | 2>(confirmText ? 1 : 2);
  const [nameInput, setNameInput] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const reset = () => {
    setStep(confirmText ? 1 : 2);
    setNameInput("");
    setPassword("");
    setError("");
    setLoading(false);
  };

  const close = () => {
    reset();
    onOpenChange(false);
  };

  const handleStep1Continue = () => {
    if (nameInput.trim() !== confirmText?.trim()) {
      setError("O texto não corresponde. Reescreve exactamente como está indicado.");
      return;
    }
    setError("");
    setStep(2);
  };

  const handleFinalConfirm = async () => {
    if (!password) {
      setError("Introduz a tua palavra-passe de administrador.");
      return;
    }
    if (!user?.email) {
      setError("Sessão inválida. Inicia sessão novamente.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      // Reautentica o admin com a própria senha, sem afectar a navegação actual.
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password,
      });
      if (authError) {
        setError("Palavra-passe incorrecta.");
        setLoading(false);
        return;
      }
      await onConfirm();
      close();
    } catch (e: any) {
      toast.error(e.message || "Ocorreu um erro ao executar a acção.");
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => (v ? onOpenChange(true) : close())}>
      <DialogContent className="max-w-sm rounded-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className={`w-5 h-5 ${variant === "danger" ? "text-red-500" : "text-amber-500"}`} />
            {title}
          </DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        {step === 1 && confirmText ? (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Para confirmar, reescreve o {confirmLabel} abaixo:
            </p>
            <p className="text-sm font-bold text-foreground bg-muted rounded-lg px-3 py-2 select-all break-all">
              {confirmText}
            </p>
            <input
              autoFocus
              value={nameInput}
              onChange={(e) => { setNameInput(e.target.value); setError(""); }}
              placeholder={`Reescreve o ${confirmLabel}`}
              className="w-full px-3 py-2.5 rounded-xl bg-card border border-border text-sm text-foreground"
            />
            {error && <p className="text-xs text-red-500">{error}</p>}
            <div className="flex gap-2 pt-1">
              <button onClick={close} className="flex-1 py-2.5 rounded-xl border border-border text-sm font-bold text-foreground">
                Cancelar
              </button>
              <button
                onClick={handleStep1Continue}
                disabled={!nameInput}
                className="flex-1 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-bold disabled:opacity-50"
              >
                Continuar
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5" /> Introduz a tua palavra-passe de administrador para finalizar.
            </p>
            <input
              autoFocus
              type="password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError(""); }}
              placeholder="Palavra-passe"
              onKeyDown={(e) => e.key === "Enter" && handleFinalConfirm()}
              className="w-full px-3 py-2.5 rounded-xl bg-card border border-border text-sm text-foreground"
            />
            {error && <p className="text-xs text-red-500">{error}</p>}
            <div className="flex gap-2 pt-1">
              <button onClick={close} className="flex-1 py-2.5 rounded-xl border border-border text-sm font-bold text-foreground">
                Cancelar
              </button>
              <button
                onClick={handleFinalConfirm}
                disabled={loading || !password}
                className={`flex-1 py-2.5 rounded-xl text-sm font-bold text-primary-foreground disabled:opacity-50 flex items-center justify-center gap-1.5 ${
                  variant === "danger" ? "bg-red-500" : "bg-primary"
                }`}
              >
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                {actionLabel}
              </button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default AdminConfirmDialog;
