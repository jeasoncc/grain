/**
 * Wiki 提及悬浮预览插件
 * 
 * 监听 Mention 节点的鼠标悬停事件，显示 Wiki 条目预览
 * 已从废弃的 RoleInterface 迁移到 WikiEntryInterface
 * 
 * Note: This plugin requires external components (WikiHoverPreview, useWikiHoverPreview)
 * to be provided by the consuming application. The plugin handles the event listening
 * and state management, but the actual preview rendering is delegated to the app.
 */

import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { useEffect } from "react";

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

export interface MentionTooltipPluginProps {
  /** Hook for managing wiki hover preview state */
  useWikiHoverPreview: () => WikiHoverPreviewHook;
  /** Component to render the wiki preview */
  WikiHoverPreview: React.ComponentType<{
    entryId: string;
    anchorElement: HTMLElement;
    onClose: () => void;
  }>;
}

export default function MentionTooltipPlugin({
  useWikiHoverPreview,
  WikiHoverPreview,
}: MentionTooltipPluginProps): React.ReactElement | null {
  const [editor] = useLexicalComposerContext();
  const { 
    previewState, 
    showPreview, 
    hidePreview, 
    hidePreviewImmediately 
  } = useWikiHoverPreview();

  useEffect(() => {
    const rootElement = editor.getRootElement();
    if (!rootElement) return;

    // 处理鼠标进入 mention 节点
    const handleMouseEnter = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      
      // 检查是否是 mention 节点
      if (target.classList.contains("mention") || target.closest(".mention")) {
        const mentionElement = target.classList.contains("mention") 
          ? target 
          : target.closest(".mention") as HTMLElement;
        
        if (mentionElement) {
          const entryId = mentionElement.getAttribute("data-role-id");
          if (entryId) {
            showPreview(entryId, mentionElement);
          }
        }
      }
    };

    // 处理鼠标离开 mention 节点
    const handleMouseLeave = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      const relatedTarget = event.relatedTarget as HTMLElement | null;
      
      // 检查是否从 mention 节点离开
      if (target.classList.contains("mention") || target.closest(".mention")) {
        // 如果移动到预览卡片，不隐藏
        if (relatedTarget?.closest("[data-wiki-preview]")) {
          return;
        }
        hidePreview();
      }
    };

    // 使用事件委托监听 mention 节点的悬停事件
    rootElement.addEventListener("mouseover", handleMouseEnter);
    rootElement.addEventListener("mouseout", handleMouseLeave);

    return () => {
      rootElement.removeEventListener("mouseover", handleMouseEnter);
      rootElement.removeEventListener("mouseout", handleMouseLeave);
    };
  }, [editor, showPreview, hidePreview]);

  // 渲染预览组件
  if (!previewState.isVisible || !previewState.entryId || !previewState.anchorElement) {
    return null;
  }

  return (
    <WikiHoverPreview
      entryId={previewState.entryId}
      anchorElement={previewState.anchorElement}
      onClose={hidePreviewImmediately}
    />
  );
}
