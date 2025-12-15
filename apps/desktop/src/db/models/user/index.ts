/**
 * User Model - Unified Exports
 *
 * Exports all user-related types, schemas, builder, repository, and hooks.
 *
 * @requirements 2.1
 */

// Interface exports
export type {
  UserInterface,
  UserCreateInput,
  UserUpdateInput,
  UserPlan,
  TokenStatus,
  UserFeatures,
  UserState,
  UserSettings,
  UserDBVersion,
} from "./user.interface";

// Schema exports
export {
  UserSchema,
  UserCreateSchema,
  UserUpdateSchema,
  UserPlanSchema,
  TokenStatusSchema,
  UserFeaturesSchema,
  UserStateSchema,
  UserSettingsSchema,
  UserDBVersionSchema,
} from "./user.schema";

export type {
  UserSchemaType,
  UserCreateSchemaType,
  UserUpdateSchemaType,
  UserFeaturesSchemaType,
  UserStateSchemaType,
  UserSettingsSchemaType,
} from "./user.schema";

// Builder export
export { UserBuilder } from "./user.builder";

// Repository export
export { UserRepository } from "./user.repository";

// Hooks exports
export {
  useAllUsers,
  useUser,
  useUserByUsername,
  useUserByEmail,
  useCurrentUser,
  useUsersByPlan,
  useUserCount,
  useUserExists,
  useUsernameExists,
  useUserSubscription,
  useUserFeatures,
  useUserSettings,
} from "./user.hooks";
