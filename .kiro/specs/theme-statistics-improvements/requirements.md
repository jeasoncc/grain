# Requirements Document

## Introduction

This feature specification addresses four key improvements to the Novel Editor desktop application:
1. Adding more light themes to provide users with greater visual customization options
2. Fixing the theme selector scroll issue in the editor interface where themes cannot be scrolled
3. Converting all Chinese magic strings to English for consistency and future internationalization
4. Improving the statistics page visual design for better aesthetics
5. Adding text selection background color configuration to each theme for better visibility

## Glossary

- **Theme**: A collection of color configurations that define the visual appearance of the application
- **Theme Selector**: A UI component that allows users to choose and preview different themes
- **Magic String**: Hard-coded text strings embedded directly in the source code
- **Statistics Page**: A dedicated page displaying writing statistics including word counts, chapter breakdowns, and reading time estimates
- **Selection Background**: The background color applied to text when it is selected/highlighted in the editor
- **Light Theme**: A theme with a light/white background color scheme
- **Dark Theme**: A theme with a dark/black background color scheme

## Requirements

### Requirement 1

**User Story:** As a user, I want more light theme options, so that I can choose a visual style that suits my preferences when working in bright environments.

#### Acceptance Criteria

1. WHEN a user opens the theme selector THEN the system SHALL display at least 12 light theme options
2. WHEN a user selects a new light theme THEN the system SHALL apply the theme colors consistently across all UI components
3. WHEN displaying light themes THEN the system SHALL include themes with varied color palettes (warm, cool, neutral tones)

### Requirement 2

**User Story:** As a user, I want to scroll through all available themes in the editor's theme selector, so that I can access and preview all theme options.

#### Acceptance Criteria

1. WHEN the theme selector popover contains more themes than can fit in the visible area THEN the system SHALL enable vertical scrolling
2. WHEN a user scrolls within the theme selector THEN the system SHALL display all available themes without clipping
3. WHEN the theme selector is opened THEN the system SHALL set a maximum height with overflow scroll behavior

### Requirement 3

**User Story:** As a developer, I want all UI text strings to be in English, so that the codebase is consistent and ready for future internationalization.

#### Acceptance Criteria

1. WHEN displaying UI labels, buttons, and messages THEN the system SHALL render text in English
2. WHEN a Chinese string exists in the codebase THEN the system SHALL replace it with an equivalent English string
3. WHEN converting strings THEN the system SHALL maintain the same semantic meaning and context

### Requirement 4

**User Story:** As a user, I want a visually appealing statistics page, so that I can enjoy reviewing my writing progress.

#### Acceptance Criteria

1. WHEN displaying the statistics page THEN the system SHALL use modern card designs with subtle shadows and rounded corners
2. WHEN showing chapter breakdown THEN the system SHALL display progress bars with gradient colors
3. WHEN presenting statistics THEN the system SHALL use consistent spacing, typography, and visual hierarchy
4. WHEN the statistics page loads THEN the system SHALL display smooth entrance animations

### Requirement 5

**User Story:** As a user, I want to see selected text clearly in any theme, so that I can identify what text I have highlighted regardless of the theme I'm using.

#### Acceptance Criteria

1. WHEN a user selects text in the editor THEN the system SHALL display a visible selection background color
2. WHEN using a light theme THEN the system SHALL apply a selection background color that contrasts with the light background
3. WHEN using a dark theme THEN the system SHALL apply a selection background color that contrasts with the dark background
4. WHEN defining a theme THEN the system SHALL include a dedicated editorSelection color property
5. WHEN the selection color is applied THEN the system SHALL ensure selected text remains readable
