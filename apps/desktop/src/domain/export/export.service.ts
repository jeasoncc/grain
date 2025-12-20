/**
 * Export Service
 * Supports PDF, Word, TXT, EPUB format exports.
 * Based on the Node structure.
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
import { saveAs } from "file-saver";
import JSZip from "jszip";
import { database } from "@/db/database";
import { ContentRepository } from "@/db/models";
import {
	type ExportOptions,
	type ExportFormat,
	escapeHtml,
	generatePrintHtml,
	generateEpubChapterHtml,
	getNodeContents,
} from "./export.utils";

export type { ExportOptions, ExportFormat };

const defaultOptions: ExportOptions = {
	includeTitle: true,
	includeAuthor: true,
	includeChapterTitles: true,
	includeSceneTitles: false,
	pageBreakBetweenChapters: true,
};

/**
 * 获取项目的完整内容数据（基于 Node 结构）
 */
async function getProjectContent(projectId: string) {
	const project = await database.workspaces.get(projectId);
	if (!project) throw new Error("Project not found");

	// 获取所有节点
	const nodes = await database.nodes
		.where("workspace")
		.equals(projectId)
		.toArray();

	// 获取所有节点的内容
	const nodeIds = nodes.map(n => n.id);
	const contents = await ContentRepository.getByNodeIds(nodeIds);
	const contentMap = new Map(contents.map(c => [c.nodeId, c.content]));

	// 按 order 排序
	nodes.sort((a, b) => a.order - b.order);

	// 构建树结构
	const rootNodes = nodes.filter(n => !n.parent);
	
	return { project, nodes, rootNodes, contentMap };
}

// ============================================
// TXT Export
// ============================================

export async function exportToTxt(
	projectId: string,
	options: ExportOptions = {},
): Promise<void> {
	const opts = { ...defaultOptions, ...options };
	const { project, nodes, rootNodes, contentMap } = await getProjectContent(projectId);

	const lines: string[] = [];

	// 标题
	if (opts.includeTitle) {
		lines.push(project.title || "Untitled Work");
		lines.push("");
	}

	// 作者
	if (opts.includeAuthor && project.author) {
		lines.push(`作者：${project.author}`);
		lines.push("");
	}

	// 分隔线
	if (opts.includeTitle || opts.includeAuthor) {
		lines.push("═".repeat(40));
		lines.push("");
	}

	// 内容
	for (const rootNode of rootNodes) {
		const contents = getNodeContents(rootNode, nodes, contentMap);
		
		for (const { node, depth, text } of contents) {
			if (opts.includeChapterTitles && depth === 0) {
				lines.push("");
				lines.push(`【${node.title}】`);
				lines.push("");
			} else if (opts.includeSceneTitles && depth > 0) {
				lines.push(`〔${node.title}〕`);
				lines.push("");
			}

			if (text.trim()) {
				const paragraphs = text.split("\n").filter((p) => p.trim());
				for (const para of paragraphs) {
					lines.push(`　　${para.trim()}`);
				}
				lines.push("");
			}
		}

		if (opts.pageBreakBetweenChapters) {
			lines.push("");
			lines.push("─".repeat(40));
		}
	}

	// 生成文件
	const content = lines.join("\n");
	const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
	saveAs(blob, `${project.title || "novel"}.txt`);
}

// ============================================
// Word (DOCX) Export
// ============================================

export async function exportToWord(
	projectId: string,
	options: ExportOptions = {},
): Promise<void> {
	const opts = { ...defaultOptions, ...options };
	const { project, nodes, rootNodes, contentMap } = await getProjectContent(projectId);

	const children: Paragraph[] = [];

	// 标题页
	if (opts.includeTitle) {
		children.push(
			new Paragraph({
				text: project.title || "Untitled Work",
				heading: HeadingLevel.TITLE,
				alignment: AlignmentType.CENTER,
				spacing: { after: 400 },
			}),
		);
	}

	if (opts.includeAuthor && project.author) {
		children.push(
			new Paragraph({
				text: `作者：${project.author}`,
				alignment: AlignmentType.CENTER,
				spacing: { after: 800 },
			}),
		);
	}

	// 内容
	let isFirst = true;
	for (const rootNode of rootNodes) {
		const contents = getNodeContents(rootNode, nodes, contentMap);
		
		for (const { node, depth, text } of contents) {
			// 章节分页
			if (opts.pageBreakBetweenChapters && depth === 0 && !isFirst) {
				children.push(
					new Paragraph({
						children: [new PageBreak()],
					}),
				);
			}
			isFirst = false;

			// 标题
			if (opts.includeChapterTitles && depth === 0) {
				children.push(
					new Paragraph({
						text: node.title,
						heading: HeadingLevel.HEADING_1,
						spacing: { before: 400, after: 200 },
					}),
				);
			} else if (opts.includeSceneTitles && depth > 0) {
				children.push(
					new Paragraph({
						text: node.title,
						heading: HeadingLevel.HEADING_2,
						spacing: { before: 200, after: 100 },
					}),
				);
			}

			if (text.trim()) {
				const paragraphs = text.split("\n").filter((p) => p.trim());
				for (const para of paragraphs) {
					children.push(
						new Paragraph({
							children: [
								new TextRun({
									text: `　　${para.trim()}`,
									font: "SimSun",
									size: 24,
								}),
							],
							spacing: { line: 360, after: 120 },
						}),
					);
				}
			}
		}
	}

	// 创建文档
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
// PDF Export (使用打印样式)
// ============================================

export async function exportToPdf(
	projectId: string,
	options: ExportOptions = {},
): Promise<void> {
	const opts = { ...defaultOptions, ...options };
	const { project, nodes, rootNodes, contentMap } = await getProjectContent(projectId);

	const printWindow = window.open("", "_blank");
	if (!printWindow) {
		throw new Error("Unable to open print window, please check browser popup settings");
	}

	const html = generatePrintHtml(project, nodes, rootNodes, contentMap, opts, getNodeContents);

	printWindow.document.write(html);
	printWindow.document.close();

	printWindow.onload = () => {
		setTimeout(() => {
			printWindow.print();
		}, 500);
	};
}

// ============================================
// EPUB Export
// ============================================

export async function exportToEpub(
	projectId: string,
	options: ExportOptions = {},
): Promise<void> {
	const opts = { ...defaultOptions, ...options };
	const { project, nodes, rootNodes, contentMap } = await getProjectContent(projectId);

	const zip = new JSZip();
	const bookId = `grain-${Date.now()}`;
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

	const chapters: Array<{ id: string; title: string; filename: string }> = [];

	// 标题页
	if (opts.includeTitle) {
		const titleHtml = generateEpubChapterHtml(
			title,
			`<div class="title-page"><h1>${escapeHtml(title)}</h1>${opts.includeAuthor ? `<p class="author">${escapeHtml(author)}</p>` : ""}</div>`,
		);
		zip.file("OEBPS/title.xhtml", titleHtml);
		chapters.push({ id: "title", title: "Cover", filename: "title.xhtml" });
	}

	// 内容
	let chapterIndex = 0;
	for (const rootNode of rootNodes) {
		const contents = getNodeContents(rootNode, nodes, contentMap);
		
		for (const { node, depth, text } of contents) {
			if (depth > 0 && !opts.includeSceneTitles) continue;
			
			chapterIndex++;
			const chapterId = `chapter-${chapterIndex}`;
			const filename = `${chapterId}.xhtml`;

			let htmlContent = "";
			if (opts.includeChapterTitles) {
				htmlContent += `<h2 class="chapter-title">${escapeHtml(node.title)}</h2>`;
			}

			if (text.trim()) {
				const paragraphs = text.split("\n").filter((p) => p.trim());
				for (const para of paragraphs) {
					htmlContent += `<p>${escapeHtml(para.trim())}</p>`;
				}
			}

			const chapterHtml = generateEpubChapterHtml(node.title, htmlContent);
			zip.file(`OEBPS/${filename}`, chapterHtml);
			chapters.push({ id: chapterId, title: node.title, filename });
		}
	}

	// 样式表
	zip.file("OEBPS/styles.css", `body { font-family: serif; line-height: 1.8; } .title-page { text-align: center; padding-top: 30%; } .chapter-title { text-align: center; margin: 2em 0; } p { text-indent: 2em; }`);

	// content.opf
	const manifestItems = chapters.map((ch) => `<item id="${ch.id}" href="${ch.filename}" media-type="application/xhtml+xml"/>`).join("\n");
	const spineItems = chapters.map((ch) => `<itemref idref="${ch.id}"/>`).join("\n");

	zip.file("OEBPS/content.opf", `<?xml version="1.0" encoding="UTF-8"?>
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
</package>`);

	const blob = await zip.generateAsync({ type: "blob", mimeType: "application/epub+zip" });
	saveAs(blob, `${title}.epub`);
}

// ============================================
// Export Interface
// ============================================

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
			throw new Error(`不支持的Export格式: ${format}`);
	}
}
