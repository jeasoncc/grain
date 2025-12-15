/**
 * UI Settings Store - DEPRECATED
 * 
 * This file is kept for backward compatibility only.
 * All UI settings have been consolidated into ui.ts
 * 
 * @deprecated Import from '@/stores/ui' instead
 * 
 * Requirements: 4.3
 */

// Re-export everything from the consolidated ui store
export { useUIStore as useUISettingsStore, type TabPosition } from "./ui";
