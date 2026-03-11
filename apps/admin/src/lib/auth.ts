import bcrypt from "bcrypt"
import jwt from "jsonwebtoken"

/**
 * 用户接口
 * User interface
 */
export interface User {
	readonly username: string
	readonly name?: string
}

/**
 * 登录凭证
 * Login credentials
 */
interface LoginCredentials {
	readonly username: string
	readonly password: string
}

/**
 * 认证令牌
 * Authentication token
 */
interface AuthToken {
	readonly token: string
	readonly expiresIn: number
}

/**
 * JWT Payload
 */
interface JWTPayload {
	readonly username: string
	readonly iat: number
	readonly exp: number
}

// ============================================================================
// 配置 / Configuration
// ============================================================================

const ADMIN_USERNAME = process.env.ADMIN_USERNAME || "admin"
const ADMIN_PASSWORD_HASH = process.env.ADMIN_PASSWORD_HASH
const JWT_SECRET = process.env.JWT_SECRET
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "1h"

if (!ADMIN_PASSWORD_HASH) {
	console.error("错误：ADMIN_PASSWORD_HASH 环境变量未设置")
	console.error("请运行：bun run scripts/generate-password-hash.ts <password>")
}

if (!JWT_SECRET) {
	console.error("错误：JWT_SECRET 环境变量未设置")
	console.error("请在 .env.local 中设置一个安全的随机字符串")
}

// ============================================================================
// 认证函数 / Authentication Functions
// ============================================================================

/**
 * 验证用户凭证
 * Verify user credentials
 *
 * @param credentials - 用户名和密码 / Username and password
 * @returns Promise<boolean> - 验证是否成功 / Whether verification succeeded
 */
export async function verifyCredentials(
	credentials: LoginCredentials,
): Promise<boolean> {
	const { username, password } = credentials

	// 验证用户名
	if (username !== ADMIN_USERNAME) {
		return false
	}

	// 验证密码
	if (!ADMIN_PASSWORD_HASH) {
		return false
	}

	try {
		return await bcrypt.compare(password, ADMIN_PASSWORD_HASH)
	} catch (error) {
		console.error("密码验证失败:", error)
		return false
	}
}

/**
 * 生成 JWT token
 * Generate JWT token
 *
 * @param username - 用户名 / Username
 * @returns AuthToken - 包含 token 和过期时间 / Token and expiration time
 */
export function generateToken(username: string): AuthToken {
	if (!JWT_SECRET) {
		throw new Error("JWT_SECRET 未配置")
	}

	const token = jwt.sign({ username }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN })

	// 计算过期时间（秒）
	const decoded = jwt.decode(token) as JWTPayload
	const expiresIn = decoded.exp - decoded.iat

	return { token, expiresIn }
}

/**
 * 验证 JWT token
 * Verify JWT token
 *
 * @param token - JWT token
 * @returns JWTPayload | null - 解码后的 payload 或 null
 */
export function verifyToken(token: string): JWTPayload | null {
	if (!JWT_SECRET) {
		return null
	}

	try {
		return jwt.verify(token, JWT_SECRET) as JWTPayload
	} catch (error) {
		console.error("Token 验证失败:", error)
		return null
	}
}

/**
 * 登录函数
 * Login function
 *
 * @param credentials - 用户凭证 / User credentials
 * @returns Promise<AuthToken | null> - 认证 token 或 null
 */
export async function login(
	credentials: LoginCredentials,
): Promise<AuthToken | null> {
	const isValid = await verifyCredentials(credentials)

	if (!isValid) {
		return null
	}

	return generateToken(credentials.username)
}

/**
 * 获取当前用户信息
 * Get current user info
 *
 * @param token - JWT token
 * @returns User | null
 */
export function getCurrentUser(token: string): User | null {
	const payload = verifyToken(token)

	if (!payload) {
		return null
	}

	return {
		username: payload.username,
		name: "管理员",
	}
}
