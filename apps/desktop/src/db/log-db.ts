/**
 * 日志数据库
 * 用于持久化存储应用日志
 */
import Dexie, { type Table } from "dexie";

export interface LogEntry {
	id?: number;
	timestamp: string;
	level: string;
	message: string;
}

export class LogDB extends Dexie {
	logs!: Table<LogEntry>;

	constructor() {
		super("NovelEditorLogsDB");
		this.version(1).stores({
			logs: "++id, timestamp, level",
		});
	}
}

export const logDB = new LogDB();
