export const HOME_BANNER_SLOTS = [
  { value: 1, label: "1. Topo da home" },
  { value: 2, label: "2. Depois do banner principal" },
  { value: 3, label: "3. Terceiro bloco de banner" },
  { value: 4, label: "4. Quarto bloco de banner" },
  { value: 5, label: "5. Quinto bloco antes dos destaques" },
  { value: 6, label: "6. Depois de vendedores em destaque" },
  { value: 7, label: "7. Depois do segundo bloco pós-destaques" },
  { value: 8, label: "8. Depois dos cards de promoção" },
  { value: 9, label: "9. Depois dos stories" },
  { value: 10, label: "10. Bloco intermédio 1" },
  { value: 11, label: "11. Bloco intermédio 2" },
  { value: 12, label: "12. Bloco intermédio 3" },
  { value: 13, label: "13. Bloco intermédio 4" },
  { value: 14, label: "14. Bloco intermédio 5" },
  { value: 15, label: "15. Penúltimo bloco de banner" },
  { value: 16, label: "16. Último bloco antes dos produtos" },
];

export const getHomeSlotLabel = (value: number | string | null | undefined) => {
  const numericValue = Number(value);
  return HOME_BANNER_SLOTS.find((slot) => slot.value === numericValue)?.label || `Posição ${numericValue}`;
};