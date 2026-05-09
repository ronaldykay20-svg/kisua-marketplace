/**
 * Slots por device — completamente independentes.
 * Mobile  : 1–16
 * Tablet  : 201–216
 * Desktop : 301–316  +  Sidebar 101–103
 */

export const MOBILE_SLOTS: { value: number; label: string }[] = [
  { value: 1,  label: "1. Topo da home"                          },
  { value: 2,  label: "2. Depois do banner principal"            },
  { value: 3,  label: "3. Terceiro bloco"                        },
  { value: 4,  label: "4. Quarto bloco"                          },
  { value: 5,  label: "5. Antes dos destaques"                   },
  { value: 6,  label: "6. Depois de vendedores em destaque"      },
  { value: 7,  label: "7. Segundo bloco pós-destaques"           },
  { value: 8,  label: "8. Depois dos cards de promoção"          },
  { value: 9,  label: "9. Depois dos stories"                    },
  { value: 10, label: "10. Bloco intermédio 1"                   },
  { value: 11, label: "11. Bloco intermédio 2"                   },
  { value: 12, label: "12. Bloco intermédio 3"                   },
  { value: 13, label: "13. Bloco intermédio 4"                   },
  { value: 14, label: "14. Bloco intermédio 5"                   },
  { value: 15, label: "15. Penúltimo bloco"                      },
  { value: 16, label: "16. Último antes dos produtos"            },
];

export const TABLET_SLOTS: { value: number; label: string }[] = [
  { value: 201, label: "T1. Topo da home (tablet)"               },
  { value: 202, label: "T2. Depois do banner principal"          },
  { value: 203, label: "T3. Terceiro bloco"                      },
  { value: 204, label: "T4. Quarto bloco"                        },
  { value: 205, label: "T5. Antes dos destaques"                 },
  { value: 206, label: "T6. Depois de vendedores em destaque"    },
  { value: 207, label: "T7. Segundo bloco pós-destaques"         },
  { value: 208, label: "T8. Depois dos cards de promoção"        },
  { value: 209, label: "T9. Depois dos stories"                  },
  { value: 210, label: "T10. Bloco intermédio 1"                 },
  { value: 211, label: "T11. Bloco intermédio 2"                 },
  { value: 212, label: "T12. Bloco intermédio 3"                 },
  { value: 213, label: "T13. Bloco intermédio 4"                 },
  { value: 214, label: "T14. Bloco intermédio 5"                 },
  { value: 215, label: "T15. Penúltimo bloco"                    },
  { value: 216, label: "T16. Último antes dos produtos"          },
];

export const DESKTOP_SLOTS: { value: number; label: string }[] = [
  { value: 301, label: "D1. Topo da home (desktop)"              },
  { value: 302, label: "D2. Depois do banner principal"          },
  { value: 303, label: "D3. Terceiro bloco"                      },
  { value: 304, label: "D4. Quarto bloco"                        },
  { value: 305, label: "D5. Antes dos destaques"                 },
  { value: 306, label: "D6. Depois de vendedores em destaque"    },
  { value: 307, label: "D7. Segundo bloco pós-destaques"         },
  { value: 308, label: "D8. Depois dos cards de promoção"        },
  { value: 309, label: "D9. Depois dos stories"                  },
  { value: 310, label: "D10. Bloco intermédio 1"                 },
  { value: 311, label: "D11. Bloco intermédio 2"                 },
  { value: 312, label: "D12. Bloco intermédio 3"                 },
  { value: 313, label: "D13. Bloco intermédio 4"                 },
  { value: 314, label: "D14. Bloco intermédio 5"                 },
  { value: 315, label: "D15. Penúltimo bloco"                    },
  { value: 316, label: "D16. Último antes dos produtos"          },
  { value: 101, label: "Sidebar — posição 1"                     },
  { value: 102, label: "Sidebar — posição 2"                     },
  { value: 103, label: "Sidebar — posição 3"                     },
];

/** Retrocompatibilidade — usado fora do admin */
export const HOME_BANNER_SLOTS = [
  ...MOBILE_SLOTS,
  ...TABLET_SLOTS,
  ...DESKTOP_SLOTS,
];

export const SIDEBAR_SLOTS = [101, 102, 103];

/** Devolve os slots do device seleccionado */
export const getSlotsForDevice = (device: "mobile" | "tablet" | "desktop") => {
  if (device === "tablet")  return TABLET_SLOTS;
  if (device === "desktop") return DESKTOP_SLOTS;
  return MOBILE_SLOTS;
};

export const getHomeSlotLabel = (value: number | string | null | undefined) => {
  const n = Number(value);
  return HOME_BANNER_SLOTS.find(s => s.value === n)?.label || `Posição ${n}`;
};
