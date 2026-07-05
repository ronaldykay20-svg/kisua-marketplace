import { defineMcp } from "@lovable.dev/mcp-js";
import searchProducts from "./tools/search-products";
import getProduct from "./tools/get-product";
import listCategories from "./tools/list-categories";

export default defineMcp({
  name: "angoexpress-mcp",
  title: "AngoExpress Marketplace",
  version: "0.1.0",
  instructions:
    "Ferramentas para pesquisar produtos, obter detalhes e listar categorias do marketplace AngoExpress (Angola).",
  tools: [searchProducts, getProduct, listCategories],
});
