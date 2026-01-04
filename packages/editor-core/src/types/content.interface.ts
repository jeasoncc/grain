/**
 * Content serialization types for editor content storage and transfer
 * @module @grain/editor-core/types/content
 */

/**
 * Supported content formats for serialization
 */
export type ContentFormat = "json" | "markdown" | "html";

/**
 * Serialized content structure for storage and transfer
 * Used to persist editor content in a format-agnostic way
 */
export interface SerializedContent {
  /** The format of the serialized data */
  readonly format: ContentFormat;
  /** The serialized content data as a string */
  readonly data: string;
  /** Version number for migration support */
  readonly version: number;
}

/**
 * Create a JSON-formatted SerializedContent
 * @param data - The object to serialize as JSON
 * @returns SerializedContent with JSON format
 */
export const createJsonContent = (data: object): SerializedContent => ({
  format: "json",
  data: JSON.stringify(data),
  version: 1,
});

/**
 * Create a Markdown-formatted SerializedContent
 * @param markdown - The markdown string
 * @returns SerializedContent with markdown format
 */
export const createMarkdownContent = (markdown: string): SerializedContent => ({
  format: "markdown",
  data: markdown,
  version: 1,
});

/**
 * Create an HTML-formatted SerializedContent
 * @param html - The HTML string
 * @returns SerializedContent with HTML format
 */
export const createHtmlContent = (html: string): SerializedContent => ({
  format: "html",
  data: html,
  version: 1,
});

/**
 * Parse SerializedContent back to its original format
 * @param content - The serialized content to parse
 * @returns The parsed data (object for JSON, string for markdown/html)
 */
export const parseSerializedContent = (
  content: SerializedContent
): object | string => {
  switch (content.format) {
    case "json":
      return JSON.parse(content.data);
    case "markdown":
    case "html":
      return content.data;
  }
};
