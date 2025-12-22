/**
 * Database Initialization Service
 *
 * Initializes the database with default data (guest user, version tracking).
 * Uses the new database.ts instance instead of deprecated curd.ts.
 */

import dayjs from "dayjs";
import { v4 as uuidv4 } from "uuid";
import { database } from "@/db/database";
import logger from "@/log/index";

/**
 * Initialize database with default data
 * - Creates default guest user if no users exist
 * - Sets initial DB version if not set
 */
export async function initDatabase(): Promise<void> {
	try {
		// Check and create default guest user
		const existingUsers = await database.users.toArray();
		if (existingUsers.length === 0) {
			const now = dayjs().toISOString();
			const guestUser = {
				id: uuidv4(),
				username: "guest",
				displayName: "Guest User",
				lastLogin: now,
				createDate: now,
				plan: "free" as const,
				tokenStatus: "unchecked" as const,
				state: {
					lastLocation: "",
					currentProject: "",
					currentChapter: "",
					currentScene: "",
					currentTitle: "",
					currentTyping: "",
					lastCloudSave: "",
					lastLocalSave: "",
					isUserLoggedIn: false,
				},
				settings: {
					theme: "dark" as const,
					language: "en",
					autosave: true,
					spellCheck: true,
					lastLocation: true,
					fontSize: "14px",
				},
			};
			await database.users.add(guestUser);
			logger.info(`Added user ${guestUser.username} (${guestUser.id})`);
			logger.info("✅ Created default guest user");
		}

		// Check and set DB version
		const dbVersions = await database.dbVersions.toArray();
		if (dbVersions.length === 0) {
			const versionRecord = {
				id: uuidv4(),
				version: "2.0.0",
				updatedAt: dayjs().toISOString(),
				migrationNotes: "Unified database architecture",
			};
			await database.dbVersions.put(versionRecord);
			logger.info("DB version set to 2.0.0");
			logger.info("✅ Initialized DB version 2.0.0");
		}

		logger.success("🎉 Database initialized successfully!");
	} catch (error) {
		logger.error("❌ Database initialization failed:", error);
		throw error;
	}
}
