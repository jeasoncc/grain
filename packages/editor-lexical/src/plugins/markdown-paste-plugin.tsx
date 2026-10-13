/**
 * MarkdownPastePlugin - Handle pasting Markdown content
 * 
 * This plugin intercepts paste events and converts Markdown text to Lexical nodes.
 * It uses @lexical/markdown transformers to parse and convert the content.
 */

import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { $generateNodesFromMarkdownString, TRANSFORMERS, CHECK_LIST } from "@lexical/markdown";
import { useEffect } from "react";
import { $getSelection, $isRangeSelection, COMMAND_PRIORITY_BEFORE_LOW, PASTE_COMMAND } from "lexical";

/**
 * MarkdownPastePlugin component
 * 
 * Registers a paste command handler that:
 * 1. Detects if pasted content is plain text (potential Markdown)
 * 2. Converts Markdown to Lexical nodes
 * 3. Inserts the converted content into the editor
 */
export default function MarkdownPastePlugin(): null {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    return editor.registerCommand(
      PASTE_COMMAND,
      (event) => {
        if (!("clipboardData" in event)) return false;
        const clipboardData = event.clipboardData;
        if (!clipboardData) return false;

        // Preserve rich HTML and same-namespace Lexical clipboard payloads.
        const htmlData = clipboardData.getData("text/html");
        if (htmlData || clipboardData.getData("application/x-lexical-editor")) return false;

        // Get plain text content
        const textData = clipboardData.getData("text/plain");
        if (!textData) return false;

        // Check if content looks like Markdown
        // Simple heuristic: contains Markdown syntax
        const hasMarkdownSyntax = /^#{1,6}\s|^\*\s|^\d+\.\s|^\-\s|^\>\s|```|^\|.*\|$|^\[.*\]\(.*\)|^\*\*.*\*\*|^\_\_.*\_\_/m.test(textData);
        
        if (!hasMarkdownSyntax) return false;

        const selection = $getSelection();
        if (!$isRangeSelection(selection)) return false;

        event.preventDefault();
        selection.insertNodes(
          $generateNodesFromMarkdownString(textData, [...TRANSFORMERS, CHECK_LIST])
        );

        return true;
      },
      COMMAND_PRIORITY_BEFORE_LOW
    );
  }, [editor]);

  return null;
}
