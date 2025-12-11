/**
 * Excalidraw 节点 - 在 Lexical 编辑器中嵌入绘图
 */

import type {
	DOMConversionMap,
	DOMExportOutput,
	EditorConfig,
	LexicalNode,
	NodeKey,
	SerializedLexicalNode,
	Spread,
} from "lexical";
import { $applyNodeReplacement, DecoratorNode } from "lexical";
import * as React from "react";
import { type JSX, Suspense } from "react";

const ExcalidrawComponent = React.lazy(
	() => import("../editor-ui/excalidraw-component"),
);

// Loading fallback component
function ExcalidrawLoadingFallback({ height }: { height: number }) {
	return (
		<div 
			className="flex flex-col items-center justify-center bg-muted/30 rounded-lg border animate-pulse"
			style={{ height: Math.max(300, height), minWidth: 400 }}
		>
			<div className="flex items-center gap-2 text-muted-foreground">
				<svg 
					className="animate-spin h-5 w-5" 
					xmlns="http://www.w3.org/2000/svg" 
					fill="none" 
					viewBox="0 0 24 24"
				>
					<circle 
						className="opacity-25" 
						cx="12" 
						cy="12" 
						r="10" 
						stroke="currentColor" 
						strokeWidth="4"
					/>
					<path 
						className="opacity-75" 
						fill="currentColor" 
						d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
					/>
				</svg>
				<span>加载绘图组件...</span>
			</div>
		</div>
	);
}

export interface ExcalidrawPayload {
	key?: NodeKey;
	data?: string; // JSON 字符串存储 Excalidraw 数据
	width?: number;
	height?: number;
}

export interface ExcalidrawData {
	// biome-ignore lint/suspicious/noExplicitAny: Excalidraw 元素类型
	elements: any[];
	// biome-ignore lint/suspicious/noExplicitAny: Excalidraw AppState 类型
	appState?: any;
	// biome-ignore lint/suspicious/noExplicitAny: Excalidraw 文件类型
	files?: any;
}

export type SerializedExcalidrawNode = Spread<
	{
		data: string;
		width: number;
		height: number;
	},
	SerializedLexicalNode
>;

export class ExcalidrawNode extends DecoratorNode<JSX.Element> {
	__data: string;
	__width: number;
	__height: number;

	static getType(): string {
		return "excalidraw";
	}

	static clone(node: ExcalidrawNode): ExcalidrawNode {
		return new ExcalidrawNode(
			node.__data,
			node.__width,
			node.__height,
			node.__key,
		);
	}

	static importJSON(serializedNode: SerializedExcalidrawNode): ExcalidrawNode {
		// Safely extract and validate data
		const data = typeof serializedNode.data === "string" ? serializedNode.data : "";
		const width = typeof serializedNode.width === "number" && serializedNode.width > 0 
			? serializedNode.width 
			: 600;
		const height = typeof serializedNode.height === "number" && serializedNode.height > 0 
			? serializedNode.height 
			: 400;
		return $createExcalidrawNode({ data, width, height });
	}

	exportDOM(): DOMExportOutput {
		const element = document.createElement("div");
		element.setAttribute("data-excalidraw", "true");
		element.setAttribute("data-excalidraw-data", this.__data);
		element.style.width = `${this.__width}px`;
		element.style.height = `${this.__height}px`;
		return { element };
	}

	static importDOM(): DOMConversionMap | null {
		return {
			div: (node: Node) => {
				const element = node as HTMLElement;
				if (element.getAttribute("data-excalidraw") === "true") {
					return {
						conversion: () => {
							const data = element.getAttribute("data-excalidraw-data") || "";
							const width = Number.parseInt(element.style.width, 10) || 600;
							const height = Number.parseInt(element.style.height, 10) || 400;
							return { node: $createExcalidrawNode({ data, width, height }) };
						},
						priority: 1,
					};
				}
				return null;
			},
		};
	}

	constructor(
		data: string = "",
		width: number = 600,
		height: number = 400,
		key?: NodeKey,
	) {
		super(key);
		this.__data = data;
		this.__width = width;
		this.__height = height;
	}

	exportJSON(): SerializedExcalidrawNode {
		return {
			data: this.__data,
			width: this.__width,
			height: this.__height,
			type: "excalidraw",
			version: 1,
		};
	}

	setData(data: string): void {
		const writable = this.getWritable();
		writable.__data = data;
	}

	getData(): string {
		return this.__data;
	}

	setSize(width: number, height: number): void {
		const writable = this.getWritable();
		writable.__width = width;
		writable.__height = height;
	}

	getWidth(): number {
		return this.__width;
	}

	getHeight(): number {
		return this.__height;
	}

	createDOM(config: EditorConfig): HTMLElement {
		const div = document.createElement("div");
		const theme = config.theme;
		const className = theme.embedBlock?.base;
		if (className) {
			div.className = className;
		}
		return div;
	}

	updateDOM(): false {
		return false;
	}

	decorate(): JSX.Element {
		return (
			<Suspense fallback={<ExcalidrawLoadingFallback height={this.__height} />}>
				<ExcalidrawComponent
					nodeKey={this.getKey()}
					data={this.__data}
					width={this.__width}
					height={this.__height}
				/>
			</Suspense>
		);
	}
}

export function $createExcalidrawNode({
	data = "",
	width = 600,
	height = 400,
	key,
}: ExcalidrawPayload): ExcalidrawNode {
	return $applyNodeReplacement(new ExcalidrawNode(data, width, height, key));
}

export function $isExcalidrawNode(
	node: LexicalNode | null | undefined,
): node is ExcalidrawNode {
	return node instanceof ExcalidrawNode;
}
