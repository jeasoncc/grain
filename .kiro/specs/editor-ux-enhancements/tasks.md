# Implementation Plan

- [x] 1. Enhance MentionsPlugin with mouse click support and styling fixes
  - Update `MentionsTypeaheadMenuItem` component to handle click events properly
  - Remove animation CSS classes from menu container
  - Update z-index to 99999 or higher
  - Change helper text from Chinese to English
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 2.1, 2.2, 2.3, 3.1, 3.2, 3.3, 7.2_

- [ ] 1.1 Write property test for click selection
  - **Property 1: Click selection inserts mention**
  - **Validates: Requirements 1.1, 1.2**

- [ ]* 1.2 Write property test for hover state
  - **Property 2: Hover updates selection state**
  - **Validates: Requirements 1.3**

- [ ]* 1.3 Write property test for selection consistency
  - **Property 3: Selection state consistency**
  - **Validates: Requirements 1.4**

- [ ]* 1.4 Write property test for menu layering
  - **Property 4: Menu layering**
  - **Validates: Requirements 2.2**

- [ ]* 1.5 Write example tests for z-index and animations
  - **Example 1: Menu z-index value**
  - **Example 2: No animation classes**
  - **Validates: Requirements 2.1, 2.3, 3.1, 3.2, 3.3**

- [x] 2. Remove TagPickerPlugin and update editor configuration
  - Delete `packages/editor/src/plugins/tag-picker-plugin.tsx`
  - Remove TagPickerPlugin import from `packages/editor/src/plugins/index.ts`
  - Remove TagPickerPlugin from any editor configurations in desktop app
  - Verify TagTransformPlugin continues to work correctly
  - _Requirements: 4.1, 4.2, 4.3_

- [ ]* 2.1 Write property test for tag transformation
  - **Property 5: Tag transformation without menu**
  - **Validates: Requirements 4.1, 4.3**

- [ ]* 2.2 Write example test for TagPickerPlugin removal
  - **Example 3: TagPickerPlugin removed**
  - **Validates: Requirements 4.2**

- [x] 3. Add sidebar hover effects and internationalization
  - Add CSS for breathing animation effect on hover
  - Implement opacity transitions for file tree items
  - Update all Chinese text to English in FileTree component
  - Update dropdown menu items to English
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 7.1_

- [ ]* 3.1 Write property test for hover breathing effect
  - **Property 6: Hover breathing effect**
  - **Validates: Requirements 5.1**

- [ ]* 3.2 Write property test for sidebar hover opacity
  - **Property 7: Sidebar hover opacity**
  - **Validates: Requirements 5.2**

- [ ]* 3.3 Write property test for non-hover opacity
  - **Property 8: Non-hover opacity reduction**
  - **Validates: Requirements 5.3**

- [ ]* 3.4 Write property test for selected item persistence
  - **Property 9: Selected item persistence**
  - **Validates: Requirements 5.4**

- [ ]* 3.5 Write example tests for animation duration and English labels
  - **Example 4: Breathing animation duration**
  - **Example 10: English UI labels**
  - **Validates: Requirements 5.5, 7.1**

- [x] 4. Update UI store with default English locale
  - Add `locale` field to UIState interface in `apps/desktop/src/stores/ui.ts`
  - Set default value to "en"
  - Add `setLocale` action
  - Include locale in persistence configuration
  - _Requirements: 8.1, 8.2, 8.3, 8.4_

- [ ]* 4.1 Write example test for default locale
  - **Example 13: Default locale is English**
  - **Validates: Requirements 8.1, 8.2, 8.3, 8.4**

- [x] 5. Configure MCP for automated testing
  - Update `.kiro/settings/mcp.json` or `~/.kiro/settings/mcp.json` with Puppeteer configuration
  - Set browser URL to `http://localhost:1420`
  - Verify MCP server can connect
  - _Requirements: 6.1_

- [ ]* 5.1 Write example tests for MCP automation
  - **Example 5: MCP configuration**
  - **Example 6: Diary creation automation**
  - **Example 7: Wiki creation automation**
  - **Example 8: Editor text input automation**
  - **Example 9: Mention menu automation**
  - **Validates: Requirements 6.1, 6.2, 6.3, 6.4, 6.5**

- [ ] 6. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 7. Manual testing with MCP automation
  - Start desktop app on port 1420
  - Use MCP to create a diary entry via activity bar
  - Use MCP to create a wiki entry via activity bar
  - Use MCP to input text in editor
  - Use MCP to trigger @ mention menu above text
  - Verify mention menu appears above text with mouse click support
  - Verify sidebar hover effects work correctly
  - Verify all UI text is in English
  - _Requirements: 6.2, 6.3, 6.4, 6.5, 7.1, 7.2, 7.4_

- [ ]* 7.1 Write example tests for English text verification
  - **Example 11: English mention helper text**
  - **Example 12: English error messages**
  - **Validates: Requirements 7.2, 7.4**

- [ ] 8. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.
