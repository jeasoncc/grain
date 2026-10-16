import { create } from "zustand"
import type { DiagramState } from "@/types/diagram"

/** Remote rendering is disabled until explicitly configured in config.json. */
export const useDiagramStore = create<DiagramState>(() => ({ krokiServerUrl: "" }))

// ============================================================================
// Selector Hooks
// ============================================================================

export const useKrokiServerUrl = () => useDiagramStore((s) => s.krokiServerUrl)
