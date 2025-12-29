/**
 * Monaco Editor 自定义语言定义
 *
 * 为 PlantUML 和 Mermaid 提供语法高亮支持
 */
import type { Monaco } from "@monaco-editor/react";

/**
 * 注册 PlantUML 语言
 *
 * 提供 PlantUML 图表语言的语法高亮支持
 * 包括关键字、箭头操作符、字符串、注释等 token 规则
 *
 * @param monaco - Monaco 实例
 */
export const registerPlantUMLLanguage = (monaco: Monaco): void => {
	// 检查语言是否已注册
	const languages = monaco.languages.getLanguages();
	if (languages.some((lang: { id: string }) => lang.id === "plantuml")) {
		return;
	}

	// 注册语言
	monaco.languages.register({ id: "plantuml" });

	// 设置 Monarch tokenizer
	monaco.languages.setMonarchTokensProvider("plantuml", {
		// 关键字定义
		keywords: [
			// 图表类型
			"@startuml",
			"@enduml",
			"@startmindmap",
			"@endmindmap",
			"@startwbs",
			"@endwbs",
			"@startgantt",
			"@endgantt",
			"@startjson",
			"@endjson",
			"@startyaml",
			"@endyaml",
			// 参与者类型
			"participant",
			"actor",
			"boundary",
			"control",
			"entity",
			"database",
			"collections",
			"queue",
			// 类图关键字
			"class",
			"interface",
			"enum",
			"abstract",
			"annotation",
			// 包和命名空间
			"package",
			"namespace",
			"node",
			"folder",
			"frame",
			"cloud",
			"rectangle",
			"component",
			"usecase",
			// 控制流
			"if",
			"else",
			"elseif",
			"endif",
			"while",
			"endwhile",
			"repeat",
			"until",
			"fork",
			"again",
			"end",
			"split",
			"detach",
			// 其他
			"note",
			"as",
			"over",
			"of",
			"on",
			"link",
			"left",
			"right",
			"top",
			"bottom",
			"activate",
			"deactivate",
			"destroy",
			"create",
			"return",
			"alt",
			"opt",
			"loop",
			"par",
			"break",
			"critical",
			"group",
			"title",
			"header",
			"footer",
			"legend",
			"caption",
			"skinparam",
			"hide",
			"show",
			"remove",
		],

		// 箭头操作符
		arrows: [
			"->",
			"-->",
			"->>",
			"-->>",
			"<-",
			"<--",
			"<<-",
			"<<--",
			"..>",
			"<..",
			"-[#",
			"--|>",
			"<|--",
			"..|>",
			"<|..",
			"--*",
			"*--",
			"--o",
			"o--",
			"..o",
			"o..",
			"-up->",
			"-down->",
			"-left->",
			"-right->",
		],

		// Tokenizer 规则
		tokenizer: {
			root: [
				// @ 开头的指令（如 @startuml）
				[/@\w+/, "keyword"],

				// 关键字
				[
					/\b(participant|actor|boundary|control|entity|database|collections|queue)\b/,
					"keyword",
				],
				[/\b(class|interface|enum|abstract|annotation)\b/, "keyword"],
				[
					/\b(package|namespace|node|folder|frame|cloud|rectangle|component|usecase)\b/,
					"keyword",
				],
				[
					/\b(if|else|elseif|endif|while|endwhile|repeat|until|fork|again|end|split|detach)\b/,
					"keyword",
				],
				[/\b(note|as|over|of|on|link|left|right|top|bottom)\b/, "keyword"],
				[/\b(activate|deactivate|destroy|create|return)\b/, "keyword"],
				[/\b(alt|opt|loop|par|break|critical|group)\b/, "keyword"],
				[
					/\b(title|header|footer|legend|caption|skinparam|hide|show|remove)\b/,
					"keyword",
				],

				// 箭头操作符
				[
					/->|-->|->>|-->>|<-|<--|<<-|<<--|\.\.>|<\.\.|--\|>|<\|--|\.\.>|<\.\.|--\*|\*--|--o|o--|\.\.o|o\.\./,
					"operator",
				],
				[/-up->|-down->|-left->|-right->/, "operator"],
				[/-\[#[^\]]*\]->/, "operator"],

				// 颜色定义
				[/#[a-fA-F0-9]{6}\b/, "number.hex"],
				[/#[a-fA-F0-9]{3}\b/, "number.hex"],
				[/#\w+/, "number.hex"],

				// 字符串
				[/"[^"]*"/, "string"],
				[/'[^']*'/, "string"],

				// 单行注释
				[/'.*$/, "comment"],
				[/\/\/.*$/, "comment"],

				// 多行注释
				[/\/\*/, "comment", "@comment"],
				[/\/'\s*$/, "comment", "@blockComment"],

				// 数字
				[/\b\d+\b/, "number"],

				// 标识符
				[/[a-zA-Z_]\w*/, "identifier"],

				// 空白
				[/[ \t\r\n]+/, "white"],

				// 括号
				[/[{}()[\]]/, "@brackets"],

				// 冒号（用于消息）
				[/:/, "delimiter"],
			],

			// 多行注释状态
			comment: [
				[/\*\//, "comment", "@pop"],
				[/./, "comment"],
			],

			// 块注释状态（PlantUML 特有的 /' ... '/）
			blockComment: [
				[/'\//, "comment", "@pop"],
				[/./, "comment"],
			],
		},
	});

	// 设置语言配置（括号匹配等）
	monaco.languages.setLanguageConfiguration("plantuml", {
		comments: {
			lineComment: "'",
			blockComment: ["/'", "'/"],
		},
		brackets: [
			["{", "}"],
			["[", "]"],
			["(", ")"],
		],
		autoClosingPairs: [
			{ open: "{", close: "}" },
			{ open: "[", close: "]" },
			{ open: "(", close: ")" },
			{ open: '"', close: '"' },
			{ open: "'", close: "'" },
		],
		surroundingPairs: [
			{ open: "{", close: "}" },
			{ open: "[", close: "]" },
			{ open: "(", close: ")" },
			{ open: '"', close: '"' },
			{ open: "'", close: "'" },
		],
	});
};

/**
 * 注册 Mermaid 语言
 *
 * 提供 Mermaid 图表语言的语法高亮支持
 * 包括图表类型、方向、节点、连接线等 token 规则
 *
 * @param monaco - Monaco 实例
 */
export const registerMermaidLanguage = (monaco: Monaco): void => {
	// 检查语言是否已注册
	const languages = monaco.languages.getLanguages();
	if (languages.some((lang: { id: string }) => lang.id === "mermaid")) {
		return;
	}

	// 注册语言
	monaco.languages.register({ id: "mermaid" });

	// 设置 Monarch tokenizer
	monaco.languages.setMonarchTokensProvider("mermaid", {
		// 关键字定义
		keywords: [
			// 图表类型
			"graph",
			"flowchart",
			"sequenceDiagram",
			"classDiagram",
			"stateDiagram",
			"stateDiagram-v2",
			"erDiagram",
			"gantt",
			"pie",
			"journey",
			"gitGraph",
			"mindmap",
			"timeline",
			"quadrantChart",
			"requirementDiagram",
			"C4Context",
			"C4Container",
			"C4Component",
			"C4Dynamic",
			"C4Deployment",
			// 方向
			"TB",
			"TD",
			"BT",
			"RL",
			"LR",
			// 序列图关键字
			"participant",
			"actor",
			"note",
			"loop",
			"alt",
			"else",
			"opt",
			"par",
			"and",
			"rect",
			"end",
			"activate",
			"deactivate",
			"autonumber",
			// 类图关键字
			"class",
			"direction",
			// 流程图关键字
			"subgraph",
			// 甘特图关键字
			"dateFormat",
			"title",
			"excludes",
			"includes",
			"section",
			"todayMarker",
			// 状态图关键字
			"state",
			// ER 图关键字
			"erDiagram",
			// 饼图关键字
			"showData",
			// Git 图关键字
			"commit",
			"branch",
			"checkout",
			"merge",
			"cherry-pick",
		],

		// Tokenizer 规则
		tokenizer: {
			root: [
				// 图表类型声明
				[
					/\b(graph|flowchart|sequenceDiagram|classDiagram|stateDiagram|stateDiagram-v2)\b/,
					"keyword",
				],
				[
					/\b(erDiagram|gantt|pie|journey|gitGraph|mindmap|timeline)\b/,
					"keyword",
				],
				[
					/\b(quadrantChart|requirementDiagram|C4Context|C4Container|C4Component|C4Dynamic|C4Deployment)\b/,
					"keyword",
				],

				// 方向关键字
				[/\b(TB|TD|BT|RL|LR)\b/, "keyword"],

				// 序列图关键字
				[
					/\b(participant|actor|note|loop|alt|else|opt|par|and|rect|end)\b/,
					"keyword",
				],
				[/\b(activate|deactivate|autonumber)\b/, "keyword"],

				// 其他关键字
				[/\b(class|subgraph|state|direction)\b/, "keyword"],
				[
					/\b(dateFormat|title|excludes|includes|section|todayMarker)\b/,
					"keyword",
				],
				[/\b(commit|branch|checkout|merge|cherry-pick)\b/, "keyword"],
				[/\b(showData)\b/, "keyword"],

				// 箭头和连接线
				[/-->|---|-\.->|-\.-|==>|==|~~~|-.->|--x|--o/, "operator"],
				[/\|>|<\||o\||o-|x-|-x|-o/, "operator"],

				// 节点形状 - 方括号
				[/\[[^\]]*\]/, "string"],

				// 节点形状 - 圆括号
				[/\([^)]*\)/, "string"],

				// 节点形状 - 花括号
				[/\{[^}]*\}/, "string"],

				// 节点形状 - 双括号
				[/\[\[[^\]]*\]\]/, "string"],

				// 节点形状 - 圆角
				[/\(\([^)]*\)\)/, "string"],

				// 节点形状 - 菱形
				[/\{[^}]*\}/, "string"],

				// 注释（%% 开头）
				[/%%.*$/, "comment"],

				// 字符串
				[/"[^"]*"/, "string"],

				// 数字
				[/\b\d+\b/, "number"],

				// 日期格式（甘特图）
				[/\d{4}-\d{2}-\d{2}/, "number"],

				// 标识符
				[/[a-zA-Z_]\w*/, "identifier"],

				// 空白
				[/[ \t\r\n]+/, "white"],

				// 冒号（用于标签）
				[/:/, "delimiter"],

				// 分号
				[/;/, "delimiter"],
			],
		},
	});

	// 设置语言配置
	monaco.languages.setLanguageConfiguration("mermaid", {
		comments: {
			lineComment: "%%",
		},
		brackets: [
			["{", "}"],
			["[", "]"],
			["(", ")"],
		],
		autoClosingPairs: [
			{ open: "{", close: "}" },
			{ open: "[", close: "]" },
			{ open: "(", close: ")" },
			{ open: '"', close: '"' },
			{ open: "[[", close: "]]" },
			{ open: "((", close: "))" },
		],
		surroundingPairs: [
			{ open: "{", close: "}" },
			{ open: "[", close: "]" },
			{ open: "(", close: ")" },
			{ open: '"', close: '"' },
		],
	});
};

/**
 * 注册所有自定义语言
 *
 * 一次性注册所有自定义语言定义
 *
 * @param monaco - Monaco 实例
 */
export const registerAllLanguages = (monaco: Monaco): void => {
	registerPlantUMLLanguage(monaco);
	registerMermaidLanguage(monaco);
};
