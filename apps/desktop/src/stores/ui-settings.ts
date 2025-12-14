/**
 * UI Settings Store
 * Manages user interface preferences like tab position
 *
 * Requirements: 4.1, 4.4
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";

export type TabPosition = "top" | "right-sidebar";

interface UISettingsState {
  /** Tab position: "top" displays tabs above editor, "right-sidebar" displays in right panel */
  tabPosition: TabPosition;
  
  /** Set tab position */
  setTabPosition: (position: TabPosition) => void;
}

export const useUISettingsStore = create<UISettingsState>()(
  persist(
    (set) => ({
      // Default to "right-sidebar" as per requirements
      tabPosition: "right-sidebar",
      
      setTabPosition: (position) => set({ tabPosition: position }),
    }),
    {
      name: "novel-editor-ui-settings",
    }
  )
);
