# Design Document: Theme and Statistics Improvements

## Overview

This design document outlines the implementation of four key improvements to the Novel Editor desktop application:

1. **Light Theme Expansion**: Add 3+ new light themes to provide users with more visual customization options
2. **Theme Selector Scroll Fix**: Enable scrolling in the theme selector popover to access all themes
3. **English String Conversion**: Convert Chinese magic strings to English for consistency
4. **Statistics Page Redesign**: Modernize the statistics page with improved visual design
5. **Selection Background Colors**: Add visible text selection colors to all themes

## Architecture

The implementation follows the existing architecture patterns:

```
apps/desktop/src/
├── lib/
│   └── themes.ts              # Theme definitions (add new light themes + selection colors)
├── components/
│   └── blocks/
│       └── theme-selector.tsx # Theme selector UI (add scroll support)
├── routes/
│   └── statistics.tsx         # Statistics page (redesign)
└── styles.css                 # Global styles (selection CSS variables)
```

## Components and Interfaces

### 1. Theme System Enhancement

#### Updated ThemeColors Interface

```typescript
export interface ThemeColors {
  // ... existing colors ...
  
  // Editor selection color (required for all themes)
  editorSelection: string;  // Background color for selected text
}
```

#### New Light Themes

Add the following light themes to `themes.ts`:

1. **Paper Light** - Warm paper-like background for comfortable reading
2. **Sepia** - Classic sepia tone for reduced eye strain
3. **Nord Light** - Cool Nordic-inspired light theme
4. **Material Light** - Google Material Design light theme
5. **One Light** - Atom One Light inspired theme

### 2. Theme Selector Component

Update `theme-selector.tsx` to add scrollable container:

```typescript
// Add max-height and overflow-y-auto to theme sections
<div className="max-h-[400px] overflow-y-auto space-y-4">
  {/* Light themes section */}
  {/* Dark themes section */}
</div>
```

### 3. Statistics Page Redesign

The statistics page will be redesigned with:

- Modern card designs with gradient backgrounds
- Animated progress bars with color gradients
- Improved typography and spacing
- Smooth entrance animations
- Better visual hierarchy

### 4. Selection Color Implementation

Add CSS variable for selection background:

```css
::selection {
  background-color: var(--editor-selection);
}
```

## Data Models

### Theme Definition Structure

```typescript
interface Theme {
  key: string;
  name: string;
  description: string;
  type: "light" | "dark";
  colors: ThemeColors;
}
```

### New Light Theme Examples

```typescript
{
  key: "paper-light",
  name: "Paper",
  description: "Warm paper-like theme",
  type: "light",
  colors: {
    background: "#f8f5f0",
    foreground: "#2c2c2c",
    // ... other colors
    editorSelection: "#d4c4a8",  // Warm selection color
  }
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property Reflection

After analyzing the acceptance criteria, the following properties were identified as testable:

- Properties 1.1 and 1.2 can be combined into a single theme count and application property
- Properties 5.2 and 5.3 can be combined into a single selection contrast property
- Properties 3.1 and 3.2 are related but test different aspects (runtime vs static analysis)

### Correctness Properties

**Property 1: Light theme count minimum**
*For any* call to getLightThemes(), the returned array SHALL contain at least 12 theme objects
**Validates: Requirements 1.1**

**Property 2: Theme application sets CSS variables**
*For any* valid theme object, when applyTheme() is called, all color properties SHALL be set as CSS custom properties on the document root
**Validates: Requirements 1.2**

**Property 3: All themes have selection color**
*For any* theme in the themes array, the theme.colors object SHALL include a non-empty editorSelection property
**Validates: Requirements 5.4**

**Property 4: Selection color contrasts with background**
*For any* theme, the editorSelection color SHALL have a different hex value than the background color
**Validates: Requirements 5.2, 5.3**

**Property 5: UI text is English**
*For any* rendered UI component in the specified files, the text content SHALL not contain Chinese characters (Unicode range \u4e00-\u9fa5)
**Validates: Requirements 3.1**

## Error Handling

### Theme Loading Errors

- If a theme key is not found, fall back to default-light or default-dark
- If CSS variable application fails, log error and continue with partial theme

### Statistics Page Errors

- Display empty state message if no projects exist
- Handle missing chapter/scene data gracefully
- Show loading state during data fetch

## Testing Strategy

### Dual Testing Approach

Both unit tests and property-based tests will be implemented:

#### Unit Tests

1. **Theme selector scroll behavior** - Verify scroll container has correct CSS classes
2. **Statistics page rendering** - Verify cards and progress bars render correctly
3. **String conversion verification** - Spot check specific components for English text

#### Property-Based Tests

Using **fast-check** library for property-based testing:

1. **Theme count property** - Generate random theme queries, verify minimum count
2. **Theme application property** - Generate random themes, verify CSS variable application
3. **Selection color property** - For all themes, verify editorSelection exists and differs from background
4. **English text property** - For rendered components, verify no Chinese characters

### Test Configuration

- Property tests will run minimum 100 iterations
- Tests will be tagged with correctness property references
- Format: `**Feature: theme-statistics-improvements, Property {number}: {property_text}**`
