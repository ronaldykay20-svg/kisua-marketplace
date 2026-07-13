import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { convertToWebP, getFileExtension } from "@/lib/imageToWebp";
import { Image as ImageIcon, Upload, Shield, Plus, CheckCircle, XCircle, Eye, Trash2 } from "lucide-react";

// Extraído do AdminPanel.tsx para poder ser usado também no painel dedicado
// /equipa/marketing — comportamento idêntico, apenas ficheiro próprio.
const AdminLeiloesTab = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const heroFileRef = useRef<HTMLInputElement>(null);
  const [heroUploading, setHeroUploading] = useState(false);
  const [proofModal, setProofModal] = useState<any>(null);
  const [showMethodForm, setShowMethodForm] = useState(false);
  const [methodForm, setMethodForm] = useState({ type: "xpress", label: "", value: "", holder: "" });

  const { data: heroImage } = useQuery({
    queryKey: ["auction_hero_image"],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("auction_hero_image")
        .select("image_url")
        .limit(1)
        .maybeSingle();
      return data;
    },
  });

  const uploadHero = async (file: File) => {
    setHeroUploading(true);
    try {
      // Converte para WebP antes de enviar
      const webpFile = await convertToWebP(file, 0.8, 1600);
      const ext = getFileExtension(webpFile);
      const path = `hero-${Date.now()}.${ext}`;
      const { error: upErr } = await (supabase as any).storage
        .from("auction-hero")
        .upload(path, webpFile, { upsert: true });
      if (upErr) throw upErr;

      const { data: urlData } = (supabase as any).storage
        .from("auction-hero")
        .getPublicUrl(path);

      const { error } = await (supabase as any)
        .from("auction_hero_image")
        .upsert(
          { image_url: urlData.publicUrl, updated_by: user!.id },
          { onConflict: "id" }
        );
      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ["auction_hero_image"] });
      toast.success("Imagem hero atualizada!");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setHeroUploading(false);
    }
  };

  const { data: proofs = [] } = useQuery({
    queryKey: ["admin_bid_proofs"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("auction_bid_proofs")
        .select("*, profiles:user_id(full_name), auctions:auction_id(title)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    refetchInterval: 10000,
  });

  const { data: methods = [] } = useQuery({
    queryKey: ["auction_payment_methods"],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("auction_payment_methods")
        .select("*")
        .order("type");
      return data || [];
    },
  });

  const addMethod = useMutation({
    mutationFn: async () => {
      const { error } = await (supabase as any)
        .from("auction_payment_methods")
        .insert({ ...methodForm, label: methodForm.label || methodForm.type });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["auction_payment_methods"] });
      toast.success("Método adicionado!");
      setMethodForm({ type: "xpress", label: "", value: "", holder: "" });
      setShowMethodForm(false);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const toggleMethod = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await (supabase as any)
        .from("auction_payment_methods")
        .update({ is_active: active })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["auction_payment_methods"] }),
  });

  const deleteMethod = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from("auction_payment_methods")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["auction_payment_methods"] });
      toast.success("Removido");
    },
  });

  const reviewProof = useMutation({
    mutationFn: async ({ id, status, auctionId, userId, amount }: any) => {
      const { error } = await (supabase as any)
        .from("auction_bid_proofs")
        .update({ status, reviewed_by: user!.id, reviewed_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
      if (status === "approved") {
        await (supabase as any)
          .from("auction_bids")
          .insert({ auction_id: auctionId, user_id: userId, amount });
        await (supabase as any)
          .from("auctions")
          .update({ current_bid: amount })
          .eq("id", auctionId)
          .lt("current_bid", amount);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin_bid_proofs"] });
      queryClient.invalidateQueries({ queryKey: ["public_auctions"] });
      queryClient.invalidateQueries({ queryKey: ["auction_bids"] });
      setProofModal(null);
      toast.success("Comprovante processado!");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const getProofUrl = async (path: string) => {
    const { data } = await (supabase as any).storage
      .from("bid-proofs")
      .createSignedUrl(path, 60);
    return data?.signedUrl;
  };

  return (
    <>
      <div className="bg-card rounded-xl border border-border p-4 mb-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
            <ImageIcon className="w-4 h-4 text-primary" /> Imagem Hero do Leilão
          </h2>
          <button
            onClick={() => heroFileRef.current?.click()}
            disabled={heroUploading}
            className="text-xs font-bold text-primary flex items-center gap-1 disabled:opacity-50"
          >
            <Upload className="w-3.5 h-3.5" />
            {heroUploading ? "A enviar..." : heroImage?.image_url ? "Trocar imagem" : "Fazer upload"}
          </button>
          <input
            ref={heroFileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={e => {
              const f = e.target.files?.[0];
              if (f) uploadHero(f);
              e.target.value = "";
            }}
          />
        </div>

        {heroImage?.image_url ? (
          <div className="relative rounded-xl overflow-hidden border border-border">
            <img
              src={heroImage.image_url}
              alt="Hero do leilão"
              className="w-full object-cover"
              style={{ maxHeight: 200 }}
            />
            <div className="absolute bottom-0 left-0 right-0 px-3 py-2 text-[10px] text-white font-bold"
              style={{ background: "rgba(0,0,0,0.5)" }}>
              Imagem actual — clique em "Trocar imagem" para substituir
            </div>
          </div>
        ) : (
          <button
            onClick={() => heroFileRef.current?.click()}
            className="w-full border-2 border-dashed border-border rounded-xl p-8 flex flex-col items-center gap-2 hover:border-primary/50 hover:bg-primary/5 transition"
          >
            <Upload className="w-6 h-6 text-muted-foreground" />
            <p className="text-xs font-bold text-foreground">Nenhuma imagem definida</p>
            <p className="text-[10px] text-muted-foreground">
              Clique para fazer upload (JPG, PNG, WebP)
            </p>
          </button>
        )}
      </div>

      <div className="bg-card rounded-xl border border-border p-4 mb-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
            <Shield className="w-4 h-4 text-primary" /> Métodos de Pagamento
          </h2>
          <button
            onClick={() => setShowMethodForm(!showMethodForm)}
            className="text-xs font-bold text-primary flex items-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" /> Adicionar
          </button>
        </div>
        {showMethodForm && (
          <div className="space-y-2 mb-3 p-3 bg-muted rounded-lg">
            <select
              value={methodForm.type}
              onChange={e => setMethodForm({ ...methodForm, type: e.target.value })}
              className="w-full px-3 py-2 rounded-lg bg-background border border-border text-base md:text-sm text-foreground"
            >
              <option value="xpress">Xpress</option>
              <option value="iban">IBAN / TPA</option>
              <option value="outro">Outro</option>
            </select>
            {methodForm.type === "outro" && (
              <input
                placeholder="Nome do método"
                value={methodForm.label}
                onChange={e => setMethodForm({ ...methodForm, label: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-background border border-border text-base md:text-sm text-foreground"
              />
            )}
            <input
              placeholder={
                methodForm.type === "xpress"
                  ? "Número Xpress"
                  : methodForm.type === "iban"
                  ? "IBAN"
                  : "Valor/Número"
              }
              value={methodForm.value}
              onChange={e => setMethodForm({ ...methodForm, value: e.target.value })}
              className="w-full px-3 py-2 rounded-lg bg-background border border-border text-base md:text-sm text-foreground"
            />
            <input
              placeholder="Titular da conta"
              value={methodForm.holder}
              onChange={e => setMethodForm({ ...methodForm, holder: e.target.value })}
              className="w-full px-3 py-2 rounded-lg bg-background border border-border text-base md:text-sm text-foreground"
            />
            <button
              onClick={() => addMethod.mutate()}
              disabled={!methodForm.value || addMethod.isPending}
              className="w-full py-2 bg-primary text-primary-foreground text-xs font-bold rounded-lg disabled:opacity-50"
            >
              {addMethod.isPending ? "A guardar..." : "Guardar"}
            </button>
          </div>
        )}
        <div className="space-y-2">
          {methods.map((m: any) => (
            <div
              key={m.id}
              className={`flex items-center justify-between px-3 py-2 rounded-lg border ${
                m.is_active ? "border-border bg-background" : "border-border bg-muted opacity-60"
              }`}
            >
              <div>
                <p className="text-[10px] font-bold text-muted-foreground uppercase">
                  {m.type === "xpress" ? "Xpress" : m.type === "iban" ? "IBAN" : m.label}
                </p>
                <p className="text-sm font-bold text-foreground">{m.value}</p>
                {m.holder && <p className="text-[10px] text-muted-foreground">{m.holder}</p>}
              </div>
              <div className="flex gap-1">
                <button
                  onClick={() => toggleMethod.mutate({ id: m.id, active: !m.is_active })}
                  className={`p-1.5 rounded-lg ${
                    m.is_active ? "text-green-500 bg-green-500/10" : "text-muted-foreground bg-muted"
                  }`}
                >
                  <CheckCircle className="w-4 h-4" />
                </button>
                <button
                  onClick={() => deleteMethod.mutate(m.id)}
                  className="p-1.5 rounded-lg text-destructive bg-destructive/10"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
          {methods.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-2">
              Nenhum método configurado.
            </p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 mb-4">
        {[
          { label: "Pendentes",  status: "pending",  color: "bg-amber-500/10 text-amber-500 border-amber-500/20" },
          { label: "Aprovados",  status: "approved", color: "bg-green-500/10 text-green-500 border-green-500/20" },
          { label: "Rejeitados", status: "rejected", color: "bg-red-500/10 text-red-500 border-red-500/20" },
        ].map(s => (
          <div key={s.status} className={`rounded-xl border p-3 text-center ${s.color}`}>
            <p className="text-lg font-bold">
              {proofs.filter((p: any) => p.status === s.status).length}
            </p>
            <p className="text-[10px]">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="space-y-2">
        {proofs.length === 0 && (
          <p className="text-center py-6 text-sm text-muted-foreground">
            Nenhum comprovante submetido.
          </p>
        )}
        {proofs.map((p: any) => (
          <div key={p.id} className="bg-card rounded-xl border border-border p-3">
            <div className="flex items-center justify-between mb-2">
              <div>
                <p className="text-sm font-bold text-foreground">
                  {p.profiles?.full_name || "Anónimo"}
                </p>
                <p className="text-[10px] text-muted-foreground">{p.auctions?.title || "—"}</p>
              </div>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  p.status === "pending"
                    ? "bg-amber-500/10 text-amber-500"
                    : p.status === "approved"
                    ? "bg-green-500/10 text-green-500"
                    : "bg-red-500/10 text-red-500"
                }`}
              >
                {p.status === "pending"
                  ? "Pendente"
                  : p.status === "approved"
                  ? "Aprovado"
                  : "Rejeitado"}
              </span>
            </div>
            <div className="flex justify-between text-xs text-muted-foreground mb-2">
              <span>
                Lance:{" "}
                <span className="font-bold text-foreground">
                  {Number(p.amount).toLocaleString("pt-AO")} Kz
                </span>
              </span>
              {p.reference && <span>Ref: {p.reference}</span>}
            </div>
            <div className="flex gap-2">
              <button
                onClick={async () => {
                  const url = await getProofUrl(p.proof_url);
                  setProofModal({ ...p, signedUrl: url });
                }}
                className="flex-1 py-1.5 bg-muted text-foreground text-xs font-bold rounded-lg flex items-center justify-center gap-1"
              >
                <Eye className="w-3.5 h-3.5" /> Ver
              </button>
              {p.status === "pending" && (
                <>
                  <button
                    onClick={() =>
                      reviewProof.mutate({
                        id: p.id,
                        status: "approved",
                        auctionId: p.auction_id,
                        userId: p.user_id,
                        amount: p.amount,
                      })
                    }
                    className="flex-1 py-1.5 bg-green-500/10 text-green-500 text-xs font-bold rounded-lg flex items-center justify-center gap-1"
                  >
                    <CheckCircle className="w-3.5 h-3.5" /> Aprovar
                  </button>
                  <button
                    onClick={() =>
                      reviewProof.mutate({
                        id: p.id,
                        status: "rejected",
                        auctionId: p.auction_id,
                        userId: p.user_id,
                        amount: p.amount,
                      })
                    }
                    className="flex-1 py-1.5 bg-red-500/10 text-red-500 text-xs font-bold rounded-lg flex items-center justify-center gap-1"
                  >
                    <XCircle className="w-3.5 h-3.5" /> Rejeitar
                  </button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>

      {proofModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70"
          onClick={() => setProofModal(null)}
        >
          <div
            className="bg-card border border-border rounded-xl p-4 w-[92vw] max-w-sm shadow-xl"
            onClick={e => e.stopPropagation()}
          >
            <h3 className="text-sm font-black text-foreground mb-3">Comprovante</h3>
            <div className="text-xs space-y-1 mb-3">
              <p className="text-muted-foreground">
                Utilizador:{" "}
                <span className="font-bold text-foreground">
                  {proofModal.profiles?.full_name || "—"}
                </span>
              </p>
              <p className="text-muted-foreground">
                Leilão:{" "}
                <span className="font-bold text-foreground">
                  {proofModal.auctions?.title || "—"}
                </span>
              </p>
              <p className="text-muted-foreground">
                Valor:{" "}
                <span className="font-bold text-green-500">
                  {Number(proofModal.amount).toLocaleString("pt-AO")} Kz
                </span>
              </p>
              {proofModal.reference && (
                <p className="text-muted-foreground">
                  Ref:{" "}
                  <span className="font-bold text-foreground">{proofModal.reference}</span>
                </p>
              )}
            </div>
            {proofModal.signedUrl && (
              <img
                src={proofModal.signedUrl}
                alt="Comprovante"
                className="w-full rounded-lg mb-3 max-h-64 object-contain bg-muted"
              />
            )}
            <button
              onClick={() => setProofModal(null)}
              className="w-full py-2 bg-muted text-foreground text-xs font-bold rounded-lg"
            >
              Fechar
            </button>
          </div>
        </div>
      )}
    </>
  );
};



export default AdminLeiloesTab;
