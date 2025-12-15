/**
 * Editor Package Type Definitions
 *
 * Shared type definitions for the editor package.
 * These types are used across components, nodes, and plugins.
 *
 * @see Requirements 1.3, 2.2
 */

import type { SerializedEditorState } from "lexical";

// Re-export SerializedEditorState from lexical for convenience
export type { SerializedEditorState } from "lexical";

/**
 * Editor tab representation
 * Used by MultiEditorContainer to manage multiple editor instances
 */
export interface EditorTab {
  /** Unique identifier for the tab */
  id: string;
  /** Display title for the tab */
  title: string;
  /** Optional type identifier */
  type?: string;
  /** Optional node ID reference */
  nodeId?: string;
}

/**
 * Editor instance state
 * Stores the state of a single editor instance including content and scroll position
 */
export interface EditorInstanceState {
  /** Lexical serialized editor state */
  serializedState?: SerializedEditorState;
  /** Vertical scroll position */
  scrollTop?: number;
}

/**
 * Editor component props
 */
export interface EditorProps {
  /** Initial editor state (JSON string) */
  initialState?: string | null;
  /** Content change callback */
  onChange?: (state: SerializedEditorState) => void;
  /** Placeholder text */
  placeholder?: string;
  /** Read-only mode */
  readOnly?: boolean;
  /** Editor namespace */
  namespace?: string;
}

/**
 * EditorInstance component props
 */
export interface EditorInstanceProps {
  /** Tab ID */
  tabId: string;
  /** Initial content (JSON string) */
  initialState?: string | null;
  /** Visibility state */
  isVisible: boolean;
  /** Initial scroll position */
  initialScrollTop?: number;
  /** Content change callback */
  onContentChange?: (state: SerializedEditorState) => void;
  /** Scroll position change callback */
  onScrollChange?: (scrollTop: number) => void;
  /** Placeholder text */
  placeholder?: string;
  /** Read-only mode */
  readOnly?: boolean;
}

/**
 * MultiEditorContainer component props
 */
export interface MultiEditorContainerProps {
  /** All open tabs */
  tabs: EditorTab[];
  /** Currently active tab ID */
  activeTabId: string | null;
  /** Editor states map */
  editorStates: Record<string, EditorInstanceState>;
  /** Content change callback */
  onContentChange: (tabId: string, state: SerializedEditorState) => void;
  /** Scroll position change callback */
  onScrollChange: (tabId: string, scrollTop: number) => void;
  /** Placeholder text */
  placeholder?: string;
  /** Read-only mode */
  readOnly?: boolean;
  /** Empty state component */
  emptyState?: React.ReactNode;
}
