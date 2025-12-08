// 访客信息类型定义（与 API 保持一致）
export interface Visitor {
  id: string;
  // 基本信息
  ip: string;
  userAgent: string;
  referer?: string;
  
  // 访问信息
  path: string;
  query?: Record<string, string>;
  
  // 地理位置（可选）
  country?: string;
  region?: string;
  city?: string;
  
  // 设备信息
  device?: string;
  browser?: string;
  os?: string;
  
  // 时间信息
  timestamp: number;
  visitedAt: string; // ISO 字符串
  
  // 扩展信息
  metadata?: Record<string, unknown>;
}

export interface VisitorStats {
  total: number;
  today: number;
  thisWeek: number;
  thisMonth: number;
  uniqueIPs: number;
}

export interface VisitorQueryParams {
  page?: number;
  pageSize?: number;
  startDate?: string;
  endDate?: string;
  ip?: string;
  path?: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface PaginatedResponse<T> {
  visitors: T[];
  total: number;
}
