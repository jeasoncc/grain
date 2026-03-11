/**
 * 安全的 Token 存储模块
 * Secure token storage module
 *
 * 使用 sessionStorage 而非 localStorage 以提高安全性
 * Use sessionStorage instead of localStorage for better security
 */

const AUTH_TOKEN_KEY = "admin_auth_token"
const AUTH_EXPIRES_KEY = "admin_auth_expires"

/**
 * 存储认证 token
 * Store authentication token
 *
 * @param token - JWT token
 * @param expiresIn - 过期时间（秒）/ Expiration time in seconds
 */
export function setAuthToken(token: string, expiresIn: number): void {
	const expiresAt = Date.now() + expiresIn * 1000
	sessionStorage.setItem(AUTH_TOKEN_KEY, token)
	sessionStorage.setItem(AUTH_EXPIRES_KEY, String(expiresAt))
}

/**
 * 获取认证 token
 * Get authentication token
 *
 * @returns string | null - Token 或 null（如果不存在或已过期）
 */
export function getAuthToken(): string | null {
	const token = sessionStorage.getItem(AUTH_TOKEN_KEY)
	const expiresStr = sessionStorage.getItem(AUTH_EXPIRES_KEY)

	if (!token || !expiresStr) {
		return null
	}

	// 检查是否过期
	const expiresAt = parseInt(expiresStr, 10)
	if (Date.now() > expiresAt) {
		clearAuthToken()
		return null
	}

	return token
}

/**
 * 清除认证 token
 * Clear authentication token
 */
export function clearAuthToken(): void {
	sessionStorage.removeItem(AUTH_TOKEN_KEY)
	sessionStorage.removeItem(AUTH_EXPIRES_KEY)
}

/**
 * 检查是否已认证
 * Check if authenticated
 *
 * @returns boolean - 是否已认证 / Whether authenticated
 */
export function isAuthenticated(): boolean {
	return getAuthToken() !== null
}
