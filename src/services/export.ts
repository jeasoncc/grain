/**
 * 导出服务 - 支持 PDF、Word、TXT、EPUB 格式导出
 */
import {
	Document,
	Packer,
	Paragraph,
	TextRun,
	HeadingLevel,
	AlignmentType,
	PageBreak,
	Header,
	Footer,
	PageNumber,
} from "docx";
import { saveAs } from "file-saver";
import JSZip from "jszip";
import { db } from "@/db/curd";
import type { ProjectInterface, ChapterInterface, SceneInterface } from "@/db/schema";
import { extractTextFromSerialized } from "@/lib/statistics";

export interface ExportOptions {
	includeTitle?: boolean;
	includeAuthor?: boolean;
	includeChapterTitles?: boolean;
	includeSceneTitles?: boolean;
	pageBreakBetweenChapters?: boolean;
}

const defaultOptions: ExportOptions = {
	includeTitle: true,
	includeAuthor: true,
	includeChapterTitles: true,
	includeSceneTitles: false,
	pageBreakBetweenChapters: true,
};

/**
 * 获取项目的完整内容数据
 */
async function getProjectContent(projectId: string) {
	const project = await db.projects.get(projectId);
	if (!project) throw new Error("项目不存在");

	const chapters = await db.chapters
		.where("project")
		.equals(projectId)
		.sortBy("order");

	const scenes = await db.scenes
		.where("project")
		.equals(projectId)
		.toArray();

	// 按章节组织场景
	const chapterContents = chapters.map((chapter) => {
		const chapterScenes = scenes
			.filter((s) => s.chapter === chapter.id)
			.sort((a, b) => a.order - b.order);

		return {
			chapter,
			scenes: chapterScenes,
		};
	});

	return { project, chapterContents };
}

/**
 * 从场景内容中提取纯文本
 */
function getSceneText(scene: SceneInterface): string {
	try {
		const content =
			typeof scene.content === "string"
				? JSON.parse(scene.content)
				: scene.content;
		return extractTextFromSerialized(content);
	} catch {
		return typeof scene.content === "string" ? scene.content : "";
	}
}

// ============================================
// TXT 导出
// ============================================

export async function exportToTxt(
	projectId: string,
	options: ExportOptions = {}
): Promise<void> {
	const opts = { ...defaultOptions, ...options };
	const { project, chapterContents } = await getProjectContent(projectId);

	const lines: string[] = [];

	// 标题
	if (opts.includeTitle) {
		lines.push(project.title || "未命名作品");
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

	// 章节内容
	for (const { chapter, scenes } of chapterContents) {
		if (opts.includeChapterTitles) {
			lines.push("");
			lines.push(`【${chapter.title}】`);
			lines.push("");
		}

		for (const scene of scenes) {
			if (opts.includeSceneTitles) {
				lines.push(`〔${scene.title}〕`);
				lines.push("");
			}

			const text = getSceneText(scene);
			if (text.trim()) {
				// 按段落分割并添加缩进
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
// Word (DOCX) 导出
// ============================================

export async function exportToWord(
	projectId: string,
	options: ExportOptions = {}
): Promise<void> {
	const opts = { ...defaultOptions, ...options };
	const { project, chapterContents } = await getProjectContent(projectId);

	const children: Paragraph[] = [];

	// 标题页
	if (opts.includeTitle) {
		children.push(
			new Paragraph({
				text: project.title || "未命名作品",
				heading: HeadingLevel.TITLE,
				alignment: AlignmentType.CENTER,
				spacing: { after: 400 },
			})
		);
	}

	if (opts.includeAuthor && project.author) {
		children.push(
			new Paragraph({
				text: `作者：${project.author}`,
				alignment: AlignmentType.CENTER,
				spacing: { after: 800 },
			})
		);
	}

	// 章节内容
	for (let i = 0; i < chapterContents.length; i++) {
		const { chapter, scenes } = chapterContents[i];

		// 章节分页
		if (opts.pageBreakBetweenChapters && i > 0) {
			children.push(
				new Paragraph({
					children: [new PageBreak()],
				})
			);
		}

		// 章节标题
		if (opts.includeChapterTitles) {
			children.push(
				new Paragraph({
					text: chapter.title,
					heading: HeadingLevel.HEADING_1,
					spacing: { before: 400, after: 200 },
				})
			);
		}

		// 场景内容
		for (const scene of scenes) {
			if (opts.includeSceneTitles) {
				children.push(
					new Paragraph({
						text: scene.title,
						heading: HeadingLevel.HEADING_2,
						spacing: { before: 200, after: 100 },
					})
				);
			}

			const text = getSceneText(scene);
			if (text.trim()) {
				const paragraphs = text.split("\n").filter((p) => p.trim());
				for (const para of paragraphs) {
					children.push(
						new Paragraph({
							children: [
								new TextRun({
									text: `　　${para.trim()}`,
									font: "SimSun",
									size: 24, // 12pt
								}),
							],
							spacing: { line: 360, after: 120 }, // 1.5倍行距
						})
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
							top: 1440, // 1 inch = 1440 twips
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

	// 生成并下载
	const blob = await Packer.toBlob(doc);
	saveAs(blob, `${project.title || "novel"}.docx`);
}

// ============================================
// PDF 导出 (使用打印样式)
// ============================================

export async function exportToPdf(
	projectId: string,
	options: ExportOptions = {}
): Promise<void> {
	const opts = { ...defaultOptions, ...options };
	const { project, chapterContents } = await getProjectContent(projectId);

	// 创建打印窗口
	const printWindow = window.open("", "_blank");
	if (!printWindow) {
		throw new Error("无法打开打印窗口，请检查浏览器弹窗设置");
	}

	// 构建 HTML 内容
	const html = generatePrintHtml(project, chapterContents, opts);

	printWindow.document.write(html);
	printWindow.document.close();

	// 等待样式加载后打印
	printWindow.onload = () => {
		setTimeout(() => {
			printWindow.print();
		}, 500);
	};
}

function generatePrintHtml(
	project: ProjectInterface,
	chapterContents: Array<{ chapter: ChapterInterface; scenes: SceneInterface[] }>,
	opts: ExportOptions
): string {
	let content = "";

	// 标题页
	if (opts.includeTitle) {
		content += `<div class="title-page">
			<h1 class="book-title">${escapeHtml(project.title || "未命名作品")}</h1>
			${opts.includeAuthor && project.author ? `<p class="author">作者：${escapeHtml(project.author)}</p>` : ""}
		</div>`;
	}

	// 章节内容
	for (const { chapter, scenes } of chapterContents) {
		if (opts.pageBreakBetweenChapters) {
			content += '<div class="chapter" style="page-break-before: always;">';
		} else {
			content += '<div class="chapter">';
		}

		if (opts.includeChapterTitles) {
			content += `<h2 class="chapter-title">${escapeHtml(chapter.title)}</h2>`;
		}

		for (const scene of scenes) {
			if (opts.includeSceneTitles) {
				content += `<h3 class="scene-title">${escapeHtml(scene.title)}</h3>`;
			}

			const text = getSceneText(scene);
			if (text.trim()) {
				const paragraphs = text.split("\n").filter((p) => p.trim());
				for (const para of paragraphs) {
					content += `<p class="paragraph">${escapeHtml(para.trim())}</p>`;
				}
			}
		}

		content += "</div>";
	}

	return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
	<meta charset="UTF-8">
	<title>${escapeHtml(project.title || "导出")}</title>
	<style>
		@page {
			size: A4;
			margin: 2.5cm 2cm;
			@top-center {
				content: "${escapeHtml(project.title || "")}";
				font-size: 10pt;
				color: #888;
			}
			@bottom-center {
				content: counter(page);
				font-size: 10pt;
			}
		}

		* {
			margin: 0;
			padding: 0;
			box-sizing: border-box;
		}

		body {
			font-family: "Source Han Serif SC", "Noto Serif CJK SC", "SimSun", "宋体", serif;
			font-size: 12pt;
			line-height: 1.8;
			color: #333;
			text-align: justify;
		}

		.title-page {
			page-break-after: always;
			display: flex;
			flex-direction: column;
			justify-content: center;
			align-items: center;
			min-height: 60vh;
			text-align: center;
		}

		.book-title {
			font-size: 28pt;
			font-weight: bold;
			margin-bottom: 2em;
			letter-spacing: 0.1em;
		}

		.author {
			font-size: 14pt;
			color: #666;
		}

		.chapter {
			margin-bottom: 2em;
		}

		.chapter-title {
			font-size: 18pt;
			font-weight: bold;
			text-align: center;
			margin: 2em 0 1.5em;
			letter-spacing: 0.05em;
		}

		.scene-title {
			font-size: 14pt;
			font-weight: bold;
			margin: 1.5em 0 1em;
			color: #555;
		}

		.paragraph {
			text-indent: 2em;
			margin-bottom: 0.5em;
		}

		@media print {
			body {
				-webkit-print-color-adjust: exact;
				print-color-adjust: exact;
			}
		}

		@media screen {
			body {
				max-width: 800px;
				margin: 0 auto;
				padding: 40px 20px;
				background: #f5f5f5;
			}

			.title-page,
			.chapter {
				background: white;
				padding: 40px;
				margin-bottom: 20px;
				box-shadow: 0 2px 8px rgba(0,0,0,0.1);
			}
		}
	</style>
</head>
<body>
	${content}
	<script>
		// 自动触发打印
		window.onafterprint = function() {
			window.close();
		};
	</script>
</body>
</html>`;
}

function escapeHtml(text: string): string {
	return text
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&#039;");
}

// ============================================
// EPUB 导出
// ============================================

export async function exportToEpub(
	projectId: string,
	options: ExportOptions = {}
): Promise<void> {
	const opts = { ...defaultOptions, ...options };
	const { project, chapterContents } = await getProjectContent(projectId);

	const zip = new JSZip();
	const bookId = `novel-editor-${Date.now()}`;
	const title = project.title || "未命名作品";
	const author = project.author || "未知作者";

	// mimetype (必须是第一个文件，不压缩)
	zip.file("mimetype", "application/epub+zip", { compression: "STORE" });

	// META-INF/container.xml
	zip.file(
		"META-INF/container.xml",
		`<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`
	);

	// 生成章节 HTML 文件
	const chapters: Array<{ id: string; title: string; filename: string }> = [];

	// 标题页
	if (opts.includeTitle) {
		const titleHtml = generateEpubChapterHtml(
			title,
			`<div class="title-page">
				<h1>${escapeHtml(title)}</h1>
				${opts.includeAuthor ? `<p class="author">${escapeHtml(author)}</p>` : ""}
			</div>`
		);
		zip.file("OEBPS/title.xhtml", titleHtml);
		chapters.push({ id: "title", title: "封面", filename: "title.xhtml" });
	}

	// 章节内容
	for (let i = 0; i < chapterContents.length; i++) {
		const { chapter, scenes } = chapterContents[i];
		const chapterId = `chapter-${i + 1}`;
		const filename = `${chapterId}.xhtml`;

		let content = "";

		if (opts.includeChapterTitles) {
			content += `<h2 class="chapter-title">${escapeHtml(chapter.title)}</h2>`;
		}

		for (const scene of scenes) {
			if (opts.includeSceneTitles) {
				content += `<h3 class="scene-title">${escapeHtml(scene.title)}</h3>`;
			}

			const text = getSceneText(scene);
			if (text.trim()) {
				const paragraphs = text.split("\n").filter((p) => p.trim());
				for (const para of paragraphs) {
					content += `<p>${escapeHtml(para.trim())}</p>`;
				}
			}
		}

		const chapterHtml = generateEpubChapterHtml(chapter.title, content);
		zip.file(`OEBPS/${filename}`, chapterHtml);
		chapters.push({ id: chapterId, title: chapter.title, filename });
	}

	// 样式表
	zip.file(
		"OEBPS/styles.css",
		`@charset "UTF-8";

body {
	font-family: "Source Han Serif SC", "Noto Serif CJK SC", "SimSun", "宋体", serif;
	font-size: 1em;
	line-height: 1.8;
	color: #333;
	margin: 1em;
	text-align: justify;
}

.title-page {
	text-align: center;
	padding-top: 30%;
}

.title-page h1 {
	font-size: 2em;
	font-weight: bold;
	margin-bottom: 1em;
}

.title-page .author {
	font-size: 1.2em;
	color: #666;
}

.chapter-title {
	font-size: 1.5em;
	font-weight: bold;
	text-align: center;
	margin: 2em 0 1em;
	page-break-before: always;
}

.scene-title {
	font-size: 1.2em;
	font-weight: bold;
	margin: 1.5em 0 0.5em;
	color: #555;
}

p {
	text-indent: 2em;
	margin: 0.5em 0;
}`
	);

	// content.opf (包清单)
	const manifestItems = chapters
		.map((ch) => `    <item id="${ch.id}" href="${ch.filename}" media-type="application/xhtml+xml"/>`)
		.join("\n");

	const spineItems = chapters.map((ch) => `    <itemref idref="${ch.id}"/>`).join("\n");

	const navPoints = chapters
		.map(
			(ch, i) => `
    <navPoint id="navpoint-${i + 1}" playOrder="${i + 1}">
      <navLabel><text>${escapeHtml(ch.title)}</text></navLabel>
      <content src="${ch.filename}"/>
    </navPoint>`
		)
		.join("");

	zip.file(
		"OEBPS/content.opf",
		`<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="BookId">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:identifier id="BookId">${bookId}</dc:identifier>
    <dc:title>${escapeHtml(title)}</dc:title>
    <dc:creator>${escapeHtml(author)}</dc:creator>
    <dc:language>zh-CN</dc:language>
    <meta property="dcterms:modified">${new Date().toISOString().split(".")[0]}Z</meta>
  </metadata>
  <manifest>
    <item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/>
    <item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>
    <item id="css" href="styles.css" media-type="text/css"/>
${manifestItems}
  </manifest>
  <spine toc="ncx">
${spineItems}
  </spine>
</package>`
	);

	// toc.ncx (目录 - EPUB 2 兼容)
	zip.file(
		"OEBPS/toc.ncx",
		`<?xml version="1.0" encoding="UTF-8"?>
<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1">
  <head>
    <meta name="dtb:uid" content="${bookId}"/>
    <meta name="dtb:depth" content="1"/>
    <meta name="dtb:totalPageCount" content="0"/>
    <meta name="dtb:maxPageNumber" content="0"/>
  </head>
  <docTitle><text>${escapeHtml(title)}</text></docTitle>
  <navMap>${navPoints}
  </navMap>
</ncx>`
	);

	// nav.xhtml (目录 - EPUB 3)
	const navItems = chapters
		.map((ch) => `      <li><a href="${ch.filename}">${escapeHtml(ch.title)}</a></li>`)
		.join("\n");

	zip.file(
		"OEBPS/nav.xhtml",
		`<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops">
<head>
  <meta charset="UTF-8"/>
  <title>目录</title>
  <link rel="stylesheet" type="text/css" href="styles.css"/>
</head>
<body>
  <nav epub:type="toc">
    <h1>目录</h1>
    <ol>
${navItems}
    </ol>
  </nav>
</body>
</html>`
	);

	// 生成 EPUB 文件
	const blob = await zip.generateAsync({
		type: "blob",
		mimeType: "application/epub+zip",
		compression: "DEFLATE",
		compressionOptions: { level: 9 },
	});

	saveAs(blob, `${title}.epub`);
}

function generateEpubChapterHtml(title: string, content: string): string {
	return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="UTF-8"/>
  <title>${escapeHtml(title)}</title>
  <link rel="stylesheet" type="text/css" href="styles.css"/>
</head>
<body>
${content}
</body>
</html>`;
}

// ============================================
// 导出对话框数据
// ============================================

export type ExportFormat = "pdf" | "docx" | "txt" | "epub";

export async function exportProject(
	projectId: string,
	format: ExportFormat,
	options?: ExportOptions
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
