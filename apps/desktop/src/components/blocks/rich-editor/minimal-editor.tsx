/**
 * 极简编辑器 - Typora 风格
 * 无工具栏，只在选中文字时显示格式化选项
 */
import {
	type InitialConfigType,
	LexicalComposer,
} from "@lexical/react/LexicalComposer";
import { OnChangePlugin } from "@lexical/react/LexicalOnChangePlugin";
import type { SerializedEditorState } from "lexical";

import { editorTheme } from "@/components/editor/themes/editor-theme";
import { MinimalPlugins } from "./minimal-plugins";
import { nodes } from "./nodes";

const editorConfig: InitialConfigType = {
	namespace: "MinimalEditor",
	theme: editorTheme,
	nodes,
	onError: (error: Error) => {
		console.error(error);
	},
};

interface MinimalEditorProps {
	editorSerializedState?: SerializedEditorState;
	onSerializedChange?: (state: SerializedEditorState) => void;
	placeholder?: string;
}

export function MinimalEditor({
	editorSerializedState,
	onSerializedChange,
	placeholder = "开始写作...",
}: MinimalEditorProps) {
	return (
		<LexicalComposer
			initialConfig={{
				...editorConfig,
				...(editorSerializedState
					? { editorState: JSON.stringify(editorSerializedState) }
					: {}),
			}}
		>
			<div className="relative h-full novel-editor-content">
				<MinimalPlugins placeholder={placeholder} />

				<OnChangePlugin
					ignoreSelectionChange={true}
					onChange={(editorState) => {
						onSerializedChange?.(editorState.toJSON());
					}}
				/>
			</div>
		</LexicalComposer>
	);
}
