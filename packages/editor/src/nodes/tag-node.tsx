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

    dom.className = "tag-node inline-flex items-center text-xs font-medium text-primary";
    dom.style.cssText = `
      vertical-align: middle;
    `;

    dom.setAttribute("data-tag-name", this.__tagName);

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
