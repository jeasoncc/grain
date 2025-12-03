import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface BackdropBlurSectionProps {
  children: ReactNode;
  className?: string;
  intensity?: "light" | "medium" | "strong";
}

export function BackdropBlurSection({
  children,
  className,
  intensity = "medium",
}: BackdropBlurSectionProps) {
  const blurClasses = {
    light: "backdrop-blur-sm",
    medium: "backdrop-blur-md",
    strong: "backdrop-blur-lg",
  };

  return (
    <div
      className={cn(
        "relative",
        blurClasses[intensity],
        className
      )}
    >
      {children}
    </div>
  );
}





