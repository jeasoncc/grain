/**
 * DiagramPreview - Preview component for diagram rendering
 * @module @grain/editor-monaco/diagram
 */

import { memo } from "react";
import type { DiagramError, DiagramErrorType, DiagramPreviewProps } from "./monaco-diagram-editor.types";

// ==============================
// Helper Functions
// ==============================

const getErrorIconSvg = (type: DiagramErrorType): string => {
  switch (type) {
    case "network":
      return `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h.01"/><path d="M8.5 16.429a5 5 0 0 1 7 0"/><path d="M5 12.859a10 10 0 0 1 5.17-2.69"/><path d="M19 12.859a10 10 0 0 0-2.007-1.523"/><path d="M2 8.82a15 15 0 0 1 4.177-2.643"/><path d="M22 8.82a15 15 0 0 0-11.288-3.764"/><path d="m2 2 20 20"/></svg>`;
    case "syntax":
      return `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m18 16 4-4-4-4"/><path d="m6 8-4 4 4 4"/><path d="m14.5 4-5 16"/></svg>`;
    case "server":
      return `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12h10"/><path d="M9 4v16"/><path d="M3 9l3 3-3 3"/><path d="M12 6 9 9 6 6"/><path d="M6 18l3-3 3 3"/><path d="M21 12h-4"/><path d="M21 12a9 9 0 0 0-9-9"/><path d="M21 12a9 9 0 0 1-9 9"/></svg>`;
    default:
      return `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/></svg>`;
  }
};

const getErrorTitle = (type: DiagramErrorType): string => {
  switch (type) {
    case "network":
      return "Network Error";
    case "syntax":
      return "Syntax Error";
    case "server":
      return "Server Error";
    default:
      return "Render Error";
  }
};

const getErrorHint = (type: DiagramErrorType): string | null => {
  switch (type) {
    case "network":
      return "Please check your internet connection and Kroki server availability.";
    case "syntax":
      return "Please check your diagram code for syntax errors.";
    case "server":
      return "The Kroki server encountered an error. Try again later.";
    default:
      return null;
  }
};

// ==============================
// Styles
// ==============================

const styles = {
  container: {
    display: "flex",
    flexDirection: "column" as const,
    alignItems: "center",
    justifyContent: "center",
    height: "100%",
    gap: "12px",
  },
  loadingText: {
    fontSize: "14px",
    color: "var(--muted-foreground, #888)",
  },
  spinner: {
    width: "32px",
    height: "32px",
    border: "3px solid var(--border, #e5e5e5)",
    borderTopColor: "var(--primary, #3b82f6)",
    borderRadius: "50%",
    animation: "spin 1s linear infinite",
  },
  errorContainer: {
    display: "flex",
    flexDirection: "column" as const,
    alignItems: "center",
    justifyContent: "center",
    height: "100%",
    gap: "16px",
    padding: "16px",
  },
  errorAlert: {
    maxWidth: "400px",
    padding: "16px",
    borderRadius: "8px",
    backgroundColor: "var(--destructive-bg, #fef2f2)",
    border: "1px solid var(--destructive, #ef4444)",
    color: "var(--destructive, #ef4444)",
  },
  errorTitle: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    fontWeight: 600,
    marginBottom: "8px",
  },
  errorMessage: {
    fontSize: "14px",
    wordBreak: "break-word" as const,
  },
  errorHint: {
    fontSize: "12px",
    opacity: 0.8,
    marginTop: "8px",
  },
  retryButton: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "8px 16px",
    borderRadius: "6px",
    border: "1px solid var(--border, #e5e5e5)",
    backgroundColor: "transparent",
    cursor: "pointer",
    fontSize: "14px",
  },
  emptyText: {
    fontSize: "14px",
    color: "var(--muted-foreground, #888)",
  },
  scrollArea: {
    height: "100%",
    overflow: "auto",
  },
  svgContainer: {
    padding: "16px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: "100%",
  },
};

// ==============================
// Sub Components
// ==============================

export const DiagramLoadingState = memo(function DiagramLoadingState() {
  return (
    <div style={styles.container}>
      <style>
        {"@keyframes spin { to { transform: rotate(360deg); } }"}
      </style>
      <div style={styles.spinner} />
      <p style={styles.loadingText}>Rendering diagram...</p>
    </div>
  );
});

export const DiagramErrorDisplay = memo(function DiagramErrorDisplay({
  error,
  onRetry,
}: {
  readonly error: DiagramError;
  readonly onRetry: () => void;
}) {
  const iconSvg = getErrorIconSvg(error.type);
  const title = getErrorTitle(error.type);
  const hint = getErrorHint(error.type);

  return (
    <div style={styles.errorContainer}>
      <div style={styles.errorAlert}>
        <div style={styles.errorTitle}>
          {/* biome-ignore lint/security/noDangerouslySetInnerHtml: SVG icon */}
          <span dangerouslySetInnerHTML={{ __html: iconSvg }} />
          {title}
        </div>
        <p style={styles.errorMessage}>{error.message}</p>
        {hint && <p style={styles.errorHint}>{hint}</p>}
        {error.retryCount > 0 && (
          <p style={styles.errorHint}>Retry attempts: {error.retryCount}</p>
        )}
      </div>
      {error.retryable && (
        <button type="button" style={styles.retryButton} onClick={onRetry}>
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/>
            <path d="M21 3v5h-5"/>
            <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/>
            <path d="M8 16H3v5"/>
          </svg>
          Retry
        </button>
      )}
    </div>
  );
});

export const DiagramEmptyState = memo(function DiagramEmptyState({
  text = "Enter diagram code to see preview",
}: {
  readonly text?: string;
}) {
  return (
    <div style={styles.container}>
      <p style={styles.emptyText}>{text}</p>
    </div>
  );
});

export const DiagramSvgContent = memo(function DiagramSvgContent({
  svg,
}: {
  readonly svg: string;
}) {
  return (
    <div style={styles.scrollArea}>
      <div
        style={styles.svgContainer}
        // biome-ignore lint/security/noDangerouslySetInnerHtml: SVG from Kroki service
        dangerouslySetInnerHTML={{ __html: svg }}
      />
    </div>
  );
});

// ==============================
// Main Component
// ==============================

export const DiagramPreview = memo(function DiagramPreview({
  previewSvg,
  isLoading,
  error,
  onRetry,
  emptyText,
  className,
}: DiagramPreviewProps) {
  const containerStyle = className ? undefined : { height: "100%" };

  if (isLoading) {
    return (
      <div className={className} style={containerStyle}>
        <DiagramLoadingState />
      </div>
    );
  }

  if (error) {
    return (
      <div className={className} style={containerStyle}>
        <DiagramErrorDisplay error={error} onRetry={onRetry} />
      </div>
    );
  }

  if (previewSvg) {
    return (
      <div className={className} style={containerStyle}>
        <DiagramSvgContent svg={previewSvg} />
      </div>
    );
  }

  return (
    <div className={className} style={containerStyle}>
      <DiagramEmptyState text={emptyText} />
    </div>
  );
});

export default DiagramPreview;
