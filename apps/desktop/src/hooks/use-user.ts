/**
 * @file hooks/use-user.ts
 * @description User React Hooks
 *
 * Provides React hooks for accessing user data.
 * Uses TanStack Query for data fetching from Rust backend.
 *
 * @requirements 8.1
 */

import {
	useCurrentUserQuery,
	useUserByEmailQuery,
	useUserByUsernameQuery,
	useUserQuery,
	useUsersByPlanQuery,
	useUsersQuery,
} from '@/hooks/queries";
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
	const { data } = useUsersQuery();
	return data;
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
	const { data } = useUserQuery(userId);
	return data ?? undefined;
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
	const { data } = useUserByUsernameQuery(username);
	return data ?? undefined;
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
	const { data } = useUserByEmailQuery(email);
	return data ?? undefined;
}

/**
 * Hook to get the current/default user with live updates
 *
 * Returns the first user (most recently logged in) or undefined if no users exist.
 *
 * @returns The current user or undefined
 */
export function useCurrentUser(): UserInterface | undefined {
	const { data } = useCurrentUserQuery();
	return data ?? undefined;
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
	const { data } = useUsersByPlanQuery(plan);
	return data;
}

/**
 * Hook to count all users
 *
 * @returns The count of users or undefined while loading
 */
export function useUserCount(): number | undefined {
	const { data } = useUsersQuery();
	return data?.length;
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
	const { data, isLoading } = useUserQuery(userId);
	if (isLoading) return undefined;
	return data !== null && data !== undefined;
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
	const { data, isLoading } = useUserByUsernameQuery(username);
	if (isLoading) return undefined;
	return data !== null && data !== undefined;
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
	const { data: user } = useUserQuery(userId);
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
	const { data: user } = useUserQuery(userId);
	return user?.features;
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
	const { data: user } = useUserQuery(userId);
	return user?.settings;
}
