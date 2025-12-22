// API 客户端
const API_BASE_URL =
	import.meta.env.VITE_API_URL || "http://localhost:4001/api";

export interface ApiResponse<T> {
	success: boolean;
	data?: T;
	error?: string;
}

async function request<T>(
	endpoint: string,
	options?: RequestInit,
): Promise<ApiResponse<T>> {
	const url = `${API_BASE_URL}${endpoint}`;

	try {
		const response = await fetch(url, {
			...options,
			headers: {
				"Content-Type": "application/json",
				...options?.headers,
			},
		});

		if (!response.ok) {
			const error = await response.json().catch(() => ({ error: "请求失败" }));
			return {
				success: false,
				error: error.error || `HTTP ${response.status}`,
			};
		}

		const data = await response.json();
		return data;
	} catch (error) {
		return {
			success: false,
			error: error instanceof Error ? error.message : "网络错误",
		};
	}
}

export const api = {
	// 健康检查
	health: () => request<{ status: string }>("/health"),

	// 获取统计信息
	getStats: () =>
		request<{
			total: number;
			today: number;
			thisWeek: number;
			thisMonth: number;
			uniqueIPs: number;
		}>("/stats"),

	// 获取访客列表
	getVisitors: (params?: {
		page?: number;
		pageSize?: number;
		startDate?: string;
		endDate?: string;
		ip?: string;
		path?: string;
	}) => {
		const searchParams = new URLSearchParams();
		if (params) {
			Object.entries(params).forEach(([key, value]) => {
				if (value !== undefined && value !== null && value !== "") {
					searchParams.append(key, String(value));
				}
			});
		}
		const query = searchParams.toString();
		return request<{
			visitors: any[];
			total: number;
		}>(`/visitors${query ? `?${query}` : ""}`);
	},

	// 提交访客信息（可选，用于测试）
	submitVisitor: (data: {
		path?: string;
		query?: Record<string, string>;
		referer?: string;
		userAgent?: string;
		metadata?: Record<string, unknown>;
	}) =>
		request("/visitors", {
			method: "POST",
			body: JSON.stringify(data),
		}),
};
