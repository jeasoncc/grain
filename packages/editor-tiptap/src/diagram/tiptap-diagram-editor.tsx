/**
 * TiptapDiagramEditor - Diagram editor component using Tiptap
 * @module @grain/editor-tiptap/diagram
 */

import {
  forwardRef,
  useImperativeHandle,
  useEffect,
  useCallback,
  useState,
  useRef,
  memo,
} from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import Document from "@tiptap/extension-document";
import Text from "@tiptap/extension-text";
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import Placeholder from "@tiptap/extension-placeholder";
import type { DiagramType } from "@grain/editor-core";
import type {
  TiptapDiagramEditorProps,
  TiptapDiagramEditorHandle,
} from "./tiptap-diagram-editor.types";

/**
 * TiptapDiagramEditor component
 * 
 * A split-view diagram editor with Tiptap for source editing
 * and Mermaid/PlantUML for preview rendering.
 */
export const TiptapDiagramEditor = memo(
  forwardRef<TiptapDiagramEditorHandle, TiptapDiagramEditorProps>(
    (
      {
        initialSource = "",
        diagramType = "mermaid",
        placeholder = "Enter diagram code...",
        readOnly = false,
        autoFocus = false,
        onChange,
        onFocus,
        onBlur,
        onSave,
        onRenderComplete,
        onRenderError,
        className,
      },
      ref
    ) => {
      const [currentDiagramType, setCurrentDiagramType] = useState<DiagramType>(diagramType);
      const [previewSvg, setPreviewSvg] = useState<string>("");
      const [renderError, setRenderError] = useState<string | null>(null);
      const [isRendering, setIsRendering] = useState(false);
      const previewRef = useRef<HTMLDivElement>(null);
      const renderTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

      // Initialize Tiptap editor
      const editor = useEditor({
        extensions: [
          Document,
          Text,
          CodeBlockLowlight.configure({
            defaultLanguage: currentDiagramType,
          }),
          Placeholder.configure({
            placeholder,
          }),
        ],
        content: initialSource
          ? {
              type: "doc",
              content: [
                {
                  type: "codeBlock",
                  attrs: { language: currentDiagramType },
                  content: [{ type: "text", text: initialSource }],
                },
              ],
            }
          : undefined,
        editable: !readOnly,
        autofocus: autoFocus,
        onUpdate: ({ editor }) => {
          const source = editor.getText();
          onChange?.(source);
          // Debounce render
          if (renderTimeoutRef.current) {
            clearTimeout(renderTimeoutRef.current);
          }
          renderTimeoutRef.current = setTimeout(() => {
            renderDiagram(source);
          }, 500);
        },
        onFocus: () => {
          onFocus?.();
        },
        onBlur: () => {
          onBlur?.();
        },
      });

      // Render diagram
      const renderDiagram = useCallback(
        async (source: string) => {
          if (!source.trim()) {
            setPreviewSvg("");
            setRenderError(null);
            return "";
          }

          setIsRendering(true);
          setRenderError(null);

          try {
            let svg: string;
            if (currentDiagramType === "mermaid") {
              const mermaid = await import("mermaid");
              mermaid.default.initialize({
                startOnLoad: false,
                theme: "default",
                securityLevel: "loose",
              });
              const result = await mermaid.default.render(
                `mermaid-${Date.now()}`,
                source
              );
              svg = result.svg;
            } else {
              // PlantUML via public server
              const encoded = btoa(unescape(encodeURIComponent(source)));
              const url = `https://www.plantuml.com/plantuml/svg/${encoded}`;
              const response = await fetch(url);
              if (!response.ok) {
                throw new Error(`PlantUML server error: ${response.status}`);
              }
              svg = await response.text();
            }

            setPreviewSvg(svg);
            onRenderComplete?.(svg);
            return svg;
          } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            setRenderError(message);
            onRenderError?.(error instanceof Error ? error : new Error(message));
            return "";
          } finally {
            setIsRendering(false);
          }
        },
        [currentDiagramType, onRenderComplete, onRenderError]
      );

      // Initial render
      useEffect(() => {
        if (initialSource) {
          renderDiagram(initialSource);
        }
      }, []);

      // Handle Ctrl+S for save
      useEffect(() => {
        if (!editor || !onSave) return;

        const handleKeyDown = (event: KeyboardEvent) => {
          if ((event.ctrlKey || event.metaKey) && event.key === "s") {
            event.preventDefault();
            onSave();
          }
        };

        const editorElement = editor.view.dom;
        editorElement.addEventListener("keydown", handleKeyDown);

        return () => {
          editorElement.removeEventListener("keydown", handleKeyDown);
        };
      }, [editor, onSave]);

      // Cleanup timeout on unmount
      useEffect(() => {
        return () => {
          if (renderTimeoutRef.current) {
            clearTimeout(renderTimeoutRef.current);
          }
        };
      }, []);

      // Expose imperative handle
      useImperativeHandle(
        ref,
        () => ({
          getEditor: () => editor,
          getSource: () => editor?.getText() ?? "",
          setSource: (source: string) => {
            editor?.commands.setContent({
              type: "doc",
              content: [
                {
                  type: "codeBlock",
                  attrs: { language: currentDiagramType },
                  content: [{ type: "text", text: source }],
                },
              ],
            });
            renderDiagram(source);
          },
          focus: () => {
            editor?.commands.focus();
          },
          getDiagramType: () => currentDiagramType,
          setDiagramType: (type: DiagramType) => {
            setCurrentDiagramType(type);
            editor?.commands.updateAttributes("codeBlock", { language: type });
          },
          render: async () => {
            const source = editor?.getText() ?? "";
            return renderDiagram(source);
          },
        }),
        [editor, currentDiagramType, renderDiagram]
      );

      if (!editor) {
        return (
          <div className={className}>
            <div className="animate-pulse bg-gray-100 h-64 rounded" />
          </div>
        );
      }

      return (
        <div className={`flex gap-4 ${className ?? ""}`}>
          {/* Source Editor */}
          <div className="flex-1 border rounded overflow-hidden">
            <div className="bg-gray-100 px-3 py-1 text-sm text-gray-600 border-b">
              {currentDiagramType === "mermaid" ? "Mermaid" : "PlantUML"}
            </div>
            <EditorContent
              editor={editor}
              className="font-mono text-sm p-2 min-h-[200px] focus:outline-none"
            />
          </div>

          {/* Preview */}
          <div className="flex-1 border rounded overflow-hidden">
            <div className="bg-gray-100 px-3 py-1 text-sm text-gray-600 border-b">
              Preview
              {isRendering && (
                <span className="ml-2 text-blue-500">Rendering...</span>
              )}
            </div>
            <div
              ref={previewRef}
              className="p-4 min-h-[200px] flex items-center justify-center"
            >
              {renderError ? (
                <div className="text-red-500 text-sm">{renderError}</div>
              ) : previewSvg ? (
                <div
                  className="max-w-full overflow-auto"
                  // biome-ignore lint/security/noDangerouslySetInnerHtml: SVG from trusted source
                  dangerouslySetInnerHTML={{ __html: previewSvg }}
                />
              ) : (
                <div className="text-gray-400 text-sm">
                  Enter diagram code to see preview
                </div>
              )}
            </div>
          </div>
        </div>
      );
    }
  )
);

TiptapDiagramEditor.displayName = "TiptapDiagramEditor";

/**
 * Default export with display name
 */
export const TiptapDiagramEditorDefault = TiptapDiagramEditor;
