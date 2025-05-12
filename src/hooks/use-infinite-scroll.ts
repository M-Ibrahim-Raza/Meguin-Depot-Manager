"use client";

import { useEffect, useRef } from "react";

/**
 * Drives infinite scroll: returns a ref to attach to a sentinel element at the
 * foot of a list. When that sentinel scrolls within `rootMargin` of the
 * viewport, `onLoadMore` fires. No-ops while `disabled` (nothing more to load
 * or a fetch is already in flight). The callback is read through a ref so the
 * observer isn't torn down and rebuilt on every render.
 */
export function useInfiniteScroll<T extends HTMLElement = HTMLDivElement>(
  onLoadMore: () => void,
  options: { disabled?: boolean; rootMargin?: string } = {},
) {
  const { disabled = false, rootMargin = "200px" } = options;
  const sentinelRef = useRef<T | null>(null);
  const onLoadMoreRef = useRef(onLoadMore);

  // Keep the latest callback in the ref without re-subscribing the observer.
  useEffect(() => {
    onLoadMoreRef.current = onLoadMore;
  });

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || disabled) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) onLoadMoreRef.current();
      },
      { rootMargin },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [disabled, rootMargin]);

  return sentinelRef;
}
