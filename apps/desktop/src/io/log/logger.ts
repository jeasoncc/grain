/**
 * Logger - 应用日志系统
 *
 * 职责：提供统一的日志接口，支持控制台输出和 IndexedDB 持久化
 *
 * @module io/log/logger
 */

import consola, { type LogType } from "consola";
import { logDB } from "@/io/db/log-db";

// 定义图标与颜色
export const ICONS: Record<LogType, string> = {
	silent: "🤫",
	fatal: "💀",
	error: "❌",
	warn: "⚠️",
	log: "💬",
	info: "ℹ️",
	success: "✅",
	debug: "🐛",
	trace: "🔍",
	verbose: "📢",
	ready: "✨",
	start: "🚀",
	box: "📦",
	fail: "💥",
};

const COLORS: Record<LogType, string> = {
	silent: "color: gray;",
	fatal: "color: crimson;",
	error: "color: red;",
	warn: "color: orange;",
	log: "color: white;",
	info: "color: dodgerblue;",
	success: "color: green;",
	debug: "color: violet;",
	trace: "color: gray;",
	verbose: "color: lightblue;",
	ready: "color: limegreen;",
	start: "color: cyan;",
	box: "color: gold;",
	fail: "color: orangered;",
};

// 保存日志到 IndexedDB
async function saveLog(level: string, message: string) {
	const timestamp = new Date().toISOString();
	await logDB.logs.add({ timestamp, level, message });
}

// 创建 consola 实例
const logger = consola.create({
	reporters: [
		{
			log: (logObj) => {
				const icon = ICONS[logObj.type] ?? "💬";
				const color = COLORS[logObj.type] ?? "color: white;";
				const time = new Date().toLocaleTimeString();
				const message = logObj.args.join(" ");

				// 输出控制台
				console.log(
					`%c${time} ${icon} [${logObj.type.toUpperCase()}]`,
					color,
					message,
				);

				// 保存到数据库
				saveLog(logObj.type.toUpperCase(), message);
			},
		},
	],
});

export default logger;
