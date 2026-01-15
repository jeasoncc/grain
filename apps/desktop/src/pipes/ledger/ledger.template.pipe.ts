/**
 * @file pipes/ledger/ledger.template.pipe.ts
 * @description 记账模板生成函数
 *
 * 功能说明：
 * - 生成记账 Lexical JSON 模板
 * - 使用结构化文本（列表）而非表格
 * - 包含收入、支出、汇总、备注区域
 *
 * @requirements 118
 */

import dayjs from "dayjs"

// ==============================
// Pure Functions
// ==============================

/**
 * 生成记账模板内容（Lexical JSON 格式）
 *
 * 模板结构：
 * - 标签行：#[ledger] #[日期]
 * - H2 标题：日期 - Ledger
 * - H2 Income：收入列表
 * - H2 Expenses：支出列表
 * - H2 Summary：汇总列表
 * - H2 Notes：备注区域
 *
 * @param date - 日期，默认为当前时间
 * @returns Lexical JSON 字符串
 */
export function generateLedgerContent(date: Date = dayjs().toDate()): string {
	// 格式化日期标签：2024-12-25
	const dateTag = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`

	// 格式化标题日期：December 25, 2024
	const titleDate = date.toLocaleDateString("en-US", {
		day: "numeric",
		month: "long",
		year: "numeric",
	})

	const content = {
		root: {
			children: [
				// 标签行：#[ledger] #[2024-12-25]
				{
					children: [
						{
							detail: 2,
							format: 0,
							mode: "segmented",
							style: "",
							tagName: "ledger",
							text: "#[ledger]",
							type: "tag",
							version: 1,
						},
						{
							detail: 0,
							format: 0,
							mode: "normal",
							style: "",
							text: " ",
							type: "text",
							version: 1,
						},
						{
							detail: 2,
							format: 0,
							mode: "segmented",
							style: "",
							tagName: dateTag,
							text: `#[${dateTag}]`,
							type: "tag",
							version: 1,
						},
					],
					direction: "ltr",
					format: "",
					indent: 0,
					type: "paragraph",
					version: 1,
				},
				// 空行
				{
					children: [],
					direction: "ltr",
					format: "",
					indent: 0,
					type: "paragraph",
					version: 1,
				},
				// H2 标题：日期 - Ledger
				{
					children: [
						{
							detail: 0,
							format: 0,
							mode: "normal",
							style: "",
							text: `${titleDate} - Ledger`,
							type: "text",
							version: 1,
						},
					],
					direction: "ltr",
					format: "",
					indent: 0,
					tag: "h2",
					type: "heading",
					version: 1,
				},
				// 空行
				{
					children: [],
					direction: "ltr",
					format: "",
					indent: 0,
					type: "paragraph",
					version: 1,
				},
				// H2: Income
				{
					children: [
						{
							detail: 0,
							format: 1, // bold
							mode: "normal",
							style: "",
							text: "Income",
							type: "text",
							version: 1,
						},
					],
					direction: "ltr",
					format: "",
					indent: 0,
					tag: "h2",
					type: "heading",
					version: 1,
				},
				// 收入列表项
				{
					children: [
						{
							detail: 0,
							format: 0,
							mode: "normal",
							style: "",
							text: "[Source]: ¥0.00",
							type: "text",
							version: 1,
						},
					],
					direction: "ltr",
					format: "",
					indent: 0,
					type: "listitem",
					value: 1,
					version: 1,
				},
				// 空行
				{
					children: [],
					direction: "ltr",
					format: "",
					indent: 0,
					type: "paragraph",
					version: 1,
				},
				// H2: Expenses
				{
					children: [
						{
							detail: 0,
							format: 1, // bold
							mode: "normal",
							style: "",
							text: "Expenses",
							type: "text",
							version: 1,
						},
					],
					direction: "ltr",
					format: "",
					indent: 0,
					tag: "h2",
					type: "heading",
					version: 1,
				},
				// 支出列表项
				{
					children: [
						{
							detail: 0,
							format: 0,
							mode: "normal",
							style: "",
							text: "[Category] [Item]: ¥0.00",
							type: "text",
							version: 1,
						},
					],
					direction: "ltr",
					format: "",
					indent: 0,
					type: "listitem",
					value: 1,
					version: 1,
				},
				// 空行
				{
					children: [],
					direction: "ltr",
					format: "",
					indent: 0,
					type: "paragraph",
					version: 1,
				},
				// H2: Summary
				{
					children: [
						{
							detail: 0,
							format: 1, // bold
							mode: "normal",
							style: "",
							text: "Summary",
							type: "text",
							version: 1,
						},
					],
					direction: "ltr",
					format: "",
					indent: 0,
					tag: "h2",
					type: "heading",
					version: 1,
				},
				// 汇总列表项 - Total Income
				{
					children: [
						{
							detail: 0,
							format: 0,
							mode: "normal",
							style: "",
							text: "Total Income: ¥0.00",
							type: "text",
							version: 1,
						},
					],
					direction: "ltr",
					format: "",
					indent: 0,
					type: "listitem",
					value: 1,
					version: 1,
				},
				// 汇总列表项 - Total Expenses
				{
					children: [
						{
							detail: 0,
							format: 0,
							mode: "normal",
							style: "",
							text: "Total Expenses: ¥0.00",
							type: "text",
							version: 1,
						},
					],
					direction: "ltr",
					format: "",
					indent: 0,
					type: "listitem",
					value: 2,
					version: 1,
				},
				// 汇总列表项 - Balance
				{
					children: [
						{
							detail: 0,
							format: 0,
							mode: "normal",
							style: "",
							text: "Balance: ¥0.00",
							type: "text",
							version: 1,
						},
					],
					direction: "ltr",
					format: "",
					indent: 0,
					type: "listitem",
					value: 3,
					version: 1,
				},
				// 空行
				{
					children: [],
					direction: "ltr",
					format: "",
					indent: 0,
					type: "paragraph",
					version: 1,
				},
				// H2: Notes
				{
					children: [
						{
							detail: 0,
							format: 1, // bold
							mode: "normal",
							style: "",
							text: "Notes",
							type: "text",
							version: 1,
						},
					],
					direction: "ltr",
					format: "",
					indent: 0,
					tag: "h2",
					type: "heading",
					version: 1,
				},
				// 空行（准备开始写备注）
				{
					children: [],
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
	}

	return JSON.stringify(content)
}
