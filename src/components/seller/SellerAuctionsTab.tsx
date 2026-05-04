import { useState } from "react";
import { Gavel, Plus, Trash2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import BannerImageUploader from "@/components/admin/banner/BannerImageUploader";

interface Props { sellerId: string; }

const SellerAuctionsTab = ({ sellerId }: Props) => {
  const qc = useQueryClient();
  const [show, setShow] = useState(false);
  const [form, setForm] = useState({
    title: "", description: "", image_url: "", category: "Electrónicos",
    starting_bid: "", bid_increment: "1000", ends_at: "", product_id: "",
  });

  const { data: auctions = [] } = useQuery({
    queryKey: ["seller_auctions", sellerId],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("auctions")
        .select("*").eq("seller_id", sellerId).order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const { data: products = [] } = useQuery({
    queryKey: ["seller_products_for_auction", sellerId],
    queryFn: async () => {
      const { data } = await supabase.from("products").select("id, title").eq("seller_id", sellerId);
      return data || [];
    },
  });

  const create = useMutation({
    mutationFn: async () => {
      const payload: any = {
        seller_id: sellerId,
        title: form.title,
        description: form.description || null,
        image_url: form.image_url || null,
        category: form.category,
        starting_bid: parseFloat(form.starting_bid) || 0,
        current_bid: parseFloat(form.starting_bid) || 0,
        bid_increment: parseFloat(form.bid_increment) || 1000,
        ends_at: new Date(form.ends_at).toISOString(),
        status: "active",
        product_id: form.product_id || null,
      };
      const { error } = await (supabase as any).from("auctions").insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Leilão criado!");
      qc.invalidateQueries({ queryKey: ["seller_auctions"] });
      setShow(false);
      setForm({ title: "", description: "", image_url: "", category: "Electrónicos", starting_bid: "", bid_increment: "1000", ends_at: "", product_id: "" });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("auctions").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["seller_auctions"] }); toast.success("Removido"); },
  });

  return (
    <div>
      <button onClick={() => setShow(!show)} className="w-full mb-3 py-2 bg-secondary text-foreground text-xs font-bold rounded-lg flex items-center justify-center gap-1">
        <Plus className="w-4 h-4" /> {show ? "Cancelar" : "Criar leilão"}
      </button>

      {show && (
        <div className="bg-card border border-border rounded-xl p-3 mb-4 space-y-2">
          <input className="w-full px-3 py-2 rounded-lg bg-muted border border-border text-sm" placeholder="Título" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
          <textarea className="w-full px-3 py-2 rounded-lg bg-muted border border-border text-sm h-16" placeholder="Descrição" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
          <div>
            <label className="text-[11px] font-bold text-muted-foreground">Imagem</label>
            <BannerImageUploader value={form.image_url} onChange={(url: string) => setForm({ ...form, image_url: url })} />
          </div>
          <select className="w-full px-3 py-2 rounded-lg bg-muted border border-border text-sm" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
            <option>Electrónicos</option><option>Imóveis</option><option>Veículos</option><option>Luxo & Relógios</option><option>Outro</option>
          </select>
          {products.length > 0 && (
            <select className="w-full px-3 py-2 rounded-lg bg-muted border border-border text-sm" value={form.product_id} onChange={e => setForm({ ...form, product_id: e.target.value })}>
              <option value="">— Sem produto vinculado —</option>
              {products.map((p: any) => <option key={p.id} value={p.id}>{p.title}</option>)}
            </select>
          )}
          <div className="grid grid-cols-2 gap-2">
            <input type="number" className="px-3 py-2 rounded-lg bg-muted border border-border text-sm" placeholder="Lance inicial (Kz)" value={form.starting_bid} onChange={e => setForm({ ...form, starting_bid: e.target.value })} />
            <input type="number" className="px-3 py-2 rounded-lg bg-muted border border-border text-sm" placeholder="Incremento (Kz)" value={form.bid_increment} onChange={e => setForm({ ...form, bid_increment: e.target.value })} />
          </div>
          <div>
            <label className="text-[11px] font-bold text-muted-foreground">Termina em</label>
            <input type="datetime-local" className="w-full px-3 py-2 rounded-lg bg-muted border border-border text-sm" value={form.ends_at} onChange={e => setForm({ ...form, ends_at: e.target.value })} />
          </div>
          <button disabled={!form.title || !form.starting_bid || !form.ends_at || create.isPending} onClick={() => create.mutate()}
            className="w-full py-2 bg-primary text-primary-foreground text-sm font-bold rounded-lg disabled:opacity-50">
            {create.isPending ? "Criando..." : "Publicar leilão"}
          </button>
        </div>
      )}

      <div className="space-y-2">
        {auctions.map((a: any) => (
          <div key={a.id} className="bg-card border border-border rounded-xl p-3 flex items-center gap-2">
            <div className="w-14 h-14 rounded-lg bg-muted overflow-hidden flex-shrink-0">
              {a.image_url ? <img src={a.image_url} className="w-full h-full object-cover" alt="" /> : <Gavel className="w-6 h-6 m-4 text-muted-foreground" />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold truncate">{a.title}</p>
              <p className="text-[11px] text-muted-foreground">Lance: <span className="font-bold text-walmart-green">{Number(a.current_bid).toLocaleString("pt-AO")} Kz</span></p>
              <p className="text-[10px] text-muted-foreground">Termina: {new Date(a.ends_at).toLocaleString("pt-AO")}</p>
            </div>
            <button onClick={() => remove.mutate(a.id)} className="p-2 rounded-lg text-destructive hover:bg-destructive/10"><Trash2 className="w-4 h-4" /></button>
          </div>
        ))}
        {auctions.length === 0 && <p className="text-center text-sm text-muted-foreground py-6">Nenhum leilão. Crie o primeiro!</p>}
      </div>
    </div>
  );
};

export default SellerAuctionsTab;
