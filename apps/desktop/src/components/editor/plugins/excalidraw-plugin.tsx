/**
 * Excalidraw 插件 - 处理绘图节点的插入和管理
 */

import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { $insertNodeToNearestRoot } from "@lexical/utils";
import {
	$getSelection,
	$isRangeSelection,
	COMMAND_PRIORITY_EDITOR,
	createCommand,
	type LexicalCommand,
} from "lexical";
import { useEffect } from "react";
import {
	$createExcalidrawNode,
	ExcalidrawNode,
} from "../nodes/excalidraw-node";

export const INSERT_EXCALIDRAW_COMMAND: LexicalCommand<void> = createCommand(
	"INSERT_EXCALIDRAW_COMMAND",
);

export function ExcalidrawPlugin(): null {
	const [editor] = useLexicalComposerContext();

	useEffect(() => {
		// 注册 ExcalidrawNode
		if (!editor.hasNodes([ExcalidrawNode])) {
			throw new Error(
				"ExcalidrawPlugin: ExcalidrawNode not registered on editor",
			);
		}

		// 注册插入命令
		return editor.registerCommand(
			INSERT_EXCALIDRAW_COMMAND,
			() => {
				console.log("ExcalidrawPlugin: INSERT_EXCALIDRAW_COMMAND received");
				editor.update(() => {
					const selection = $getSelection();
					console.log("ExcalidrawPlugin: selection:", selection);
					if ($isRangeSelection(selection)) {
						console.log("ExcalidrawPlugin: creating excalidraw node");
						const excalidrawNode = $createExcalidrawNode({});
						$insertNodeToNearestRoot(excalidrawNode);
						console.log("ExcalidrawPlugin: node inserted");
					} else {
						console.log("ExcalidrawPlugin: selection is not range selection");
					}
				});
				return true;
			},
			COMMAND_PRIORITY_EDITOR,
		);
	}, [editor]);

	return null;
}
