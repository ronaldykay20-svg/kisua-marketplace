// Importação em massa de produtos via Excel (.xlsx) ou CSV.
//
// Fluxo: o vendedor (ou o Admin, em nome de um vendedor) carrega uma folha
// de cálculo com uma linha por produto. Este ficheiro lê e valida essa
// folha, faz a correspondência da coluna "categoria" (texto) com o id real
// da categoria na base de dados, e devolve linhas prontas para inserir na
// tabela `products` — sem imagens, que continuam a ser adicionadas depois,
// produto a produto, tal como já acontecia.
//
// Não corre nada sozinho: só entra em ação quando alguém explicitamente
// carrega um ficheiro e confirma a importação.

import * as XLSX from "xlsx";

export interface CategoryOption {
  id: string;
  name: string;
  parent_id: string | null;
}

export interface ParsedProductRow {
  rowNumber: number; // linha na folha original (para o vendedor localizar erros)
  title: string;
  description: string | null;
  price: number;
  old_price: number | null;
  discount_percent: number | null;
  stock: number;
  sku: string | null;
  condition: string;
  category_id: string | null;
  category_label: string | null; // o texto que a folha tinha, para mostrar no preview
  free_shipping: boolean;
  weight_kg: number | null;
  length_cm: number | null;
  width_cm: number | null;
  height_cm: number | null;
}

export interface ProductImportError {
  rowNumber: number;
  message: string;
}

export interface ProductImportResult {
  valid: ParsedProductRow[];
  errors: ProductImportError[];
}

const CONDITION_LABELS: Record<string, string> = {
  novo: "new",
  "como novo": "like_new",
  "bom estado": "good",
  usado: "used",
  recondicionado: "refurbished",
};

const normalize = (s: string) =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

// Aceita várias grafias razoáveis para cada coluna, para não obrigar o
// vendedor a decorar nomes exatos de cabeçalho.
const HEADER_ALIASES: Record<string, string[]> = {
  title: ["nome", "produto", "titulo", "título", "name", "title"],
  description: ["descricao", "descrição", "description"],
  price: ["preco", "preço", "price", "valor"],
  old_price: ["preco_antigo", "preço_antigo", "preco antigo", "old_price", "preco_de", "de"],
  discount_percent: ["desconto", "desconto_percent", "discount", "desconto (%)"],
  stock: ["stock", "estoque", "quantidade", "qtd"],
  sku: ["sku", "referencia", "referência", "codigo", "código"],
  condition: ["condicao", "condição", "estado", "condition"],
  category: ["categoria", "category"],
  free_shipping: ["frete_gratis", "frete grátis", "frete_gratis", "envio_gratis", "free_shipping"],
  weight_kg: ["peso", "peso_kg", "weight_kg", "weight"],
  length_cm: ["comprimento", "comprimento_cm", "length_cm"],
  width_cm: ["largura", "largura_cm", "width_cm"],
  height_cm: ["altura", "altura_cm", "height_cm"],
};

const buildHeaderMap = (headerRow: string[], aliasMap: Record<string, string[]>): Record<string, number> => {
  const map: Record<string, number> = {};
  headerRow.forEach((rawHeader, index) => {
    const h = normalize(String(rawHeader || ""));
    for (const [field, aliases] of Object.entries(aliasMap)) {
      if (aliases.some(a => normalize(a) === h) && map[field] === undefined) {
        map[field] = index;
      }
    }
  });
  return map;
};

const toNumberOrNull = (raw: any): number | null => {
  if (raw === undefined || raw === null || raw === "") return null;
  const n = typeof raw === "number" ? raw : parseFloat(String(raw).replace(",", "."));
  return isNaN(n) ? null : n;
};

const toBoolean = (raw: any): boolean => {
  if (typeof raw === "boolean") return raw;
  const s = normalize(String(raw ?? ""));
  return ["sim", "yes", "true", "1", "verdadeiro"].includes(s);
};

// Resolve o texto de categoria (ex: "Telemóveis" ou "Eletrónica > Telemóveis")
// para o id real, tentando primeiro correspondência exata e depois parcial,
// preferindo sempre a subcategoria (é essa que o produto tem de usar).
const resolveCategoryId = (label: string, categories: CategoryOption[]): string | null => {
  if (!label) return null;
  const term = normalize(label.split(">").pop() || label);
  const exact = categories.find(c => normalize(c.name) === term);
  if (exact) return exact.id;
  const partial = categories.find(c => normalize(c.name).includes(term) || term.includes(normalize(c.name)));
  return partial ? partial.id : null;
};

/** Lê um ficheiro .xlsx ou .csv e devolve a matriz de linhas em bruto (sem validar). */
export const readSpreadsheetFile = async (file: File): Promise<any[][]> => {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array" });
  const firstSheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[firstSheetName];
  return XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "", raw: false }) as any[][];
};

/** Valida e mapeia as linhas em bruto para produtos prontos a inserir. */
export const parseProductRows = (rows: any[][], categories: CategoryOption[]): ProductImportResult => {
  const valid: ParsedProductRow[] = [];
  const errors: ProductImportError[] = [];

  if (rows.length === 0) return { valid, errors: [{ rowNumber: 0, message: "Ficheiro vazio." }] };

  const headerMap = buildHeaderMap(rows[0].map(String), HEADER_ALIASES);
  if (headerMap.title === undefined) {
    return { valid, errors: [{ rowNumber: 1, message: 'Falta a coluna "Nome" (ou "Produto"/"Título") no cabeçalho.' }] };
  }
  if (headerMap.price === undefined) {
    return { valid, errors: [{ rowNumber: 1, message: 'Falta a coluna "Preço" no cabeçalho.' }] };
  }

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const rowNumber = i + 1; // linha real na folha (1 = cabeçalho)
    const isEmpty = row.every(cell => String(cell ?? "").trim() === "");
    if (isEmpty) continue;

    const get = (field: string) => (headerMap[field] !== undefined ? row[headerMap[field]] : undefined);

    const title = String(get("title") ?? "").trim();
    if (!title) { errors.push({ rowNumber, message: "Nome do produto em falta." }); continue; }

    const price = toNumberOrNull(get("price"));
    if (price === null || price <= 0) { errors.push({ rowNumber, message: `Preço inválido para "${title}".` }); continue; }

    const categoryLabel = String(get("category") ?? "").trim() || null;
    const category_id = categoryLabel ? resolveCategoryId(categoryLabel, categories) : null;
    if (categoryLabel && !category_id) {
      errors.push({ rowNumber, message: `Categoria "${categoryLabel}" não encontrada para "${title}" — corrige o nome ou deixa em branco.` });
      continue;
    }

    const conditionLabel = normalize(String(get("condition") ?? "novo"));
    const condition = CONDITION_LABELS[conditionLabel] || "new";

    valid.push({
      rowNumber,
      title,
      description: String(get("description") ?? "").trim() || null,
      price,
      old_price: toNumberOrNull(get("old_price")),
      discount_percent: toNumberOrNull(get("discount_percent")),
      stock: toNumberOrNull(get("stock")) ?? 1,
      sku: String(get("sku") ?? "").trim() || null,
      condition,
      category_id,
      category_label: categoryLabel,
      free_shipping: toBoolean(get("free_shipping")),
      weight_kg: toNumberOrNull(get("weight_kg")),
      length_cm: toNumberOrNull(get("length_cm")),
      width_cm: toNumberOrNull(get("width_cm")),
      height_cm: toNumberOrNull(get("height_cm")),
    });
  }

  return { valid, errors };
};

/** Gera e descarrega um modelo .xlsx em branco, já com os cabeçalhos certos e uma linha de exemplo. */
export const downloadImportTemplate = () => {
  const headers = [
    "Nome", "Descrição", "Preço", "Preço antigo", "Desconto (%)", "Stock",
    "SKU", "Condição", "Categoria", "Frete grátis", "Peso (kg)",
    "Comprimento (cm)", "Largura (cm)", "Altura (cm)",
  ];
  const example = [
    "Scandal perfume", "Perfume floral 100ml", 7273, "", "", 10,
    "PRF-001", "Novo", "Perfumes", "Não", 0.3, 15, 8, 8,
  ];
  const ws = XLSX.utils.aoa_to_sheet([headers, example]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Produtos");
  XLSX.writeFile(wb, "modelo-importacao-produtos.xlsx");
};

// ═══════════════════════════════════════════════════════════════════════
// Catálogo de FORNECEDOR (dropship) — vive na tabela `supplier_products`,
// com um esquema diferente do dos produtos normais: "name" em vez de
// "title", "cost_price" em vez de "price", "category" é texto livre (não
// há category_id), e tem ainda "suggested_price"/"min_price" próprios do
// modelo de dropshipping. Por isso tem o seu próprio parser e modelo.
// ═══════════════════════════════════════════════════════════════════════

export interface ParsedSupplierProductRow {
  rowNumber: number;
  name: string;
  description: string | null;
  category: string | null;
  cost_price: number;
  suggested_price: number | null;
  min_price: number | null;
  stock_quantity: number;
  sku: string | null;
  weight_kg: number | null;
  length_cm: number | null;
  width_cm: number | null;
  height_cm: number | null;
  volume_m3: number | null;
}

const SUPPLIER_HEADER_ALIASES: Record<string, string[]> = {
  name: ["nome", "produto", "titulo", "título", "name"],
  description: ["descricao", "descrição", "description"],
  category: ["categoria", "category"],
  cost_price: ["preco_custo", "preço de custo", "preco de custo", "cost_price", "custo"],
  suggested_price: ["preco_sugerido", "preço sugerido", "preco sugerido", "suggested_price"],
  min_price: ["preco_minimo", "preço mínimo", "preco minimo", "min_price"],
  stock_quantity: ["stock", "estoque", "quantidade", "qtd", "stock_quantity"],
  sku: ["sku", "referencia", "referência", "codigo", "código"],
  weight_kg: ["peso", "peso_kg", "weight_kg"],
  length_cm: ["comprimento", "comprimento_cm", "length_cm"],
  width_cm: ["largura", "largura_cm", "width_cm"],
  height_cm: ["altura", "altura_cm", "height_cm"],
};

export const parseSupplierProductRows = (rows: any[][]): { valid: ParsedSupplierProductRow[]; errors: ProductImportError[] } => {
  const valid: ParsedSupplierProductRow[] = [];
  const errors: ProductImportError[] = [];

  if (rows.length === 0) return { valid, errors: [{ rowNumber: 0, message: "Ficheiro vazio." }] };

  const headerMap = buildHeaderMap(rows[0].map(String), SUPPLIER_HEADER_ALIASES);
  if (headerMap.name === undefined) {
    return { valid, errors: [{ rowNumber: 1, message: 'Falta a coluna "Nome" no cabeçalho.' }] };
  }
  if (headerMap.cost_price === undefined) {
    return { valid, errors: [{ rowNumber: 1, message: 'Falta a coluna "Preço de custo" no cabeçalho.' }] };
  }

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const rowNumber = i + 1;
    const isEmpty = row.every(cell => String(cell ?? "").trim() === "");
    if (isEmpty) continue;

    const get = (field: string) => (headerMap[field] !== undefined ? row[headerMap[field]] : undefined);

    const name = String(get("name") ?? "").trim();
    if (!name) { errors.push({ rowNumber, message: "Nome do produto em falta." }); continue; }

    const cost_price = toNumberOrNull(get("cost_price"));
    if (cost_price === null || cost_price <= 0) { errors.push({ rowNumber, message: `Preço de custo inválido para "${name}".` }); continue; }

    const weight_kg = toNumberOrNull(get("weight_kg"));
    const length_cm = toNumberOrNull(get("length_cm"));
    const width_cm = toNumberOrNull(get("width_cm"));
    const height_cm = toNumberOrNull(get("height_cm"));
    const volume_m3 = (length_cm && width_cm && height_cm)
      ? Number(((length_cm * width_cm * height_cm) / 1_000_000).toFixed(4))
      : null;

    valid.push({
      rowNumber,
      name,
      description: String(get("description") ?? "").trim() || null,
      category: String(get("category") ?? "").trim() || null,
      cost_price,
      suggested_price: toNumberOrNull(get("suggested_price")),
      min_price: toNumberOrNull(get("min_price")),
      stock_quantity: toNumberOrNull(get("stock_quantity")) ?? 1,
      sku: String(get("sku") ?? "").trim() || null,
      weight_kg,
      length_cm,
      width_cm,
      height_cm,
      volume_m3,
    } as ParsedSupplierProductRow);
  }

  return { valid, errors };
};

export const downloadSupplierImportTemplate = () => {
  const headers = [
    "Nome", "Descrição", "Categoria", "Preço de custo", "Preço sugerido",
    "Preço mínimo", "Stock", "SKU", "Peso (kg)", "Comprimento (cm)", "Largura (cm)", "Altura (cm)",
  ];
  const example = [
    "Fone Bluetooth X200", "Fone sem fio com cancelamento de ruído", "Eletrónica",
    5000, 8000, 6500, 50, "FN-200", 0.15, 12, 8, 4,
  ];
  const ws = XLSX.utils.aoa_to_sheet([headers, example]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Catálogo");
  XLSX.writeFile(wb, "modelo-importacao-catalogo-fornecedor.xlsx");
};
