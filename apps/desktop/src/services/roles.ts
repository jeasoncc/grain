import { useLiveQuery } from "dexie-react-hooks";

import { db } from "@/db/curd";
import type { RoleInterface } from "@/db/schema";

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

export async function updateRole(
	id: string,
	updates: Partial<RoleInterface>,
): Promise<void> {
	await db.updateRole(id, updates);
}

export async function deleteRole(id: string): Promise<void> {
	await db.deleteRole(id);
}
