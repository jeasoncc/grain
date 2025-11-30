/**
 * Excalidraw 选择器插件 - 用于 / 命令菜单
 */
import { Pencil } from "lucide-react";
import { ComponentPickerOption } from "@/components/editor/plugins/picker/component-picker-option";
import { INSERT_EXCALIDRAW_COMMAND } from "../excalidraw-plugin";

export function ExcalidrawPickerPlugin() {
	return new ComponentPickerOption("绘图 (Excalidraw)", {
		icon: <Pencil className="size-4" />,
		keywords: [
			"excalidraw",
			"draw",
			"drawing",
			"sketch",
			"绘图",
			"画图",
			"草图",
			"白板",
		],
		onSelect: (queryString, editor, showModal) => {
			console.log("ExcalidrawPickerPlugin: onSelect called");
			const result = editor.dispatchCommand(
				INSERT_EXCALIDRAW_COMMAND,
				undefined,
			);
			console.log("ExcalidrawPickerPlugin: command dispatched, result:", result);
		},
	});
}
