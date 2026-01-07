# E2E 测试报告

**生成时间**: 2026-01-07T11:03:23.530Z
**总耗时**: 218.58s

## 测试概览

| 指标 | 数量 |
|------|------|
| 总测试数 | 13 |
| ✅ 通过 | 7 |
| ❌ 失败 | 1 |
| ⏭️ 跳过 | 5 |

**通过率**: 53.8%

## 测试套件详情

### Workspace

**耗时**: 33.61s | ✅ 0 | ❌ 0 | ⏭️ 0

| 测试用例 | 状态 | 耗时 | 备注 |
|----------|------|------|------|

### Diary

**耗时**: 33.77s | ✅ 0 | ❌ 0 | ⏭️ 0

| 测试用例 | 状态 | 耗时 | 备注 |
|----------|------|------|------|

### Wiki

**耗时**: 67.28s | ✅ 0 | ❌ 0 | ⏭️ 0

| 测试用例 | 状态 | 耗时 | 备注 |
|----------|------|------|------|

### Ledger

**耗时**: 47.16s | ✅ 4 | ❌ 0 | ⏭️ 3

| 测试用例 | 状态 | 耗时 | 备注 |
|----------|------|------|------|
| New Ledger Button Exists | ✅ passed | 448ms | - |
| Click New Ledger Button | ✅ passed | 3121ms | - |
| Success Toast Displayed | ✅ passed | 7005ms | - |
| Ledger Folder Structure Created | ✅ passed | 1583ms | - |
| Ledger File Appears in File Tree | ⏭️ skipped | 6007ms | Ledger file not found in File Tree - feature may n... |
| Ledger File Auto Opened | ⏭️ skipped | 5005ms | Editor tabs container not found |
| No Workspace Error Handling | ⏭️ skipped | 0ms | Test requires special environment setup (no worksp... |

### Excalidraw

**耗时**: 36.75s | ✅ 3 | ❌ 1 | ⏭️ 2

| 测试用例 | 状态 | 耗时 | 备注 |
|----------|------|------|------|
| Command Palette Opens | ❌ failed | 4012ms | Command palette did not open |
| Trigger Excalidraw Creation | ⏭️ skipped | 5972ms | Could not trigger Excalidraw creation via command ... |
| Success Toast Displayed | ✅ passed | 7009ms | - |
| Excalidraw Folder Structure Created | ✅ passed | 1614ms | - |
| Excalidraw File Appears in File Tree | ✅ passed | 6448ms | - |
| Excalidraw File Auto Opened | ⏭️ skipped | 5003ms | Editor tabs container not found |

## 失败测试详情

### Excalidraw > Command Palette Opens

**错误信息**:
```
Command palette did not open
```
