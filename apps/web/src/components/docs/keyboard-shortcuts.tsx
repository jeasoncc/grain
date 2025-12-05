"use client";

import { useEffect } from "react";

interface KeyboardShortcut {
  key: string;
  description: string;
  action: () => void;
}

export function useKeyboardShortcuts(shortcuts: KeyboardShortcut[]) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      shortcuts.forEach((shortcut) => {
        const keys = shortcut.key.split("+").map((k) => k.trim().toLowerCase());
        const ctrl = keys.includes("ctrl");
        const shift = keys.includes("shift");
        const alt = keys.includes("alt");
        const meta = keys.includes("cmd") || keys.includes("meta");
        const key = keys[keys.length - 1];

        const matches =
          (ctrl ? e.ctrlKey : !e.ctrlKey) &&
          (shift ? e.shiftKey : !e.shiftKey) &&
          (alt ? e.altKey : !e.altKey) &&
          (meta ? e.metaKey : !e.metaKey) &&
          e.key.toLowerCase() === key;

        if (matches) {
          e.preventDefault();
          shortcut.action();
        }
      });
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [shortcuts]);
}






