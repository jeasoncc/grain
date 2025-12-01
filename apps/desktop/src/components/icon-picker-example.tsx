/**
 * 图标选择器使用示例
 * 这个文件展示了如何在实际项目中使用图标系统
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { IconSelectButton, IconDisplay } from "@/components/icon-picker";
import type { IconOption } from "@/lib/icons";

/**
 * 示例 1: 创建项目对话框
 */
export function CreateProjectExample() {
	const [iconKey, setIconKey] = useState("book");
	const [projectName, setProjectName] = useState("");

	const handleCreate = () => {
		console.log("创建项目:", { iconKey, projectName });
		// 这里添加创建项目的逻辑
	};

	return (
		<Card>
			<CardHeader>
				<CardTitle>创建新项目</CardTitle>
				<CardDescription>选择一个图标和项目名称</CardDescription>
			</CardHeader>
			<CardContent className="space-y-4">
				<div className="flex items-end gap-4">
					<div className="space-y-2">
						<Label>项目图标</Label>
						<IconSelectButton
							iconKey={iconKey}
							onSelect={(icon: IconOption) => setIconKey(icon.key)}
							size="default"
						/>
					</div>
					<div className="flex-1 space-y-2">
						<Label htmlFor="project-name">项目名称</Label>
						<Input
							id="project-name"
							value={projectName}
							onChange={(e) => setProjectName(e.target.value)}
							placeholder="输入项目名称..."
						/>
					</div>
				</div>
				<Button onClick={handleCreate} className="w-full">
					创建项目
				</Button>
			</CardContent>
		</Card>
	);
}

/**
 * 示例 2: 项目列表
 */
export function ProjectListExample() {
	const [projects] = useState([
		{ id: "1", title: "我的第一本小说", iconKey: "book" },
		{ id: "2", title: "科幻短篇集", iconKey: "sparkles" },
		{ id: "3", title: "个人日记", iconKey: "notebook" },
		{ id: "4", title: "重要项目", iconKey: "star" },
	]);

	return (
		<Card>
			<CardHeader>
				<CardTitle>我的项目</CardTitle>
				<CardDescription>所有项目列表</CardDescription>
			</CardHeader>
			<CardContent>
				<div className="space-y-2">
					{projects.map((project) => (
						<div
							key={project.id}
							className="flex items-center gap-3 p-3 rounded-lg hover:bg-accent transition-colors"
						>
							<IconDisplay iconKey={project.iconKey} size="default" />
							<span className="font-medium">{project.title}</span>
						</div>
					))}
				</div>
			</CardContent>
		</Card>
	);
}

/**
 * 示例 3: 图标展示网格
 */
export function IconShowcaseExample() {
	const showcaseIcons = [
		{ key: "book", label: "书籍" },
		{ key: "feather", label: "羽毛笔" },
		{ key: "star", label: "星星" },
		{ key: "heart", label: "心形" },
		{ key: "flame", label: "火焰" },
		{ key: "crown", label: "皇冠" },
		{ key: "target", label: "目标" },
		{ key: "sparkles", label: "闪光" },
	];

	return (
		<Card>
			<CardHeader>
				<CardTitle>图标展示</CardTitle>
				<CardDescription>常用图标预览</CardDescription>
			</CardHeader>
			<CardContent>
				<div className="grid grid-cols-4 gap-4">
					{showcaseIcons.map((item) => (
						<div
							key={item.key}
							className="flex flex-col items-center gap-2 p-4 rounded-lg border"
						>
							<IconDisplay iconKey={item.key} size="lg" />
							<span className="text-sm text-muted-foreground">{item.label}</span>
						</div>
					))}
				</div>
			</CardContent>
		</Card>
	);
}

/**
 * 示例 4: 完整的演示页面
 */
export function IconPickerDemo() {
	return (
		<div className="container mx-auto p-6 space-y-6">
			<div>
				<h1 className="text-3xl font-bold mb-2">图标系统演示</h1>
				<p className="text-muted-foreground">
					展示如何在 Novel Editor 中使用图标系统
				</p>
			</div>

			<div className="grid gap-6 md:grid-cols-2">
				<CreateProjectExample />
				<ProjectListExample />
			</div>

			<IconShowcaseExample />
		</div>
	);
}
