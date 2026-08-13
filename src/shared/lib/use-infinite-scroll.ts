import { useEffect, useRef } from "react";

type UseInfiniteScrollArgs = {
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  fetchNextPage: () => void;
};

// A última página carregada quase nunca fecha a última linha do grid (perPage não é
// múltiplo do número de colunas, que varia com a largura). Empurrando o fim do conteúdo
// para além de uma viewport, essa linha incompleta fica fora da tela. Só dispara quando
// perPage não deu conta da tela (janela muito alta / poucas colunas).
const LOOKAHEAD_VIEWPORTS = 1;
const MAX_LOOKAHEAD_FETCHES = 4;

export function useInfiniteScroll({
  hasNextPage,
  isFetchingNextPage,
  fetchNextPage,
}: UseInfiniteScrollArgs) {
  const sentinelRef = useRef<HTMLDivElement>(null);
  const lookaheadFetches = useRef(0);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !hasNextPage) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { rootMargin: "400px" },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !hasNextPage || isFetchingNextPage) return;
    if (lookaheadFetches.current >= MAX_LOOKAHEAD_FETCHES) return;

    if (sentinel.getBoundingClientRect().top < window.innerHeight * LOOKAHEAD_VIEWPORTS) {
      lookaheadFetches.current += 1;
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  return sentinelRef;
}
