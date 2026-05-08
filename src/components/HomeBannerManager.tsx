/**
 * HomeBannerManager
 * Painel admin para gerir banners por dispositivo (mobile / tablet / desktop).
 * Cada slot pode ter uma imagem diferente para cada breakpoint.
 *
 * Tabela Supabase esperada: home_banners
 *   id, slot (int), device (mobile|tablet|desktop), image_url, link_url,
 *   title, subtitle, active (bool), sort_order (int), created_at
 */
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  Monitor, Tablet, Smartphone, Plus, Trash2,
  Eye, EyeOff, GripVertical, Save, X, ImageOff,
} from "lucide-react";

const DEVICES = [
  { key: "mobile",  label: "Mobile",  icon: Smartphone },
  { key: "tablet",  label: "Tablet",  icon: Tablet },
  { key: "desktop", label: "Desktop", icon: Monitor },
] as const;

type Device = "mobile" | "tablet" | "desktop";

interface Banner {
  id: string;
  slot: number;
  device: Device;
  image_url: string;
  link_url?: string;
  title?: string;
  subtitle?: string;
  active: boolean;
  sort_order: number;
}

const sand = "#D4B896";
const sandDark = "#B8956A";
const cream = "#F7F0E6";
const brown = "#4A2E0A";
const brownLight = "rgba(74,46,10,0.10)";

const HomeBannerManager = () => {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [activeDevice, setActiveDevice] = useState<Device>("desktop");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Partial<Banner>>({});
  const [adding, setAdding] = useState(false);
  const [newForm, setNewForm] = useState<Partial<Banner>>({
    device: "desktop", slot: 1, active: true, sort_order: 0,
  });

  const { data: banners = [], isLoading } = useQuery<Banner[]>({
    queryKey: ["home_banners", activeDevice],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("home_banners")
        .select("*")
        .eq("device", activeDevice)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return data || [];
    },
  });

  const upsert = useMutation({
    mutationFn: async (b: Partial<Banner>) => {
      const { error } = await supabase.from("home_banners").upsert(b);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["home_banners"] });
      setEditingId(null);
      setAdding(false);
    },
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("home_banners").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["home_banners"] }),
  });

  const toggleActive = (b: Banner) =>
    upsert.mutate({ ...b, active: !b.active });

  if (!user) return null;

  return (
    <div className="rounded-2xl overflow-hidden" style={{ border: `1px solid ${sand}`, background: cream }}>

      {/* Header */}
      <div className="px-5 py-4 flex items-center justify-between"
        style={{ background: `linear-gradient(135deg, ${cream}, ${sand})`, borderBottom: `1px solid ${sand}` }}>
        <div>
          <h2 className="text-base font-black" style={{ color: brown }}>Gestor de Banners</h2>
          <p className="text-xs mt-0.5" style={{ color: sandDark }}>
            Configure banners diferentes para cada dispositivo
          </p>
        </div>
        <button onClick={() => setAdding(true)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90"
          style={{ background: `linear-gradient(135deg, ${sandDark}, ${brown})` }}>
          <Plus className="w-4 h-4" /> Novo banner
        </button>
      </div>

      {/* Device tabs */}
      <div className="flex border-b" style={{ borderColor: sand }}>
        {DEVICES.map(({ key, label, icon: Icon }) => (
          <button key={key}
            onClick={() => setActiveDevice(key)}
            className="flex-1 flex items-center justify-center gap-2 py-3 text-sm font-bold transition-all"
            style={{
              color: activeDevice === key ? brown : sandDark,
              borderBottom: activeDevice === key ? `2px solid ${brown}` : "2px solid transparent",
              background: activeDevice === key ? "rgba(74,46,10,0.06)" : "transparent",
            }}>
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {/* Formulário de novo banner */}
      {adding && (
        <div className="p-4 border-b" style={{ borderColor: sand, background: "rgba(255,255,255,0.6)" }}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-black" style={{ color: brown }}>Novo banner — {activeDevice}</span>
            <button onClick={() => setAdding(false)}><X className="w-4 h-4" style={{ color: sandDark }} /></button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[
              { key: "image_url", label: "URL da imagem *", placeholder: "https://..." },
              { key: "link_url",  label: "Link ao clicar",  placeholder: "/categoria/moda" },
              { key: "title",     label: "Título",          placeholder: "Texto do banner" },
              { key: "subtitle",  label: "Subtítulo",       placeholder: "Subtítulo opcional" },
            ].map(f => (
              <div key={f.key}>
                <label className="text-[11px] font-bold block mb-1" style={{ color: brown }}>{f.label}</label>
                <input
                  type="text"
                  placeholder={f.placeholder}
                  value={(newForm as any)[f.key] || ""}
                  onChange={e => setNewForm(p => ({ ...p, [f.key]: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl text-sm focus:outline-none"
                  style={{ background: "white", border: `1px solid ${sand}`, color: brown }}
                />
              </div>
            ))}
            <div>
              <label className="text-[11px] font-bold block mb-1" style={{ color: brown }}>Slot</label>
              <input type="number" min={1} max={20}
                value={newForm.slot || 1}
                onChange={e => setNewForm(p => ({ ...p, slot: parseInt(e.target.value) }))}
                className="w-full px-3 py-2 rounded-xl text-sm focus:outline-none"
                style={{ background: "white", border: `1px solid ${sand}`, color: brown }}
              />
            </div>
            <div>
              <label className="text-[11px] font-bold block mb-1" style={{ color: brown }}>Ordem</label>
              <input type="number" min={0}
                value={newForm.sort_order || 0}
                onChange={e => setNewForm(p => ({ ...p, sort_order: parseInt(e.target.value) }))}
                className="w-full px-3 py-2 rounded-xl text-sm focus:outline-none"
                style={{ background: "white", border: `1px solid ${sand}`, color: brown }}
              />
            </div>
          </div>
          <div className="flex justify-end mt-3 gap-2">
            <button onClick={() => setAdding(false)}
              className="px-4 py-2 rounded-xl text-sm font-bold" style={{ color: sandDark }}>
              Cancelar
            </button>
            <button
              disabled={!newForm.image_url}
              onClick={() => upsert.mutate({ ...newForm, device: activeDevice })}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold text-white disabled:opacity-50"
              style={{ background: `linear-gradient(135deg, ${sandDark}, ${brown})` }}>
              <Save className="w-4 h-4" /> Guardar
            </button>
          </div>
        </div>
      )}

      {/* Lista de banners */}
      <div className="p-4 space-y-3">
        {isLoading && (
          <div className="py-8 text-center text-sm" style={{ color: sandDark }}>A carregar...</div>
        )}
        {!isLoading && banners.length === 0 && (
          <div className="py-12 flex flex-col items-center gap-2">
            <ImageOff className="w-8 h-8" style={{ color: sand }} />
            <p className="text-sm font-bold" style={{ color: sandDark }}>
              Nenhum banner para {activeDevice}
            </p>
            <p className="text-xs" style={{ color: sandDark }}>
              Clique em "Novo banner" para adicionar
            </p>
          </div>
        )}
        {banners.map(b => (
          <div key={b.id} className="rounded-2xl overflow-hidden"
            style={{
              border: `1px solid ${sand}`,
              background: b.active ? "white" : "rgba(255,255,255,0.4)",
              opacity: b.active ? 1 : 0.6,
            }}>

            {editingId === b.id ? (
              /* Modo edição */
              <div className="p-3">
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { key: "image_url", label: "URL da imagem" },
                    { key: "link_url",  label: "Link" },
                    { key: "title",     label: "Título" },
                    { key: "subtitle",  label: "Subtítulo" },
                  ].map(f => (
                    <div key={f.key}>
                      <label className="text-[10px] font-bold block mb-0.5" style={{ color: brown }}>{f.label}</label>
                      <input type="text"
                        value={(form as any)[f.key] || ""}
                        onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                        className="w-full px-2 py-1.5 rounded-lg text-xs focus:outline-none"
                        style={{ background: cream, border: `1px solid ${sand}`, color: brown }}
                      />
                    </div>
                  ))}
                </div>
                <div className="flex justify-end gap-2 mt-2">
                  <button onClick={() => setEditingId(null)}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold" style={{ color: sandDark }}>
                    Cancelar
                  </button>
                  <button onClick={() => upsert.mutate(form)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold text-white"
                    style={{ background: brown }}>
                    <Save className="w-3 h-3" /> Guardar
                  </button>
                </div>
              </div>
            ) : (
              /* Modo visualização */
              <div className="flex items-center gap-3 p-3">
                <GripVertical className="w-4 h-4 flex-shrink-0 cursor-grab" style={{ color: sand }} />

                {/* Miniatura */}
                {b.image_url
                  ? <img src={b.image_url} alt="" className="w-16 h-10 rounded-lg object-cover flex-shrink-0"
                      onError={e => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
                  : <div className="w-16 h-10 rounded-lg flex-shrink-0 flex items-center justify-center"
                      style={{ background: brownLight }}>
                      <ImageOff className="w-4 h-4" style={{ color: sand }} />
                    </div>
                }

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-black px-1.5 py-0.5 rounded-full"
                      style={{ background: brownLight, color: brown }}>
                      Slot {b.slot}
                    </span>
                    {b.title && (
                      <span className="text-xs font-bold truncate" style={{ color: brown }}>{b.title}</span>
                    )}
                  </div>
                  {b.link_url && (
                    <p className="text-[10px] truncate mt-0.5" style={{ color: sandDark }}>{b.link_url}</p>
                  )}
                </div>

                {/* Acções */}
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <button onClick={() => toggleActive(b)}
                    className="w-8 h-8 rounded-lg flex items-center justify-center transition-all hover:scale-110"
                    style={{ background: brownLight }}
                    title={b.active ? "Desactivar" : "Activar"}>
                    {b.active
                      ? <Eye className="w-3.5 h-3.5" style={{ color: brown }} />
                      : <EyeOff className="w-3.5 h-3.5" style={{ color: sandDark }} />}
                  </button>
                  <button onClick={() => { setEditingId(b.id); setForm(b); }}
                    className="w-8 h-8 rounded-lg flex items-center justify-center transition-all hover:scale-110 text-xs font-black"
                    style={{ background: brownLight, color: brown }}>
                    ✎
                  </button>
                  <button onClick={() => { if (confirm("Eliminar banner?")) remove.mutate(b.id); }}
                    className="w-8 h-8 rounded-lg flex items-center justify-center transition-all hover:scale-110"
                    style={{ background: "rgba(229,57,53,0.08)", color: "#E53935" }}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default HomeBannerManager;
