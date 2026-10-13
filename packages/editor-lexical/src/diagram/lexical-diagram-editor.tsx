/**
 * LexicalDiagramEditor - Diagram editing component using Lexical
 * Provides a split-view with code editor and Mermaid preview
 * @module @grain/editor-lexical/diagram
 */

import type React from "react";
import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from "react";
import { LexicalExtensionComposer } from "@lexical/react/LexicalExtensionComposer";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import { LexicalErrorBoundary } from "@lexical/react/LexicalErrorBoundary";
import { HistoryPlugin } from "@lexical/react/LexicalHistoryPlugin";
import { OnChangePlugin } from "@lexical/react/LexicalOnChangePlugin";
import { PlainTextPlugin } from "@lexical/react/LexicalPlainTextPlugin";
import { $createParagraphNode, $createTextNode, $getRoot, defineExtension, type EditorState, type LexicalEditor } from "lexical";
import mermaid from "mermaid";

import type { DiagramType } from "@grain/editor-core";
import EditorLifecyclePlugin from "../components/EditorLifecyclePlugin";

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

type DiagramView = "source" | "preview" | "split";

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
    const previousDiagramTypePropRef = useRef(diagramType);
    const editorRef = useRef<LexicalEditor | null>(null);
    const previewRef = useRef<HTMLDivElement>(null);
    const renderVersionRef = useRef(0);
    const mountedRef = useRef(false);
    const renderContainersRef = useRef(new Set<HTMLDivElement>());
    const [activeDiagramType, setActiveDiagramType] = useState(diagramType);
    const [view, setView] = useState<DiagramView>("split");
    const [renderedSvg, setRenderedSvg] = useState<string>("");
    const [renderError, setRenderError] = useState<Error | null>(null);

    useEffect(() => {
      mountedRef.current = true;
      return () => {
        mountedRef.current = false;
        ++renderVersionRef.current;
        for (const container of renderContainersRef.current) container.remove();
        renderContainersRef.current.clear();
      };
    }, []);

    /**
     * Render the diagram using Mermaid
     */
    const renderDiagram = useCallback(async (source: string): Promise<string> => {
      const renderVersion = ++renderVersionRef.current;
      const isCurrent = () => mountedRef.current && renderVersion === renderVersionRef.current;
      let renderContainer: HTMLDivElement | undefined;

      try {
        if (!isCurrent()) return "";
        if (diagramTypeRef.current === "plantuml") {
          throw new Error("PlantUML preview is unavailable. A server-side renderer is required.");
        }
        mermaid.initialize({
          startOnLoad: false,
          theme: "default",
          layout: "dagre",
          look: "classic",
          securityLevel: "loose",
        });

        // Mermaid leaves its error SVG behind when parsing fails. Keep every
        // temporary node inside this request's measurable, off-screen container.
        renderContainer = document.createElement("div");
        renderContainer.setAttribute("aria-hidden", "true");
        renderContainer.style.cssText = "position:fixed;left:-10000px;top:0;visibility:hidden;pointer-events:none";
        document.body.append(renderContainer);
        renderContainersRef.current.add(renderContainer);
        const { svg } = await mermaid.render(
          `mermaid-${crypto.randomUUID()}`,
          source,
          renderContainer
        );

        if (isCurrent()) {
          setRenderedSvg(svg);
          setRenderError(null);
          onRenderComplete?.(svg);
        }
        return svg;
      } catch (error) {
        if (!isCurrent()) return "";
        const err = error instanceof Error ? error : new Error(String(error));
        setRenderedSvg("");
        setRenderError(err);
        onRenderError?.(err);
        return "";
      } finally {
        if (renderContainer) {
          renderContainer.remove();
          renderContainersRef.current.delete(renderContainer);
        }
      }
    }, [onRenderComplete, onRenderError]);

    /**
     * Handle content changes
     */
    const handleChange = useCallback(
      (editorState: EditorState) => {
        editorState.read(() => {
          const root = $getRoot();
          const source = root.getTextContent();
          latestSourceRef.current = source;
          onChange?.(source);
          
          renderDiagram(source);
        });
      },
      [onChange, renderDiagram]
    );

    useEffect(() => {
      if (previousDiagramTypePropRef.current !== diagramType) {
        previousDiagramTypePropRef.current = diagramType;
        diagramTypeRef.current = diagramType;
        setActiveDiagramType(diagramType);
      }
      renderDiagram(latestSourceRef.current);
    }, [diagramType, renderDiagram]);

    useImperativeHandle(
      ref,
      () => ({
        getSource: () => latestSourceRef.current,
        setSource: (source: string) => {
          editorRef.current?.update(() => {
            const root = $getRoot();
            root.clear();
            root.append($createParagraphNode().append($createTextNode(source)));
          }, { discrete: true });
          latestSourceRef.current = source;
          renderDiagram(source);
        },
        getDiagramType: () => diagramTypeRef.current,
        setDiagramType: (type: DiagramType) => {
          diagramTypeRef.current = type;
          setActiveDiagramType(type);
          renderDiagram(latestSourceRef.current);
        },
        render: () => renderDiagram(latestSourceRef.current),
        getPreviewElement: () => previewRef.current,
        focus: () => editorRef.current?.focus(),
        blur: () => editorRef.current?.blur(),
      }),
      [renderDiagram]
    );

    const [extension] = useState(() => defineExtension({
      name: "@grain/editor-lexical/diagram",
      namespace,
      theme: diagramEditorTheme,
      editable: !readOnly,
      onError,
      $initialEditorState: () => {
        $getRoot().append($createParagraphNode().append($createTextNode(latestSourceRef.current)));
      },
    }));

    const supportsPreview = activeDiagramType === "mermaid";
    const previewVisible = showPreview && supportsPreview && view !== "source";
    const sourceVisible = !showPreview || !supportsPreview || view !== "preview";
    const split = sourceVisible && previewVisible;

    return (
      <div className="flex h-full min-h-0 flex-col bg-background text-foreground">
        <div className="flex min-h-10 shrink-0 items-center gap-3 border-b border-border px-3">
          <span className="text-xs font-medium">
            {activeDiagramType === "mermaid" ? "Mermaid" : "PlantUML"}
          </span>
          {readOnly && <span className="text-xs text-muted-foreground">Read-only</span>}
          {showPreview && supportsPreview && (
            <div role="group" aria-label="Diagram view" className="ml-auto flex items-center gap-1">
              {(["source", "preview", "split"] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  aria-pressed={view === mode}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => setView(mode)}
                  className={`h-8 rounded-md px-3 text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
                    view === mode
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  {mode === "source" ? "Source" : mode === "preview" ? "Preview" : "Split"}
                </button>
              ))}
            </div>
          )}
        </div>
        {showPreview && !supportsPreview && (
          <div ref={previewRef} role="status" className="border-b border-border px-3 py-2 text-xs text-muted-foreground">
            PlantUML preview is unavailable. A server-side renderer is required.
          </div>
        )}
        <div className="flex min-h-0 flex-1">
        <div
          hidden={!sourceVisible}
          className={`${sourceVisible ? "flex" : "hidden"} min-h-0 min-w-0 flex-col ${split ? "w-1/2 border-r border-border" : "w-full"}`}
        >
          <div className="relative min-h-0 flex-1 overflow-auto">
            <LexicalExtensionComposer extension={extension} contentEditable={null}>
              <PlainTextPlugin
                contentEditable={
                  <ContentEditable
                    aria-label={`${activeDiagramType === "mermaid" ? "Mermaid" : "PlantUML"} source`}
                    aria-readonly={readOnly}
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
              <OnChangePlugin onChange={handleChange} ignoreSelectionChange />
              <EditorLifecyclePlugin editorRef={editorRef} readOnly={readOnly} />
            </LexicalExtensionComposer>
          </div>
        </div>

        {showPreview && supportsPreview && (
          <div
            hidden={!previewVisible}
            className={`${previewVisible ? "flex" : "hidden"} min-h-0 min-w-0 flex-col ${split ? "w-1/2" : "w-full"}`}
          >
            <div
              ref={previewRef}
              aria-label="Diagram preview"
              className="flex min-h-0 flex-1 items-center justify-center overflow-auto p-4"
            >
              {renderError ? (
                <div role="alert" className="max-w-full rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-foreground [overflow-wrap:anywhere]">
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
      </div>
    );
  }
);

export default LexicalDiagramEditor;
