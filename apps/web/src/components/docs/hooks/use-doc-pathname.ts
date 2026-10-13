"use client";

import { usePathname } from "next/navigation";

export function useDocPathname() {
  // Static hosts can serve clean-URL exports at slash-suffixed URLs too.
  // Match the prerendered route on the first client render, not after mounting.
  return usePathname().replace(/\/+$/, "") || "/";
}
