/**
 * User Interface Definitions
 *
 * Defines the UserInterface for user information, subscription status,
 * feature permissions, and application state.
 *
 * @requirements 2.1
 */

import type { UUID, ISODateString } from "../shared";

/**
 * User subscription plan type
 */
export type UserPlan = "free" | "premium";

/**
 * Token validation status
 */
export type TokenStatus = "valid" | "invalid" | "unchecked";

/**
 * User feature permissions
 * Controls access to premium features based on subscription
 */
export interface UserFeatures {
  /** Whether user can use all scenes */
  canUseAllScenes?: boolean;
  /** Whether user can export to PDF */
  canExportPDF?: boolean;
  /** Whether user can use cloud sync */
  canUseCloudSync?: boolean;
  /** Whether to show ads (free tier) */
  showAds?: boolean;
  /** Reminder/ad popup interval in seconds */
  reminderInterval?: number;
  /** Flexible feature flags for future expansion */
  featureFlags?: Record<string, boolean>;
}

/**
 * User application state
 * Stores the user's current editing context for session restoration
 */
export interface UserState {
  /** Last opened location/route */
  lastLocation: string;
  /** Currently open project ID */
  currentProject: string;
  /** Currently editing chapter ID (legacy compatibility) */
  currentChapter: string;
  /** Currently editing scene ID (legacy compatibility) */
  currentScene: string;
  /** Currently editing title */
  currentTitle: string;
  /** Current typing text */
  currentTyping: string;
  /** Last cloud save timestamp */
  lastCloudSave: string;
  /** Last local save timestamp */
  lastLocalSave: string;
  /** Whether user is logged in */
  isUserLoggedIn: boolean;
}

/**
 * User settings/preferences
 */
export interface UserSettings {
  /** UI theme (light/dark) */
  theme: string;
  /** Application language (zh/en) */
  language: string;
  /** Enable autosave */
  autosave?: boolean;
  /** Enable spell check */
  spellCheck?: boolean;
  /** Remember last editing location */
  lastLocation?: boolean;
  /** Editor font size */
  fontSize: string;
}

/**
 * Database version info for user data
 */
export interface UserDBVersion {
  /** Version record ID */
  id: string;
  /** Database version string */
  version: string;
  /** Last update timestamp */
  updatedAt: string;
  /** Migration notes */
  migrationNotes?: string;
}

/**
 * Main User interface
 * Contains all user-related data including profile, subscription, and settings
 */
export interface UserInterface {
  /** Unique user identifier (UUID) */
  id: UUID;

  /** Login username */
  username: string;

  /** Display name (optional) */
  displayName?: string;

  /** Avatar URL (optional) */
  avatar?: string;

  /** User email (optional) */
  email?: string;

  /** Last login timestamp */
  lastLogin: ISODateString;

  /** Account creation timestamp */
  createDate: ISODateString;

  // Subscription information
  /** User subscription plan */
  plan: UserPlan;

  /** Subscription start date */
  planStartDate?: ISODateString;

  /** Subscription expiration date (premium) */
  planExpiresAt?: ISODateString;

  /** Trial expiration date */
  trialExpiresAt?: ISODateString;

  // Token and authentication
  /** Authentication token */
  token?: string;

  /** Token validation status */
  tokenStatus?: TokenStatus;

  /** Last token validation timestamp */
  lastTokenCheck?: ISODateString;

  /** Server message (subscription notices, etc.) */
  serverMessage?: string;

  // Nested objects
  /** Feature permissions */
  features?: UserFeatures;

  /** Application state */
  state?: UserState;

  /** User settings/preferences */
  settings?: UserSettings;

  /** Database version info */
  dbVersion?: UserDBVersion;
}

/**
 * User creation input type
 * Used when creating new users
 * id, createDate, and lastLogin are auto-generated
 */
export interface UserCreateInput {
  username: string;
  displayName?: string;
  avatar?: string;
  email?: string;
  plan?: UserPlan;
  features?: UserFeatures;
  settings?: UserSettings;
}

/**
 * User update input type
 * Used when updating existing users
 * Only mutable fields can be updated
 */
export interface UserUpdateInput {
  username?: string;
  displayName?: string;
  avatar?: string;
  email?: string;
  lastLogin?: ISODateString;
  plan?: UserPlan;
  planStartDate?: ISODateString;
  planExpiresAt?: ISODateString;
  trialExpiresAt?: ISODateString;
  token?: string;
  tokenStatus?: TokenStatus;
  lastTokenCheck?: ISODateString;
  serverMessage?: string;
  features?: UserFeatures;
  state?: UserState;
  settings?: UserSettings;
  dbVersion?: UserDBVersion;
}
