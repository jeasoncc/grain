/**
 * MarkdownPastePlugin - Handle pasting Markdown content
 * 
 * This plugin intercepts paste events and converts Markdown text to Lexical nodes.
 * It uses @lexical/markdown transformers to parse and convert the content.
 */

import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { $convertFromMarkdownString, TRANSFORMERS, CHECK_LIST } from "@lexical/markdown";
import { useEffect } from "react";
import { COMMAND_PRIORITY_LOW, PASTE_COMMAND, type LexicalCommand } from "lexical";

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
      (event: ClipboardEvent) => {
        const clipboardData = event.clipboardData;
        if (!clipboardData) return false;

        // Check if there's HTML content - if so, let default handler deal with it
        const htmlData = clipboardData.getData("text/html");
        if (htmlData) return false;

        // Get plain text content
        const textData = clipboardData.getData("text/plain");
        if (!textData) return false;

        // Check if content looks like Markdown
        // Simple heuristic: contains Markdown syntax
        const hasMarkdownSyntax = /^#{1,6}\s|^\*\s|^\d+\.\s|^\-\s|^\>\s|```|^\|.*\|$|^\[.*\]\(.*\)|^\*\*.*\*\*|^\_\_.*\_\_/m.test(textData);
        
        if (!hasMarkdownSyntax) return false;

        // Prevent default paste behavior
        event.preventDefault();

        // Convert Markdown to Lexical nodes
        editor.update(() => {
          $convertFromMarkdownString(
            textData,
            [...TRANSFORMERS, CHECK_LIST]
          );
        });

        return true;
      },
      COMMAND_PRIORITY_LOW
    );
  }, [editor]);

  return null;
}
