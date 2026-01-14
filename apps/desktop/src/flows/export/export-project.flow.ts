/**
 * Export Project Flow
 *
 * 支持 PDF、Word、TXT、EPUB 格式导出
 * 从 domain/export/export.service.ts 迁移
 *
 * Requirements: 1.1, 1.2, 4.1
 */
import {
	AlignmentType,
	Document,
	Footer,
	Header,
	HeadingLevel,
	Packer,
	PageBreak,
	PageNumber,
	Paragraph,
	TextRun,
} from "docx";
import { orderBy } from "es-toolkit";
import { saveAs } from "file-saver";
import * as E from "fp-ts/Either";
import JSZip from "jszip";
import dayjs from "dayjs";
import { getContentsByNodeIds } from "@/io/api";
import { legacyDatabase } from "@/io/db/legacy-database";
import type { NodeInterface, WorkspaceInterface } from "@/types";
import type { ContentInterface } from "@/types/content";
import type { ExportFormat, ExportOptions } from "@/types/export";

export type { ExportOptions, ExportFormat };

const defaultOptions: ExportOptions = {
	includeTitle: true,
	includeAuthor: true,
	includeChapterTitles: true,
	includeSceneTitles: false,
	pageBreakBetweenChapters: true,
};

// ============================================
// 工具函数
// ============================================

/**
 * 从 Lexical 编辑器 JSON 内容中提取纯文本
 */
function extractTextFromContent(content: string | null): string {
	if (!content) return "";
	try {
		const parsed = JSON.parse(content);
		return extractTextFromNode(parsed.root);
	} catch {
		return content;
	}
}

/**
 * 递归从 Lexical 节点树中提取文本
 */
function extractTextFromNode(node: unknown): string {
	if (!node) return "";

	const n = node as Record<string, unknown>;

	if (n.type === "text") {
		return (n.text as string) || "";
	}

	if (n.children && Array.isArray(n.children)) {
		return n.children.map(extractTextFromNode).join("");
	}

	return "";
}

/**
 * 转义 HTML 特殊字符
 */
function escapeHtml(text: string): string {
	return text
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&#039;");
}

/**
 * 递归获取节点内容
 */
function getNodeContents(
	node: NodeInterface,
	allNodes: readonly NodeInterface[],
	contentMap: ReadonlyMap<string, string>,
	depth: number = 0,
): ReadonlyArray<{ readonly node: NodeInterface; readonly depth: number; readonly text: string }> {
	const currentResult: ReadonlyArray<{ readonly node: NodeInterface; readonly depth: number; readonly text: string }> = (node.type === "file" || node.type === "diary")
		? [{
				node,
				depth,
				text: extractTextFromContent(contentMap.get(node.id) ?? null),
		  }]
		: [];

	// 使用 es-toolkit 的 orderBy 进行不可变排序
	const children = orderBy(
		allNodes.filter((n) => n.parent === node.id),
		[(n) => n.order],
		["asc"]
	);

	const childResults = children.flatMap((child) =>
		getNodeContents(child, allNodes, contentMap, depth + 1)
	);

	return [...currentResult, ...childResults];
}

/**
 * 生成打印/PDF 导出的 HTML 内容
 */
function generatePrintHtml(
	project: WorkspaceInterface,
	nodes: readonly NodeInterface[],
	rootNodes: readonly NodeInterface[],
	contentMap: ReadonlyMap<string, string>,
	opts: ExportOptions,
): string {
	const titlePage = opts.includeTitle
		? `<div class="title-page">
			<h1 class="book-title">${escapeHtml(project.title || "Untitled Work")}</h1>
			${opts.includeAuthor && project.author ? `<p class="author">Author: ${escapeHtml(project.author)}</p>` : ""}
		</div>`
		: "";

	const chapters = rootNodes.flatMap((rootNode) => {
		const contents = getNodeContents(rootNode, nodes, contentMap);

		return contents.map(({ node, depth, text }) => {
			const chapterClass = opts.pageBreakBetweenChapters && depth === 0
				? '<div class="chapter" style="page-break-before: always;">'
				: '<div class="chapter">';

			const title = opts.includeChapterTitles && depth === 0
				? `<h2 class="chapter-title">${escapeHtml(node.title)}</h2>`
				: opts.includeSceneTitles && depth > 0
				? `<h3 class="scene-title">${escapeHtml(node.title)}</h3>`
				: "";

			const paragraphs = text.trim()
				? text.split("\n")
					.filter((p) => p.trim())
					.map((para) => `<p class="paragraph">${escapeHtml(para.trim())}</p>`)
					.join("")
				: "";

			return `${chapterClass}${title}${paragraphs}</div>`;
		});
	}).join("");

	const content = titlePage + chapters;

	return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
	<meta charset="UTF-8">
	<title>${escapeHtml(project.title || "Export")}</title>
	<style>
		@page { size: A4; margin: 2.5cm 2cm; }
		body { font-family: "SimSun", serif; font-size: 12pt; line-height: 1.8; }
		.title-page { page-break-after: always; text-align: center; padding-top: 30%; }
		.book-title { font-size: 28pt; margin-bottom: 2em; }
		.author { font-size: 14pt; color: #666; }
		.chapter-title { font-size: 18pt; text-align: center; margin: 2em 0 1.5em; }
		.scene-title { font-size: 14pt; margin: 1.5em 0 1em; color: #555; }
		.paragraph { text-indent: 2em; margin-bottom: 0.5em; }
	</style>
</head>
<body>${content}</body>
</html>`;
}

/**
 * 生成 EPUB 章节的 XHTML 内容
 */
function generateEpubChapterHtml(title: string, content: string): string {
	return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml">
<head><meta charset="UTF-8"/><title>${escapeHtml(title)}</title><link rel="stylesheet" href="styles.css"/></head>
<body>${content}</body>
</html>`;
}

// ============================================
// 获取项目内容
// ============================================

/**
 * 获取项目的完整内容数据（基于 Node 结构）
 */
async function getProjectContent(projectId: string) {
	const project = await legacyDatabase.workspaces.get(projectId);
	if (!project) throw new Error("Project not found");

	const nodes = await legacyDatabase.nodes
		.where("workspace")
		.equals(projectId)
		.toArray();

	const nodeIds: readonly string[] = nodes.map((n) => n.id);
	const contentsResult = await getContentsByNodeIds(nodeIds)();
	const contents: readonly ContentInterface[] = E.isRight(contentsResult)
		? contentsResult.right
		: [];
	const contentMap = new Map(contents.map((c) => [c.nodeId, c.content]));

	// 使用 es-toolkit 的 orderBy 进行不可变排序
	const sortedNodes = orderBy(nodes, [(n) => n.order], ["asc"]);

	const rootNodes = sortedNodes.filter((n) => !n.parent);

	return { project, nodes: sortedNodes, rootNodes, contentMap };
}

// ============================================
// TXT 导出
// ============================================

export async function exportToTxt(
	projectId: string,
	options: ExportOptions = {},
): Promise<void> {
	const opts = { ...defaultOptions, ...options };
	const { project, nodes, rootNodes, contentMap } =
		await getProjectContent(projectId);

	const headerLines = [
		...(opts.includeTitle ? [project.title || "Untitled Work", ""] : []),
		...(opts.includeAuthor && project.author ? [`作者：${project.author}`, ""] : []),
		...(opts.includeTitle || opts.includeAuthor ? ["═".repeat(40), ""] : []),
	];

	const contentLines = rootNodes.flatMap((rootNode) => {
		const contents = getNodeContents(rootNode, nodes, contentMap);

		const chapterLines = contents.flatMap(({ node, depth, text }) => {
			const title = opts.includeChapterTitles && depth === 0
				? ["", `【${node.title}】`, ""]
				: opts.includeSceneTitles && depth > 0
				? [`〔${node.title}〕`, ""]
				: [];

			const paragraphs = text.trim()
				? [...text.split("\n")
					.filter((p) => p.trim())
					.map((para) => `  ${para.trim()}`), ""]
				: [];

			return [...title, ...paragraphs];
		});

		const separator = opts.pageBreakBetweenChapters
			? ["", "─".repeat(40)]
			: [];

		return [...chapterLines, ...separator];
	});

	const lines = [...headerLines, ...contentLines];
	const content = lines.join("\n");
	const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
	saveAs(blob, `${project.title || "novel"}.txt`);
}

// ============================================
// Word (DOCX) 导出
// ============================================

export async function exportToWord(
	projectId: string,
	options: ExportOptions = {},
): Promise<void> {
	const opts = { ...defaultOptions, ...options };
	const { project, nodes, rootNodes, contentMap } =
		await getProjectContent(projectId);

	const headerParagraphs: readonly Paragraph[] = [
		...(opts.includeTitle
			? [
					new Paragraph({
						text: project.title || "Untitled Work",
						heading: HeadingLevel.TITLE,
						alignment: AlignmentType.CENTER,
						spacing: { after: 400 },
					}),
			  ]
			: []),
		...(opts.includeAuthor && project.author
			? [
					new Paragraph({
						text: `作者：${project.author}`,
						alignment: AlignmentType.CENTER,
						spacing: { after: 800 },
					}),
			  ]
			: []),
	];

	const contentParagraphs = rootNodes.flatMap((rootNode, rootIndex) => {
		const contents = getNodeContents(rootNode, nodes, contentMap);

		return contents.flatMap(({ node, depth, text }) => {
			const pageBreak =
				opts.pageBreakBetweenChapters && depth === 0 && rootIndex > 0
					? [new Paragraph({ children: [new PageBreak()] })]
					: [];

			const title =
				opts.includeChapterTitles && depth === 0
					? [
							new Paragraph({
								text: node.title,
								heading: HeadingLevel.HEADING_1,
								spacing: { before: 400, after: 200 },
							}),
					  ]
					: opts.includeSceneTitles && depth > 0
					? [
							new Paragraph({
								text: node.title,
								heading: HeadingLevel.HEADING_2,
								spacing: { before: 200, after: 100 },
							}),
					  ]
					: [];

			const paragraphs = text.trim()
				? text
						.split("\n")
						.filter((p) => p.trim())
						.map(
							(para) =>
								new Paragraph({
									children: [
										new TextRun({
											text: `  ${para.trim()}`,
											font: "SimSun",
											size: 24,
										}),
									],
									spacing: { line: 360, after: 120 },
								}),
						)
				: [];

			return [...pageBreak, ...title, ...paragraphs];
		});
	});

	const children: readonly Paragraph[] = [...headerParagraphs, ...contentParagraphs];

	const doc = new Document({
		sections: [
			{
				properties: {
					page: {
						margin: {
							top: 1440,
							right: 1440,
							bottom: 1440,
							left: 1440,
						},
					},
				},
				headers: {
					default: new Header({
						children: [
							new Paragraph({
								children: [
									new TextRun({
										text: project.title || "",
										size: 18,
										color: "888888",
									}),
								],
								alignment: AlignmentType.CENTER,
							}),
						],
					}),
				},
				footers: {
					default: new Footer({
						children: [
							new Paragraph({
								children: [
									new TextRun({
										children: [PageNumber.CURRENT],
										size: 18,
									}),
								],
								alignment: AlignmentType.CENTER,
							}),
						],
					}),
				},
				children,
			},
		],
	});

	const blob = await Packer.toBlob(doc);
	saveAs(blob, `${project.title || "novel"}.docx`);
}

// ============================================
// PDF 导出（使用打印样式）
// ============================================

/**
 * 在新窗口中打印 HTML 内容（副作用操作）
 */
function printHtmlInNewWindow(html: string): void {
	const printWindow = window.open("", "_blank");
	if (!printWindow) {
		throw new Error(
			"Unable to open print window, please check browser popup settings",
		);
	}

	// 必要的 DOM 操作（打印功能的副作用）
	printWindow.document.write(html);
	printWindow.document.close();

	printWindow.onload = () => {
		setTimeout(() => {
			printWindow.print();
		}, 500);
	};
}

export async function exportToPdf(
	projectId: string,
	options: ExportOptions = {},
): Promise<void> {
	const opts = { ...defaultOptions, ...options };
	const { project, nodes, rootNodes, contentMap } =
		await getProjectContent(projectId);

	const html = generatePrintHtml(project, nodes, rootNodes, contentMap, opts);
	printHtmlInNewWindow(html);
}

// ============================================
// EPUB 导出
// ============================================

export async function exportToEpub(
	projectId: string,
	options: ExportOptions = {},
): Promise<void> {
	const opts = { ...defaultOptions, ...options };
	const { project, nodes, rootNodes, contentMap } =
		await getProjectContent(projectId);

	const zip = new JSZip();
	const bookId = `grain-${dayjs().valueOf()}`;
	const title = project.title || "Untitled Work";
	const author = project.author || "Unknown Author";

	zip.file("mimetype", "application/epub+zip", { compression: "STORE" });

	zip.file(
		"META-INF/container.xml",
		`<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`,
	);

	const titleChapter: ReadonlyArray<{ readonly id: string; readonly title: string; readonly filename: string }> = opts.includeTitle
		? (() => {
				const titleHtml = generateEpubChapterHtml(
					title,
					`<div class="title-page"><h1>${escapeHtml(title)}</h1>${opts.includeAuthor ? `<p class="author">${escapeHtml(author)}</p>` : ""}</div>`,
				);
				zip.file("OEBPS/title.xhtml", titleHtml);
				return [{ id: "title", title: "Cover", filename: "title.xhtml" }];
		  })()
		: [];

	let chapterIndex = 0;
	const contentChapters = rootNodes.flatMap((rootNode) => {
		const contents = getNodeContents(rootNode, nodes, contentMap);

		return contents.flatMap(({ node, depth, text }) => {
			if (depth > 0 && !opts.includeSceneTitles) return [];

			chapterIndex++;
			const chapterId = `chapter-${chapterIndex}`;
			const filename = `${chapterId}.xhtml`;

			const titleHtml = opts.includeChapterTitles
				? `<h2 class="chapter-title">${escapeHtml(node.title)}</h2>`
				: "";

			const paragraphsHtml = text.trim()
				? text.split("\n")
					.filter((p) => p.trim())
					.map((para) => `<p>${escapeHtml(para.trim())}</p>`)
					.join("")
				: "";

			const htmlContent = titleHtml + paragraphsHtml;

			const chapterHtml = generateEpubChapterHtml(node.title, htmlContent);
			zip.file(`OEBPS/${filename}`, chapterHtml);
			
			return [{ id: chapterId, title: node.title, filename }];
		});
	});

	const chapters = [...titleChapter, ...contentChapters];

	zip.file(
		"OEBPS/styles.css",
		`body { font-family: serif; line-height: 1.8; } .title-page { text-align: center; padding-top: 30%; } .chapter-title { text-align: center; margin: 2em 0; } p { text-indent: 2em; }`,
	);

	const manifestItems = chapters
		.map(
			(ch) =>
				`<item id="${ch.id}" href="${ch.filename}" media-type="application/xhtml+xml"/>`,
		)
		.join("\n");
	const spineItems = chapters
		.map((ch) => `<itemref idref="${ch.id}"/>`)
		.join("\n");

	zip.file(
		"OEBPS/content.opf",
		`<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="BookId">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:identifier id="BookId">${bookId}</dc:identifier>
    <dc:title>${escapeHtml(title)}</dc:title>
    <dc:creator>${escapeHtml(author)}</dc:creator>
    <dc:language>zh-CN</dc:language>
  </metadata>
  <manifest>
    <item id="css" href="styles.css" media-type="text/css"/>
    ${manifestItems}
  </manifest>
  <spine>${spineItems}</spine>
</package>`,
	);

	const blob = await zip.generateAsync({
		type: "blob",
		mimeType: "application/epub+zip",
	});
	saveAs(blob, `${title}.epub`);
}

// ============================================
// 导出接口
// ============================================

/**
 * 导出项目到指定格式
 *
 * @param projectId - 项目/工作区 ID
 * @param format - 导出格式 (pdf, docx, txt, epub)
 * @param options - 导出选项
 */
export async function exportProject(
	projectId: string,
	format: ExportFormat,
	options?: ExportOptions,
): Promise<void> {
	switch (format) {
		case "pdf":
			return exportToPdf(projectId, options);
		case "docx":
			return exportToWord(projectId, options);
		case "txt":
			return exportToTxt(projectId, options);
		case "epub":
			return exportToEpub(projectId, options);
		default:
			throw new Error(`不支持的导出格式: ${format}`);
	}
}
