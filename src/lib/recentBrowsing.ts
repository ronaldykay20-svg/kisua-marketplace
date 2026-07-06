// Guarda em localStorage os últimos produtos vistos e pesquisas do utilizador.
// Usado por "Recomendado para si" para complementar a RPC quando ainda não há
// dados suficientes no servidor.

const VIEWED_KEY = "recent_viewed_products";
const SEARCH_KEY = "recent_search_queries";
const MAX = 30;

function readList(key: string): string[] {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}

function writeList(key: string, list: string[]) {
  try {
    localStorage.setItem(key, JSON.stringify(list.slice(0, MAX)));
  } catch {
    /* quota — ignorar */
  }
}

export function trackViewedProduct(productId: string) {
  if (!productId) return;
  const list = readList(VIEWED_KEY).filter((id) => id !== productId);
  list.unshift(productId);
  writeList(VIEWED_KEY, list);
}

export function getViewedProducts(): string[] {
  return readList(VIEWED_KEY);
}

export function trackSearchQuery(query: string) {
  const q = query.trim();
  if (!q || q.length < 2) return;
  const list = readList(SEARCH_KEY).filter((s) => s.toLowerCase() !== q.toLowerCase());
  list.unshift(q);
  writeList(SEARCH_KEY, list);
}

export function getSearchQueries(): string[] {
  return readList(SEARCH_KEY);
}
