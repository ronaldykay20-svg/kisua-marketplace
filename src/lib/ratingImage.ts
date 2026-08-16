import r0 from "@/assets/ratings/rating-0.webp";
import r05 from "@/assets/ratings/rating-0-5.webp";
import r1 from "@/assets/ratings/rating-1.webp";
import r15 from "@/assets/ratings/rating-1-5.webp";
import r2 from "@/assets/ratings/rating-2.webp";
import r25 from "@/assets/ratings/rating-2-5.webp";
import r3 from "@/assets/ratings/rating-3.webp";
import r35 from "@/assets/ratings/rating-3-5.webp";
import r4 from "@/assets/ratings/rating-4.webp";
import r45 from "@/assets/ratings/rating-4-5.webp";
import r5 from "@/assets/ratings/rating-5.webp";

const RATING_IMAGES: Record<string, string> = {
  "0": r0, "0.5": r05, "1": r1, "1.5": r15, "2": r2, "2.5": r25,
  "3": r3, "3.5": r35, "4": r4, "4.5": r45, "5": r5,
};

/**
 * Devolve a imagem da fileira de 5 estrelas mais próxima da nota recebida,
 * arredondando para o incremento de 0,5 mais próximo (ex: 3.7 -> "3.5").
 */
export function getRatingImage(rating: number | null | undefined): string {
  const safe = Math.max(0, Math.min(5, Number(rating) || 0));
  const rounded = Math.round(safe * 2) / 2;
  return RATING_IMAGES[String(rounded)] ?? r0;
}

export { default as freteGratisImg } from "@/assets/product-badges/frete-gratis.webp";
