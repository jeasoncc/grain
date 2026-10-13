import { useQuery } from "@tanstack/react-query"
import { getDesktopMode, type DesktopMode } from "@/io/api/desktop-mode.api"
import type { AppError } from "@/types/error"

export interface DesktopModeState {
	readonly mode: DesktopMode | null
	readonly isLoading: boolean
	readonly error: string | null
}

export const useDesktopMode = (): DesktopModeState => {
	const query = useQuery<DesktopMode, AppError>({
		queryKey: ["desktop-mode"],
		queryFn: async () => {
			const result = await getDesktopMode()()
			if (result._tag === "Left") throw result.left
			return result.right
		},
		staleTime: Infinity,
		gcTime: Infinity,
		retry: false,
	})
	return {
		mode: query.data ?? null,
		isLoading: query.isPending,
		error: query.error?.message ?? null,
	}
}
