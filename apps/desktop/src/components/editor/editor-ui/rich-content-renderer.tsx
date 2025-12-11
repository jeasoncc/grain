/**
 * RichContentRenderer 组件
 * 将 Lexical JSON 内容解析并渲染为 HTML
 * 支持标题、段落、列表、粗体、斜体等格式
 */

import { cn } from "@/lib/utils";

// Lexical JSON 节点类型定义
interface LexicalTextNode {
  type: "text";
  text: string;
  format?: number; // 位掩码: 1=bold, 2=italic, 4=strikethrough, 8=underline, 16=code, 32=subscript, 64=superscript
  style?: string;
}

interface LexicalElementNode {
  type: string;
  children?: LexicalNode[];
  tag?: string; // 用于 heading 节点 (h1, h2, etc.)
  listType?: "bullet" | "number" | "check"; // 用于 list 节点
  value?: number; // 用于 listitem 节点
  checked?: boolean; // 用于 checklist 项
  url?: string; // 用于 link 节点
  language?: string; // 用于 code 节点
}

type LexicalNode = LexicalTextNode | LexicalElementNode;

interface LexicalRoot {
  root: {
    children: LexicalNode[];
    direction?: "ltr" | "rtl" | null;
    format?: string;
    indent?: number;
    type: "root";
    version?: number;
  };
}

// 文本格式位掩码常量
const FORMAT_BOLD = 1;
const FORMAT_ITALIC = 2;
const FORMAT_STRIKETHROUGH = 4;
const FORMAT_UNDERLINE = 8;
const FORMAT_CODE = 16;
const FORMAT_SUBSCRIPT = 32;
const FORMAT_SUPERSCRIPT = 64;

export interface RichContentRendererProps {
  content: string; // Lexical JSON 字符串
  maxHeight?: number;
  className?: string;
}

/**
 * 解析 Lexical JSON 字符串
 */
function parseLexicalContent(content: string): LexicalRoot | null {
  if (!content) return null;
  
  try {
    const parsed = JSON.parse(content);
    if (parsed.root && Array.isArray(parsed.root.children)) {
      return parsed as LexicalRoot;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * 渲染文本节点，应用格式
 */
function renderTextNode(node: LexicalTextNode, key: string): React.ReactNode {
  let content: React.ReactNode = node.text;
  const format = node.format || 0;
  
  // 应用格式（从内到外）
  if (format & FORMAT_CODE) {
    content = (
      <code key={`${key}-code`} className="px-1 py-0.5 rounded bg-muted font-mono text-sm">
        {content}
      </code>
    );
  }
  
  if (format & FORMAT_SUBSCRIPT) {
    content = <sub key={`${key}-sub`}>{content}</sub>;
  }
  
  if (format & FORMAT_SUPERSCRIPT) {
    content = <sup key={`${key}-sup`}>{content}</sup>;
  }
  
  if (format & FORMAT_STRIKETHROUGH) {
    content = <s key={`${key}-strike`}>{content}</s>;
  }
  
  if (format & FORMAT_UNDERLINE) {
    content = <u key={`${key}-underline`}>{content}</u>;
  }
  
  if (format & FORMAT_ITALIC) {
    content = <em key={`${key}-italic`}>{content}</em>;
  }
  
  if (format & FORMAT_BOLD) {
    content = <strong key={`${key}-bold`}>{content}</strong>;
  }
  
  return <span key={key}>{content}</span>;
}

/**
 * 渲染子节点数组
 */
function renderChildren(children: LexicalNode[] | undefined, keyPrefix: string): React.ReactNode[] {
  if (!children || children.length === 0) return [];
  
  return children.map((child, index) => {
    const key = `${keyPrefix}-${index}`;
    return renderNode(child, key);
  });
}

/**
 * 渲染单个节点
 */
function renderNode(node: LexicalNode, key: string): React.ReactNode {
  // 文本节点
  if (node.type === "text") {
    return renderTextNode(node as LexicalTextNode, key);
  }
  
  const elementNode = node as LexicalElementNode;
  const children = renderChildren(elementNode.children, key);
  
  switch (elementNode.type) {
    case "paragraph":
      return (
        <p key={key} className="mb-2 last:mb-0 leading-relaxed">
          {children.length > 0 ? children : <br />}
        </p>
      );
    
    case "heading": {
      const tag = elementNode.tag || "h1";
      const headingClasses: Record<string, string> = {
        h1: "text-xl font-bold mb-3 mt-4 first:mt-0",
        h2: "text-lg font-semibold mb-2 mt-3 first:mt-0",
        h3: "text-base font-semibold mb-2 mt-2 first:mt-0",
        h4: "text-sm font-semibold mb-1 mt-2 first:mt-0",
        h5: "text-sm font-medium mb-1 mt-1 first:mt-0",
        h6: "text-xs font-medium mb-1 mt-1 first:mt-0",
      };
      const className = headingClasses[tag] || headingClasses.h1;
      
      switch (tag) {
        case "h1":
          return <h1 key={key} className={className}>{children}</h1>;
        case "h2":
          return <h2 key={key} className={className}>{children}</h2>;
        case "h3":
          return <h3 key={key} className={className}>{children}</h3>;
        case "h4":
          return <h4 key={key} className={className}>{children}</h4>;
        case "h5":
          return <h5 key={key} className={className}>{children}</h5>;
        case "h6":
          return <h6 key={key} className={className}>{children}</h6>;
        default:
          return <h1 key={key} className={className}>{children}</h1>;
      }
    }
    
    case "quote":
      return (
        <blockquote key={key} className="border-l-4 border-primary/30 pl-4 my-2 italic text-muted-foreground">
          {children}
        </blockquote>
      );
    
    case "list":
      if (elementNode.listType === "number") {
        return (
          <ol key={key} className="list-decimal list-inside mb-2 space-y-1">
            {children}
          </ol>
        );
      }
      if (elementNode.listType === "check") {
        return (
          <ul key={key} className="mb-2 space-y-1">
            {children}
          </ul>
        );
      }
      // 默认为 bullet list
      return (
        <ul key={key} className="list-disc list-inside mb-2 space-y-1">
          {children}
        </ul>
      );
    
    case "listitem":
      if (elementNode.checked !== undefined) {
        // Checklist item
        return (
          <li key={key} className="flex items-start gap-2">
            <input
              type="checkbox"
              checked={elementNode.checked}
              readOnly
              className="mt-1 shrink-0"
            />
            <span className={elementNode.checked ? "line-through text-muted-foreground" : ""}>
              {children}
            </span>
          </li>
        );
      }
      return <li key={key}>{children}</li>;
    
    case "link":
      return (
        <a
          key={key}
          href={elementNode.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary underline hover:text-primary/80"
        >
          {children}
        </a>
      );
    
    case "code":
      return (
        <pre key={key} className="bg-muted rounded-md p-3 my-2 overflow-x-auto">
          <code className="text-sm font-mono">{children}</code>
        </pre>
      );
    
    case "code-highlight":
      // Code highlight nodes are typically children of code blocks
      return <span key={key}>{children}</span>;
    
    case "horizontalrule":
      return <hr key={key} className="my-4 border-border" />;
    
    case "linebreak":
      return <br key={key} />;
    
    // 特殊节点类型 - 简化渲染
    case "mention":
      return (
        <span key={key} className="text-primary font-medium">
          @{children}
        </span>
      );
    
    case "hashtag":
      return (
        <span key={key} className="text-primary">
          {children}
        </span>
      );
    
    case "image":
      // 图片节点通常有 src 属性
      const imgNode = elementNode as LexicalElementNode & { src?: string; altText?: string };
      if (imgNode.src) {
        return (
          <img
            key={key}
            src={imgNode.src}
            alt={imgNode.altText || ""}
            className="max-w-full h-auto rounded my-2"
          />
        );
      }
      return null;
    
    // 表格相关节点
    case "table":
      return (
        <table key={key} className="w-full border-collapse my-2">
          <tbody>{children}</tbody>
        </table>
      );
    
    case "tablerow":
      return <tr key={key}>{children}</tr>;
    
    case "tablecell":
      const cellNode = elementNode as LexicalElementNode & { headerState?: number };
      if (cellNode.headerState) {
        return (
          <th key={key} className="border border-border p-2 bg-muted font-semibold">
            {children}
          </th>
        );
      }
      return (
        <td key={key} className="border border-border p-2">
          {children}
        </td>
      );
    
    // 布局节点
    case "layout-container":
    case "layout-item":
      return <div key={key}>{children}</div>;
    
    // 默认：渲染子节点
    default:
      if (children.length > 0) {
        return <span key={key}>{children}</span>;
      }
      return null;
  }
}

/**
 * RichContentRenderer 组件
 * 将 Lexical JSON 内容渲染为格式化的 HTML
 */
export function RichContentRenderer({
  content,
  maxHeight,
  className,
}: RichContentRendererProps) {
  const parsed = parseLexicalContent(content);
  
  // 如果解析失败，尝试显示原始文本
  if (!parsed) {
    // 可能是纯文本内容
    if (content && typeof content === "string") {
      return (
        <div
          className={cn("text-sm text-muted-foreground", className)}
          style={maxHeight ? { maxHeight, overflowY: "auto" } : undefined}
        >
          <p>{content}</p>
        </div>
      );
    }
    return null;
  }
  
  const renderedContent = renderChildren(parsed.root.children, "root");
  
  return (
    <div
      className={cn("text-sm prose prose-sm dark:prose-invert max-w-none", className)}
      style={maxHeight ? { maxHeight, overflowY: "auto" } : undefined}
    >
      {renderedContent}
    </div>
  );
}

/**
 * 从 Lexical JSON 内容中提取纯文本
 * 用于搜索、摘要等场景
 */
export function extractPlainText(content: string): string {
  const parsed = parseLexicalContent(content);
  if (!parsed) {
    return typeof content === "string" ? content : "";
  }
  
  const texts: string[] = [];
  
  function extractFromNode(node: LexicalNode) {
    if (node.type === "text") {
      texts.push((node as LexicalTextNode).text);
    } else {
      const elementNode = node as LexicalElementNode;
      if (elementNode.children) {
        for (const child of elementNode.children) {
          extractFromNode(child);
        }
      }
    }
  }
  
  for (const child of parsed.root.children) {
    extractFromNode(child);
  }
  
  return texts.join(" ").trim();
}

export default RichContentRenderer;
