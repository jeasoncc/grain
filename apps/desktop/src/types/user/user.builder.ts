/**
 * @file types/user/user.builder.ts
 * @description 用户 Builder
 *
 * 实现用于创建 User 对象的 Builder 模式。
 * 提供带有链式方法的流畅 API 来设置属性。
 *
 * @requirements 3.1, 3.2
 */

import dayjs from "dayjs";
import { v4 as uuidv4 } from "uuid";
import type {
	TokenStatus,
	UserDBVersion,
	UserFeatures,
	UserInterface,
	UserPlan,
	UserSettings,
	UserState,
} from "./user.interface";
import { UserSchema } from "./user.schema";

/**
 * Builder 内部使用的可变类型
 * 用于在构建过程中修改数据
 */
type MutableUser = {
	-readonly [K in keyof UserInterface]: UserInterface[K];
};

/**
 * UserBuilder 类
 *
 * 提供用于构建 User 对象的流畅 API：
 * - 可选属性的合理默认值
 * - 方法链式调用，代码清晰易读
 * - build() 时进行 Zod 校验
 * - 使用 Object.freeze() 返回不可变对象
 */
export class UserBuilder {
	private data: Partial<MutableUser> = {};

	constructor() {
		// 设置合理的默认值
		const now = dayjs().toISOString();
		this.data = {
			id: uuidv4(),
			username: "user",
			plan: "free",
			lastLogin: now,
			createDate: now,
		};
	}

	/**
	 * 设置用户 ID（可选，默认自动生成）
	 * @param id - 用户的 UUID
	 * @returns this builder 用于链式调用
	 */
	id(id: string): this {
		this.data.id = id;
		return this;
	}

	/**
	 * 设置用户名
	 * @param username - 登录用户名
	 * @returns this builder 用于链式调用
	 */
	username(username: string): this {
		this.data.username = username;
		return this;
	}

	/**
	 * 设置显示名称
	 * @param displayName - 显示名称
	 * @returns this builder 用于链式调用
	 */
	displayName(displayName: string): this {
		this.data.displayName = displayName;
		return this;
	}

	/**
	 * 设置头像 URL
	 * @param avatar - 头像 URL
	 * @returns this builder 用于链式调用
	 */
	avatar(avatar: string): this {
		this.data.avatar = avatar;
		return this;
	}

	/**
	 * 设置邮箱
	 * @param email - 用户邮箱
	 * @returns this builder 用于链式调用
	 */
	email(email: string): this {
		this.data.email = email;
		return this;
	}

	/**
	 * 设置最后登录时间戳
	 * @param timestamp - ISO 8601 日期时间字符串
	 * @returns this builder 用于链式调用
	 */
	lastLogin(timestamp: string): this {
		this.data.lastLogin = timestamp;
		return this;
	}

	/**
	 * 设置创建日期时间戳（可选，默认自动生成）
	 * @param timestamp - ISO 8601 日期时间字符串
	 * @returns this builder 用于链式调用
	 */
	createDate(timestamp: string): this {
		this.data.createDate = timestamp;
		return this;
	}

	/**
	 * 设置订阅计划
	 * @param plan - 用户计划（free/premium）
	 * @returns this builder 用于链式调用
	 */
	plan(plan: UserPlan): this {
		this.data.plan = plan;
		return this;
	}

	/**
	 * 设置计划开始日期
	 * @param timestamp - ISO 8601 日期时间字符串
	 * @returns this builder 用于链式调用
	 */
	planStartDate(timestamp: string): this {
		this.data.planStartDate = timestamp;
		return this;
	}

	/**
	 * 设置计划到期日期
	 * @param timestamp - ISO 8601 日期时间字符串
	 * @returns this builder 用于链式调用
	 */
	planExpiresAt(timestamp: string): this {
		this.data.planExpiresAt = timestamp;
		return this;
	}

	/**
	 * 设置试用到期日期
	 * @param timestamp - ISO 8601 日期时间字符串
	 * @returns this builder 用于链式调用
	 */
	trialExpiresAt(timestamp: string): this {
		this.data.trialExpiresAt = timestamp;
		return this;
	}

	/**
	 * 设置认证 Token
	 * @param token - 认证 Token 字符串
	 * @returns this builder 用于链式调用
	 */
	token(token: string): this {
		this.data.token = token;
		return this;
	}

	/**
	 * 设置 Token 状态
	 * @param status - Token 验证状态
	 * @returns this builder 用于链式调用
	 */
	tokenStatus(status: TokenStatus): this {
		this.data.tokenStatus = status;
		return this;
	}

	/**
	 * 设置最后 Token 检查时间戳
	 * @param timestamp - ISO 8601 日期时间字符串
	 * @returns this builder 用于链式调用
	 */
	lastTokenCheck(timestamp: string): this {
		this.data.lastTokenCheck = timestamp;
		return this;
	}

	/**
	 * 设置服务器消息
	 * @param message - 服务器消息字符串
	 * @returns this builder 用于链式调用
	 */
	serverMessage(message: string): this {
		this.data.serverMessage = message;
		return this;
	}

	/**
	 * 设置用户功能
	 * @param features - 用户功能权限
	 * @returns this builder 用于链式调用
	 */
	features(features: UserFeatures): this {
		this.data.features = features;
		return this;
	}

	/**
	 * 设置用户状态
	 * @param state - 用户应用状态
	 * @returns this builder 用于链式调用
	 */
	state(state: UserState): this {
		this.data.state = state;
		return this;
	}

	/**
	 * 设置用户设置
	 * @param settings - 用户设置/偏好
	 * @returns this builder 用于链式调用
	 */
	settings(settings: UserSettings): this {
		this.data.settings = settings;
		return this;
	}

	/**
	 * 设置数据库版本信息
	 * @param dbVersion - 数据库版本信息
	 * @returns this builder 用于链式调用
	 */
	dbVersion(dbVersion: UserDBVersion): this {
		this.data.dbVersion = dbVersion;
		return this;
	}

	/**
	 * 从现有用户对象初始化 Builder
	 * @param user - 现有的用户对象
	 * @returns this builder 用于链式调用
	 */
	from(user: UserInterface): this {
		this.data = { ...user };
		return this;
	}

	/**
	 * 构建并校验 User 对象
	 * @returns 经过校验的不可变 UserInterface 对象
	 * @throws ZodError 如果校验失败
	 */
	build(): UserInterface {
		// 如果构造后未显式设置，则更新 lastLogin 为当前时间
		const now = dayjs().toISOString();
		if (!this.data.lastLogin) {
			this.data.lastLogin = now;
		}
		if (!this.data.createDate) {
			this.data.createDate = now;
		}

		// 校验并返回不可变对象
		const result = UserSchema.parse(this.data);
		return Object.freeze(result) as UserInterface;
	}

	/**
	 * 构建用于更新操作的部分 User 对象
	 * 不需要所有字段，只校验提供的字段
	 * @returns 带有更新的 lastLogin 的部分 UserInterface 对象
	 */
	buildPartial(): Partial<UserInterface> {
		// 部分构建时始终更新 lastLogin
		this.data.lastLogin = dayjs().toISOString();
		return Object.freeze({ ...this.data }) as Partial<UserInterface>;
	}

	/**
	 * 重置 Builder 到初始状态
	 * 用于重用同一个 Builder 实例
	 * @returns this builder 用于链式调用
	 */
	reset(): this {
		const now = dayjs().toISOString();
		this.data = {
			id: uuidv4(),
			username: "user",
			plan: "free",
			lastLogin: now,
			createDate: now,
		};
		return this;
	}
}
