# E2E 测试报告

**生成时间**: 2025-12-27T13:10:33.121Z
**总耗时**: 150.65s

## 测试概览

| 指标 | 数量 |
|------|------|
| 总测试数 | 31 |
| ✅ 通过 | 19 |
| ❌ 失败 | 3 |
| ⏭️ 跳过 | 9 |

**通过率**: 61.3%

## 测试套件详情

### Workspace

**耗时**: 10.25s | ✅ 4 | ❌ 0 | ⏭️ 0

| 测试用例 | 状态 | 耗时 | 备注 |
|----------|------|------|------|
| Activity Bar Visible | ✅ passed | 432ms | - |
| Create Buttons Exist | ✅ passed | 1365ms | - |
| Workspace Loaded | ✅ passed | 2533ms | - |
| File Tree Visible | ✅ passed | 459ms | - |

### Diary

**耗时**: 36.45s | ✅ 3 | ❌ 3 | ⏭️ 0

| 测试用例 | 状态 | 耗时 | 备注 |
|----------|------|------|------|
| New Diary Button Exists | ✅ passed | 447ms | - |
| Click New Diary Button | ✅ passed | 3072ms | - |
| Success Toast Displayed | ✅ passed | 6004ms | - |
| Diary Folder Structure Created | ❌ failed | 6360ms | Diary folder not found in File Tree |
| Diary File Appears in File Tree | ❌ failed | 10300ms | File not found in tree: 27 |
| Diary File Auto Opened | ❌ failed | 5150ms | Editor tabs container not found |

### Wiki

**耗时**: 48.47s | ✅ 3 | ❌ 0 | ⏭️ 5

| 测试用例 | 状态 | 耗时 | 备注 |
|----------|------|------|------|
| New Wiki Button Exists | ✅ passed | 447ms | - |
| Click New Wiki Button Opens Dialog | ✅ passed | 9070ms | - |
| Enter Wiki Title and Confirm | ⏭️ skipped | 51ms | No dialog present - Wiki creation may use differen... |
| Success Toast Displayed | ✅ passed | 7010ms | - |
| Wiki Folder Structure Created | ⏭️ skipped | 6145ms | Wiki folder not found in File Tree - feature may n... |
| Wiki File Appears in File Tree | ⏭️ skipped | 5003ms | Wiki file not found in File Tree - feature may not... |
| Wiki File Auto Opened | ⏭️ skipped | 5004ms | Editor tabs container not found |
| Cancel Wiki Creation Does Not Create File | ⏭️ skipped | 5128ms | No dialog present - Wiki creation may use differen... |

### Ledger

**耗时**: 21.70s | ✅ 4 | ❌ 0 | ⏭️ 3

| 测试用例 | 状态 | 耗时 | 备注 |
|----------|------|------|------|
| New Ledger Button Exists | ✅ passed | 441ms | - |
| Click New Ledger Button | ✅ passed | 3057ms | - |
| Success Toast Displayed | ✅ passed | 501ms | - |
| Ledger Folder Structure Created | ✅ passed | 1590ms | - |
| Ledger File Appears in File Tree | ⏭️ skipped | 6005ms | Ledger file not found in File Tree - feature may n... |
| Ledger File Auto Opened | ⏭️ skipped | 5006ms | Editor tabs container not found |
| No Workspace Error Handling | ⏭️ skipped | 0ms | Test requires special environment setup (no worksp... |

### Excalidraw

**耗时**: 33.77s | ✅ 5 | ❌ 0 | ⏭️ 1

| 测试用例 | 状态 | 耗时 | 备注 |
|----------|------|------|------|
| Command Palette Opens | ✅ passed | 1682ms | - |
| Trigger Excalidraw Creation | ✅ passed | 7236ms | - |
| Success Toast Displayed | ✅ passed | 7003ms | - |
| Excalidraw Folder Structure Created | ✅ passed | 1587ms | - |
| Excalidraw File Appears in File Tree | ✅ passed | 6446ms | - |
| Excalidraw File Auto Opened | ⏭️ skipped | 5003ms | Editor tabs container not found |

## 失败测试详情

### Diary > Diary Folder Structure Created

**错误信息**:
```
Diary folder not found in File Tree
```

### Diary > Diary File Appears in File Tree

**错误信息**:
```
File not found in tree: 27
```

### Diary > Diary File Auto Opened

**错误信息**:
```
Editor tabs container not found
```
