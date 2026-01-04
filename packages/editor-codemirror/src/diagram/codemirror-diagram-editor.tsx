/**
 * CodeMirrorDiagramEditor - Diagram editor component using CodeMirror
 * @module @grain/editor-codemirror/diagram
 */

import {
  forwardRef,
  useImperativeHandle,
  useEffect,
  useRef,
  useState,
  useCallback,
  memo,
} from "react";
import { EditorView, keymap, placeholder as placeholderExt } from "@codemirror/view";
import { EditorState } from "@codemirror/state";
import { defaultKeymap, history, historyKeymap } from "@codemirror/commands";
import type { DiagramType } from "@grain/editor-core";
import type {
  CodeMirrorDiagramEditorProps,
  CodeMirrorDiagramEditorHandle,
} from "./codemirror-diagram-editor.types";

/**
 * CodeMirrorDiagramEditor component
 * 
 * A split-view diagram editor with CodeMirror for source editing
 * and Mermaid/PlantUML for preview rendering.
 */
export const CodeMirrorDiagramEditor = memo(
  forwardRef<CodeMirrorDiagramEditorHandle, CodeMirrorDiagramEditorProps>(
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
      const containerRef = useRef<HTMLDivElement>(null);
      const viewRef = useRef<EditorView | null>(null);
      const [currentDiagramType, setCurrentDiagramType] = useState<DiagramType>(diagramType);
      const [previewSvg, setPreviewSvg] = useState<string>("");
      const [renderError, setRenderError] = useState<string | null>(null);
      const [isRendering, setIsRendering] = useState(false);
      const renderTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

      // Initialize CodeMirror
      useEffect(() => {
        if (!containerRef.current) return;

        const updateListener = EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            const source = update.state.doc.toString();
            onChange?.(source);
            // Debounce render
            if (renderTimeoutRef.current) {
              clearTimeout(renderTimeoutRef.current);
            }
            renderTimeoutRef.current = setTimeout(() => {
              renderDiagram(source);
            }, 500);
          }
        });

        const focusListener = EditorView.focusChangeEffect.of((_state, focusing) => {
          if (focusing) {
            onFocus?.();
          } else {
            onBlur?.();
          }
          return null;
        });

        const saveKeymap = keymap.of([
          {
            key: "Mod-s",
            run: () => {
              onSave?.();
              return true;
            },
          },
        ]);

        const state = EditorState.create({
          doc: initialSource,
          extensions: [
            history(),
            keymap.of([...defaultKeymap, ...historyKeymap]),
            saveKeymap,
            updateListener,
            focusListener,
            placeholderExt(placeholder),
            EditorView.editable.of(!readOnly),
            EditorView.lineWrapping,
          ],
        });

        const view = new EditorView({
          state,
          parent: containerRef.current,
        });

        viewRef.current = view;

        if (autoFocus) {
          view.focus();
        }

        // Initial render
        if (initialSource) {
          renderDiagram(initialSource);
        }

        return () => {
          view.destroy();
          viewRef.current = null;
          if (renderTimeoutRef.current) {
            clearTimeout(renderTimeoutRef.current);
          }
        };
      }, []);

      // Expose imperative handle
      useImperativeHandle(
        ref,
        () => ({
          getView: () => viewRef.current,
          getSource: () => viewRef.current?.state.doc.toString() ?? "",
          setSource: (source: string) => {
            viewRef.current?.dispatch({
              changes: {
                from: 0,
                to: viewRef.current.state.doc.length,
                insert: source,
              },
            });
            renderDiagram(source);
          },
          focus: () => {
            viewRef.current?.focus();
          },
          getDiagramType: () => currentDiagramType,
          setDiagramType: (type: DiagramType) => {
            setCurrentDiagramType(type);
          },
          render: async () => {
            const source = viewRef.current?.state.doc.toString() ?? "";
            return renderDiagram(source);
          },
        }),
        [currentDiagramType, renderDiagram]
      );

      return (
        <div className={`flex gap-4 h-full ${className ?? ""}`}>
          {/* Source Editor */}
          <div className="flex-1 flex flex-col border rounded overflow-hidden">
            <div className="bg-gray-100 px-3 py-1 text-sm text-gray-600 border-b">
              {currentDiagramType === "mermaid" ? "Mermaid" : "PlantUML"}
            </div>
            <div ref={containerRef} className="flex-1 overflow-auto" />
          </div>

          {/* Preview */}
          <div className="flex-1 flex flex-col border rounded overflow-hidden">
            <div className="bg-gray-100 px-3 py-1 text-sm text-gray-600 border-b">
              Preview
              {isRendering && (
                <span className="ml-2 text-blue-500">Rendering...</span>
              )}
            </div>
            <div className="flex-1 p-4 overflow-auto flex items-center justify-center">
              {renderError ? (
                <div className="text-red-500 text-sm">{renderError}</div>
              ) : previewSvg ? (
                <div
                  className="max-w-full"
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

CodeMirrorDiagramEditor.displayName = "CodeMirrorDiagramEditor";

/**
 * Default export with display name
 */
export const CodeMirrorDiagramEditorDefault = CodeMirrorDiagramEditor;
