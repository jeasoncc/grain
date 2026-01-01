/**
 * 可折叠内容块节点
 * 
 * 结构：
 * - CollapsibleContainerNode (容器)
 *   - CollapsibleTitleNode (标题，点击折叠/展开)
 *   - CollapsibleContentNode (内容区域)
 */

import {
  DOMConversionMap,
  DOMConversionOutput,
  DOMExportOutput,
  EditorConfig,
  ElementNode,
  LexicalEditor,
  LexicalNode,
  NodeKey,
  SerializedElementNode,
  Spread,
} from "lexical";

// ============================================
// CollapsibleContainerNode
// ============================================

type SerializedCollapsibleContainerNode = Spread<
  { open: boolean },
  SerializedElementNode
>;

export class CollapsibleContainerNode extends ElementNode {
  __open: boolean;

  constructor(open: boolean, key?: NodeKey) {
    super(key);
    this.__open = open;
  }

  static getType(): string {
    return "collapsible-container";
  }

  static clone(node: CollapsibleContainerNode): CollapsibleContainerNode {
    return new CollapsibleContainerNode(node.__open, node.__key);
  }

  createDOM(config: EditorConfig, editor: LexicalEditor): HTMLElement {
    const dom = document.createElement("details");
    dom.classList.add("Collapsible__container");
    dom.open = this.__open;
    
    // 监听 toggle 事件
    dom.addEventListener("toggle", () => {
      const open = dom.open;
      editor.update(() => {
        const writable = this.getWritable();
        writable.__open = open;
      });
    });
    
    return dom;
  }

  updateDOM(prevNode: CollapsibleContainerNode, dom: HTMLDetailsElement): boolean {
    if (prevNode.__open !== this.__open) {
      dom.open = this.__open;
    }
    return false;
  }

  static importDOM(): DOMConversionMap | null {
    return {
      details: () => ({
        conversion: convertDetailsElement,
        priority: 1,
      }),
    };
  }

  static importJSON(json: SerializedCollapsibleContainerNode): CollapsibleContainerNode {
    return $createCollapsibleContainerNode(json.open);
  }

  exportDOM(): DOMExportOutput {
    const element = document.createElement("details");
    element.classList.add("Collapsible__container");
    element.open = this.__open;
    return { element };
  }

  exportJSON(): SerializedCollapsibleContainerNode {
    return {
      ...super.exportJSON(),
      open: this.__open,
      type: "collapsible-container",
      version: 1,
    };
  }

  setOpen(open: boolean): void {
    const writable = this.getWritable();
    writable.__open = open;
  }

  getOpen(): boolean {
    return this.getLatest().__open;
  }

  toggleOpen(): void {
    this.setOpen(!this.getOpen());
  }
}

function convertDetailsElement(): DOMConversionOutput {
  return {
    node: $createCollapsibleContainerNode(true),
  };
}

export function $createCollapsibleContainerNode(open = true): CollapsibleContainerNode {
  return new CollapsibleContainerNode(open);
}

export function $isCollapsibleContainerNode(
  node: LexicalNode | null | undefined
): node is CollapsibleContainerNode {
  return node instanceof CollapsibleContainerNode;
}

// ============================================
// CollapsibleTitleNode
// ============================================

type SerializedCollapsibleTitleNode = SerializedElementNode;

export class CollapsibleTitleNode extends ElementNode {
  static getType(): string {
    return "collapsible-title";
  }

  static clone(node: CollapsibleTitleNode): CollapsibleTitleNode {
    return new CollapsibleTitleNode(node.__key);
  }

  createDOM(config: EditorConfig): HTMLElement {
    const dom = document.createElement("summary");
    dom.classList.add("Collapsible__title");
    return dom;
  }

  updateDOM(): boolean {
    return false;
  }

  static importDOM(): DOMConversionMap | null {
    return {
      summary: () => ({
        conversion: convertSummaryElement,
        priority: 1,
      }),
    };
  }

  static importJSON(): CollapsibleTitleNode {
    return $createCollapsibleTitleNode();
  }

  exportDOM(): DOMExportOutput {
    const element = document.createElement("summary");
    element.classList.add("Collapsible__title");
    return { element };
  }

  exportJSON(): SerializedCollapsibleTitleNode {
    return {
      ...super.exportJSON(),
      type: "collapsible-title",
      version: 1,
    };
  }

  collapseAtStart(): boolean {
    return true;
  }

  insertNewAfter(): null {
    return null;
  }
}

function convertSummaryElement(): DOMConversionOutput {
  return {
    node: $createCollapsibleTitleNode(),
  };
}

export function $createCollapsibleTitleNode(): CollapsibleTitleNode {
  return new CollapsibleTitleNode();
}

export function $isCollapsibleTitleNode(
  node: LexicalNode | null | undefined
): node is CollapsibleTitleNode {
  return node instanceof CollapsibleTitleNode;
}

// ============================================
// CollapsibleContentNode
// ============================================

type SerializedCollapsibleContentNode = SerializedElementNode;

export class CollapsibleContentNode extends ElementNode {
  static getType(): string {
    return "collapsible-content";
  }

  static clone(node: CollapsibleContentNode): CollapsibleContentNode {
    return new CollapsibleContentNode(node.__key);
  }

  createDOM(config: EditorConfig): HTMLElement {
    const dom = document.createElement("div");
    dom.classList.add("Collapsible__content");
    return dom;
  }

  updateDOM(): boolean {
    return false;
  }

  static importDOM(): DOMConversionMap | null {
    return {};
  }

  static importJSON(): CollapsibleContentNode {
    return $createCollapsibleContentNode();
  }

  exportDOM(): DOMExportOutput {
    const element = document.createElement("div");
    element.classList.add("Collapsible__content");
    return { element };
  }

  exportJSON(): SerializedCollapsibleContentNode {
    return {
      ...super.exportJSON(),
      type: "collapsible-content",
      version: 1,
    };
  }
}

export function $createCollapsibleContentNode(): CollapsibleContentNode {
  return new CollapsibleContentNode();
}

export function $isCollapsibleContentNode(
  node: LexicalNode | null | undefined
): node is CollapsibleContentNode {
  return node instanceof CollapsibleContentNode;
}
