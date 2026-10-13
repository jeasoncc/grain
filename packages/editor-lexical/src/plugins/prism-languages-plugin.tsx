/**
 * PrismLanguagesPlugin - 注册自定义 Prism 语言
 *
 * 为 Lexical 代码块添加 Mermaid 和 PlantUML 语法高亮支持
 * 在编辑器初始化前注册语言定义到共享 Prism 实例
 */

import Prism from "prismjs";
import { useEffect } from "react";

/**
 * Mermaid 语言定义
 */
const mermaidLanguage = {
	comment: /%%.*$/m,
	keyword:
		/\b(?:graph|flowchart|sequenceDiagram|classDiagram|stateDiagram|stateDiagram-v2|erDiagram|gantt|pie|journey|gitGraph|mindmap|timeline|quadrantChart|requirementDiagram|C4Context|C4Container|C4Component|C4Dynamic|C4Deployment|TB|TD|BT|RL|LR|participant|actor|note|loop|alt|else|opt|par|and|rect|end|activate|deactivate|autonumber|class|subgraph|state|direction|dateFormat|title|excludes|includes|section|todayMarker|commit|branch|checkout|merge|cherry-pick|showData)\b/,
	operator: /-->|---|-\.->|-\.-|==>|==|~~~|-.->|--x|--o|\|>|<\||o\||o-|x-|-x|-o/,
	string: {
		pattern: /"[^"]*"|'[^']*'|\[[^\]]*\]|\([^)]*\)/,
		greedy: true,
	},
	number: /\b\d+\b|\d{4}-\d{2}-\d{2}/,
	punctuation: /[{}[\]();:]/,
};

/**
 * PlantUML 语言定义
 */
const plantumlLanguage = {
	comment: [
		{
			pattern: /\/\*[\s\S]*?\*\//,
			greedy: true,
		},
		{
			pattern: /\/'[\s\S]*?'\//, 
			greedy: true,
		},
		{
			pattern: /'.*$/m,
			greedy: true,
		},
	],
	keyword:
		/\b(?:@startuml|@enduml|@startmindmap|@endmindmap|@startwbs|@endwbs|@startgantt|@endgantt|@startjson|@endjson|@startyaml|@endyaml|participant|actor|boundary|control|entity|database|collections|queue|class|interface|enum|abstract|annotation|package|namespace|node|folder|frame|cloud|rectangle|component|usecase|if|else|elseif|endif|while|endwhile|repeat|until|fork|again|end|split|detach|note|as|over|of|on|link|left|right|top|bottom|activate|deactivate|destroy|create|return|alt|opt|loop|par|break|critical|group|title|header|footer|legend|caption|skinparam|hide|show|remove)\b/,
	operator:
		/->|-->|->>|-->>|<-|<--|<<-|<<--|\.\.>|<\.\.|--\|>|<\|--|\.\.>|<\.\.|--\*|\*--|--o|o--|\.\.o|o\.\.|(?:-(?:up|down|left|right)->)/,
	string: {
		pattern: /"[^"]*"/,
		greedy: true,
	},
	number: /#[a-fA-F0-9]{3,6}\b|\b\d+\b/,
	punctuation: /[{}[\]();:]/,
};

/**
 * 注册自定义语言到 Prism
 */
const registerLanguages = (): void => {
	// Both this plugin and @lexical/code-prism import the same Prism module.
	// 注册 Mermaid
	if (!Prism.languages.mermaid) {
		Prism.languages.mermaid = mermaidLanguage;
	}

	// 注册 PlantUML（支持多个别名）
	if (!Prism.languages.plantuml) {
		Prism.languages.plantuml = plantumlLanguage;
		Prism.languages.puml = plantumlLanguage;
	}
};

// Extension registration highlights initial content before React effects run.
registerLanguages();

/**
 * Prism 语言注册插件
 *
 * 在编辑器挂载时注册 Mermaid 和 PlantUML 语言
 */
export default function PrismLanguagesPlugin(): null {
	useEffect(() => {
		registerLanguages();
	}, []);

	return null;
}
