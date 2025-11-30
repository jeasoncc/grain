/**
 * Excalidraw 节点 - 在 Lexical 编辑器中嵌入绘图
 */
import * as React from "react";
import { JSX, Suspense } from "react";
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


const ExcalidrawComponent = React.lazy(
	() => import("../editor-ui/excalidraw-component"),
);

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
		const { data, width, height } = serializedNode;
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
							const width =
								Number.parseInt(element.style.width, 10) || 600;
							const height =
								Number.parseInt(element.style.height, 10) || 400;
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
			<Suspense
				fallback={
					<div className="flex items-center justify-center h-[400px] bg-muted rounded-lg">
						<span className="text-muted-foreground">加载绘图组件...</span>
					</div>
				}
			>
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
