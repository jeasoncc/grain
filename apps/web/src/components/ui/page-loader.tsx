"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { LoadingSpinner } from "./loading-spinner";
import { useHydrated } from "@/hooks/use-hydrated";

const getDocumentLoaded = () => document.readyState === "complete";
const getServerDocumentLoaded = () => false;
const subscribeToLoad = (onLoad: () => void) => {
  window.addEventListener("load", onLoad);
  return () => window.removeEventListener("load", onLoad);
};

export function PageLoader() {
  const hydrated = useHydrated();
  return hydrated ? <ClientPageLoader /> : <PageLoaderOverlay progress={0} />;
}

function ClientPageLoader() {
  const documentLoaded = useSyncExternalStore(
    subscribeToLoad,
    getDocumentLoaded,
    getServerDocumentLoaded
  );
  const [loadedOnMount] = useState(documentLoaded);
  const [dismissed, setDismissed] = useState(false);
  const [progress, setProgress] = useState(0);
  const isLoading = !loadedOnMount && !dismissed;
  const progressComplete = progress >= 100;

  useEffect(() => {
    if (!isLoading || documentLoaded || progressComplete) return;
    const interval = setInterval(() => {
      const increment = Math.random() * 15;
      setProgress((current) => Math.min(current + increment, 100));
    }, 100);
    return () => clearInterval(interval);
  }, [isLoading, documentLoaded, progressComplete]);

  useEffect(() => {
    if (!isLoading || (!documentLoaded && !progressComplete)) return;
    // Allow the completed progress bar its existing 300ms animation.
    const timer = setTimeout(() => setDismissed(true), 300);
    return () => clearTimeout(timer);
  }, [isLoading, documentLoaded, progressComplete]);

  if (!isLoading) return null;
  return <PageLoaderOverlay progress={documentLoaded ? 100 : progress} />;
}

function PageLoaderOverlay({ progress }: { progress: number }) {
  return (
    <div className="fixed inset-0 z-[9999] bg-white dark:bg-black flex items-center justify-center transition-opacity duration-300">
      <div className="text-center">
        <div className="mb-8">
          <LoadingSpinner size="lg" />
        </div>
        <div className="w-48 h-1 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-gray-900 dark:bg-white transition-all duration-300 ease-out rounded-full"
            style={{ width: `${Math.min(progress, 100)}%` }}
          />
        </div>
        <p className="mt-4 text-sm text-gray-600 dark:text-gray-400">
          加载中...
        </p>
      </div>
    </div>
  );
}

