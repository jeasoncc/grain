import { useEffect, useState, useRef } from "react";
import { createPortal } from "react-dom";
import { getNodeContent, getNode } from "@/services/nodes";
import { Loader2 } from "lucide-react";

interface WikiHoverPreviewProps {
  entryId: string;
  anchorElement: HTMLElement;
  onClose: () => void;
}

export function WikiHoverPreview({
  entryId,
  anchorElement,
  onClose,
}: WikiHoverPreviewProps) {
  const [content, setContent] = useState<string | null>(null);
  const [title, setTitle] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [position, setPosition] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const tooltipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let mounted = true;

    async function fetchData() {
      setLoading(true);
      try {
        const [nodeContent, node] = await Promise.all([
          getNodeContent(entryId),
          getNode(entryId),
        ]);

        if (mounted) {
          setTitle(node?.title || "Unknown");
          // Extract plain text preview from JSON content if possible
          if (nodeContent) {
            try {
              const parsed = JSON.parse(nodeContent);
              // Simple extraction of text from Lexical JSON
              // This is a simplified approach; a proper serializer would be better
              const text = extractTextFromLexical(parsed.root);
              setContent(text.slice(0, 150) + (text.length > 150 ? "..." : ""));
            } catch {
              setContent("Preview not available");
            }
          } else {
            setContent("No content");
          }
        }
      } catch (error) {
        if (mounted) setContent("Failed to load content");
      } finally {
        if (mounted) setLoading(false);
      }
    }

    fetchData();

    return () => {
      mounted = false;
    };
  }, [entryId]);

  // Calculate position
  useEffect(() => {
    if (!anchorElement) return;

    const rect = anchorElement.getBoundingClientRect();
    const top = rect.bottom + window.scrollY + 5;
    const left = rect.left + window.scrollX;

    setPosition({ top, left });
  }, [anchorElement]);

  // Extract text helper
  function extractTextFromLexical(node: any): string {
    if (!node) return "";
    if (typeof node.text === "string") return node.text;
    if (Array.isArray(node.children)) {
      return node.children.map(extractTextFromLexical).join(" ");
    }
    return "";
  }

  if (!anchorElement) return null;

  return createPortal(
    <div
      ref={tooltipRef}
      className="fixed z-[9999] w-64 p-3 bg-popover/95 backdrop-blur-xl border border-border/40 rounded-xl shadow-xl animate-in fade-in zoom-in-95 duration-200"
      style={{ top: position.top, left: position.left }}
      onMouseEnter={() => {
        // Prevent closing when hovering the tooltip itself
      }}
      onMouseLeave={onClose}
      data-wiki-preview="true"
    >
      {loading ? (
        <div className="flex items-center justify-center py-4">
          <Loader2 className="size-4 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="space-y-2">
          <h4 className="font-medium text-sm border-b border-border/40 pb-1.5 mb-1.5">{title}</h4>
          <p className="text-xs text-muted-foreground leading-relaxed line-clamp-4">
            {content}
          </p>
        </div>
      )}
    </div>,
    document.body
  );
}
