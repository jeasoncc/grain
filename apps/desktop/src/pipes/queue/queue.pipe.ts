/**
 * @file pipes/queue/queue.pipe.ts
 * @description Queue operations pipe - wrapper for queue utilities
 *
 * This pipe wraps queue utility functions to maintain architecture compliance.
 * flows/ should not directly import from utils/, but can import from pipes/.
 *
 * @requirements Architecture compliance (flows → pipes → utils)
 */

import PQueue from "p-queue";
import {
	fileOperationQueue as utilFileOperationQueue,
	getQueueStatus as utilGetQueueStatus,
	waitForQueueIdle as utilWaitForQueueIdle,
	type QueueStatus,
} from "@/utils/queue.util";

/**
 * File operation queue - re-exported from utils
 *
 * This is a module-level singleton queue that ensures all file operations
 * execute serially to avoid race conditions.
 */
export const fileOperationQueue: PQueue = utilFileOperationQueue;

/**
 * Get queue status
 *
 * Returns current state of the file operation queue including:
 * - size: number of waiting tasks
 * - pending: number of executing tasks
 * - isPaused: whether the queue is paused
 *
 * @returns Queue status object
 */
export const getQueueStatus = (): QueueStatus => utilGetQueueStatus();

/**
 * Wait for queue to become idle
 *
 * Returns a promise that resolves when all queued operations complete.
 * Useful for testing or ensuring operations finish before proceeding.
 *
 * @returns Promise that resolves when queue is idle
 */
export const waitForQueueIdle = (): Promise<void> => utilWaitForQueueIdle();

// Re-export types
export type { QueueStatus };
