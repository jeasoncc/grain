# Requirements Document

## Introduction

This specification defines enhancements to the editor module and desktop application UI to improve user experience, interaction patterns, and internationalization. The focus is on refining the mention/tag plugins, sidebar interactions, and language settings.

## Glossary

- **Editor Module**: The `@novel-editor/editor` package containing Lexical-based rich text editing components
- **Mention Plugin**: The `@` symbol autocomplete feature for referencing wiki entries
- **Tag Plugin**: The `#[tag]` feature for inline tag insertion
- **Typeahead Menu**: The dropdown suggestion panel that appears during autocomplete
- **Sidebar**: The left navigation panel containing file tree and navigation elements
- **Activity Bar**: The leftmost vertical bar with icon buttons for different views
- **Desktop Application**: The Tauri-based desktop app in `apps/desktop`
- **MCP**: Model Context Protocol server for browser automation testing

## Requirements

### Requirement 1

**User Story:** As a user, I want to select mention suggestions with mouse clicks, so that I can choose entries without relying solely on keyboard navigation.

#### Acceptance Criteria

1. WHEN the mention typeahead menu is displayed THEN the system SHALL allow mouse click selection of any visible option
2. WHEN a user clicks on a mention option THEN the system SHALL insert the selected mention and close the menu
3. WHEN a user hovers over a mention option THEN the system SHALL highlight that option to indicate it is clickable
4. WHEN mouse and keyboard navigation are used together THEN the system SHALL maintain consistent selection state across both input methods

### Requirement 2

**User Story:** As a user, I want the mention typeahead menu to appear above editor content, so that I can see both the menu and the text I'm editing without obstruction.

#### Acceptance Criteria

1. WHEN the mention typeahead menu is displayed THEN the system SHALL render it with a z-index higher than editor content
2. WHEN editor content and the menu overlap THEN the system SHALL ensure the menu remains fully visible and interactive
3. WHEN the menu is positioned THEN the system SHALL use a z-index value of at least 99999 to prevent occlusion

### Requirement 3

**User Story:** As a user, I want the mention menu to appear instantly, so that the interface feels responsive and doesn't distract me with animations.

#### Acceptance Criteria

1. WHEN the mention typeahead menu appears THEN the system SHALL display it without fade-in, zoom, or slide animations
2. WHEN the mention typeahead menu disappears THEN the system SHALL remove it without fade-out or transition animations
3. WHEN CSS classes are applied to the menu THEN the system SHALL exclude animation-related classes such as `animate-in`, `fade-in-0`, `zoom-in-95`, or `duration-*`

### Requirement 4

**User Story:** As a user, I want a streamlined tag insertion experience, so that I can add tags without unnecessary UI complexity.

#### Acceptance Criteria

1. WHEN a user types `#[tagname]` THEN the system SHALL convert it to a tag node without displaying a typeahead menu
2. WHEN tag transformation occurs THEN the system SHALL rely solely on the TagTransformPlugin for automatic conversion
3. WHEN the TagPickerPlugin is removed THEN the system SHALL maintain all existing tag functionality through TagTransformPlugin

### Requirement 5

**User Story:** As a user, I want visual feedback when hovering over sidebar items, so that I can see the full file tree structure and understand my navigation context.

#### Acceptance Criteria

1. WHEN a user hovers over any sidebar item THEN the system SHALL apply a subtle pulsing glow effect to that item
2. WHEN a user hovers over the sidebar THEN the system SHALL increase opacity of all file tree items to full visibility
3. WHEN a user moves the mouse away from the sidebar THEN the system SHALL return non-selected items to reduced opacity
4. WHEN a file is selected THEN the system SHALL maintain its highlight regardless of hover state
5. WHEN the hover effect is applied THEN the system SHALL use CSS animations with a duration between 1-2 seconds for the breathing effect

### Requirement 6

**User Story:** As a developer, I want automated UI testing capabilities, so that I can verify internationalization changes across the application.

#### Acceptance Criteria

1. WHEN MCP server is configured for port 1420 THEN the system SHALL allow browser automation connections
2. WHEN test automation creates a diary entry THEN the system SHALL successfully save and display the entry
3. WHEN test automation creates a wiki entry THEN the system SHALL successfully save and display the entry
4. WHEN test automation inputs text in the editor THEN the system SHALL accept and render the text correctly
5. WHEN test automation triggers the mention menu THEN the system SHALL display wiki entries for selection

### Requirement 7

**User Story:** As an international user, I want the application interface in English, so that I can use the application in my preferred language.

#### Acceptance Criteria

1. WHEN the application displays UI text THEN the system SHALL use English labels, buttons, and messages
2. WHEN the mention menu displays helper text THEN the system SHALL show English instructions (e.g., "↑↓ Select · ↵ Confirm · Esc Cancel")
3. WHEN the tag menu displays helper text THEN the system SHALL show English instructions
4. WHEN error messages are displayed THEN the system SHALL present them in English

### Requirement 8

**User Story:** As a new user, I want the application to default to English, so that I can start using it immediately without changing language settings.

#### Acceptance Criteria

1. WHEN the application starts for the first time THEN the system SHALL set the default language to English
2. WHEN no language preference is stored THEN the system SHALL use English as the fallback language
3. WHEN language configuration is initialized THEN the system SHALL set `locale: "en"` or equivalent as the default value
4. WHEN the user opens language settings THEN the system SHALL show English as the currently selected language
