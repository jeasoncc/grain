# Requirements Document

## Introduction

This feature refactors the wiki system from a separate module with dedicated UI components into a simpler tag-based file system. Wiki entries will become regular files stored in a `wiki/` folder with a "wiki" tag, integrated into the existing file tree structure. This simplifies the architecture by removing duplicate UI components while maintaining wiki functionality through the existing file and tag systems.

## Glossary

- **Wiki Entry**: A knowledge base document that was previously stored in a separate `wikiEntries` table, now will be a regular file with a "wiki" tag
- **File Tree**: The hierarchical file/folder structure displayed in the Files panel
- **Node**: A file or folder in the workspace, stored in the `nodes` table
- **Tag**: A label that can be attached to files for categorization and filtering
- **Activity Bar**: The left-side vertical navigation bar with icon buttons
- **@ Operator**: The autocomplete trigger for mentioning/linking to other files (previously wiki entries)
- **Unified Sidebar**: The collapsible sidebar that contains various panels (Files, Search, etc.)

## Requirements

### Requirement 1

**User Story:** As a user, I want wiki entries to be regular files in a wiki folder, so that I can manage them using the same file operations as other documents.

#### Acceptance Criteria

1. WHEN the system initializes a workspace THEN the system SHALL create a `wiki/` folder at the root level if it does not exist
2. WHEN a user creates a new wiki entry THEN the system SHALL create a file node in the `wiki/` folder with type "file" and automatically apply a "wiki" tag
3. WHEN a user views the file tree THEN the system SHALL display the `wiki/` folder below the `diary/` folder at the root level
4. WHEN a user opens a file with a "wiki" tag THEN the system SHALL open it in the standard editor like any other file
5. WHEN a user deletes a wiki file THEN the system SHALL remove it using the standard node deletion process

### Requirement 2

**User Story:** As a user, I want the @ operator to autocomplete files tagged as "wiki", so that I can link to wiki entries from any document.

#### Acceptance Criteria

1. WHEN a user types "@" in the editor THEN the system SHALL display an autocomplete menu showing all files with the "wiki" tag
2. WHEN the autocomplete menu displays wiki files THEN the system SHALL show the file title and path
3. WHEN a user selects a wiki file from the autocomplete THEN the system SHALL insert a mention/link to that file
4. WHEN a user hovers over a wiki mention THEN the system SHALL display a preview tooltip with the file content
5. WHEN no files have the "wiki" tag THEN the system SHALL display an empty state in the autocomplete menu

### Requirement 3

**User Story:** As a user, I want the wiki activity bar icon and sidebar panel removed, so that the interface is simplified and wiki files are accessed through the file tree.

#### Acceptance Criteria

1. WHEN the application loads THEN the system SHALL NOT display a wiki icon in the activity bar
2. WHEN the unified sidebar opens THEN the system SHALL NOT include a wiki panel option
3. WHEN a user navigates the interface THEN the system SHALL NOT show any wiki-specific UI components separate from the file tree
4. WHEN a user wants to access wiki files THEN the system SHALL allow access through the Files panel in the file tree

### Requirement 4

**User Story:** As a developer, I want to migrate existing wiki entries to the new file-based system, so that users don't lose their existing wiki data.

#### Acceptance Criteria

1. WHEN the application detects existing wiki entries in the `wikiEntries` table THEN the system SHALL migrate them to file nodes in the `wiki/` folder
2. WHEN migrating a wiki entry THEN the system SHALL preserve the entry's title, content, and project association
3. WHEN migrating a wiki entry THEN the system SHALL apply the "wiki" tag to the created file node
4. WHEN migration completes THEN the system SHALL remove the migrated entries from the `wikiEntries` table
5. WHEN migration encounters an error THEN the system SHALL log the error and continue with remaining entries

### Requirement 5

**User Story:** As a developer, I want to remove the wikiEntries database table and related code, so that the codebase is simplified and maintains a single source of truth for file storage.

#### Acceptance Criteria

1. WHEN the database schema is updated THEN the system SHALL remove the `wikiEntries` table definition
2. WHEN the codebase is refactored THEN the system SHALL remove all services, hooks, and utilities related to `wikiEntries`
3. WHEN the editor plugins are updated THEN the system SHALL replace `WikiEntryInterface` with file-based interfaces
4. WHEN the mentions plugin is updated THEN the system SHALL query files with "wiki" tags instead of wiki entries
5. WHEN the refactor is complete THEN the system SHALL have no references to `wikiEntries` except in migration code

### Requirement 6

**User Story:** As a user, I want to manually tag any file as "wiki", so that I can organize my knowledge base flexibly without being restricted to the wiki folder.

#### Acceptance Criteria

1. WHEN a user adds a "wiki" tag to any file THEN the system SHALL include that file in @ operator autocomplete
2. WHEN a file has the "wiki" tag THEN the system SHALL treat it as a wiki entry regardless of its location
3. WHEN a user removes the "wiki" tag from a file THEN the system SHALL exclude it from wiki-related features
4. WHEN displaying wiki files in autocomplete THEN the system SHALL show files from any location that have the "wiki" tag
