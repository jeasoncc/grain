/**
 * Rich Content Renderer - 将 Lexical JSON 渲染为 HTML
 *
 * 用于在预览卡片等场景中显示富文本内容
 * 支持标题、段落、列表、粗体、斜体等格式
 */

import type { ReactNode } from "react";
import { useMemo } from "react";

interface RichContentRendererProps {
  /** Lexical JSON 字符串 */
  content: string;
  /** 自定义 CSS 类名 */
  className?: string;
  /** 最大高度 */
  maxHeight?: number;
}

interface LexicalNode {
  type: string;
  text?: string;
  format?: number;
  tag?: string;
  listType?: string;
  children?: LexicalNode[];
  mentionName?: string;
  tagName?: string;
  url?: string;
}

interface LexicalRoot {
  root: LexicalNode;
}

// 文本格式标志位 (Lexical 使用位掩码)
const FORMAT_BOLD = 1;
const FORMAT_ITALIC = 2;
const FORMAT_STRIKETHROUGH = 4;
const FORMAT_UNDERLINE = 8;
const FORMAT_CODE = 16;

/**
 * 渲染文本节点，处理格式化
 */
function renderTextNode(node: LexicalNode, key: string): ReactNode {
  const { text, format } = node;
  if (!text) return null;

  let content: ReactNode = text;

  if (format) {
    if (format & FORMAT_CODE) {
      content = (
        <code className="px-1 py-0.5 rounded bg-muted font-mono text-sm">
          {content}
        </code>
      );
    }
    if (format & FORMAT_BOLD) {
      content = <strong>{content}</strong>;
    }
    if (format & FORMAT_ITALIC) {
      content = <em>{content}</em>;
    }
    if (format & FORMAT_UNDERLINE) {
      content = <u>{content}</u>;
    }
    if (format & FORMAT_STRIKETHROUGH) {
      content = <s>{content}</s>;
    }
  }

  return <span key={key}>{content}</span>;
}

/**
 * 递归渲染 Lexical 节点
 */
function renderNode(node: LexicalNode, key: string): ReactNode {
  const { type, children } = node;

  // 渲染子节点
  const renderedChildren = children?.map((child, index) =>
    renderNode(child, `${key}-${index}`)
  );

  switch (type) {
    case "text":
      return renderTextNode(node, key);

    case "paragraph":
      return (
        <p key={key} className="mb-2 last:mb-0 leading-relaxed">
          {renderedChildren}
        </p>
      );

    case "heading": {
      const tag = node.tag || "h1";
      const headingClasses: Record<string, string> = {
        h1: "text-xl font-bold mb-3",
        h2: "text-lg font-semibold mb-2",
        h3: "text-base font-semibold mb-2",
        h4: "text-sm font-semibold mb-1",
        h5: "text-sm font-medium mb-1",
        h6: "text-xs font-medium mb-1",
      };
      const className = headingClasses[tag] || headingClasses.h1;
      
      // Render heading based on tag
      switch (tag) {
        case "h1":
          return <h1 key={key} className={className}>{renderedChildren}</h1>;
        case "h2":
          return <h2 key={key} className={className}>{renderedChildren}</h2>;
        case "h3":
          return <h3 key={key} className={className}>{renderedChildren}</h3>;
        case "h4":
          return <h4 key={key} className={className}>{renderedChildren}</h4>;
        case "h5":
          return <h5 key={key} className={className}>{renderedChildren}</h5>;
        case "h6":
          return <h6 key={key} className={className}>{renderedChildren}</h6>;
        default:
          return <h1 key={key} className={className}>{renderedChildren}</h1>;
      }
    }

    case "list": {
      const listClass =
        node.listType === "number"
          ? "list-decimal list-inside mb-2 space-y-1"
          : "list-disc list-inside mb-2 space-y-1";
      if (node.listType === "number") {
        return (
          <ol key={key} className={listClass}>
            {renderedChildren}
          </ol>
        );
      }
      return (
        <ul key={key} className={listClass}>
          {renderedChildren}
        </ul>
      );
    }

    case "listitem":
      return (
        <li key={key} className="leading-relaxed">
          {renderedChildren}
        </li>
      );

    case "quote":
      return (
        <blockquote
          key={key}
          className="border-l-2 border-primary/50 pl-3 italic text-muted-foreground mb-2"
        >
          {renderedChildren}
        </blockquote>
      );

    case "code":
      return (
        <pre
          key={key}
          className="bg-muted rounded-md p-3 overflow-x-auto text-sm font-mono mb-2"
        >
          <code>{renderedChildren}</code>
        </pre>
      );

    case "link":
      return (
        <a
          key={key}
          href={node.url}
          className="text-primary underline hover:no-underline"
          target="_blank"
          rel="noopener noreferrer"
        >
          {renderedChildren}
        </a>
      );

    case "linebreak":
      return <br key={key} />;

    case "horizontalrule":
      return <hr key={key} className="my-3 border-border" />;

    // 自定义节点：mention
    case "mention":
      return (
        <span
          key={key}
          className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-primary/10 text-primary font-medium"
        >
          @{node.mentionName || node.text}
        </span>
      );

    // 自定义节点：tag
    case "tag":
      return (
        <span
          key={key}
          className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-secondary text-secondary-foreground text-sm"
        >
          #{node.tagName || node.text}
        </span>
      );

    // 根节点
    case "root":
      return <>{renderedChildren}</>;

    default:
      // 对于未知节点类型，尝试渲染其子节点
      if (renderedChildren && renderedChildren.length > 0) {
        return <span key={key}>{renderedChildren}</span>;
      }
      return null;
  }
}

/**
 * 解析 Lexical JSON 内容
 */
function parseLexicalContent(content: string): LexicalRoot | null {
  if (!content) return null;

  try {
    const parsed = JSON.parse(content) as { root?: { type?: string; children?: LexicalNode[] } };
    if (parsed.root && parsed.root.children) {
      return {
        root: {
          type: parsed.root.type || "root",
          children: parsed.root.children,
        },
      };
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Rich Content Renderer 组件
 *
 * 将 Lexical JSON 格式的内容渲染为 HTML
 */
export function RichContentRenderer({
  content,
  className = "",
  maxHeight,
}: RichContentRendererProps): React.ReactElement | null {
  const renderedContent = useMemo(() => {
    const parsed = parseLexicalContent(content);
    if (!parsed) {
      // 如果解析失败，尝试显示原始文本
      return content ? (
        <p className="text-muted-foreground">{content}</p>
      ) : null;
    }

    return renderNode(parsed.root, "root");
  }, [content]);

  if (!renderedContent) {
    return null;
  }

  return (
    <div
      className={`rich-content-renderer ${className}`}
      style={maxHeight ? { maxHeight, overflow: "auto" } : undefined}
    >
      {renderedContent}
    </div>
  );
}

export default RichContentRenderer;
