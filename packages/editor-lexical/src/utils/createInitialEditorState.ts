/**
 * @file utils/createInitialEditorState.ts
 * @description 创建 Lexical 编辑器的初始状态
 *
 * 职责：
 * - 封装 Lexical 内部数据结构的创建逻辑
 * - 提供类型安全的初始状态生成函数
 * - 业务层不需要知道 Lexical 的 SerializedEditorState 结构
 */

/**
 * 创建包含标题的文档初始状态
 *
 * 生成的文档结构：
 * - H2 标题（包含传入的 title）
 * - 空段落（光标位置）
 *
 * @param title - 文档标题
 * @returns 序列化的编辑器状态（JSON 字符串）
 */
export function createInitialDocumentState(title: string): string {
	const state = {
		root: {
			children: [
				{
					children: [
						{
							detail: 0,
							format: 0,
							mode: "normal",
							style: "",
							text: title,
							type: "text",
							version: 1,
						},
					],
					direction: "ltr",
					format: "",
					indent: 0,
					tag: "h2",
					type: "heading",
					version: 1,
				},
				{
					children: [
						{
							detail: 0,
							format: 0,
							mode: "normal",
							style: "",
							text: "",
							type: "text",
							version: 1,
						},
					],
					direction: "ltr",
					format: "",
					indent: 0,
					type: "paragraph",
					version: 1,
				},
			],
			direction: "ltr",
			format: "",
			indent: 0,
			type: "root",
			version: 1,
		},
	};

	return JSON.stringify(state);
}
