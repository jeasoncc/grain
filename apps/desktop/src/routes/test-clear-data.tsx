import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import * as E from "fp-ts/Either";
import { DevOnlyPage } from "@/components/dev-only";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import logger from "@/log";
import {
	clearAllData,
	clearCookies,
	clearIndexedDB,
	clearLocalStorage,
	clearSessionStorage,
	getStorageStats,
} from "@/db/clear-data";

export const Route = createFileRoute("/test-clear-data")({
	component: () => (
		<DevOnlyPage>
			<TestClearData />
		</DevOnlyPage>
	),
});

function TestClearData() {
	const [loading, setLoading] = useState(false);
	const [storageStats, setStorageStats] = useState<{
		indexedDB: { size: number; tables: Record<string, number> };
		localStorage: { size: number; keys: number };
		sessionStorage: { size: number; keys: number };
		cookies: { count: number };
	} | null>(null);

	const loadStats = async () => {
		try {
			const result = await getStorageStats()();
			if (E.isLeft(result)) {
				throw new Error(result.left.message);
			}
			setStorageStats(result.right);
		} catch (error) {
			toast.error("Failed to load storage stats");
			logger.error(error);
		}
	};

	const handleClearAll = async () => {
		setLoading(true);
		try {
			const result = await clearAllData()();
			if (E.isLeft(result)) {
				throw new Error(result.left.message);
			}
			toast.success("All data cleared successfully");
			await loadStats();
		} catch (error) {
			toast.error("Failed to clear data");
			logger.error(error);
		} finally {
			setLoading(false);
		}
	};

	const handleClearIndexedDB = async () => {
		setLoading(true);
		try {
			const result = await clearIndexedDB()();
			if (E.isLeft(result)) {
				throw new Error(result.left.message);
			}
			toast.success("IndexedDB cleared successfully");
			await loadStats();
		} catch (error) {
			toast.error("Failed to clear IndexedDB");
			logger.error(error);
		} finally {
			setLoading(false);
		}
	};

	const handleClearLocalStorage = async () => {
		try {
			const result = await clearLocalStorage()();
			if (E.isLeft(result)) {
				throw new Error(result.left.message);
			}
			toast.success("localStorage cleared successfully");
			loadStats();
		} catch (error) {
			toast.error("Failed to clear localStorage");
			logger.error(error);
		}
	};

	const handleClearSessionStorage = async () => {
		try {
			const result = await clearSessionStorage()();
			if (E.isLeft(result)) {
				throw new Error(result.left.message);
			}
			toast.success("sessionStorage cleared successfully");
			loadStats();
		} catch (error) {
			toast.error("Failed to clear sessionStorage");
			logger.error(error);
		}
	};

	const handleClearCookies = async () => {
		try {
			const result = await clearCookies()();
			if (E.isLeft(result)) {
				throw new Error(result.left.message);
			}
			toast.success("Cookies cleared successfully");
			loadStats();
		} catch (error) {
			toast.error("Failed to clear cookies");
			logger.error(error);
		}
	};

	return (
		<div className="container mx-auto p-6 space-y-6">
			<h1 className="text-2xl font-bold">Clear Data Test</h1>

			<Card>
				<CardHeader>
					<CardTitle>Storage Statistics</CardTitle>
				</CardHeader>
				<CardContent className="space-y-4">
					<Button onClick={loadStats}>Load Stats</Button>

					{storageStats && (
						<div className="space-y-4">
							<div>
								<h3 className="font-semibold">IndexedDB</h3>
								<p>
									Total records:{" "}
									{(
										Object.values(storageStats.indexedDB.tables) as number[]
									).reduce((a, b) => a + b, 0)}
								</p>
								<ul className="text-sm text-gray-600">
									{Object.entries(storageStats.indexedDB.tables).map(
										([table, count]) => (
											<li key={table}>
												{table}: {count as number}
											</li>
										),
									)}
								</ul>
							</div>

							<div>
								<h3 className="font-semibold">localStorage</h3>
								<p>
									Keys: {storageStats.localStorage.keys}, Size:{" "}
									{storageStats.localStorage.size} bytes
								</p>
							</div>

							<div>
								<h3 className="font-semibold">sessionStorage</h3>
								<p>
									Keys: {storageStats.sessionStorage.keys}, Size:{" "}
									{storageStats.sessionStorage.size} bytes
								</p>
							</div>

							<div>
								<h3 className="font-semibold">Cookies</h3>
								<p>Count: {storageStats.cookies.count}</p>
							</div>
						</div>
					)}
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle>Clear Data Actions</CardTitle>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="flex flex-wrap gap-3">
						<Button
							onClick={handleClearAll}
							disabled={loading}
							variant="destructive"
						>
							Clear All Data
						</Button>

						<Button
							onClick={handleClearIndexedDB}
							disabled={loading}
							variant="outline"
						>
							Clear IndexedDB
						</Button>

						<Button
							onClick={handleClearLocalStorage}
							disabled={loading}
							variant="outline"
						>
							Clear localStorage
						</Button>

						<Button
							onClick={handleClearSessionStorage}
							disabled={loading}
							variant="outline"
						>
							Clear sessionStorage
						</Button>

						<Button
							onClick={handleClearCookies}
							disabled={loading}
							variant="outline"
						>
							Clear Cookies
						</Button>
					</div>

					<p className="text-sm text-gray-600">
						Use these buttons to test the clear data functionality. Make sure to
						load stats before and after clearing to see the changes.
					</p>
				</CardContent>
			</Card>
		</div>
	);
}
