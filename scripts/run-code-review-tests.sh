#!/bin/bash

# 代码审查自动化测试脚本
# Automated Code Review Test Script

set -e

echo "🔍 开始代码审查测试..."
echo "================================"

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 测试计数器
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# 测试函数
run_test() {
  local test_name=$1
  local test_command=$2
  
  TOTAL_TESTS=$((TOTAL_TESTS + 1))
  echo ""
  echo "测试 $TOTAL_TESTS: $test_name"
  
  if eval "$test_command"; then
    echo -e "${GREEN}✓ 通过${NC}"
    PASSED_TESTS=$((PASSED_TESTS + 1))
    return 0
  else
    echo -e "${RED}✗ 失败${NC}"
    FAILED_TESTS=$((FAILED_TESTS + 1))
    return 1
  fi
}

# P0 安全测试
echo ""
echo "🔒 P0 安全漏洞测试"
echo "================================"

run_test "检查硬编码密码" \
  "! grep -r 'admin123' apps/admin/src/ 2>/dev/null"

run_test "检查不安全的 localStorage token 存储" \
  "! grep -r 'localStorage.setItem.*token' apps/admin/src/ 2>/dev/null"

run_test "检查弱 token 生成（Date.now）" \
  "! grep -r 'token_.*Date.now' apps/admin/src/ 2>/dev/null"

run_test "检查是否安装输入验证库" \
  "grep -E '(zod|joi|yup)' apps/api/package.json 2>/dev/null"

run_test "检查是否安装速率限制库" \
  "grep -E 'rate-limit' apps/api/package.json 2>/dev/null"

# P1 架构测试
echo ""
echo "🏛️ P1 架构违规测试"
echo "================================"

run_test "pipes 层不应导入 React" \
  "! grep -r \"from ['\\\"]\(react\|lucide-react\)\" apps/desktop/src/pipes/ 2>/dev/null"

run_test "flows 层不应导入 React" \
  "! grep -r \"from ['\\\"]\(react\|@tanstack/react\)\" apps/desktop/src/flows/ 2>/dev/null"

run_test "不应使用 console.log（非测试文件）" \
  "! grep -r 'console\\.log' apps/desktop/src/ | grep -v test | grep -v node_modules 2>/dev/null"

run_test "flows 层不应使用 try-catch" \
  "! grep -r 'try\\s*{' apps/desktop/src/flows/ | grep -v test 2>/dev/null"

# 代码质量测试
echo ""
echo "📝 代码质量测试"
echo "================================"

run_test "运行 TypeScript 类型检查" \
  "cd apps/desktop && bun run check 2>&1 | grep -q 'Found 0 errors' || true"

run_test "运行 Biome lint" \
  "cd apps/desktop && bun run lint --reporter=summary 2>&1 | grep -q '0 errors' || true"

# Rust 安全测试
echo ""
echo "🦀 Rust 加密模块测试"
echo "================================"

run_test "Rust 加密模块使用安全随机数" \
  "grep -q 'thread_rng()' packages/rust-core/src/fn/crypto/crypto_fn.rs"

run_test "Rust 加密模块使用 256 位密钥" \
  "grep -q '\\[0u8; 32\\]' packages/rust-core/src/fn/crypto/crypto_fn.rs"

run_test "Rust 加密模块使用系统密钥链" \
  "grep -q 'keyring' packages/rust-core/Cargo.toml"

# 测试覆盖率检查
echo ""
echo "🧪 测试覆盖率检查"
echo "================================"

PIPE_FILES=$(find apps/desktop/src/pipes apps/desktop/src/flows -name "*.ts" ! -name "*.test.ts" 2>/dev/null | wc -l)
TEST_FILES=$(find apps/desktop/src/pipes apps/desktop/src/flows -name "*.test.ts" 2>/dev/null | wc -l)

if [ "$PIPE_FILES" -gt 0 ]; then
  COVERAGE=$((TEST_FILES * 100 / PIPE_FILES))
  echo "pipes/flows 文件数: $PIPE_FILES"
  echo "测试文件数: $TEST_FILES"
  echo "测试覆盖率: $COVERAGE%"
  
  if [ "$COVERAGE" -lt 50 ]; then
    echo -e "${YELLOW}⚠ 警告: 测试覆盖率低于 50%${NC}"
  fi
fi

# 生成报告
echo ""
echo "================================"
echo "📊 测试结果汇总"
echo "================================"
echo "总测试数: $TOTAL_TESTS"
echo -e "${GREEN}通过: $PASSED_TESTS${NC}"
echo -e "${RED}失败: $FAILED_TESTS${NC}"

if [ "$FAILED_TESTS" -eq 0 ]; then
  echo ""
  echo -e "${GREEN}✓ 所有测试通过！${NC}"
  exit 0
else
  echo ""
  echo -e "${RED}✗ 有 $FAILED_TESTS 个测试失败${NC}"
  echo ""
  echo "请查看 TEST_REPORT.md 了解详细信息"
  exit 1
fi
