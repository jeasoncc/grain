/**
 * Content converter utilities for converting between editor formats
 * @module @grain/editor-core/utils/content-converter
 */

import type { ContentFormat, SerializedContent } from "../types/content.interface";
import {
  createJsonContent,
  createMarkdownContent,
  createHtmlContent,
} from "../types/content.interface";
import type { EditorError } from "../types/error.interface";
import { contentParseError, unsupportedFormatError } from "../types/error.interface";

/**
 * Result type for conversion operations
 */
export type ConversionResult<T> =
  | { readonly success: true; readonly data: T }
  | { readonly success: false; readonly error: EditorError };

/**
 * Create a successful conversion result
 */
export const conversionSuccess = <T>(data: T): ConversionResult<T> => ({
  success: true,
  data,
});

/**
 * Create a failed conversion result
 */
export const conversionFailure = <T>(error: EditorError): ConversionResult<T> => ({
  success: false,
  error,
});

/**
 * Content converter interface
 * Implementations should handle conversion between specific formats
 */
export interface ContentConverter {
  /** Source format this converter handles */
  readonly sourceFormat: ContentFormat;
  /** Target format this converter produces */
  readonly targetFormat: ContentFormat;
  /** Convert content from source to target format */
  convert(content: SerializedContent): ConversionResult<SerializedContent>;
}

/**
 * JSON to Markdown converter
 * Converts Lexical/Tiptap JSON to Markdown text
 *
 * Note: This is a basic implementation. For full fidelity conversion,
 * use the editor-specific export functions.
 */
export const jsonToMarkdownConverter: ContentConverter = {
  sourceFormat: "json",
  targetFormat: "markdown",
  convert(content: SerializedContent): ConversionResult<SerializedContent> {
    if (content.format !== "json") {
      return conversionFailure(
        unsupportedFormatError(`Expected JSON format, got ${content.format}`)
      );
    }

    try {
      const parsed = JSON.parse(content.data);
      const markdown = convertJsonToMarkdown(parsed);
      return conversionSuccess(createMarkdownContent(markdown));
    } catch (error) {
      return conversionFailure(
        contentParseError(`Failed to parse JSON content: ${String(error)}`)
      );
    }
  },
};

/**
 * Markdown to JSON converter
 * Converts Markdown text to a basic JSON structure
 *
 * Note: This creates a simple paragraph-based structure.
 * For full Lexical/Tiptap compatibility, use editor-specific import functions.
 */
export const markdownToJsonConverter: ContentConverter = {
  sourceFormat: "markdown",
  targetFormat: "json",
  convert(content: SerializedContent): ConversionResult<SerializedContent> {
    if (content.format !== "markdown") {
      return conversionFailure(
        unsupportedFormatError(`Expected Markdown format, got ${content.format}`)
      );
    }

    try {
      const json = convertMarkdownToJson(content.data);
      return conversionSuccess(createJsonContent(json));
    } catch (error) {
      return conversionFailure(
        contentParseError(`Failed to convert Markdown: ${String(error)}`)
      );
    }
  },
};

/**
 * JSON to HTML converter
 * Converts Lexical/Tiptap JSON to HTML
 */
export const jsonToHtmlConverter: ContentConverter = {
  sourceFormat: "json",
  targetFormat: "html",
  convert(content: SerializedContent): ConversionResult<SerializedContent> {
    if (content.format !== "json") {
      return conversionFailure(
        unsupportedFormatError(`Expected JSON format, got ${content.format}`)
      );
    }

    try {
      const parsed = JSON.parse(content.data);
      const html = convertJsonToHtml(parsed);
      return conversionSuccess(createHtmlContent(html));
    } catch (error) {
      return conversionFailure(
        contentParseError(`Failed to parse JSON content: ${String(error)}`)
      );
    }
  },
};

/**
 * HTML to JSON converter
 * Converts HTML to a basic JSON structure
 */
export const htmlToJsonConverter: ContentConverter = {
  sourceFormat: "html",
  targetFormat: "json",
  convert(content: SerializedContent): ConversionResult<SerializedContent> {
    if (content.format !== "html") {
      return conversionFailure(
        unsupportedFormatError(`Expected HTML format, got ${content.format}`)
      );
    }

    try {
      const json = convertHtmlToJson(content.data);
      return conversionSuccess(createJsonContent(json));
    } catch (error) {
      return conversionFailure(
        contentParseError(`Failed to convert HTML: ${String(error)}`)
      );
    }
  },
};

/**
 * Markdown to HTML converter
 */
export const markdownToHtmlConverter: ContentConverter = {
  sourceFormat: "markdown",
  targetFormat: "html",
  convert(content: SerializedContent): ConversionResult<SerializedContent> {
    if (content.format !== "markdown") {
      return conversionFailure(
        unsupportedFormatError(`Expected Markdown format, got ${content.format}`)
      );
    }

    try {
      const html = convertMarkdownToHtml(content.data);
      return conversionSuccess(createHtmlContent(html));
    } catch (error) {
      return conversionFailure(
        contentParseError(`Failed to convert Markdown: ${String(error)}`)
      );
    }
  },
};

/**
 * HTML to Markdown converter
 */
export const htmlToMarkdownConverter: ContentConverter = {
  sourceFormat: "html",
  targetFormat: "markdown",
  convert(content: SerializedContent): ConversionResult<SerializedContent> {
    if (content.format !== "html") {
      return conversionFailure(
        unsupportedFormatError(`Expected HTML format, got ${content.format}`)
      );
    }

    try {
      const markdown = convertHtmlToMarkdown(content.data);
      return conversionSuccess(createMarkdownContent(markdown));
    } catch (error) {
      return conversionFailure(
        contentParseError(`Failed to convert HTML: ${String(error)}`)
      );
    }
  },
};

// ============================================
// Internal conversion functions
// ============================================

/**
 * Convert JSON (Lexical/Tiptap format) to Markdown
 * This is a simplified implementation for basic content
 */
function convertJsonToMarkdown(json: unknown): string {
  if (!json || typeof json !== "object") {
    return "";
  }

  const root = json as { root?: { children?: unknown[] } };
  if (!root.root?.children) {
    return "";
  }

  return root.root.children.map(nodeToMarkdown).join("\n\n");
}

/**
 * Convert a single node to Markdown
 */
function nodeToMarkdown(node: unknown): string {
  if (!node || typeof node !== "object") {
    return "";
  }

  const n = node as {
    type?: string;
    text?: string;
    children?: unknown[];
    tag?: string;
    listType?: string;
    format?: number;
  };

  switch (n.type) {
    case "paragraph":
      return childrenToMarkdown(n.children);
    case "heading":
      const level = n.tag ? Number.parseInt(n.tag.replace("h", ""), 10) : 1;
      return `${"#".repeat(level)} ${childrenToMarkdown(n.children)}`;
    case "list":
      return listToMarkdown(n);
    case "quote":
      return `> ${childrenToMarkdown(n.children)}`;
    case "code":
      return `\`\`\`\n${childrenToMarkdown(n.children)}\n\`\`\``;
    case "text":
      return formatText(n.text ?? "", n.format ?? 0);
    default:
      return childrenToMarkdown(n.children);
  }
}

/**
 * Convert children nodes to Markdown
 */
function childrenToMarkdown(children?: unknown[]): string {
  if (!children) return "";
  return children.map(nodeToMarkdown).join("");
}

/**
 * Convert list node to Markdown
 */
function listToMarkdown(node: { listType?: string; children?: unknown[] }): string {
  if (!node.children) return "";

  const isOrdered = node.listType === "number";
  return node.children
    .map((item, index) => {
      const prefix = isOrdered ? `${index + 1}.` : "-";
      const content = nodeToMarkdown(item);
      return `${prefix} ${content}`;
    })
    .join("\n");
}

/**
 * Apply text formatting
 */
function formatText(text: string, format: number): string {
  let result = text;
  // Lexical format flags: 1=bold, 2=italic, 4=strikethrough, 8=underline, 16=code
  if (format & 16) result = `\`${result}\``;
  if (format & 4) result = `~~${result}~~`;
  if (format & 2) result = `*${result}*`;
  if (format & 1) result = `**${result}**`;
  return result;
}

/**
 * Convert Markdown to JSON (basic Lexical-compatible structure)
 */
function convertMarkdownToJson(markdown: string): object {
  const lines = markdown.split("\n");
  const children: object[] = [];

  for (const line of lines) {
    if (line.trim() === "") continue;

    // Heading
    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      children.push({
        type: "heading",
        tag: `h${headingMatch[1].length}`,
        children: [{ type: "text", text: headingMatch[2] }],
      });
      continue;
    }

    // List item
    const listMatch = line.match(/^[-*]\s+(.+)$/);
    if (listMatch) {
      children.push({
        type: "listitem",
        children: [{ type: "text", text: listMatch[1] }],
      });
      continue;
    }

    // Paragraph
    children.push({
      type: "paragraph",
      children: [{ type: "text", text: line }],
    });
  }

  return {
    root: {
      type: "root",
      children,
    },
  };
}

/**
 * Convert JSON to HTML
 */
function convertJsonToHtml(json: unknown): string {
  if (!json || typeof json !== "object") {
    return "";
  }

  const root = json as { root?: { children?: unknown[] } };
  if (!root.root?.children) {
    return "";
  }

  return root.root.children.map(nodeToHtml).join("");
}

/**
 * Convert a single node to HTML
 */
function nodeToHtml(node: unknown): string {
  if (!node || typeof node !== "object") {
    return "";
  }

  const n = node as {
    type?: string;
    text?: string;
    children?: unknown[];
    tag?: string;
    listType?: string;
    format?: number;
  };

  switch (n.type) {
    case "paragraph":
      return `<p>${childrenToHtml(n.children)}</p>`;
    case "heading":
      const tag = n.tag ?? "h1";
      return `<${tag}>${childrenToHtml(n.children)}</${tag}>`;
    case "list":
      const listTag = n.listType === "number" ? "ol" : "ul";
      return `<${listTag}>${childrenToHtml(n.children)}</${listTag}>`;
    case "listitem":
      return `<li>${childrenToHtml(n.children)}</li>`;
    case "quote":
      return `<blockquote>${childrenToHtml(n.children)}</blockquote>`;
    case "code":
      return `<pre><code>${childrenToHtml(n.children)}</code></pre>`;
    case "text":
      return formatTextHtml(n.text ?? "", n.format ?? 0);
    default:
      return childrenToHtml(n.children);
  }
}

/**
 * Convert children nodes to HTML
 */
function childrenToHtml(children?: unknown[]): string {
  if (!children) return "";
  return children.map(nodeToHtml).join("");
}

/**
 * Apply text formatting as HTML
 */
function formatTextHtml(text: string, format: number): string {
  let result = escapeHtml(text);
  if (format & 16) result = `<code>${result}</code>`;
  if (format & 4) result = `<s>${result}</s>`;
  if (format & 2) result = `<em>${result}</em>`;
  if (format & 1) result = `<strong>${result}</strong>`;
  return result;
}

/**
 * Escape HTML special characters
 */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * Convert HTML to JSON (basic structure)
 */
function convertHtmlToJson(html: string): object {
  // Simple regex-based parsing for basic HTML
  const children: object[] = [];

  // Extract paragraphs
  const pMatches = html.matchAll(/<p[^>]*>(.*?)<\/p>/gi);
  for (const match of pMatches) {
    children.push({
      type: "paragraph",
      children: [{ type: "text", text: stripHtmlTags(match[1]) }],
    });
  }

  // Extract headings
  const hMatches = html.matchAll(/<(h[1-6])[^>]*>(.*?)<\/\1>/gi);
  for (const match of hMatches) {
    children.push({
      type: "heading",
      tag: match[1].toLowerCase(),
      children: [{ type: "text", text: stripHtmlTags(match[2]) }],
    });
  }

  return {
    root: {
      type: "root",
      children,
    },
  };
}

/**
 * Strip HTML tags from text
 */
function stripHtmlTags(html: string): string {
  return html.replace(/<[^>]*>/g, "");
}

/**
 * Convert Markdown to HTML (basic)
 */
function convertMarkdownToHtml(markdown: string): string {
  let html = markdown;

  // Headings
  html = html.replace(/^######\s+(.+)$/gm, "<h6>$1</h6>");
  html = html.replace(/^#####\s+(.+)$/gm, "<h5>$1</h5>");
  html = html.replace(/^####\s+(.+)$/gm, "<h4>$1</h4>");
  html = html.replace(/^###\s+(.+)$/gm, "<h3>$1</h3>");
  html = html.replace(/^##\s+(.+)$/gm, "<h2>$1</h2>");
  html = html.replace(/^#\s+(.+)$/gm, "<h1>$1</h1>");

  // Bold and italic
  html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/\*(.+?)\*/g, "<em>$1</em>");

  // Code
  html = html.replace(/`(.+?)`/g, "<code>$1</code>");

  // Paragraphs (lines not already wrapped)
  html = html
    .split("\n")
    .map((line) => {
      if (line.trim() === "") return "";
      if (line.startsWith("<")) return line;
      return `<p>${line}</p>`;
    })
    .join("\n");

  return html;
}

/**
 * Convert HTML to Markdown (basic)
 */
function convertHtmlToMarkdown(html: string): string {
  let md = html;

  // Headings
  md = md.replace(/<h1[^>]*>(.*?)<\/h1>/gi, "# $1\n");
  md = md.replace(/<h2[^>]*>(.*?)<\/h2>/gi, "## $1\n");
  md = md.replace(/<h3[^>]*>(.*?)<\/h3>/gi, "### $1\n");
  md = md.replace(/<h4[^>]*>(.*?)<\/h4>/gi, "#### $1\n");
  md = md.replace(/<h5[^>]*>(.*?)<\/h5>/gi, "##### $1\n");
  md = md.replace(/<h6[^>]*>(.*?)<\/h6>/gi, "###### $1\n");

  // Bold and italic
  md = md.replace(/<strong[^>]*>(.*?)<\/strong>/gi, "**$1**");
  md = md.replace(/<em[^>]*>(.*?)<\/em>/gi, "*$1*");

  // Code
  md = md.replace(/<code[^>]*>(.*?)<\/code>/gi, "`$1`");

  // Paragraphs
  md = md.replace(/<p[^>]*>(.*?)<\/p>/gi, "$1\n\n");

  // Strip remaining tags
  md = stripHtmlTags(md);

  return md.trim();
}

// ============================================
// Converter registry
// ============================================

/**
 * All available converters
 */
export const converters: readonly ContentConverter[] = [
  jsonToMarkdownConverter,
  markdownToJsonConverter,
  jsonToHtmlConverter,
  htmlToJsonConverter,
  markdownToHtmlConverter,
  htmlToMarkdownConverter,
];

/**
 * Find a converter for the given source and target formats
 */
export const findConverter = (
  sourceFormat: ContentFormat,
  targetFormat: ContentFormat
): ContentConverter | null => {
  return (
    converters.find(
      (c) => c.sourceFormat === sourceFormat && c.targetFormat === targetFormat
    ) ?? null
  );
};

/**
 * Convert content from one format to another
 * Automatically finds the appropriate converter
 */
export const convertContent = (
  content: SerializedContent,
  targetFormat: ContentFormat
): ConversionResult<SerializedContent> => {
  if (content.format === targetFormat) {
    return conversionSuccess(content);
  }

  const converter = findConverter(content.format, targetFormat);
  if (!converter) {
    return conversionFailure(
      unsupportedFormatError(
        `No converter found for ${content.format} -> ${targetFormat}`
      )
    );
  }

  return converter.convert(content);
};

/**
 * Try to convert content, with fallback chain
 * Attempts direct conversion first, then tries intermediate formats
 */
export const convertContentWithFallback = (
  content: SerializedContent,
  targetFormat: ContentFormat
): ConversionResult<SerializedContent> => {
  // Try direct conversion first
  const directResult = convertContent(content, targetFormat);
  if (directResult.success) {
    return directResult;
  }

  // Try via intermediate format
  const intermediateFormats: ContentFormat[] = ["json", "markdown", "html"];
  for (const intermediate of intermediateFormats) {
    if (intermediate === content.format || intermediate === targetFormat) {
      continue;
    }

    const toIntermediate = convertContent(content, intermediate);
    if (toIntermediate.success) {
      const toTarget = convertContent(toIntermediate.data, targetFormat);
      if (toTarget.success) {
        return toTarget;
      }
    }
  }

  return conversionFailure(
    unsupportedFormatError(
      `Cannot convert from ${content.format} to ${targetFormat}`
    )
  );
};
