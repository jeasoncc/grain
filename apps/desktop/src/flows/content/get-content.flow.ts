/**
 * @file get-content.flow.ts
 * @description 获取内容 Flow
 *
 * 封装内容查询操作，供 hooks/queries 使用
 */

import * as TE from "fp-ts/TaskEither";
import * as contentRepo from "@/io/api/content.api";
import type { ContentInterface } from "@/types/content";
import type { AppError } from "@/types/error";

/**
 * 获取节点内容
 */
export const getContentByNodeId = (
	nodeId: string,
): TE.TaskEither<AppError, ContentInterface | null> => {
	return contentRepo.getContentByNodeId(nodeId);
};

/**
 * 获取内容版本号
 */
export const getContentVersion = (
	nodeId: string,
): TE.TaskEither<AppError, number | null> => {
	return contentRepo.getContentVersion(nodeId);
};
