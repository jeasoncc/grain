/**
 * 查询客户端接口（抽象）
 * Query client interface (abstract)
 *
 * 用于在 flows 层中抽象 TanStack Query 的 QueryClient
 * Used to abstract TanStack Query's QueryClient in flows layer
 */
export interface QueryClientInterface {
	/**
	 * 使查询缓存失效
	 * Invalidate query cache
	 */
	invalidateQueries: (options: { readonly queryKey: readonly unknown[] }) => Promise<void>

	/**
	 * 获取查询数据
	 * Fetch query data
	 */
	fetchQuery: (options: {
		readonly queryKey: readonly unknown[]
		readonly queryFn: () => Promise<readonly unknown[]>
	}) => Promise<readonly unknown[]>
}
