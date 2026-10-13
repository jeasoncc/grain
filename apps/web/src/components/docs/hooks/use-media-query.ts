"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";

/**
 * 响应式 Hook
 * 监听媒体查询变化
 */
export function useMediaQuery(query: string): boolean {
  const mediaQuery = useMemo(
    () => typeof window === "undefined" ? null : window.matchMedia(query),
    [query]
  );
  const subscribe = useCallback((onChange: () => void) => {
    if (!mediaQuery) return () => {};

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener("change", onChange);
      return () => mediaQuery.removeEventListener("change", onChange);
    }

    mediaQuery.addListener(onChange);
    return () => mediaQuery.removeListener(onChange);
  }, [mediaQuery]);
  const getSnapshot = useCallback(() => mediaQuery?.matches ?? false, [mediaQuery]);

  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

function getServerSnapshot() {
  return false;
}


