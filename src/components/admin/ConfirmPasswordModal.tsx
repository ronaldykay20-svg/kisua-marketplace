import { useState } from "react";
import { Lock, X, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface Props {
  // Título curto do que se está a confirmar (ex: "Atribuir Financeiro a Maria")
  actionLabel: string;
  onConfirm: () => void;
  onClose: () => void;
}

// Passo de segurança extra para atribuir/remover cargos: pede a password do
// admin actual antes de prosseguir. Usa signInWithPassword para verificar a
// password sem alterar a conta de ninguém — apenas confirma "és mesmo tu".
const ConfirmPasswordModal = ({ actionLabel, onConfirm, onClose }: Props) => {
  const { user } = useAuth();
  const [password, setPassword] = useState("");
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState("");

  const handleConfirm = async () => {
    if (!password) return;
    setChecking(true);
    setError("");
    try {
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: user!.email!,
        password,
      });
      if (authError) {
        setError("Password incorrecta.");
        setChecking(false);
        return;
      }
      onConfirm();
      onClose();
      toast.success("Confirmado");
    } catch (e: any) {
      setError(e.message || "Não foi possível confirmar.");
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 px-4" onClick={onClose}>
      <div
        className="bg-card border border-border rounded-2xl p-5 w-full max-w-sm shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-black text-foreground flex items-center gap-2">
            <Lock className="w-4 h-4 text-primary" /> Confirmar acção
          </h3>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-accent">
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        <p className="text-xs text-muted-foreground mb-3">
          Estás prestes a: <span className="font-bold text-foreground">{actionLabel}</span>.
          Insere a tua password de admin para confirmar.
        </p>

        <input
          type="password"
          autoFocus
          placeholder="A tua password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleConfirm()}
          className="w-full px-3 py-2 rounded-lg bg-muted border border-border text-base md:text-sm text-foreground mb-2"
        />
        {error && <p className="text-[11px] text-destructive mb-2">{error}</p>}

        <div className="flex gap-2 mt-2">
          <button
            onClick={onClose}
            className="flex-1 py-2 rounded-lg text-xs font-bold bg-muted text-foreground"
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            disabled={!password || checking}
            className="flex-1 py-2 rounded-lg text-xs font-bold bg-primary text-primary-foreground disabled:opacity-50 flex items-center justify-center gap-1.5"
          >
            {checking ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Confirmar"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmPasswordModal;
