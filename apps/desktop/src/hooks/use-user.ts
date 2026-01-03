/**
 * @file hooks/use-user.ts
 * @description User React Hooks
 *
 * Provides React hooks for accessing user data with live updates.
 * Uses dexie-react-hooks for reactive data subscriptions.
 *
 * @requirements 3.3
 */

import { useLiveQuery } from "dexie-react-hooks";
import { legacyDatabase } from "@/db/legacy-database";
import type { UserInterface, UserPlan } from "@/types/user";

/**
 * Hook to get all users with live updates
 *
 * Returns users sorted by lastLogin (most recent first).
 *
 * @returns Array of users or undefined while loading
 *
 * @example
 * ```tsx
 * function UserList() {
 *   const users = useAllUsers();
 *
 *   if (users === undefined) {
 *     return <Loading />;
 *   }
 *
 *   return (
 *     <ul>
 *       {users.map(user => (
 *         <li key={user.id}>{user.username}</li>
 *       ))}
 *     </ul>
 *   );
 * }
 * ```
 */
export function useAllUsers(): UserInterface[] | undefined {
	return useLiveQuery(
		async () => {
			const users = await legacyDatabase.users.toArray();
			return users.sort(
				(a, b) =>
					new Date(b.lastLogin).getTime() - new Date(a.lastLogin).getTime(),
			);
		},
		[],
		undefined,
	);
}

/**
 * Hook to get a single user by ID with live updates
 *
 * @param userId - The user ID (can be null/undefined)
 * @returns The user or undefined
 *
 * @example
 * ```tsx
 * function UserProfile({ userId }: { userId: string }) {
 *   const user = useUser(userId);
 *
 *   if (!user) {
 *     return <div>Loading...</div>;
 *   }
 *
 *   return <h1>{user.displayName || user.username}</h1>;
 * }
 * ```
 */
export function useUser(
	userId: string | null | undefined,
): UserInterface | undefined {
	return useLiveQuery(
		async () => {
			if (!userId) return undefined;
			return legacyDatabase.users.get(userId);
		},
		[userId],
		undefined,
	);
}

/**
 * Hook to get a user by username with live updates
 *
 * @param username - The username (can be null/undefined)
 * @returns The user or undefined
 */
export function useUserByUsername(
	username: string | null | undefined,
): UserInterface | undefined {
	return useLiveQuery(
		async () => {
			if (!username) return undefined;
			return legacyDatabase.users.where("username").equals(username).first();
		},
		[username],
		undefined,
	);
}

/**
 * Hook to get a user by email with live updates
 *
 * @param email - The email (can be null/undefined)
 * @returns The user or undefined
 */
export function useUserByEmail(
	email: string | null | undefined,
): UserInterface | undefined {
	return useLiveQuery(
		async () => {
			if (!email) return undefined;
			return legacyDatabase.users.where("email").equals(email).first();
		},
		[email],
		undefined,
	);
}

/**
 * Hook to get the current/default user with live updates
 *
 * Returns the first user (most recently logged in) or undefined if no users exist.
 *
 * @returns The current user or undefined
 */
export function useCurrentUser(): UserInterface | undefined {
	return useLiveQuery(
		async () => {
			const users = await legacyDatabase.users.toArray();
			if (users.length === 0) return undefined;
			return users.sort(
				(a, b) =>
					new Date(b.lastLogin).getTime() - new Date(a.lastLogin).getTime(),
			)[0];
		},
		[],
		undefined,
	);
}

/**
 * Hook to get users by plan type with live updates
 *
 * @param plan - The plan type to filter by
 * @returns Array of users with the specified plan
 */
export function useUsersByPlan(
	plan: UserPlan | null | undefined,
): UserInterface[] | undefined {
	return useLiveQuery(
		async () => {
			if (!plan) return [];
			const users = await legacyDatabase.users.toArray();
			return users.filter((u) => u.plan === plan);
		},
		[plan],
		undefined,
	);
}

/**
 * Hook to count all users
 *
 * @returns The count of users or undefined while loading
 */
export function useUserCount(): number | undefined {
	return useLiveQuery(
		async () => {
			return legacyDatabase.users.count();
		},
		[],
		undefined,
	);
}

/**
 * Hook to check if a user exists
 *
 * @param userId - The user ID
 * @returns True if exists, false otherwise, undefined while loading
 */
export function useUserExists(
	userId: string | null | undefined,
): boolean | undefined {
	return useLiveQuery(
		async () => {
			if (!userId) return false;
			const count = await legacyDatabase.users.where("id").equals(userId).count();
			return count > 0;
		},
		[userId],
		undefined,
	);
}

/**
 * Hook to check if a username is taken
 *
 * @param username - The username to check
 * @returns True if taken, false otherwise, undefined while loading
 */
export function useUsernameExists(
	username: string | null | undefined,
): boolean | undefined {
	return useLiveQuery(
		async () => {
			if (!username) return false;
			const count = await legacyDatabase.users
				.where("username")
				.equals(username)
				.count();
			return count > 0;
		},
		[username],
		undefined,
	);
}

/**
 * Hook to get user's subscription status
 *
 * @param userId - The user ID
 * @returns Object with plan info or undefined while loading
 */
export function useUserSubscription(userId: string | null | undefined):
	| {
			plan: UserPlan;
			isPremium: boolean;
			isExpired: boolean;
			expiresAt?: string;
	  }
	| undefined {
	return useLiveQuery(
		async () => {
			if (!userId) return undefined;
			const user = await legacyDatabase.users.get(userId);
			if (!user) return undefined;

			const isPremium = user.plan === "premium";
			const isExpired = user.planExpiresAt
				? new Date(user.planExpiresAt) < new Date()
				: false;

			return {
				plan: user.plan,
				isPremium,
				isExpired,
				expiresAt: user.planExpiresAt,
			};
		},
		[userId],
		undefined,
	);
}

/**
 * Hook to get user's feature permissions
 *
 * @param userId - The user ID
 * @returns User features or undefined while loading
 */
export function useUserFeatures(
	userId: string | null | undefined,
): UserInterface["features"] | undefined {
	return useLiveQuery(
		async () => {
			if (!userId) return undefined;
			const user = await legacyDatabase.users.get(userId);
			return user?.features;
		},
		[userId],
		undefined,
	);
}

/**
 * Hook to get user's settings
 *
 * @param userId - The user ID
 * @returns User settings or undefined while loading
 */
export function useUserSettings(
	userId: string | null | undefined,
): UserInterface["settings"] | undefined {
	return useLiveQuery(
		async () => {
			if (!userId) return undefined;
			const user = await legacyDatabase.users.get(userId);
			return user?.settings;
		},
		[userId],
		undefined,
	);
}
