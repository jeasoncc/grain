/**
 * LexicalDiagramEditor - Diagram editing component using Lexical
 * Provides a split-view with code editor and Mermaid preview
 * @module @grain/editor-lexical/diagram
 */

import type React from "react";
import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from "react";
import { LexicalComposer } from "@lexical/react/LexicalComposer";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import { LexicalErrorBoundary } from "@lexical/react/LexicalErrorBoundary";
import { HistoryPlugin } from "@lexical/react/LexicalHistoryPlugin";
import { OnChangePlugin } from "@lexical/react/LexicalOnChangePlugin";
import { PlainTextPlugin } from "@lexical/react/LexicalPlainTextPlugin";
import type { EditorState } from "lexical";

import type { DiagramType } from "@grain/editor-core";

/**
 * Props for LexicalDiagramEditor component
 */
export interface LexicalDiagramEditorProps {
  /** Initial diagram source */
  initialSource?: string;
  /** Diagram type (mermaid or plantuml) */
  diagramType?: DiagramType;
  /** Source change callback */
  onChange?: (source: string) => void;
  /** Render complete callback */
  onRenderComplete?: (svg: string) => void;
  /** Render error callback */
  onRenderError?: (error: Error) => void;
  /** Placeholder text */
  placeholder?: string;
  /** Read-only mode */
  readOnly?: boolean;
  /** Editor namespace */
  namespace?: string;
  /** Show preview panel */
  showPreview?: boolean;
}

/**
 * Ref handle for LexicalDiagramEditor
 */
export interface LexicalDiagramEditorHandle {
  /** Get current source */
  getSource: () => string;
  /** Set source */
  setSource: (source: string) => void;
  /** Get diagram type */
  getDiagramType: () => DiagramType;
  /** Set diagram type */
  setDiagramType: (type: DiagramType) => void;
  /** Render the diagram */
  render: () => Promise<string>;
  /** Get preview element */
  getPreviewElement: () => HTMLElement | null;
  /** Focus the editor */
  focus: () => void;
  /** Blur the editor */
  blur: () => void;
}

/**
 * Error handler for Lexical
 */
function onError(error: Error): void {
  console.error("[LexicalDiagramEditor Error]", error);
}

/**
 * Theme for diagram editor
 */
const diagramEditorTheme = {
  paragraph: "font-mono text-sm",
};

/**
 * Default Mermaid diagram template
 */
const DEFAULT_MERMAID_SOURCE = `graph TD
    A[Start] --> B{Decision}
    B -->|Yes| C[Action 1]
    B -->|No| D[Action 2]
    C --> E[End]
    D --> E`;

/**
 * Default PlantUML diagram template
 */
const DEFAULT_PLANTUML_SOURCE = `@startuml
Alice -> Bob: Hello
Bob --> Alice: Hi there
@enduml`;

/**
 * LexicalDiagramEditor component
 * 
 * A diagram editor built on Lexical with Mermaid/PlantUML preview.
 * Provides a split-view interface with source code on the left and
 * rendered diagram on the right.
 */
const LexicalDiagramEditor = forwardRef<LexicalDiagramEditorHandle, LexicalDiagramEditorProps>(
  function LexicalDiagramEditor(
    {
      initialSource,
      diagramType = "mermaid",
      onChange,
      onRenderComplete,
      onRenderError,
      placeholder = "Enter diagram code...",
      readOnly = false,
      namespace = "LexicalDiagramEditor",
      showPreview = true,
    },
    ref
  ): React.ReactElement {
    const latestSourceRef = useRef<string>(
      initialSource ?? (diagramType === "mermaid" ? DEFAULT_MERMAID_SOURCE : DEFAULT_PLANTUML_SOURCE)
    );
    const diagramTypeRef = useRef<DiagramType>(diagramType);
    const previewRef = useRef<HTMLDivElement>(null);
    const [renderedSvg, setRenderedSvg] = useState<string>("");
    const [renderError, setRenderError] = useState<Error | null>(null);

    /**
     * Render the diagram using Mermaid
     */
    const renderDiagram = useCallback(async (source: string): Promise<string> => {
      if (diagramTypeRef.current === "plantuml") {
        // PlantUML requires server-side rendering
        console.warn("[LexicalDiagramEditor] PlantUML rendering not implemented");
        return "";
      }

      try {
        // Dynamic import of mermaid to avoid bundling issues
        const mermaid = await import("mermaid");
        mermaid.default.initialize({
          startOnLoad: false,
          theme: "default",
          securityLevel: "loose",
        });

        const { svg } = await mermaid.default.render(
          `mermaid-${Date.now()}`,
          source
        );
        
        setRenderedSvg(svg);
        setRenderError(null);
        onRenderComplete?.(svg);
        return svg;
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        setRenderError(err);
        onRenderError?.(err);
        return "";
      }
    }, [onRenderComplete, onRenderError]);

    /**
     * Handle content changes
     */
    const handleChange = useCallback(
      (editorState: EditorState) => {
        editorState.read(() => {
          const { $getRoot } = require("lexical");
          const root = $getRoot();
          const source = root.getTextContent();
          latestSourceRef.current = source;
          onChange?.(source);
          
          // Debounced render
          renderDiagram(source);
        });
      },
      [onChange, renderDiagram]
    );

    // Initial render
    useEffect(() => {
      if (latestSourceRef.current) {
        renderDiagram(latestSourceRef.current);
      }
    }, [renderDiagram]);

    useImperativeHandle(
      ref,
      () => ({
        getSource: () => latestSourceRef.current,
        setSource: (source: string) => {
          latestSourceRef.current = source;
          renderDiagram(source);
        },
        getDiagramType: () => diagramTypeRef.current,
        setDiagramType: (type: DiagramType) => {
          diagramTypeRef.current = type;
        },
        render: () => renderDiagram(latestSourceRef.current),
        getPreviewElement: () => previewRef.current,
        focus: () => {
          // Would need editor ref
        },
        blur: () => {
          // Would need editor ref
        },
      }),
      [renderDiagram]
    );

    const initialConfig = {
      namespace,
      theme: diagramEditorTheme,
      nodes: [],
      editable: !readOnly,
      onError,
      editorState: latestSourceRef.current
        ? () => {
            const { $getRoot, $createTextNode, $createParagraphNode } = require("lexical");
            const root = $getRoot();
            const paragraph = $createParagraphNode();
            paragraph.append($createTextNode(latestSourceRef.current));
            root.append(paragraph);
          }
        : undefined,
    };

    return (
      <div className="flex h-full">
        {/* Editor Panel */}
        <div className={`flex flex-col ${showPreview ? "w-1/2 border-r" : "w-full"}`}>
          <div className="px-3 py-2 border-b bg-muted/50 text-sm font-medium">
            {diagramType === "mermaid" ? "Mermaid" : "PlantUML"} Source
          </div>
          <div className="flex-1 overflow-auto">
            <LexicalComposer initialConfig={initialConfig}>
              <PlainTextPlugin
                contentEditable={
                  <ContentEditable
                    className="min-h-full outline-none p-4 text-sm leading-relaxed font-mono"
                    style={{ caretColor: "var(--primary)" }}
                  />
                }
                ErrorBoundary={LexicalErrorBoundary}
                placeholder={
                  <div
                    className="text-muted-foreground/50 pointer-events-none select-none text-sm font-mono"
                    style={{
                      position: "absolute",
                      top: "1rem",
                      left: "1rem",
                    }}
                  >
                    {placeholder}
                  </div>
                }
              />
              <HistoryPlugin />
              {onChange && <OnChangePlugin onChange={handleChange} ignoreSelectionChange />}
            </LexicalComposer>
          </div>
        </div>

        {/* Preview Panel */}
        {showPreview && (
          <div className="w-1/2 flex flex-col">
            <div className="px-3 py-2 border-b bg-muted/50 text-sm font-medium">
              Preview
            </div>
            <div
              ref={previewRef}
              className="flex-1 overflow-auto p-4 flex items-center justify-center"
            >
              {renderError ? (
                <div className="text-destructive text-sm p-4 bg-destructive/10 rounded-md">
                  <div className="font-medium mb-1">Render Error</div>
                  <div className="font-mono text-xs">{renderError.message}</div>
                </div>
              ) : renderedSvg ? (
                <div
                  className="max-w-full max-h-full"
                  // biome-ignore lint/security/noDangerouslySetInnerHtml: SVG from mermaid
                  dangerouslySetInnerHTML={{ __html: renderedSvg }}
                />
              ) : (
                <div className="text-muted-foreground text-sm">
                  Enter diagram code to see preview
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }
);

export default LexicalDiagramEditor;
