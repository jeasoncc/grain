/**
 * MonacoDiagramEditor - Diagram editor with Monaco and preview
 * @module @grain/editor-monaco/diagram
 */

import { forwardRef, memo, useImperativeHandle, useRef } from "react";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";

import { MonacoCodeEditor } from "../code/monaco-code-editor";
import { DiagramPreview } from "./diagram-preview";
import type {
  DiagramType,
  MonacoDiagramEditorHandle,
  MonacoDiagramEditorProps,
} from "./monaco-diagram-editor.types";

// ==============================
// Icons
// ==============================

const SettingsIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--muted-foreground, #888)" }}>
    <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/>
    <circle cx="12" cy="12" r="3"/>
  </svg>
);

const SmallSettingsIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/>
    <circle cx="12" cy="12" r="3"/>
  </svg>
);

// ==============================
// Styles
// ==============================

const styles = {
  notConfiguredContainer: {
    display: "flex",
    flexDirection: "column" as const,
    alignItems: "center",
    justifyContent: "center",
    height: "100%",
    gap: "16px",
    padding: "32px",
  },
  iconContainer: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: "64px",
    height: "64px",
    borderRadius: "50%",
    backgroundColor: "var(--muted, #f5f5f5)",
  },
  textContainer: {
    textAlign: "center" as const,
  },
  title: {
    fontSize: "18px",
    fontWeight: 500,
    marginBottom: "8px",
  },
  description: {
    fontSize: "14px",
    color: "var(--muted-foreground, #888)",
    maxWidth: "400px",
  },
  configButton: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "10px 20px",
    borderRadius: "6px",
    border: "none",
    backgroundColor: "var(--primary, #3b82f6)",
    color: "white",
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: 500,
  },
};

// ==============================
// Sub Components
// ==============================

const KrokiNotConfigured = memo(function KrokiNotConfigured({
  onOpenSettings,
}: {
  readonly onOpenSettings: () => void;
}) {
  return (
    <div style={styles.notConfiguredContainer}>
      <div style={styles.iconContainer}>
        <SettingsIcon />
      </div>
      <div style={styles.textContainer}>
        <h3 style={styles.title}>Kroki Server Not Configured</h3>
        <p style={styles.description}>
          To render diagrams, please configure a Kroki server URL in settings.
          You can use the public server or host your own.
        </p>
      </div>
      <button type="button" onClick={onOpenSettings} style={styles.configButton}>
        <SmallSettingsIcon />
        Configure Kroki
      </button>
    </div>
  );
});

// ==============================
// Main Component
// ==============================

const MonacoDiagramEditorInner = forwardRef<MonacoDiagramEditorHandle, MonacoDiagramEditorProps>(
  function MonacoDiagramEditor(
    {
      code,
      diagramType,
      previewSvg,
      isLoading,
      error,
      isKrokiConfigured,
      theme,
      themeColors,
      onCodeChange,
      onSave,
      onOpenSettings,
      onRetry,
    },
    ref
  ) {
    const previewRef = useRef<HTMLDivElement>(null);
    const diagramTypeRef = useRef<DiagramType>(diagramType);

    useImperativeHandle(
      ref,
      () => ({
        getSource: () => code,
        setSource: (source: string) => onCodeChange(source),
        getDiagramType: () => diagramTypeRef.current,
        setDiagramType: (type: DiagramType) => {
          diagramTypeRef.current = type;
        },
        getPreviewElement: () => previewRef.current,
        focus: () => {
          // Would need editor ref
        },
        blur: () => {
          (document.activeElement as HTMLElement)?.blur?.();
        },
      }),
      [code, onCodeChange]
    );

    // If Kroki is not configured, show configuration prompt
    if (!isKrokiConfigured) {
      return <KrokiNotConfigured onOpenSettings={onOpenSettings} />;
    }

    return (
      <PanelGroup
        direction="horizontal"
        autoSaveId="diagram-editor-layout"
        className="h-full w-full"
        data-testid="diagram-editor"
      >
        {/* Code Editor Panel */}
        <Panel
          id="code-editor"
          order={1}
          defaultSize={50}
          minSize={20}
          maxSize={80}
          className="overflow-hidden"
        >
          <MonacoCodeEditor
            code={code}
            language="plaintext"
            theme={theme ?? "light"}
            themeColors={themeColors}
            onCodeChange={onCodeChange}
            onSave={onSave ?? (() => {})}
          />
        </Panel>

        {/* Resize Handle */}
        <PanelResizeHandle
          className="w-1 bg-border/50 transition-all cursor-col-resize hover:w-1.5 hover:bg-primary/50 data-[resize-handle-active]:w-1.5 data-[resize-handle-active]:bg-primary/70"
          data-testid="diagram-editor-resize-handle"
        />

        {/* Preview Panel */}
        <Panel
          id="preview"
          order={2}
          defaultSize={50}
          minSize={20}
          maxSize={80}
          className="overflow-hidden bg-background"
        >
          <div ref={previewRef} className="h-full">
            <DiagramPreview
              previewSvg={previewSvg}
              isLoading={isLoading}
              error={error}
              onRetry={onRetry}
              className="h-full"
            />
          </div>
        </Panel>
      </PanelGroup>
    );
  }
);

export const MonacoDiagramEditor = memo(MonacoDiagramEditorInner);
export default MonacoDiagramEditor;
