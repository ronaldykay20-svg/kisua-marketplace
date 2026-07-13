import { useEffect, type RefObject } from "react";

/**
 * No telemóvel, arrastar um carrossel horizontal é natural (toque). No PC,
 * sem trackpad, um rato normal não tem forma nenhuma de mover esse mesmo
 * carrossel — não há scrollbar visível (escondida de propósito) nem tecla
 * de atalho. Este hook dá ao rato o mesmo gesto de "arrastar" que o dedo já
 * tem, em qualquer contentor com overflow-x: auto.
 *
 * Uso:
 *   const scrollRef = useRef<HTMLDivElement>(null);
 *   useDragScroll(scrollRef);
 *   <div ref={scrollRef} className="overflow-x-auto ...">...</div>
 *
 * Cuidados incluídos:
 * - Cursor muda para "grab"/"grabbing" — é a pista visual que faltava.
 * - Um arrasto real (>5px) cancela o "click" que aconteceria a seguir,
 *   para não abrir sem querer o produto por cima do qual se largou o rato.
 * - Só ativa com o botão principal do rato; toque continua a funcionar
 *   como já funcionava (o browser trata disso nativamente).
 */
export function useDragScroll<T extends HTMLElement>(ref: RefObject<T | null>) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    let isDown = false;
    let moved = false;
    let startX = 0;
    let startScrollLeft = 0;

    const onPointerDown = (e: MouseEvent) => {
      if (e.button !== 0) return; // só o botão esquerdo do rato
      isDown = true;
      moved = false;
      startX = e.pageX;
      startScrollLeft = el.scrollLeft;
      el.style.cursor = "grabbing";
      el.style.scrollSnapType = "none"; // deixa o arrasto ser livre, sem "prender" a meio
      el.style.userSelect = "none"; // não selecionar texto/imagens ao arrastar
    };

    const endDrag = () => {
      if (!isDown) return;
      isDown = false;
      el.style.cursor = "grab";
      el.style.removeProperty("scroll-snap-type");
      el.style.removeProperty("user-select");
    };

    const onPointerMove = (e: MouseEvent) => {
      if (!isDown) return;
      const delta = e.pageX - startX;
      if (Math.abs(delta) > 5) moved = true;
      el.scrollLeft = startScrollLeft - delta;
    };

    // Impede que o "click" que se segue a um arrasto real abra um produto
    // sem querer — só intercepta se de facto houve movimento (>5px).
    const onClickCapture = (e: MouseEvent) => {
      if (moved) {
        e.stopPropagation();
        e.preventDefault();
        moved = false;
      }
    };

    el.style.cursor = "grab";
    el.addEventListener("mousedown", onPointerDown);
    window.addEventListener("mousemove", onPointerMove);
    window.addEventListener("mouseup", endDrag);
    el.addEventListener("mouseleave", endDrag);
    el.addEventListener("click", onClickCapture, true);

    return () => {
      el.removeEventListener("mousedown", onPointerDown);
      window.removeEventListener("mousemove", onPointerMove);
      window.removeEventListener("mouseup", endDrag);
      el.removeEventListener("mouseleave", endDrag);
      el.removeEventListener("click", onClickCapture, true);
      el.style.removeProperty("cursor");
    };
  }, [ref]);
}
