/**
 * @file diagram.content.fn.ts
 * @description 图表内容生成纯函数
 *
 * 功能说明：
 * - 生成 Mermaid 默认内容（flowchart 模板）
 * - 生成 PlantUML 默认内容（sequence diagram 模板）
 * - 纯函数，无副作用
 *
 * @requirements 1.5, 2.5
 */

// ==============================
// Mermaid Content Generation
// ==============================

/**
 * 生成默认 Mermaid 内容
 *
 * 返回一个简单的 flowchart 模板，用户可以在此基础上修改。
 *
 * @param _date - 日期参数（保留用于未来扩展）
 * @returns Mermaid flowchart 代码
 */
export const generateMermaidContent = (_date: Date): string => {
	return `flowchart TD
    A[开始] --> B{判断条件}
    B -->|是| C[执行操作 1]
    B -->|否| D[执行操作 2]
    C --> E[结束]
    D --> E`;
};

// ==============================
// PlantUML Content Generation
// ==============================

/**
 * 生成默认 PlantUML 内容
 *
 * 返回一个简单的 sequence diagram 模板，用户可以在此基础上修改。
 *
 * @param _date - 日期参数（保留用于未来扩展）
 * @returns PlantUML sequence diagram 代码
 */
export const generatePlantUMLContent = (_date: Date): string => {
	return `@startuml
Alice -> Bob: 你好
Bob --> Alice: 你好！
Alice -> Bob: 今天怎么样？
Bob --> Alice: 很好，谢谢！
@enduml`;
};
