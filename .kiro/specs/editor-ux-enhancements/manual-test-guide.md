# Manual Testing Guide with MCP Automation

## Prerequisites
- Desktop app running on http://localhost:1420
- MCP Puppeteer server configured in `.kiro/settings/mcp.json`
- Puppeteer MCP tools available in Kiro

## Test Scenarios

### Test 1: Create Diary Entry via Activity Bar
**Requirement**: 6.2

**Steps**:
1. Navigate to http://localhost:1420
2. Locate the activity bar (leftmost vertical bar)
3. Click on the diary icon/button
4. Create a new diary entry
5. Verify the entry is created and displayed

**Expected Result**: Diary entry is successfully created and visible in the UI

**MCP Commands** (example):
```
Use Puppeteer to:
- puppeteer_navigate to http://localhost:1420
- puppeteer_click on diary activity bar button
- puppeteer_click on "new entry" or similar button
- puppeteer_screenshot to capture result
```

---

### Test 2: Create Wiki Entry via Activity Bar
**Requirement**: 6.3

**Steps**:
1. Navigate to http://localhost:1420
2. Locate the activity bar
3. Click on the wiki icon/button
4. Create a new wiki entry
5. Verify the entry is created and displayed

**Expected Result**: Wiki entry is successfully created and visible in the UI

**MCP Commands** (example):
```
Use Puppeteer to:
- puppeteer_navigate to http://localhost:1420
- puppeteer_click on wiki activity bar button
- puppeteer_click on "new entry" or similar button
- puppeteer_screenshot to capture result
```

---

### Test 3: Input Text in Editor
**Requirement**: 6.4

**Steps**:
1. Navigate to http://localhost:1420
2. Open or create a document
3. Click in the editor area
4. Type text: "This is a test of the editor functionality"
5. Verify text appears correctly

**Expected Result**: Text is accepted and rendered correctly in the editor

**MCP Commands** (example):
```
Use Puppeteer to:
- puppeteer_navigate to http://localhost:1420
- puppeteer_click on editor area
- puppeteer_fill with text "This is a test of the editor functionality"
- puppeteer_screenshot to capture result
```

---

### Test 4: Trigger @ Mention Menu
**Requirement**: 6.5, 7.2

**Steps**:
1. Navigate to http://localhost:1420
2. Open or create a document
3. Click in the editor area
4. Type "@" character
5. Verify mention menu appears
6. Check that menu appears above the text
7. Verify helper text is in English: "↑↓ Select · ↵ Confirm · Esc Cancel"

**Expected Result**: 
- Mention menu displays with wiki entries
- Menu appears above editor content (z-index 99999+)
- Helper text is in English

**MCP Commands** (example):
```
Use Puppeteer to:
- puppeteer_navigate to http://localhost:1420
- puppeteer_click on editor area
- puppeteer_fill with text "@"
- Wait for menu to appear
- puppeteer_screenshot to capture menu
- Verify menu element has high z-index
- Verify helper text contains English text
```

---

### Test 5: Verify Mention Menu Mouse Click Support
**Requirement**: 1.1, 1.2, 1.3

**Steps**:
1. Trigger the @ mention menu (see Test 4)
2. Hover over a mention option
3. Verify the option highlights on hover
4. Click on the mention option
5. Verify the mention is inserted and menu closes

**Expected Result**:
- Hover highlights the option
- Click inserts the mention
- Menu closes after selection

**MCP Commands** (example):
```
Use Puppeteer to:
- Trigger mention menu with "@"
- puppeteer_hover over first menu item
- Verify highlight appears
- puppeteer_click on menu item
- Verify mention node is inserted
- Verify menu is closed
```

---

### Test 6: Verify Sidebar Hover Effects
**Requirement**: 5.1, 5.2, 5.3, 5.4

**Steps**:
1. Navigate to http://localhost:1420
2. Locate the file tree sidebar
3. Move mouse away from sidebar
4. Observe non-selected items have reduced opacity
5. Hover over the sidebar
6. Verify all items increase to full opacity
7. Hover over a specific item
8. Verify breathing/pulsing animation effect
9. Select a file
10. Verify selected item maintains highlight regardless of hover

**Expected Result**:
- Non-selected items have reduced opacity when not hovering
- All items go to full opacity on sidebar hover
- Hovered items show breathing animation (1-2 second duration)
- Selected items maintain highlight

**MCP Commands** (example):
```
Use Puppeteer to:
- puppeteer_navigate to http://localhost:1420
- puppeteer_evaluate to check opacity of sidebar items
- puppeteer_hover over sidebar
- puppeteer_evaluate to verify opacity changes
- puppeteer_hover over specific item
- Verify animation is applied
- puppeteer_screenshot to capture effects
```

---

### Test 7: Verify All UI Text is in English
**Requirement**: 7.1, 7.2, 7.4

**Steps**:
1. Navigate to http://localhost:1420
2. Check FileTree component labels
3. Check mention menu helper text
4. Check error messages (if any)
5. Check all buttons and menu items

**Expected English Text**:
- FileTree: "Explorer", "Create new folder", "Create new file", "No files yet", "Create File"
- Mention menu: "↑↓ Select · ↵ Confirm · Esc Cancel"
- Error messages: All in English

**MCP Commands** (example):
```
Use Puppeteer to:
- puppeteer_navigate to http://localhost:1420
- puppeteer_evaluate to extract all text content
- Verify no Chinese characters in UI elements
- Check specific elements for English text
- puppeteer_screenshot to document UI
```

---

## Verification Checklist

- [ ] Diary entry can be created via activity bar (Req 6.2)
- [ ] Wiki entry can be created via activity bar (Req 6.3)
- [ ] Text can be input in editor (Req 6.4)
- [ ] @ mention menu can be triggered (Req 6.5)
- [ ] Mention menu appears above text with high z-index (Req 2.1, 2.2)
- [ ] Mention menu has no animation classes (Req 3.1, 3.2, 3.3)
- [ ] Mention menu supports mouse click selection (Req 1.1, 1.2)
- [ ] Mention menu highlights on hover (Req 1.3)
- [ ] Mention menu helper text is in English (Req 7.2)
- [ ] Sidebar items show breathing effect on hover (Req 5.1)
- [ ] Sidebar items increase opacity on hover (Req 5.2)
- [ ] Non-selected items have reduced opacity (Req 5.3)
- [ ] Selected items maintain highlight (Req 5.4)
- [ ] All UI text is in English (Req 7.1, 7.4)

## Notes

This guide is designed to be used with MCP Puppeteer automation. Each test can be executed using Puppeteer MCP tools available in Kiro when the desktop app is running on port 1420.

To execute these tests:
1. Ensure the desktop app is running: `cd apps/desktop && npm run dev`
2. Use Kiro's MCP integration to run Puppeteer commands
3. Follow each test scenario in order
4. Document results and take screenshots as needed
5. Mark items in the verification checklist as complete

## Troubleshooting

- If the app doesn't load, check that port 1420 is not in use
- If MCP Puppeteer can't connect, verify the configuration in `.kiro/settings/mcp.json`
- If elements can't be found, use `puppeteer_screenshot` to inspect the current page state
- If tests fail, check browser console for errors using `puppeteer_evaluate`
