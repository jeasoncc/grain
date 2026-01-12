/**
 * @file clear-data.flow.ts
 * @description 数据清理 Flow
 *
 * 封装数据清理操作，供 views 层使用
 */

import type * as TE from "fp-ts/TaskEither";
import { clearAllData as clearAllDataApi } from "@/io/api";
import type { ClearDataResult } from "@/types/rust-api";
import type { AppError } from "@/types/error";

/**
 * 清除所有数据
 *
 * @returns TaskEither<AppError, ClearDataResult>
 */
export const clearAllData = (): TE.TaskEither<AppError, ClearDataResult> =>
	clearAllDataApi();
