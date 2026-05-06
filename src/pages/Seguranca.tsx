import { Shield, ChevronLeft, Key, Mail, Eye, EyeOff } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const Seguranca = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleChangePassword = async () => {
    if (password.length < 6) { toast.error("Mínimo 6 caracteres"); return; }
    if (password !== confirmPassword) { toast.error("As palavras-passe não coincidem"); return; }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Palavra-passe atualizada!");
    setShowPasswordForm(false);
    setPassword("");
    setConfirmPassword("");
  };

  return (
    <div className="min-h-screen bg-background pb-14 md:pb-0">
      <div className="container mx-auto px-3 py-4 max-w-lg">
        <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-sm text-muted-foreground mb-4">
          <ChevronLeft className="w-4 h-4" /> Voltar
        </button>
        <h1 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
          <Shield className="w-5 h-5 text-primary" /> Segurança
        </h1>

        <div className="bg-card rounded-lg border border-border divide-y divide-border mb-4">
          <div className="px-4 py-3">
            <div className="flex items-center gap-3">
              <Mail className="w-5 h-5 text-primary" />
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">Email</p>
                <p className="text-xs text-muted-foreground">{user?.email}</p>
              </div>
            </div>
          </div>
          <button onClick={() => setShowPasswordForm(!showPasswordForm)} className="w-full px-4 py-3 flex items-center gap-3 hover:bg-muted transition">
            <Key className="w-5 h-5 text-primary" />
            <div className="flex-1 text-left">
              <p className="text-sm font-medium text-foreground">Alterar palavra-passe</p>
              <p className="text-[10px] text-muted-foreground">Atualize a sua palavra-passe</p>
            </div>
          </button>
        </div>

        {showPasswordForm && (
          <div className="bg-card rounded-lg border border-border p-4 space-y-3">
            <div className="relative">
              <input type={showPw ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)} placeholder="Nova palavra-passe"
                className="w-full px-3 py-2 pr-10 text-sm bg-background border border-border rounded-lg text-foreground" />
              <button onClick={() => setShowPw(!showPw)} className="absolute right-3 top-2.5 text-muted-foreground">
                {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Confirmar palavra-passe"
              className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg text-foreground" />
            <button onClick={handleChangePassword} disabled={loading}
              className="w-full py-2 bg-primary text-primary-foreground text-sm font-bold rounded-lg disabled:opacity-50">
              {loading ? "A atualizar..." : "Atualizar palavra-passe"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Seguranca;
