"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [displayChildren, setDisplayChildren] = useState(children);
  const [isTransitioning, setIsTransitioning] = useState(false);

  useEffect(() => {
    if (children !== displayChildren) {
      setIsTransitioning(true);
      
      const timer = setTimeout(() => {
        setDisplayChildren(children);
        setIsTransitioning(false);
      }, 150);

      return () => clearTimeout(timer);
    }
  }, [children, displayChildren]);

  return (
    <div
      className={`transition-opacity duration-200 ${
        isTransitioning ? "opacity-0" : "opacity-100"
      }`}
    >
      {displayChildren}
    </div>
  );
}





