/**
 * 角色提及节点 - 用于 @ 提及角色
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

export type SerializedMentionNode = Spread<
  {
    mentionName: string;
    roleId: string;
  },
  SerializedTextNode
>;

function convertMentionElement(
  domNode: HTMLElement,
): DOMConversionOutput | null {
  const textContent = domNode.textContent;
  const roleId = domNode.getAttribute("data-role-id");

  if (textContent !== null && roleId !== null) {
    const node = $createMentionNode(textContent, roleId);
    return {
      node,
    };
  }

  return null;
}

export class MentionNode extends TextNode {
  __mention: string;
  __roleId: string;

  static getType(): string {
    return "mention";
  }

  static clone(node: MentionNode): MentionNode {
    return new MentionNode(node.__mention, node.__roleId, node.__key);
  }

  static importJSON(serializedNode: SerializedMentionNode): MentionNode {
    const node = $createMentionNode(
      serializedNode.mentionName,
      serializedNode.roleId,
    );
    node.setTextContent(serializedNode.text);
    node.setFormat(serializedNode.format);
    node.setDetail(serializedNode.detail);
    node.setMode(serializedNode.mode);
    node.setStyle(serializedNode.style);
    return node;
  }

  constructor(mentionName: string, roleId: string, key?: NodeKey) {
    super("@" + mentionName, key);
    this.__mention = mentionName;
    this.__roleId = roleId;
  }

  exportJSON(): SerializedMentionNode {
    return {
      ...super.exportJSON(),
      mentionName: this.__mention,
      roleId: this.__roleId,
      type: "mention",
      version: 1,
    };
  }

  createDOM(config: EditorConfig): HTMLElement {
    const dom = super.createDOM(config);
    // 添加样式类，使提及的角色更醒目
    dom.className =
      "mention inline-flex items-center px-1.5 py-0.5 rounded-md bg-primary/10 text-primary font-medium hover:bg-primary/20 transition-colors cursor-pointer";
    dom.setAttribute("data-role-id", this.__roleId);
    dom.setAttribute("data-mention-name", this.__mention);
    return dom;
  }

  exportDOM(): DOMExportOutput {
    const element = document.createElement("span");
    element.setAttribute("data-role-id", this.__roleId);
    element.setAttribute("data-mention-name", this.__mention);
    element.textContent = this.__text;
    return { element };
  }

  static importDOM(): DOMConversionMap | null {
    return {
      span: (domNode: HTMLElement) => {
        if (!domNode.hasAttribute("data-role-id")) {
          return null;
        }
        return {
          conversion: convertMentionElement,
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

  getMentionName(): string {
    return this.__mention;
  }

  getRoleId(): string {
    return this.__roleId;
  }
}

export function $createMentionNode(
  mentionName: string,
  roleId: string,
): MentionNode {
  const mentionNode = new MentionNode(mentionName, roleId);
  mentionNode.setMode("segmented").toggleDirectionless();
  return $applyNodeReplacement(mentionNode);
}

export function $isMentionNode(
  node: LexicalNode | null | undefined,
): node is MentionNode {
  return node instanceof MentionNode;
}
