/**
 * Content Repository - 内容数据访问层
 *
 * 纯函数 + TaskEither 封装，返回前端类型 (ContentInterface)。
 * 通过 Codec 层进行类型转换，确保前后端类型解耦。
 */

import { pipe } from "fp-ts/function";
import * as TE from "fp-ts/TaskEither";
import * as rustApi from "@/db/api-client.fn";
import type { AppError } from "@/lib/error.types";
import {
	decodeContent,
	decodeContentOptional,
	encodeCreateContent,
	encodeUpdateContent,
} from "@/types/codec";
import type { ContentCreateInput, ContentInterface } from "@/types/content";

// ============================================
// 查询操作
// ============================================

/**
 * 获取节点内容
 */
export const getContentByNodeId = (
	nodeId: string,
): TE.TaskEither<AppError, ContentInterface | null> =>
	pipe(rustApi.getContent(nodeId), TE.map(decodeContentOptional));

/**
 * 获取内容版本号
 */
export const getContentVersion = (
	nodeId: string,
): TE.TaskEither<AppError, number | null> => rustApi.getContentVersion(nodeId);

// ============================================
// 写入操作
// ============================================

/**
 * 创建内容
 */
export const createContent = (
	input: ContentCreateInput,
): TE.TaskEither<AppError, ContentInterface> =>
	pipe(
		TE.of(encodeCreateContent(input)),
		TE.chain(rustApi.saveContent),
		TE.map(decodeContent),
	);

/**
 * 更新节点内容
 */
export const updateContentByNodeId = (
	nodeId: string,
	content: string,
	expectedVersion?: number,
): TE.TaskEither<AppError, ContentInterface> =>
	pipe(
		TE.of(encodeUpdateContent(nodeId, content, expectedVersion)),
		TE.chain(rustApi.saveContent),
		TE.map(decodeContent),
	);

/**
 * 保存内容（创建或更新）
 * 统一的保存接口，根据是否存在自动选择创建或更新
 */
export const saveContent = (
	nodeId: string,
	content: string,
	expectedVersion?: number,
): TE.TaskEither<AppError, ContentInterface> =>
	updateContentByNodeId(nodeId, content, expectedVersion);
