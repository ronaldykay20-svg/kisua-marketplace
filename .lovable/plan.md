## Redesign da Homepage

### Ordem das secções (de cima para baixo):

1. **Cabeçalho** — Nova estrutura/design diferente do actual
2. **Categorias** — Em tablets, todas as categorias visíveis por baixo do cabeçalho
3. **Banner 1** (imagem única, full-width)
4. **Banner 4** (4 imagens)
5. **Banner 3** (3 imagens) — **NOVO formato**
6. **Banner 1** (imagem única)
7. **Banner 2** (2 imagens)
8. **Vendedor/Loja Destacada** — Cover + produtos, seta para próximo vendedor
9. **Banner 1**
10. **Banner 4**
11. **Cards de Promoções** — Produtos em promoção do BD, swipe horizontal, 2 em mobile
12. **Banner publicidade**
13. **Video Stories** — Stories de 24h, 1 em mobile / 2 em tablet, agrupados por vendedor
14. **Banner publicidade**
15. **Banner 2**
16. **Banner publicidade**
17. **Banner 4**
18. **Banner 2**
19. **Banner 1**
20. **Banner 3**
21. **Banner 2**
22. **Scroll Infinito de Produtos** — Estilo Amazon/AliExpress/Shein, cards bonitos com cores e animações

### Implementação:
- Refactor do `Navbar` com novo design
- Novo componente de categorias responsivo
- Novo variant `triple` para banners (3 imagens)
- Componente de vendedor destacado com swipe
- Cards de promoção redesenhados e coloridos
- Stories agrupados por vendedor (multi-story por vendedor)
- Componente de scroll infinito com paginação do BD
- Novo `Index.tsx` com toda a sequência

### Notas:
- Todos os banners vêm do BD (tabela `banners`)
- Produtos de promoção = produtos com `discount > 0` ou campo de promoção
- Stories com menos de 24h
- Design inspirado em Amazon/AliExpress/Shein com cores vibrantes e animações
