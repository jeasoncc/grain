"use client";

import { useRef, useEffect, ReactNode } from "react";
import { cn } from "@/lib/utils";
import { createMagneticEffect } from "@/lib/micro-interactions";

interface MagneticButtonProps {
  children: ReactNode;
  className?: string;
  strength?: number;
  asChild?: boolean;
}

export function MagneticButton({
  children,
  className,
  strength = 0.2,
  asChild = false,
}: MagneticButtonProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    return createMagneticEffect(ref.current, strength);
  }, [strength]);

  if (asChild) {
    return <div ref={ref} className={cn("inline-block", className)}>{children}</div>;
  }

  return (
    <div
      ref={ref}
      className={cn(
        "inline-block cursor-pointer transition-transform duration-300 ease-out",
        className
      )}
    >
      {children}
    </div>
  );
}


