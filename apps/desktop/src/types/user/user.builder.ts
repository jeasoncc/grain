/**
 * @file types/user/user.builder.ts
 * @description 用户 Builder
 *
 * 实现用于创建 User 对象的函数式 Builder 模式。
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
 * 函数式 UserBuilder 类型
 * 提供用于构建 User 对象的流畅 API
 */
export interface UserBuilder {
	readonly id: (id: string) => UserBuilder;
	readonly username: (username: string) => UserBuilder;
	readonly displayName: (displayName: string) => UserBuilder;
	readonly avatar: (avatar: string) => UserBuilder;
	readonly email: (email: string) => UserBuilder;
	readonly lastLogin: (timestamp: string) => UserBuilder;
	readonly createDate: (timestamp: string) => UserBuilder;
	readonly plan: (plan: UserPlan) => UserBuilder;
	readonly planStartDate: (timestamp: string) => UserBuilder;
	readonly planExpiresAt: (timestamp: string) => UserBuilder;
	readonly trialExpiresAt: (timestamp: string) => UserBuilder;
	readonly token: (token: string) => UserBuilder;
	readonly tokenStatus: (status: TokenStatus) => UserBuilder;
	readonly lastTokenCheck: (timestamp: string) => UserBuilder;
	readonly serverMessage: (message: string) => UserBuilder;
	readonly features: (features: UserFeatures) => UserBuilder;
	readonly state: (state: UserState) => UserBuilder;
	readonly settings: (settings: UserSettings) => UserBuilder;
	readonly dbVersion: (dbVersion: UserDBVersion) => UserBuilder;
	readonly from: (user: UserInterface) => UserBuilder;
	readonly build: () => UserInterface;
	readonly buildPartial: () => Partial<UserInterface>;
}

/**
 * 创建函数式 UserBuilder 实例
 * @param initialData - 初始数据（可选）
 * @returns UserBuilder 实例
 */
const createUserBuilder = (initialData?: Partial<UserInterface>): UserBuilder => {
	const now = dayjs().toISOString();
	const defaultData: Partial<UserInterface> = {
		id: uuidv4(),
		username: "user",
		plan: "free",
		lastLogin: now,
		createDate: now,
		...initialData,
	};

	const createBuilder = (data: Partial<UserInterface>): UserBuilder => ({
		id: (id: string) => createBuilder({ ...data, id }),
		username: (username: string) => createBuilder({ ...data, username }),
		displayName: (displayName: string) => createBuilder({ ...data, displayName }),
		avatar: (avatar: string) => createBuilder({ ...data, avatar }),
		email: (email: string) => createBuilder({ ...data, email }),
		lastLogin: (timestamp: string) => createBuilder({ ...data, lastLogin: timestamp }),
		createDate: (timestamp: string) => createBuilder({ ...data, createDate: timestamp }),
		plan: (plan: UserPlan) => createBuilder({ ...data, plan }),
		planStartDate: (timestamp: string) => createBuilder({ ...data, planStartDate: timestamp }),
		planExpiresAt: (timestamp: string) => createBuilder({ ...data, planExpiresAt: timestamp }),
		trialExpiresAt: (timestamp: string) => createBuilder({ ...data, trialExpiresAt: timestamp }),
		token: (token: string) => createBuilder({ ...data, token }),
		tokenStatus: (status: TokenStatus) => createBuilder({ ...data, tokenStatus: status }),
		lastTokenCheck: (timestamp: string) => createBuilder({ ...data, lastTokenCheck: timestamp }),
		serverMessage: (message: string) => createBuilder({ ...data, serverMessage: message }),
		features: (features: UserFeatures) => createBuilder({ ...data, features }),
		state: (state: UserState) => createBuilder({ ...data, state }),
		settings: (settings: UserSettings) => createBuilder({ ...data, settings }),
		dbVersion: (dbVersion: UserDBVersion) => createBuilder({ ...data, dbVersion }),
		from: (user: UserInterface) => createBuilder({ ...data, ...user }),

		build: (): UserInterface => {
			const now = dayjs().toISOString();
			const finalData = {
				...data,
				lastLogin: data.lastLogin || now,
				createDate: data.createDate || now,
			};

			const result = UserSchema.parse(finalData);
			return Object.freeze(result) as UserInterface;
		},

		buildPartial: (): Partial<UserInterface> => {
			const finalData = {
				...data,
				lastLogin: dayjs().toISOString(),
			};
			return Object.freeze(finalData) as Partial<UserInterface>;
		},
	});

	return createBuilder(defaultData);
};

/**
 * 创建新的 UserBuilder 实例
 * @returns UserBuilder 实例
 */
export const UserBuilder = (): UserBuilder => createUserBuilder();

/**
 * 从现有用户对象创建 UserBuilder 实例
 * @param user - 现有的用户对象
 * @returns UserBuilder 实例
 */
export const UserBuilderFrom = (user: UserInterface): UserBuilder => createUserBuilder(user);
