// src/lib/log-db.ts
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
