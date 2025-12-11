/**
 * @deprecated 此服务已废弃，请使用 Wiki 服务替代
 * 保留此文件仅用于向后兼容和数据迁移
 * 所有新代码应使用 WikiEntryInterface 和相关的 Wiki 服务
 */
import { useLiveQuery } from "dexie-react-hooks";

import { db } from "@/db/curd";
import type { RoleInterface } from "@/db/schema";

/** @deprecated 使用 Wiki 服务替代 */
export function useRolesByProject(projectId: string | null): RoleInterface[] {
	const data = useLiveQuery(
		() =>
			projectId
				? db.getRolesByProject(projectId)
				: Promise.resolve([] as RoleInterface[]),
		[projectId] as const,
	);

	return (data ?? []) as RoleInterface[];
}

/** @deprecated 使用 db.addWikiEntry 替代 */
export async function createRole(params: {
	projectId: string;
	name: string;
}): Promise<RoleInterface> {
	const role = await db.addRole({
		project: params.projectId,
		name: params.name,
		alias: [],
		identity: [],
		relationships: [],
		basicSettings: "",
		image: [],
		experience: "",
		showTip: false,
	});
	return role as RoleInterface;
}

/** @deprecated 使用 db.updateWikiEntry 替代 */
export async function updateRole(
	id: string,
	updates: Partial<RoleInterface>,
): Promise<void> {
	await db.updateRole(id, updates);
}

/** @deprecated 使用 db.deleteWikiEntry 替代 */
export async function deleteRole(id: string): Promise<void> {
	await db.deleteRole(id);
}
