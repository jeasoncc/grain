/**
 * User Repository
 *
 * Provides CRUD operations for the users table.
 * All database operations go through this repository for consistency.
 *
 * @requirements 5.2
 */

import dayjs from "dayjs";
import { database } from "../../database";
import type {
  UserInterface,
  UserUpdateInput,
  UserFeatures,
  UserState,
  UserSettings,
  UserPlan,
  TokenStatus,
} from "./user.interface";
import { UserBuilder } from "./user.builder";

/**
 * User Repository
 *
 * Provides methods for:
 * - CRUD: add, update, delete, get
 * - Query: getAll, getByUsername, getByEmail
 * - State management: updateState, updateSettings, updateFeatures
 */
export const UserRepository = {
  /**
   * Add a new user
   * @param username - The username
   * @param options - Optional user properties
   * @returns The created user
   */
  async add(
    username: string,
    options: {
      displayName?: string;
      avatar?: string;
      email?: string;
      plan?: UserPlan;
      features?: UserFeatures;
      settings?: UserSettings;
    } = {}
  ): Promise<UserInterface> {
    const builder = new UserBuilder().username(username);

    if (options.displayName) {
      builder.displayName(options.displayName);
    }
    if (options.avatar) {
      builder.avatar(options.avatar);
    }
    if (options.email) {
      builder.email(options.email);
    }
    if (options.plan) {
      builder.plan(options.plan);
    }
    if (options.features) {
      builder.features(options.features);
    }
    if (options.settings) {
      builder.settings(options.settings);
    }

    const user = builder.build();
    await database.users.add(user);
    return user;
  },

  /**
   * Update an existing user
   * @param id - The user ID
   * @param updates - Partial user updates
   * @returns The number of records updated (0 or 1)
   */
  async update(id: string, updates: UserUpdateInput): Promise<number> {
    return database.users.update(id, {
      ...updates,
      lastLogin: dayjs().toISOString(),
    });
  },

  /**
   * Delete a user by ID
   * @param id - The user ID
   */
  async delete(id: string): Promise<void> {
    await database.users.delete(id);
  },

  /**
   * Get a user by ID
   * @param id - The user ID
   * @returns The user or undefined if not found
   */
  async getById(id: string): Promise<UserInterface | undefined> {
    return database.users.get(id);
  },

  /**
   * Get all users
   * @returns Array of all users sorted by lastLogin (most recent first)
   */
  async getAll(): Promise<UserInterface[]> {
    const users = await database.users.toArray();
    return users.sort(
      (a, b) =>
        new Date(b.lastLogin).getTime() - new Date(a.lastLogin).getTime()
    );
  },

  /**
   * Get a user by username
   * @param username - The username
   * @returns The user or undefined if not found
   */
  async getByUsername(username: string): Promise<UserInterface | undefined> {
    return database.users.where("username").equals(username).first();
  },

  /**
   * Get a user by email
   * @param email - The email address
   * @returns The user or undefined if not found
   */
  async getByEmail(email: string): Promise<UserInterface | undefined> {
    return database.users.where("email").equals(email).first();
  },

  /**
   * Update the lastLogin timestamp
   * @param id - The user ID
   */
  async touch(id: string): Promise<void> {
    await database.users.update(id, {
      lastLogin: dayjs().toISOString(),
    });
  },

  /**
   * Check if a user exists
   * @param id - The user ID
   * @returns True if the user exists
   */
  async exists(id: string): Promise<boolean> {
    const count = await database.users.where("id").equals(id).count();
    return count > 0;
  },

  /**
   * Check if a username is taken
   * @param username - The username to check
   * @returns True if the username is already in use
   */
  async usernameExists(username: string): Promise<boolean> {
    const count = await database.users
      .where("username")
      .equals(username)
      .count();
    return count > 0;
  },

  /**
   * Check if an email is taken
   * @param email - The email to check
   * @returns True if the email is already in use
   */
  async emailExists(email: string): Promise<boolean> {
    const count = await database.users.where("email").equals(email).count();
    return count > 0;
  },

  /**
   * Count all users
   * @returns The total number of users
   */
  async count(): Promise<number> {
    return database.users.count();
  },

  /**
   * Update user subscription plan
   * @param id - The user ID
   * @param plan - The new plan
   * @param expiresAt - Optional expiration date for premium
   */
  async updatePlan(
    id: string,
    plan: UserPlan,
    expiresAt?: string
  ): Promise<void> {
    const updates: UserUpdateInput = {
      plan,
      planStartDate: dayjs().toISOString(),
    };
    if (expiresAt) {
      updates.planExpiresAt = expiresAt;
    }
    await this.update(id, updates);
  },

  /**
   * Update user token and status
   * @param id - The user ID
   * @param token - The new token
   * @param status - The token status
   */
  async updateToken(
    id: string,
    token: string,
    status: TokenStatus = "unchecked"
  ): Promise<void> {
    await this.update(id, {
      token,
      tokenStatus: status,
      lastTokenCheck: dayjs().toISOString(),
    });
  },

  /**
   * Update user features
   * @param id - The user ID
   * @param features - The new features
   */
  async updateFeatures(id: string, features: UserFeatures): Promise<void> {
    await this.update(id, { features });
  },

  /**
   * Update user state
   * @param id - The user ID
   * @param state - The new state
   */
  async updateState(id: string, state: UserState): Promise<void> {
    await this.update(id, { state });
  },

  /**
   * Update user settings
   * @param id - The user ID
   * @param settings - The new settings
   */
  async updateSettings(id: string, settings: UserSettings): Promise<void> {
    await this.update(id, { settings });
  },

  /**
   * Get users by plan type
   * @param plan - The plan type to filter by
   * @returns Array of users with the specified plan
   */
  async getByPlan(plan: UserPlan): Promise<UserInterface[]> {
    const users = await database.users.toArray();
    return users.filter((u) => u.plan === plan);
  },

  /**
   * Get the current/default user
   * Returns the first user or undefined if no users exist
   * @returns The current user or undefined
   */
  async getCurrentUser(): Promise<UserInterface | undefined> {
    const users = await this.getAll();
    return users[0];
  },

  /**
   * Create or get the default user
   * Creates a default user if none exists
   * @returns The default user
   */
  async getOrCreateDefaultUser(): Promise<UserInterface> {
    const existing = await this.getCurrentUser();
    if (existing) {
      return existing;
    }

    return this.add("default", {
      displayName: "Default User",
      plan: "free",
      settings: {
        theme: "light",
        language: "zh",
        fontSize: "16px",
      },
    });
  },
};
