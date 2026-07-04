import { useState, useRef, useEffect } from "react";
import { Sparkles, Send, X, Loader2, ShoppingBag } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useFeatureAccess } from "@/hooks/useFeatureAccess";

interface Msg { role: "user" | "assistant"; content: string; products?: any[] }

const SUGGESTIONS = [
  "Quero um telemóvel até 150.000 Kz",
  "Ténis desportivos para homem",
  "Presente para o dia dos namorados",
];

const ShoppingAssistant = () => {
  const { hasAccess, isLoading } = useFeatureAccess("ai_shopping");
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([
    { role: "assistant", content: "Olá! Diz‑me o que procuras e ajudo‑te a encontrar aqui na AngoExpress." },
  ]);
  const listRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [msgs, open]);

  if (isLoading || !hasAccess) return null;

  const send = async (text: string) => {
    const q = text.trim();
    if (!q || busy) return;
    setInput("");
    const next: Msg[] = [...msgs, { role: "user", content: q }];
    setMsgs(next);
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("shopping-assistant", {
        body: { messages: next.map(({ role, content }) => ({ role, content })) },
      });
      if (error) throw error;
      setMsgs([...next, { role: "assistant", content: data?.reply ?? "…", products: data?.products ?? [] }]);
    } catch (e: any) {
      setMsgs([...next, { role: "assistant", content: "Desculpa, houve um erro. Tenta de novo." }]);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      {!open && (
        <button
          onClick={() => setOpen(true)}
          aria-label="Abrir assistente de compras"
          className="fixed bottom-20 right-3 md:bottom-6 md:right-6 z-40 w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg hover:scale-105 transition flex items-center justify-center"
        >
          <Sparkles className="w-6 h-6" />
        </button>
      )}

      {open && (
        <div className="fixed inset-0 md:inset-auto md:bottom-6 md:right-6 md:w-[380px] md:h-[560px] z-50 bg-background md:rounded-2xl md:border md:border-border shadow-2xl flex flex-col">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-primary text-primary-foreground md:rounded-t-2xl">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              <span className="text-sm font-bold">Assistente de compras</span>
            </div>
            <button onClick={() => setOpen(false)} aria-label="Fechar"><X className="w-4 h-4" /></button>
          </div>

          <div ref={listRef} className="flex-1 overflow-y-auto p-3 space-y-3">
            {msgs.map((m, i) => (
              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[85%] text-xs leading-relaxed rounded-2xl px-3 py-2 ${m.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"}`}>
                  <p className="whitespace-pre-wrap">{m.content}</p>
                  {m.products && m.products.length > 0 && (
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      {m.products.map((p: any) => (
                        <button
                          key={p.id}
                          onClick={() => { setOpen(false); navigate(`/produto/${p.id}`); }}
                          className="text-left bg-card rounded-xl border border-border overflow-hidden hover:shadow"
                        >
                          <div className="aspect-square bg-muted">
                            {p.image ? <img src={p.image} alt={p.title} className="w-full h-full object-cover" loading="lazy" /> : <div className="w-full h-full flex items-center justify-center"><ShoppingBag className="w-6 h-6 text-muted-foreground" /></div>}
                          </div>
                          <div className="p-1.5">
                            <p className="text-[10px] font-semibold text-foreground line-clamp-2">{p.title}</p>
                            <p className="text-[11px] font-black text-foreground mt-0.5">{Number(p.price).toLocaleString("pt-AO")} Kz</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {busy && (
              <div className="flex justify-start"><div className="bg-muted rounded-2xl px-3 py-2"><Loader2 className="w-4 h-4 animate-spin text-muted-foreground" /></div></div>
            )}
            {msgs.length <= 1 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {SUGGESTIONS.map(s => (
                  <button key={s} onClick={() => send(s)} className="text-[11px] px-2.5 py-1.5 rounded-full bg-muted border border-border text-foreground hover:bg-muted/70">{s}</button>
                ))}
              </div>
            )}
          </div>

          <form
            onSubmit={(e) => { e.preventDefault(); send(input); }}
            className="p-2 border-t border-border flex items-center gap-2"
          >
            <input
              autoFocus
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ex.: quero um par de ténis…"
              className="flex-1 h-10 px-3 rounded-full bg-muted text-sm text-foreground outline-none border border-border focus:border-primary"
            />
            <button
              type="submit"
              disabled={busy || !input.trim()}
              className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-40"
              aria-label="Enviar"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}
    </>
  );
};

export default ShoppingAssistant;
