"use client";

import { useEffect, useState } from "react";

export function ScrollProgress() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const updateProgress = () => {
      const scrollTop = window.pageYOffset;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const scrollPercent = (scrollTop / docHeight) * 100;
      setProgress(scrollPercent);
    };

    window.addEventListener("scroll", updateProgress, { passive: true });
    updateProgress();

    return () => window.removeEventListener("scroll", updateProgress);
  }, []);

  return (
    <div className="fixed top-0 left-0 right-0 h-1 bg-gray-100 dark:bg-gray-800 z-[100] pointer-events-none">
      <div
        className="h-full bg-gray-900 dark:bg-white transition-all duration-150 ease-out shadow-sm"
        style={{
          width: `${progress}%`,
          boxShadow: progress > 0 ? "0 0 10px rgba(0,0,0,0.1)" : "none",
        }}
      />
    </div>
  );
}











