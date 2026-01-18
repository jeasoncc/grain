/**
 * Mention/Wiki Entry Types
 * 
 * Temporarily defined here since MentionNode is disabled in @grain/editor-lexical
 * TODO: Re-enable when mention plugin is fixed
 */

export interface MentionEntry {
  id: string;
  name: string;
  alias?: string[];
  tags?: string[];
}

export interface WikiPreviewState {
  isVisible: boolean;
  entryId: string | null;
  anchorElement: HTMLElement | null;
}

export interface WikiHoverPreviewHook {
  previewState: WikiPreviewState;
  showPreview: (entryId: string, anchorElement: HTMLElement) => void;
  hidePreview: () => void;
  hidePreviewImmediately: () => void;
}
