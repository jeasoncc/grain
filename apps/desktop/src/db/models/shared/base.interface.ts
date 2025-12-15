/**
 * Base Interface Definitions
 *
 * Defines common types and base entity interface shared across all data models.
 * These types ensure consistency in how entities are identified and timestamped.
 *
 * @requirements 2.1 - Centralized TypeScript interfaces for all data entities
 */

/**
 * UUID type alias for string identifiers
 * All entity IDs should use UUID v4 format
 */
export type UUID = string;

/**
 * ISO 8601 date string type alias
 * All timestamps should be stored in ISO format for consistency
 * Example: "2024-01-15T10:30:00.000Z"
 */
export type ISODateString = string;

/**
 * Base entity interface that all persistent entities should extend
 * Provides common fields for identification and auditing
 */
export interface BaseEntity {
  /** Unique identifier using UUID v4 format */
  id: UUID;

  /** Creation timestamp in ISO 8601 format */
  createDate: ISODateString;

  /** Last modification timestamp in ISO 8601 format */
  lastEdit: ISODateString;
}

/**
 * Optional base entity fields for create operations
 * When creating entities, id and timestamps are typically auto-generated
 */
export type BaseEntityCreate = Partial<BaseEntity>;

/**
 * Optional base entity fields for update operations
 * When updating, only lastEdit is typically modified automatically
 */
export type BaseEntityUpdate = Partial<Omit<BaseEntity, "id" | "createDate">>;
