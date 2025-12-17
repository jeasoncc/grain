# MCP Testing Checklist for Editor UX Enhancements

## Prerequisites
✓ Desktop app is running on http://localhost:1420
✓ Playwright MCP is configured in `.kiro/settings/mcp.json`
✓ Use Kiro's MCP integration to execute these tests

## How to Use This Checklist

Use Kiro's chat interface to interact with the Playwright MCP server. You can ask Kiro to:
- Navigate to pages
- Click elements
- Type text
- Take screenshots
- Evaluate JavaScript

## Test Checklist

### ✓ Test 1: App Loads (Baseline)
**Requirements**: Basic functionality

**MCP Commands**:
```
Navigate to http://localhost:1420
Take a screenshot
```

**Expected**: App loads successfully

---

### ✓ Test 2: English UI Text (Req 7.1, 7.2, 7.4)
**Requirements**: 7.1, 7.2, 7.4

**MCP Commands**:
```
Navigate to http://localhost:1420
Evaluate: document.body.innerText
Check for English labels: "Explorer", "Create new folder", "Create new file"
```

**Expected**: 
- All UI elements display English text
- No Chinese characters in UI elements (content is OK)

---

### ✓ Test 3: Editor Text Input (Req 6.4)
**Requirements**: 6.4

**MCP Commands**:
```
Navigate to http://localhost:1420
Click on [contenteditable="true"]
Type: "This is a test of the editor functionality"
Take a screenshot
```

**Expected**: Text appears correctly in editor

---

### ✓ Test 4: Mention Menu Trigger (Req 6.5, 7.2)
**Requirements**: 6.5, 7.2

**MCP Commands**:
```
Click on editor
Clear editor (Ctrl+A, Backspace)
Type: "@"
Wait 1 second
Take a screenshot
```

**Expected**: 
- Mention menu appears
- Helper text is in English: "↑↓ Select · ↵ Confirm · Esc Cancel"

---

### ✓ Test 5: Mention Menu Z-Index (Req 2.1, 2.2)
**Requirements**: 2.1, 2.2

**MCP Commands**:
```
Trigger mention menu (type "@")
Evaluate: window.getComputedStyle(document.querySelector('[role="listbox"]')).zIndex
```

**Expected**: z-index >= 99999

---

### ✓ Test 6: No Animation Classes (Req 3.1, 3.2, 3.3)
**Requirements**: 3.1, 3.2, 3.3

**MCP Commands**:
```
Trigger mention menu (type "@")
Evaluate: document.querySelector('[role="listbox"]').className
```

**Expected**: No classes like "animate-in", "fade-in", "zoom-in", "duration-"

---

### ✓ Test 7: Mention Menu Mouse Click (Req 1.1, 1.2)
**Requirements**: 1.1, 1.2

**MCP Commands**:
```
Trigger mention menu (type "@")
Click on first [role="option"]
Wait 500ms
Check if menu is closed
```

**Expected**: 
- Click inserts mention
- Menu closes after selection

---

### ✓ Test 8: Mention Menu Hover (Req 1.3)
**Requirements**: 1.3

**MCP Commands**:
```
Trigger mention menu (type "@")
Hover over first [role="option"]
Take a screenshot
Evaluate: window.getComputedStyle(document.querySelector('[role="option"]')).backgroundColor
```

**Expected**: Item highlights on hover

---

### ✓ Test 9: Sidebar Hover Effects (Req 5.1, 5.2, 5.3)
**Requirements**: 5.1, 5.2, 5.3

**MCP Commands**:
```
Navigate to http://localhost:1420
Hover over sidebar
Evaluate opacity of file tree items
Hover over specific item
Check for breathing animation
Take a screenshot
```

**Expected**: 
- Items increase to full opacity on sidebar hover
- Hovered item shows breathing animation
- Non-selected items have reduced opacity when not hovering

---

### ✓ Test 10: Create Diary Entry (Req 6.2)
**Requirements**: 6.2

**MCP Commands**:
```
Navigate to http://localhost:1420
Click on diary icon in activity bar
Click on "new entry" button
Verify entry is created
```

**Expected**: Diary entry is successfully created

---

### ✓ Test 11: Create Wiki Entry (Req 6.3)
**Requirements**: 6.3

**MCP Commands**:
```
Navigate to http://localhost:1420
Click on wiki icon in activity bar
Click on "new entry" button
Verify entry is created
```

**Expected**: Wiki entry is successfully created

---

## Summary

All tests should be executed using Kiro's MCP integration with the Playwright server that's already configured. No additional installation is needed.

## Notes

- The desktop app must be running on port 1420 before testing
- Use Kiro's chat to send MCP commands
- Take screenshots to document results
- If any test fails, note the specific requirement and investigate

## Completion Criteria

- [ ] All 11 tests executed
- [ ] Screenshots captured for key tests
- [ ] All requirements verified (1.1, 1.2, 1.3, 2.1, 2.2, 3.1, 3.2, 3.3, 5.1, 5.2, 5.3, 5.4, 6.2, 6.3, 6.4, 6.5, 7.1, 7.2, 7.4)
- [ ] Any issues documented
