/**
 * Editor Themes
 *
 * Re-exports all theme-related modules for the editor package.
 *
 * @see Requirements 2.2
 */

// Import CSS for side effects (styles will be bundled)
import './PlaygroundEditorTheme.css';

// Export the theme configuration
export { default as PlaygroundEditorTheme } from './PlaygroundEditorTheme';

// Re-export the type for consumers who need it
export type { EditorThemeClasses } from 'lexical';
