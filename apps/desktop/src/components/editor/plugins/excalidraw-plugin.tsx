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
import logger from "@/log";
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

		// 注册插入命令 - 现在创建新的空白绘图
		return editor.registerCommand(
			INSERT_EXCALIDRAW_COMMAND,
			() => {
				logger.debug("ExcalidrawPlugin: INSERT_EXCALIDRAW_COMMAND received");
				editor.update(() => {
					const selection = $getSelection();
					logger.debug("ExcalidrawPlugin: selection:", selection);
					if ($isRangeSelection(selection)) {
						logger.debug("ExcalidrawPlugin: creating new blank excalidraw node");
						// Create a new blank drawing each time
						const excalidrawNode = $createExcalidrawNode({
							data: JSON.stringify({ elements: [], appState: {}, files: {} }),
							width: 800,
							height: 600,
						});
						$insertNodeToNearestRoot(excalidrawNode);
						logger.debug("ExcalidrawPlugin: blank node inserted");
					} else {
						logger.debug("ExcalidrawPlugin: selection is not range selection");
					}
				});
				return true;
			},
			COMMAND_PRIORITY_EDITOR,
		);
	}, [editor]);

	return null;
}
