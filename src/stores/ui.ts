import { create } from "zustand";
import { persist } from "zustand/middleware";

export type RightPanelView = "outline" | "characters" | "world" | null;
export type BottomDrawerView = "outline" | "characters" | "world" | "statistics" | null;

interface UIState {
  rightPanelView: RightPanelView;
  setRightPanelView: (view: RightPanelView) => void;
  rightSidebarOpen: boolean;
  setRightSidebarOpen: (open: boolean) => void;
  toggleRightSidebar: () => void;
  // 底部抽屉状态
  bottomDrawerOpen: boolean;
  bottomDrawerView: BottomDrawerView;
  bottomDrawerHeight: number;
  setBottomDrawerOpen: (open: boolean) => void;
  setBottomDrawerView: (view: BottomDrawerView) => void;
  setBottomDrawerHeight: (height: number) => void;
  toggleBottomDrawer: (view?: BottomDrawerView) => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set, get) => ({
      rightPanelView: null,
      setRightPanelView: (view) => set({ rightPanelView: view }),
      rightSidebarOpen: true,
      setRightSidebarOpen: (open) => set({ rightSidebarOpen: open }),
      toggleRightSidebar: () => set((s) => ({ rightSidebarOpen: !s.rightSidebarOpen })),
      // 底部抽屉
      bottomDrawerOpen: false,
      bottomDrawerView: null,
      bottomDrawerHeight: 280,
      setBottomDrawerOpen: (open) => set({ bottomDrawerOpen: open }),
      setBottomDrawerView: (view) => set({ bottomDrawerView: view, bottomDrawerOpen: view !== null }),
      setBottomDrawerHeight: (height) => set({ bottomDrawerHeight: Math.max(150, Math.min(500, height)) }),
      toggleBottomDrawer: (view) => {
        const state = get();
        if (view && state.bottomDrawerView !== view) {
          set({ bottomDrawerView: view, bottomDrawerOpen: true });
        } else {
          set({ bottomDrawerOpen: !state.bottomDrawerOpen });
        }
      },
    }),
    {
      name: "novel-editor-ui",
      partialize: (state) => ({
        rightSidebarOpen: state.rightSidebarOpen,
        bottomDrawerHeight: state.bottomDrawerHeight,
      }),
    }
  )
);
