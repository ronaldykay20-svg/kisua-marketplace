## Objetivo

Fazer com que produtos e perfis de **fornecedores/afiliados** apareçam exatamente nas mesmas listagens dos vendedores normais (mesmas categorias, mesma página de Vendedores, mesma pesquisa, mesma home).

## Diagnóstico actual

Hoje existem **dois mundos separados** na base de dados:

```text
Vendedores normais          Fornecedores / Afiliados
─────────────────           ─────────────────────────
sellers                     suppliers
products                    supplier_products
                            dropship_stores
                            dropship_store_products
                            supplier_orders / items
```

Como as listagens da home (`ForYouSection`, `RecentProducts`, `FreeShippingSection`, `LowPriceSection`, `PromoSection`), as categorias (`CategoriaDetalhe`), a pesquisa (`SearchResults`) e a página `Vendedores` lêem **apenas** `products` e `sellers`, os fornecedores e os seus produtos nunca aparecem.

Além disso, o formulário em `FornecedorDashboard` (`SupplierProductForm`) escreve em `supplier_products`, que tem colunas diferentes de `products` — daí "haver falhas" no cadastro.

## Estratégia recomendada (unificação)

Tornar `sellers` + `products` na **fonte única** para todos os tipos de vendedor:

1. **Schema**
   - Adicionar `seller_type` em `sellers` com valores: `individual`, `company`, `supplier` (afiliado/fornecedor).
   - Migrar cada linha de `suppliers` para `sellers` (mesmo `user_id`, `name = company_name`, `type = 'supplier'`, copiar `logo_url`, `phone`, `province`, etc.). Guardar `supplier_id → seller_id` num mapa temporário.
   - Migrar cada `supplier_products` para `products` usando o `seller_id` mapeado, copiando `name → title`, `cost_price → price`, `stock_quantity → stock`, `category → category_id` (resolver por slug/nome), imagens para `product_media`.
   - Manter as tabelas antigas vivas (read-only) para não partir o painel do fornecedor e o fluxo dropship; passam a ser **espelho** alimentado por triggers a partir de `products` quando o vendedor é do tipo `supplier`. (Alternativa mais limpa, se preferires: apagar dropship/supplier_products de vez — confirmar contigo antes.)

2. **Formulário de cadastro**
   - Substituir `SupplierProductForm` em `FornecedorDashboard.tsx` pelo mesmo `SellerProductForm` já usado pelos vendedores (`src/components/seller/SellerProductForm.tsx`), passando o `seller_id` do fornecedor. Assim os campos são idênticos (preço, stock, categoria, free_shipping, badge, media múltipla, etc.) e desaparecem as falhas.
   - O preço mínimo/sugerido para dropshippers continua a existir como **campo extra** no produto (`min_dropship_price`, `suggested_margin`) só preenchido quando `seller_type = 'supplier'`.

3. **Listagens (frontend)**
   - Não é preciso mudar a query principal: `products` já cobre tudo após a unificação.
   - Em `Vendedores.tsx`, remover o filtro `type: "individual"` no `useSellers({...})` e mostrar também `company` e `supplier`. Adicionar um chip extra "Fornecedores" no `filtersList` para filtrar por `seller_type === 'supplier'` quando o utilizador quiser.
   - Garantir que os cards de vendedor lidam com os três tipos (badge "Fornecedor" / "Loja" / "Vendedor").

4. **Dropshipping**
   - `DropshipDashboard` e `CatalogoFornecedores` passam a ler de `products` filtrando `seller_type='supplier'` (com join a `sellers`). `dropship_store_products` continua a apontar para `product_id` (renomear coluna `supplier_product_id → product_id` via migration).

## Detalhes técnicos

- Migration SQL idempotente (memory rule):
  - `ALTER TYPE seller_type ADD VALUE IF NOT EXISTS 'supplier';`
  - `INSERT ... ON CONFLICT DO NOTHING` ao copiar suppliers → sellers.
  - `CREATE TABLE IF NOT EXISTS public._supplier_to_seller_map(...)` para preservar o mapeamento durante a migração de dados.
- Manter RLS: políticas de `products`/`sellers` já cobrem o dono via `user_id`; basta confirmar que o fornecedor tem `user_id` correcto no `sellers` migrado.
- Frontend afectado: `FornecedorDashboard.tsx`, `DropshipDashboard.tsx`, `CatalogoFornecedores.tsx`, `Vendedores.tsx`, `useSupabaseData.ts` (tipos), `database-types.ts`.

## Perguntas antes de avançar

1. **Apagar ou manter** as tabelas `suppliers` / `supplier_products`?
   - Opção A: manter por compatibilidade e sincronizar via trigger (mais seguro, mais código).
   - Opção B: migrar dados e **eliminar** as tabelas antigas, deixando só `sellers`+`products` (mais limpo, irreversível).
2. Já existem fornecedores reais com produtos cadastrados que não posso perder, ou ainda está tudo em fase de testes (posso reescrever sem preocupação com dados)?

Assim que responderes às duas perguntas, executo a migração + refactor numa só passagem.
