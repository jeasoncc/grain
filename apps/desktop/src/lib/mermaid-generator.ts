/**
 * Mermaid 图表生成器
 * 根据大纲数据自动生成各种 Mermaid 图表
 * 
 * 注意：generateCharacterRelations 函数仍使用废弃的 RoleInterface
 * 未来版本将迁移到 WikiEntryInterface
 */

import type {
	ChapterInterface,
	RoleInterface, // @deprecated - 保留用于向后兼容
	SceneInterface,
} from "@/db/schema";

/**
 * 生成章节结构图（流程图）
 */
export function generateChapterStructure(
	chapters: ChapterInterface[],
	scenes: SceneInterface[],
): string {
	if (chapters.length === 0) {
		return "graph TD\n    Empty[暂无章节数据]\n";
	}

	let mmd = "graph TD\n";

	const sortedChapters = [...chapters].sort((a, b) => a.order - b.order);

	sortedChapters.forEach((chapter, index) => {
		const chapterId = `ch${index}`;
		const status = chapter.outline?.status || "draft";
		const style = getStatusStyle(status);

		// 转义特殊字符，避免 Mermaid 语法错误
		const safeTitle = chapter.title.replace(/["[\]]/g, "");

		// 添加章节节点
		mmd += `    ${chapterId}["${safeTitle}"]${style}\n`;

		// 添加场景
		const chapterScenes = scenes
			.filter((s) => s.chapter === chapter.id)
			.sort((a, b) => a.order - b.order);

		chapterScenes.forEach((scene, sceneIndex) => {
			const sceneId = `sc${index}_${sceneIndex}`;
			const safeSceneTitle = scene.title.replace(/["[\]]/g, "");
			mmd += `    ${sceneId}["${safeSceneTitle}"]\n`;
			mmd += `    ${chapterId} --> ${sceneId}\n`;
		});

		// 连接到下一章
		if (index < sortedChapters.length - 1) {
			mmd += `    ${chapterId} ==> ch${index + 1}\n`;
		}
	});

	return mmd;
}

/**
 * 生成章节流程图
 */
export function generateChapterFlow(chapters: ChapterInterface[]): string {
	if (chapters.length === 0) {
		return "graph LR\n    Empty[暂无章节数据]\n";
	}

	let mmd = "graph LR\n";
	mmd += "    Start([开始])\n";

	const sortedChapters = [...chapters].sort((a, b) => a.order - b.order);

	sortedChapters.forEach((chapter, index) => {
		const id = `ch${index}`;
		const status = chapter.outline?.status || "draft";
		const style = getStatusStyle(status);

		// 转义特殊字符
		const safeTitle = chapter.title.replace(/["[\]]/g, "");

		mmd += `    ${id}["${safeTitle}"]${style}\n`;

		if (index === 0) {
			mmd += `    Start --> ${id}\n`;
		} else {
			mmd += `    ch${index - 1} --> ${id}\n`;
		}
	});

	if (sortedChapters.length > 0) {
		mmd += `    ch${sortedChapters.length - 1} --> End([结束])\n`;
	} else {
		mmd += "    End([结束])\n";
	}

	return mmd;
}

/**
 * 生成角色关系图
 * @deprecated 此函数使用废弃的 RoleInterface，未来将迁移到 WikiEntryInterface
 */
export function generateCharacterRelations(
	characters: RoleInterface[],
): string {
	if (characters.length === 0) {
		return "graph TD\n    Empty[暂无角色数据]\n";
	}

	let mmd = "graph TD\n";

	// 添加所有角色节点
	characters.forEach((char, index) => {
		const id = `char${index}`;
		const identity = char.identity?.[0] || "角色";
		// 转义特殊字符，避免 Mermaid 语法错误
		const safeName = char.name.replace(/["[\]]/g, "");
		const safeIdentity = identity.replace(/["[\]]/g, "");
		mmd += `    ${id}["${safeName}<br/>${safeIdentity}"]\n`;
	});

	// 如果只有一个角色，不添加关系
	if (characters.length === 1) {
		return mmd;
	}

	// 添加角色之间的关系（示例：简单连接）
	// 注意：这里需要根据实际的 relationships 数据结构来实现
	// 目前创建一个简单的网络结构
	characters.forEach((char, index) => {
		if (index < characters.length - 1) {
			mmd += `    char${index} -.-> char${index + 1}\n`;
		}
	});

	return mmd;
}

/**
 * 生成时间线图
 */
export function generateTimeline(chapters: ChapterInterface[]): string {
	if (chapters.length === 0) {
		return "timeline\n    title 故事时间线\n    暂无数据 : 请先创建章节\n";
	}

	let mmd = "timeline\n";
	mmd += "    title 故事时间线\n";

	const sortedChapters = [...chapters].sort((a, b) => a.order - b.order);

	sortedChapters.forEach((chapter, index) => {
		const storyTime = chapter.outline?.storyTime || `第${index + 1}阶段`;
		// 转义特殊字符
		const safeTitle = chapter.title.replace(/:/g, "：");
		mmd += `    ${storyTime} : ${safeTitle}\n`;
	});

	return mmd;
}

/**
 * 生成剧情点流程图
 */
export function generatePlotFlow(chapter: ChapterInterface): string {
	let mmd = "graph TD\n";
	mmd += "    Start([开始])\n";

	const plotPoints = chapter.outline?.plotPoints || [];

	if (plotPoints.length === 0) {
		mmd += "    Empty[暂无剧情点]\n";
		mmd += "    Start --> Empty\n";
	} else {
		const sorted = [...plotPoints].sort((a: any, b: any) => a.order - b.order);

		sorted.forEach((point: any, index: number) => {
			const id = `plot${index}`;
			const style = getPlotPointStyle(point.type);
			mmd += `    ${id}["${point.description}"]${style}\n`;

			if (index === 0) {
				mmd += `    Start --> ${id}\n`;
			} else {
				mmd += `    plot${index - 1} --> ${id}\n`;
			}
		});

		mmd += `    plot${sorted.length - 1} --> End([结束])\n`;
	}

	mmd += "    End([结束])\n";

	return mmd;
}

/**
 * 生成三幕结构图
 */
export function generateThreeActStructure(
	chapters: ChapterInterface[],
): string {
	if (chapters.length === 0) {
		return "graph TD\n    Empty[暂无章节数据]\n";
	}

	const total = chapters.length;
	const act1End = Math.max(1, Math.floor(total * 0.25));
	const act2End = Math.max(act1End + 1, Math.floor(total * 0.75));

	const sortedChapters = [...chapters].sort((a, b) => a.order - b.order);

	let mmd = "graph TD\n";

	// 第一幕
	mmd += "    subgraph act1[第一幕：开端]\n";
	const act1Chapters = sortedChapters.slice(0, act1End);
	if (act1Chapters.length > 0) {
		act1Chapters.forEach((ch, i) => {
			const safeTitle = ch.title.replace(/["[\]]/g, "");
			mmd += `        a1_${i}["${safeTitle}"]\n`;
		});
	} else {
		mmd += "        a1_empty[暂无章节]\n";
	}
	mmd += "    end\n";

	// 第二幕
	mmd += "    subgraph act2[第二幕：发展]\n";
	const act2Chapters = sortedChapters.slice(act1End, act2End);
	if (act2Chapters.length > 0) {
		act2Chapters.forEach((ch, i) => {
			const safeTitle = ch.title.replace(/["[\]]/g, "");
			mmd += `        a2_${i}["${safeTitle}"]\n`;
		});
	} else {
		mmd += "        a2_empty[暂无章节]\n";
	}
	mmd += "    end\n";

	// 第三幕
	mmd += "    subgraph act3[第三幕：高潮与结局]\n";
	const act3Chapters = sortedChapters.slice(act2End);
	if (act3Chapters.length > 0) {
		act3Chapters.forEach((ch, i) => {
			const safeTitle = ch.title.replace(/["[\]]/g, "");
			mmd += `        a3_${i}["${safeTitle}"]\n`;
		});
	} else {
		mmd += "        a3_empty[暂无章节]\n";
	}
	mmd += "    end\n";

	mmd += "    act1 ==> act2\n";
	mmd += "    act2 ==> act3\n";

	return mmd;
}

/**
 * 生成甘特图（进度追踪）
 */
export function generateGanttChart(chapters: ChapterInterface[]): string {
	if (chapters.length === 0) {
		return "gantt\n    title 创作进度\n    dateFormat YYYY-MM-DD\n    section 章节\n    暂无数据 :2024-01-01, 1d\n";
	}

	let mmd = "gantt\n";
	mmd += "    title 创作进度\n";
	mmd += "    dateFormat YYYY-MM-DD\n";
	mmd += "    section 章节\n";

	const sortedChapters = [...chapters].sort((a, b) => a.order - b.order);
	const today = new Date();

	sortedChapters.forEach((chapter, index) => {
		const status = chapter.outline?.status || "draft";
		const startDate = new Date(today);
		startDate.setDate(today.getDate() + index * 5);
		const endDate = new Date(startDate);
		endDate.setDate(startDate.getDate() + 5);

		const start = startDate.toISOString().split("T")[0];
		const end = endDate.toISOString().split("T")[0];

		let taskStatus = "";
		if (status === "completed") {
			taskStatus = "done, ";
		} else if (status === "in-progress") {
			taskStatus = "active, ";
		} else if (status === "needs-revision") {
			taskStatus = "crit, ";
		}

		// 转义特殊字符，特别是冒号
		const safeTitle = chapter.title.replace(/:/g, "：");

		mmd += `    ${safeTitle} :${taskStatus}${start}, ${end}\n`;
	});

	return mmd;
}

// 辅助函数

function getStatusStyle(status: string): string {
	switch (status) {
		case "completed":
			return ":::completed";
		case "in-progress":
			return ":::inProgress";
		case "needs-revision":
			return ":::needsRevision";
		case "on-hold":
			return ":::onHold";
		default:
			return ":::draft";
	}
}

function getPlotPointStyle(type: string): string {
	switch (type) {
		case "setup":
			return ":::setup";
		case "conflict":
			return ":::conflict";
		case "climax":
			return ":::climax";
		case "resolution":
			return ":::resolution";
		default:
			return "";
	}
}
