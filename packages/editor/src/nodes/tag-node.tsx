/**
 * Tag Node - 用于 #[标签名] 内联标签引用
 *
 * 在编辑器中显示为彩色标签
 * 这是 #+TAGS: 的补充，用于在正文中引用标签
 */

import type {
  DOMConversionMap,
  DOMConversionOutput,
  DOMExportOutput,
  EditorConfig,
  LexicalNode,
  NodeKey,
  SerializedTextNode,
  Spread,
} from "lexical";
import { $applyNodeReplacement, TextNode } from "lexical";

export type SerializedTagNode = Spread<
  {
    tagName: string;
  },
  SerializedTextNode
>;

function convertTagElement(domNode: HTMLElement): DOMConversionOutput | null {
  const textContent = domNode.textContent;
  const tagName = domNode.getAttribute("data-tag-name");

  if (textContent !== null && tagName !== null) {
    const node = $createTagNode(tagName);
    return { node };
  }

  return null;
}

/**
 * 根据标签名生成颜色
 */
function getTagColor(tagName: string): string {
  let hash = 0;
  for (let i = 0; i < tagName.length; i++) {
    hash = tagName.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash % 360);
  return `hsl(${hue}, 60%, 50%)`;
}

export class TagNode extends TextNode {
  __tagName: string;

  static getType(): string {
    return "tag";
  }

  static clone(node: TagNode): TagNode {
    return new TagNode(node.__tagName, node.__key);
  }

  static importJSON(serializedNode: SerializedTagNode): TagNode {
    const node = $createTagNode(serializedNode.tagName);
    node.setTextContent(serializedNode.text);
    node.setFormat(serializedNode.format);
    node.setDetail(serializedNode.detail);
    node.setMode(serializedNode.mode);
    node.setStyle(serializedNode.style);
    return node;
  }

  constructor(tagName: string, key?: NodeKey) {
    super(`#[${tagName}]`, key);
    this.__tagName = tagName;
  }

  exportJSON(): SerializedTagNode {
    return {
      ...super.exportJSON(),
      tagName: this.__tagName,
      type: "tag",
      version: 1,
    };
  }

  createDOM(config: EditorConfig): HTMLElement {
    const dom = super.createDOM(config);
    const color = getTagColor(this.__tagName);

    dom.className = "tag-node";
    dom.style.cssText = `
      display: inline-flex;
      align-items: center;
      padding: 0 6px;
      margin: 0 2px;
      border-radius: 4px;
      font-size: 0.875em;
      font-weight: 500;
      background-color: ${color}20;
      color: ${color};
      border: 1px solid ${color}40;
      cursor: pointer;
      transition: all 0.15s ease;
    `;

    dom.setAttribute("data-tag-name", this.__tagName);

    // 悬停效果
    dom.addEventListener("mouseenter", () => {
      dom.style.backgroundColor = `${color}30`;
      dom.style.borderColor = `${color}60`;
    });
    dom.addEventListener("mouseleave", () => {
      dom.style.backgroundColor = `${color}20`;
      dom.style.borderColor = `${color}40`;
    });

    return dom;
  }

  exportDOM(): DOMExportOutput {
    const element = document.createElement("span");
    element.setAttribute("data-tag-name", this.__tagName);
    element.className = "tag-node";
    element.textContent = this.__text;
    return { element };
  }

  static importDOM(): DOMConversionMap | null {
    return {
      span: (domNode: HTMLElement) => {
        if (!domNode.hasAttribute("data-tag-name")) {
          return null;
        }
        return {
          conversion: convertTagElement,
          priority: 1,
        };
      },
    };
  }

  isTextEntity(): true {
    return true;
  }

  canInsertTextBefore(): boolean {
    return false;
  }

  canInsertTextAfter(): boolean {
    return false;
  }

  getTagName(): string {
    return this.__tagName;
  }
}

export function $createTagNode(tagName: string): TagNode {
  const tagNode = new TagNode(tagName);
  tagNode.setMode("segmented").toggleDirectionless();
  return $applyNodeReplacement(tagNode);
}

export function $isTagNode(node: LexicalNode | null | undefined): node is TagNode {
  return node instanceof TagNode;
}
