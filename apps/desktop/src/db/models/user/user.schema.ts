/**
 * User Zod Schema Definitions
 *
 * Defines Zod schemas for runtime validation of user data.
 * These schemas ensure data integrity when creating or updating users.
 *
 * @requirements 2.2
 */

import { z } from "zod";
import { UUIDSchema, ISODateTimeSchema } from "../shared";

/**
 * User plan schema
 */
export const UserPlanSchema = z.enum(["free", "premium"]);

/**
 * Token status schema
 */
export const TokenStatusSchema = z.enum(["valid", "invalid", "unchecked"]);

/**
 * User features schema
 */
export const UserFeaturesSchema = z.object({
  canUseAllScenes: z.boolean().optional(),
  canExportPDF: z.boolean().optional(),
  canUseCloudSync: z.boolean().optional(),
  showAds: z.boolean().optional(),
  reminderInterval: z.number().int().min(0).optional(),
  featureFlags: z.record(z.string(), z.boolean()).optional(),
});

/**
 * User state schema
 */
export const UserStateSchema = z.object({
  lastLocation: z.string(),
  currentProject: z.string(),
  currentChapter: z.string(),
  currentScene: z.string(),
  currentTitle: z.string(),
  currentTyping: z.string(),
  lastCloudSave: z.string(),
  lastLocalSave: z.string(),
  isUserLoggedIn: z.boolean(),
});

/**
 * User settings schema
 */
export const UserSettingsSchema = z.object({
  theme: z.string(),
  language: z.string(),
  autosave: z.boolean().optional(),
  spellCheck: z.boolean().optional(),
  lastLocation: z.boolean().optional(),
  fontSize: z.string(),
});

/**
 * User DB version schema
 */
export const UserDBVersionSchema = z.object({
  id: z.string(),
  version: z.string(),
  updatedAt: z.string(),
  migrationNotes: z.string().optional(),
});

/**
 * Full User schema
 * Validates complete user records from the database
 */
export const UserSchema = z.object({
  /** Unique user identifier */
  id: UUIDSchema,

  /** Login username */
  username: z.string().min(1).max(100),

  /** Display name */
  displayName: z.string().max(200).optional(),

  /** Avatar URL */
  avatar: z.string().url().optional().or(z.literal("")),

  /** User email */
  email: z.string().email().optional().or(z.literal("")),

  /** Last login timestamp */
  lastLogin: ISODateTimeSchema,

  /** Account creation timestamp */
  createDate: ISODateTimeSchema,

  // Subscription information
  /** User subscription plan */
  plan: UserPlanSchema,

  /** Subscription start date */
  planStartDate: ISODateTimeSchema.optional(),

  /** Subscription expiration date */
  planExpiresAt: ISODateTimeSchema.optional(),

  /** Trial expiration date */
  trialExpiresAt: ISODateTimeSchema.optional(),

  // Token and authentication
  /** Authentication token */
  token: z.string().optional(),

  /** Token validation status */
  tokenStatus: TokenStatusSchema.optional(),

  /** Last token validation timestamp */
  lastTokenCheck: ISODateTimeSchema.optional(),

  /** Server message */
  serverMessage: z.string().optional(),

  // Nested objects
  /** Feature permissions */
  features: UserFeaturesSchema.optional(),

  /** Application state */
  state: UserStateSchema.optional(),

  /** User settings */
  settings: UserSettingsSchema.optional(),

  /** Database version info */
  dbVersion: UserDBVersionSchema.optional(),
});

/**
 * User creation schema
 * Used when creating new users
 * id, createDate, and lastLogin are auto-generated
 */
export const UserCreateSchema = z.object({
  /** Optional id - will be auto-generated if not provided */
  id: UUIDSchema.optional(),

  /** Required username */
  username: z.string().min(1).max(100),

  /** Optional display name */
  displayName: z.string().max(200).optional(),

  /** Optional avatar URL */
  avatar: z.string().url().optional().or(z.literal("")),

  /** Optional email */
  email: z.string().email().optional().or(z.literal("")),

  /** Optional lastLogin - will be auto-generated if not provided */
  lastLogin: ISODateTimeSchema.optional(),

  /** Optional createDate - will be auto-generated if not provided */
  createDate: ISODateTimeSchema.optional(),

  /** Optional plan - defaults to "free" */
  plan: UserPlanSchema.optional().default("free"),

  /** Optional features */
  features: UserFeaturesSchema.optional(),

  /** Optional settings */
  settings: UserSettingsSchema.optional(),
});

/**
 * User update schema
 * Used when updating existing users
 * All fields are optional except the implicit id used for lookup
 */
export const UserUpdateSchema = z.object({
  /** Updated username */
  username: z.string().min(1).max(100).optional(),

  /** Updated display name */
  displayName: z.string().max(200).optional(),

  /** Updated avatar URL */
  avatar: z.string().url().optional().or(z.literal("")),

  /** Updated email */
  email: z.string().email().optional().or(z.literal("")),

  /** Updated lastLogin timestamp */
  lastLogin: ISODateTimeSchema.optional(),

  /** Updated plan */
  plan: UserPlanSchema.optional(),

  /** Updated plan start date */
  planStartDate: ISODateTimeSchema.optional(),

  /** Updated plan expiration date */
  planExpiresAt: ISODateTimeSchema.optional(),

  /** Updated trial expiration date */
  trialExpiresAt: ISODateTimeSchema.optional(),

  /** Updated token */
  token: z.string().optional(),

  /** Updated token status */
  tokenStatus: TokenStatusSchema.optional(),

  /** Updated last token check timestamp */
  lastTokenCheck: ISODateTimeSchema.optional(),

  /** Updated server message */
  serverMessage: z.string().optional(),

  /** Updated features */
  features: UserFeaturesSchema.optional(),

  /** Updated state */
  state: UserStateSchema.optional(),

  /** Updated settings */
  settings: UserSettingsSchema.optional(),

  /** Updated DB version */
  dbVersion: UserDBVersionSchema.optional(),
});

/**
 * Type inference helpers
 * Use these to derive TypeScript types from Zod schemas
 */
export type UserSchemaType = z.infer<typeof UserSchema>;
export type UserCreateSchemaType = z.infer<typeof UserCreateSchema>;
export type UserUpdateSchemaType = z.infer<typeof UserUpdateSchema>;
export type UserFeaturesSchemaType = z.infer<typeof UserFeaturesSchema>;
export type UserStateSchemaType = z.infer<typeof UserStateSchema>;
export type UserSettingsSchemaType = z.infer<typeof UserSettingsSchema>;
