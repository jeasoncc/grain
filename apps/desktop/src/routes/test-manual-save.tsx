/**
 * 手动保存功能测试页面
 */
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { SaveStatusIndicator } from "@/components/blocks/save-status-indicator";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DevOnlyPage } from "@/components/dev-only";
import { Textarea } from "@/components/ui/textarea";
import { useManualSave } from "@/hooks/use-manual-save";
import { useSaveStore } from "@/domain/save";

export const Route = createFileRoute("/test-manual-save")({
	component: () => (
		<DevOnlyPage>
			<TestManualSaveComponent />
		</DevOnlyPage>
	),
});

function TestManualSaveComponent() {
	const [content, setContent] = useState("");
	const [nodeId] = useState("test-node-id");

	const {
		status,
		hasUnsavedChanges,
		markAsUnsaved,
		markAsSaved,
		markAsError,
		markAsSaving,
	} = useSaveStore();

	// 模拟编辑器状态
	const mockEditorState = {
		root: {
			children: [
				{
					children: content
						? [
								{
									detail: 0,
									format: 0,
									mode: "normal",
									style: "",
									text: content,
									type: "text",
									version: 1,
								},
							]
						: [],
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

	const { performManualSave, canSave } = useManualSave({
		nodeId,
		currentContent: mockEditorState as any,
		onSaveSuccess: () => {
			toast.success("测试保存成功！");
		},
		onSaveError: (error) => {
			toast.error(`测试保存失败: ${error}`);
		},
	});

	const handleContentChange = (value: string) => {
		setContent(value);
		if (value !== content) {
			markAsUnsaved();
		}
	};

	const testSaveStates = () => {
		// 测试不同的保存状态
		markAsSaving();
		setTimeout(() => {
			markAsSaved();
		}, 1000);
	};

	const testErrorState = () => {
		markAsError("这是一个测试错误");
	};

	return (
		<div className="container mx-auto p-6 space-y-6">
			<Card>
				<CardHeader>
					<CardTitle>手动保存功能测试</CardTitle>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="flex items-center gap-4">
						<SaveStatusIndicator showLastSaveTime />
						<span className="text-sm text-muted-foreground">
							状态: {status} | 未保存更改: {hasUnsavedChanges ? "是" : "否"}
						</span>
					</div>

					<div className="space-y-2">
						<label className="text-sm font-medium">
							测试内容 (输入内容后按 Ctrl+S 保存):
						</label>
						<Textarea
							value={content}
							onChange={(e) => handleContentChange(e.target.value)}
							placeholder="在这里输入一些内容，然后按 Ctrl+S 测试手动保存..."
							rows={6}
						/>
					</div>

					<div className="flex gap-2">
						<Button onClick={performManualSave} disabled={!canSave}>
							手动保存
						</Button>
						<Button variant="outline" onClick={testSaveStates}>
							测试保存状态
						</Button>
						<Button variant="outline" onClick={testErrorState}>
							测试错误状态
						</Button>
						<Button variant="outline" onClick={() => markAsUnsaved()}>
							标记为未保存
						</Button>
					</div>

					<div className="text-sm text-muted-foreground space-y-1">
						<p>
							<strong>测试说明:</strong>
						</p>
						<ul className="list-disc list-inside space-y-1">
							<li>在文本框中输入内容会自动标记为"未保存"状态</li>
							<li>按 Ctrl+S (或 Cmd+S) 可以触发手动保存</li>
							<li>点击"手动保存"按钮也可以触发保存</li>
							<li>如果没有未保存的更改，保存操作会显示提示信息</li>
							<li>保存状态指示器会显示当前的保存状态</li>
						</ul>
					</div>
				</CardContent>
			</Card>
		</div>
	);
}
