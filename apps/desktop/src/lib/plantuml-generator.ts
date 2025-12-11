/**
 * PlantUML 图表生成器
 * 根据大纲数据自动生成各种 PlantUML 图表
 * 
 * 注意：generateCharacterRelations 函数仍使用废弃的 RoleInterface
 * 未来版本将迁移到 WikiEntryInterface
 */

import pako from "pako";
import logger from "@/log";
import type {
	ChapterInterface,
	RoleInterface, // @deprecated - 保留用于向后兼容
	SceneInterface,
} from "@/db/schema";

/**
 * 生成章节结构图
 */
export function generateChapterStructure(
	chapters: ChapterInterface[],
	scenes: SceneInterface[],
): string {
	let uml = "@startuml\n";
	uml += "!theme plain\n";
	uml += "skinparam backgroundColor transparent\n";
	uml += "skinparam defaultFontSize 14\n\n";
	uml += "title 小说结构图\n\n";

	// 按顺序排序
	const sortedChapters = [...chapters].sort((a, b) => a.order - b.order);

	sortedChapters.forEach((chapter, index) => {
		const chapterScenes = scenes.filter((s) => s.chapter === chapter.id);
		const sceneCount = chapterScenes.length;
		const status = chapter.outline?.status || "draft";

		// 根据状态选择颜色
		const color = getStatusColor(status);

		uml += `package "${chapter.title}" ${color} {\n`;

		if (sceneCount > 0) {
			chapterScenes
				.sort((a, b) => a.order - b.order)
				.forEach((scene) => {
					uml += `  [${scene.title}]\n`;
				});
		} else {
			uml += `  [暂无场景]\n`;
		}

		uml += "}\n\n";

		// 添加章节之间的连接
		if (index < sortedChapters.length - 1) {
			uml += `"${chapter.title}" --> "${sortedChapters[index + 1].title}"\n\n`;
		}
	});

	uml += "@enduml";
	return uml;
}

/**
 * 生成简化的章节流程图
 */
export function generateChapterFlow(chapters: ChapterInterface[]): string {
	let uml = "@startuml\n";
	uml += "!theme plain\n";
	uml += "skinparam backgroundColor transparent\n\n";
	uml += "title 章节流程图\n\n";
	uml += "start\n";

	const sortedChapters = [...chapters].sort((a, b) => a.order - b.order);

	sortedChapters.forEach((chapter) => {
		const status = chapter.outline?.status || "draft";
		const color = getStatusColorSimple(status);
		uml += `:${chapter.title}${color};\n`;
	});

	uml += "stop\n";
	uml += "@enduml";
	return uml;
}

/**
 * 生成角色关系图
 * @deprecated 此函数使用废弃的 RoleInterface，未来将迁移到 WikiEntryInterface
 */
export function generateCharacterRelations(
	characters: RoleInterface[],
): string {
	let uml = "@startuml\n";
	uml += "!theme plain\n";
	uml += "skinparam backgroundColor transparent\n\n";
	uml += "title 角色关系图\n\n";

	// 添加所有角色
	characters.forEach((char) => {
		const identity = char.identity?.[0] || "角色";
		uml += `actor "${char.name}\\n(${identity})" as ${sanitizeId(char.id)}\n`;
	});

	uml += "\n";

	// 添加关系（基于 relationships 字段）
	characters.forEach((char) => {
		if (char.relationships && char.relationships.length > 0) {
			char.relationships.forEach((rel) => {
				// 简单的关系解析
				uml += `${sanitizeId(char.id)} -- ${sanitizeId(char.id)} : ${rel}\n`;
			});
		}
	});

	uml += "@enduml";
	return uml;
}

/**
 * 生成时间线图
 */
export function generateTimeline(chapters: ChapterInterface[]): string {
	let uml = "@startuml\n";
	uml += "!theme plain\n";
	uml += "skinparam backgroundColor transparent\n\n";
	uml += "title 故事时间线\n\n";

	const sortedChapters = [...chapters].sort((a, b) => a.order - b.order);

	sortedChapters.forEach((chapter, index) => {
		const storyTime = chapter.outline?.storyTime || `第${index + 1}阶段`;
		uml += `${index * 5} : ${chapter.title}\n`;
		uml += `${index * 5} : ${storyTime}\n\n`;
	});

	uml += "@enduml";
	return uml;
}

/**
 * 生成剧情点流程图
 */
export function generatePlotFlow(chapter: ChapterInterface): string {
	let uml = "@startuml\n";
	uml += "!theme plain\n";
	uml += "skinparam backgroundColor transparent\n\n";
	uml += `title ${chapter.title} - 剧情流程\n\n`;
	uml += "start\n";

	const plotPoints = chapter.outline?.plotPoints || [];

	if (plotPoints.length === 0) {
		uml += ":暂无剧情点;\n";
	} else {
		plotPoints
			.sort((a: any, b: any) => a.order - b.order)
			.forEach((point: any) => {
				const color = getPlotPointColor(point.type);
				uml += `:${point.description}${color};\n`;
			});
	}

	uml += "stop\n";
	uml += "@enduml";
	return uml;
}

/**
 * 生成三幕结构图
 */
export function generateThreeActStructure(
	chapters: ChapterInterface[],
): string {
	let uml = "@startuml\n";
	uml += "!theme plain\n";
	uml += "skinparam backgroundColor transparent\n\n";
	uml += "title 三幕结构\n\n";

	const total = chapters.length;
	const act1End = Math.floor(total * 0.25);
	const act2End = Math.floor(total * 0.75);

	const sortedChapters = [...chapters].sort((a, b) => a.order - b.order);

	// 第一幕：开端
	uml += 'package "第一幕：开端" #LightBlue {\n';
	sortedChapters.slice(0, act1End).forEach((ch) => {
		uml += `  [${ch.title}]\n`;
	});
	uml += "}\n\n";

	// 第二幕：发展
	uml += 'package "第二幕：发展" #LightGreen {\n';
	sortedChapters.slice(act1End, act2End).forEach((ch) => {
		uml += `  [${ch.title}]\n`;
	});
	uml += "}\n\n";

	// 第三幕：高潮与结局
	uml += 'package "第三幕：高潮与结局" #LightCoral {\n';
	sortedChapters.slice(act2End).forEach((ch) => {
		uml += `  [${ch.title}]\n`;
	});
	uml += "}\n\n";

	uml += '"第一幕：开端" --> "第二幕：发展"\n';
	uml += '"第二幕：发展" --> "第三幕：高潮与结局"\n';

	uml += "@enduml";
	return uml;
}

/**
 * 生成甘特图（进度追踪）
 */
export function generateGanttChart(chapters: ChapterInterface[]): string {
	let uml = "@startgantt\n";
	uml += "!theme plain\n";
	uml += "skinparam backgroundColor transparent\n\n";
	uml += "title 创作进度\n\n";
	uml += "projectscale daily\n\n";

	const sortedChapters = [...chapters].sort((a, b) => a.order - b.order);

	sortedChapters.forEach((chapter) => {
		const status = chapter.outline?.status || "draft";
		const progress = chapter.outline?.progress || 0;

		let color = "";
		if (status === "completed") {
			color = " colored in Green";
		} else if (status === "in-progress") {
			color = " colored in Blue";
		} else if (status === "needs-revision") {
			color = " colored in Orange";
		}

		uml += `[${chapter.title}]${color} lasts 5 days and is ${progress}% complete\n`;
	});

	uml += "@endgantt";
	return uml;
}

// 辅助函数

function getStatusColor(status: string): string {
	switch (status) {
		case "completed":
			return "#LightGreen";
		case "in-progress":
			return "#LightBlue";
		case "needs-revision":
			return "#LightYellow";
		case "on-hold":
			return "#LightGray";
		default:
			return "#White";
	}
}

function getStatusColorSimple(status: string): string {
	switch (status) {
		case "completed":
			return " #LightGreen";
		case "in-progress":
			return " #LightBlue";
		case "needs-revision":
			return " #LightYellow";
		case "on-hold":
			return " #LightGray";
		default:
			return "";
	}
}

function getPlotPointColor(type: string): string {
	switch (type) {
		case "setup":
			return " #LightBlue";
		case "conflict":
			return " #Orange";
		case "climax":
			return " #Red";
		case "resolution":
			return " #LightGreen";
		default:
			return "";
	}
}

function sanitizeId(id: string): string {
	return id.replace(/[^a-zA-Z0-9]/g, "_");
}

/**
 * PlantUML 专用的 Base64 编码表
 */
const PLANTUML_ENCODE_TABLE =
	"0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz-_";

/**
 * 将3个字节编码为4个字符
 */
function encode3bytes(b1: number, b2: number, b3: number): string {
	const c1 = b1 >> 2;
	const c2 = ((b1 & 0x3) << 4) | (b2 >> 4);
	const c3 = ((b2 & 0xf) << 2) | (b3 >> 6);
	const c4 = b3 & 0x3f;
	return (
		PLANTUML_ENCODE_TABLE.charAt(c1 & 0x3f) +
		PLANTUML_ENCODE_TABLE.charAt(c2 & 0x3f) +
		PLANTUML_ENCODE_TABLE.charAt(c3 & 0x3f) +
		PLANTUML_ENCODE_TABLE.charAt(c4 & 0x3f)
	);
}

/**
 * 编码 PlantUML 为 URL 安全的字符串
 * 使用 PlantUML 服务器的编码方式（DEFLATE 压缩 + 特殊 Base64）
 */
export function encodePlantUML(plantumlCode: string): string {
	try {
		// 1. 将字符串转换为 UTF-8 字节数组
		const encoder = new TextEncoder();
		const utf8Bytes = encoder.encode(plantumlCode);

		// 2. 使用 DEFLATE 压缩
		const compressed = pako.deflateRaw(utf8Bytes, { level: 9 });

		// 3. 使用 PlantUML 的特殊 Base64 编码
		let result = "";
		for (let i = 0; i < compressed.length; i += 3) {
			if (i + 2 === compressed.length) {
				result += encode3bytes(compressed[i], compressed[i + 1], 0);
			} else if (i + 1 === compressed.length) {
				result += encode3bytes(compressed[i], 0, 0);
			} else {
				result += encode3bytes(
					compressed[i],
					compressed[i + 1],
					compressed[i + 2],
				);
			}
		}

		return result;
	} catch (error) {
		logger.error("PlantUML encoding error:", error);
		return "";
	}
}

/**
 * 获取 PlantUML 图表的 URL
 */
export function getPlantUMLImageUrl(
	plantumlCode: string,
	format: "svg" | "png" = "svg",
): string {
	const encoded = encodePlantUML(plantumlCode);
	return `https://www.plantuml.com/plantuml/${format}/${encoded}`;
}
