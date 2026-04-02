import { useState } from "react";
import { Plus, Edit, Trash2, ChevronRight, Upload, X, Save, FolderTree } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

interface CategoryForm {
  name: string;
  slug: string;
  icon: string;
  image_url: string;
  parent_id: string;
  sort_order: string;
}

const empty: CategoryForm = { name: "", slug: "", icon: "", image_url: "", parent_id: "", sort_order: "0" };

const AdminCategoriesTab = () => {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState<CategoryForm>(empty);
  const [uploading, setUploading] = useState(false);
  const [expandedParent, setExpandedParent] = useState<string | null>(null);

  const { data: categories = [] } = useQuery({
    queryKey: ["admin_categories"],
    queryFn: async () => {
      const { data, error } = await supabase.from("categories").select("*").order("sort_order").order("name");
      if (error) throw error;
      return data;
    },
  });

  const parents = categories.filter((c: any) => !c.parent_id);
  const getChildren = (parentId: string) => categories.filter((c: any) => c.parent_id === parentId);

  const handleUpload = async (file: File) => {
    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `categories/${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("product-images").upload(path, file);
      if (error) throw error;
      const { data } = supabase.storage.from("product-images").getPublicUrl(path);
      setForm(f => ({ ...f, image_url: data.publicUrl }));
    } catch (err: any) {
      toast.error("Erro no upload: " + err.message);
    }
    setUploading(false);
  };

  const saveCategory = useMutation({
    mutationFn: async () => {
      const payload = {
        name: form.name,
        slug: form.slug || form.name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, ""),
        icon: form.icon || null,
        image_url: form.image_url || null,
        parent_id: form.parent_id || null,
        sort_order: parseInt(form.sort_order) || 0,
        is_active: true,
      };
      if (editing) {
        const { error } = await supabase.from("categories").update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("categories").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin_categories"] });
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      toast.success(editing ? "Categoria atualizada!" : "Categoria criada!");
      setShowForm(false);
      setEditing(null);
      setForm(empty);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteCategory = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("categories").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin_categories"] });
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      toast.success("Categoria removida");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const openEdit = (cat: any) => {
    setEditing(cat);
    setForm({
      name: cat.name,
      slug: cat.slug,
      icon: cat.icon || "",
      image_url: cat.image_url || "",
      parent_id: cat.parent_id || "",
      sort_order: String(cat.sort_order || 0),
    });
    setShowForm(true);
  };

  const set = (k: keyof CategoryForm, v: string) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div>
      <button onClick={() => { setEditing(null); setForm(empty); setShowForm(!showForm); }}
        className="w-full mb-3 py-2 bg-primary text-primary-foreground text-xs font-bold rounded-lg flex items-center justify-center gap-1">
        <Plus className="w-4 h-4" /> Nova Categoria
      </button>

      {showForm && (
        <div className="bg-card rounded-xl border border-border p-4 mb-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-foreground">{editing ? "Editar Categoria" : "Nova Categoria"}</h3>
            <button onClick={() => { setShowForm(false); setEditing(null); }} className="text-muted-foreground"><X className="w-4 h-4" /></button>
          </div>
          <input placeholder="Nome *" value={form.name} onChange={e => { set("name", e.target.value); if (!editing) set("slug", e.target.value.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "")); }}
            className="w-full px-3 py-2 rounded-lg bg-muted border border-border text-sm text-foreground" />
          <input placeholder="Slug" value={form.slug} onChange={e => set("slug", e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-muted border border-border text-sm text-foreground" />
          <div className="grid grid-cols-2 gap-2">
            <input placeholder="Ícone (ex: Smartphone)" value={form.icon} onChange={e => set("icon", e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-muted border border-border text-sm text-foreground" />
            <input type="number" placeholder="Ordem" value={form.sort_order} onChange={e => set("sort_order", e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-muted border border-border text-sm text-foreground" />
          </div>
          <div>
            <label className="text-[11px] font-bold text-muted-foreground mb-1 block">Categoria pai (subcategoria)</label>
            <select value={form.parent_id} onChange={e => set("parent_id", e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-muted border border-border text-sm text-foreground">
              <option value="">Nenhuma (raiz)</option>
              {parents.filter((p: any) => p.id !== editing?.id).map((c: any) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[11px] font-bold text-muted-foreground mb-1 block">Imagem</label>
            <div className="flex items-center gap-2">
              {form.image_url && <img src={form.image_url} alt="" className="w-10 h-10 rounded-lg object-cover border border-border" />}
              <label className="flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-bold cursor-pointer bg-accent text-foreground border border-border">
                <Upload className="w-3.5 h-3.5" /> {uploading ? "..." : "Upload"}
                <input type="file" accept="image/*" onChange={e => e.target.files?.[0] && handleUpload(e.target.files[0])} className="hidden" disabled={uploading} />
              </label>
            </div>
          </div>
          <button onClick={() => saveCategory.mutate()} disabled={!form.name || saveCategory.isPending}
            className="w-full py-2 bg-primary text-primary-foreground text-sm font-bold rounded-lg disabled:opacity-50 flex items-center justify-center gap-2">
            <Save className="w-4 h-4" /> {editing ? "Atualizar" : "Criar"}
          </button>
        </div>
      )}

      {/* Categories tree */}
      <div className="space-y-1">
        {parents.map((cat: any) => {
          const children = getChildren(cat.id);
          const isExpanded = expandedParent === cat.id;
          return (
            <div key={cat.id}>
              <div className="bg-card rounded-xl border border-border p-3 flex items-center gap-3">
                {cat.image_url && <img src={cat.image_url} alt="" className="w-8 h-8 rounded-lg object-cover" />}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-foreground truncate">{cat.name}</p>
                  <p className="text-[10px] text-muted-foreground">/{cat.slug} • Ordem: {cat.sort_order}{children.length > 0 && ` • ${children.length} sub`}</p>
                </div>
                {children.length > 0 && (
                  <button onClick={() => setExpandedParent(isExpanded ? null : cat.id)} className="p-1.5 text-muted-foreground">
                    <ChevronRight className={`w-4 h-4 transition-transform ${isExpanded ? "rotate-90" : ""}`} />
                  </button>
                )}
                <button onClick={() => openEdit(cat)} className="p-1.5 text-muted-foreground hover:bg-accent rounded-lg"><Edit className="w-3.5 h-3.5" /></button>
                <button onClick={() => deleteCategory.mutate(cat.id)} className="p-1.5 text-destructive hover:bg-destructive/10 rounded-lg"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
              {isExpanded && children.length > 0 && (
                <div className="ml-6 mt-1 space-y-1">
                  {children.map((sub: any) => (
                    <div key={sub.id} className="bg-card rounded-xl border border-border p-2.5 flex items-center gap-3">
                      <FolderTree className="w-3.5 h-3.5 text-muted-foreground" />
                      {sub.image_url && <img src={sub.image_url} alt="" className="w-6 h-6 rounded object-cover" />}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-foreground truncate">{sub.name}</p>
                        <p className="text-[10px] text-muted-foreground">/{sub.slug}</p>
                      </div>
                      <button onClick={() => openEdit(sub)} className="p-1 text-muted-foreground hover:bg-accent rounded-lg"><Edit className="w-3 h-3" /></button>
                      <button onClick={() => deleteCategory.mutate(sub.id)} className="p-1 text-destructive hover:bg-destructive/10 rounded-lg"><Trash2 className="w-3 h-3" /></button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
        {parents.length === 0 && <p className="text-center py-6 text-sm text-muted-foreground">Nenhuma categoria.</p>}
      </div>
    </div>
  );
};

export default AdminCategoriesTab;
