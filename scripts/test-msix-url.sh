#!/bin/bash

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  测试 GitHub Pages 文件 URL"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

BASE_URL="https://jeasoncc.github.io/novel-editor/docs"
VERSION="0.1.15"

# 测试函数
test_url() {
    local file=$1
    local url="${BASE_URL}/${file}"
    
    echo "测试: $file"
    echo "URL: $url"
    echo ""
    
    # 获取 HTTP 响应头
    response=$(curl -sI "$url")
    
    # 提取状态码
    status=$(echo "$response" | grep -i "^HTTP" | awk '{print $2}')
    
    # 提取 Content-Type
    content_type=$(echo "$response" | grep -i "^content-type:" | cut -d' ' -f2- | tr -d '\r')
    
    # 提取 Content-Length
    content_length=$(echo "$response" | grep -i "^content-length:" | awk '{print $2}' | tr -d '\r')
    
    echo "  状态码: $status"
    echo "  Content-Type: $content_type"
    echo "  Content-Length: $content_length bytes"
    
    if [ "$status" = "200" ]; then
        echo "  ✅ URL 可访问"
    else
        echo "  ❌ URL 不可访问"
    fi
    
    echo ""
    echo "完整响应头:"
    echo "$response"
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
}

# 测试三个文件
test_url "novel-editor_${VERSION}_x64_zh-CN.msi"
test_url "novel-editor_${VERSION}_x64-setup.exe"
test_url "novel-editor_${VERSION}_x64.msix"

# 测试 MSIX 文件是否真的存在
echo "验证 MSIX 文件是否存在于 gh-pages 分支..."
git checkout gh-pages 2>/dev/null
if [ -f "docs/novel-editor_${VERSION}_x64.msix" ]; then
    echo "✅ MSIX 文件存在于 gh-pages 分支"
    ls -lh "docs/novel-editor_${VERSION}_x64.msix"
else
    echo "❌ MSIX 文件不存在于 gh-pages 分支"
fi
git checkout - 2>/dev/null

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  建议"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "如果 MSIX 的 Content-Type 不正确，尝试："
echo "1. 在 gh-pages 分支添加 .nojekyll 文件"
echo "2. 等待 GitHub Pages 重新部署（约 1-2 分钟）"
echo "3. 重新测试 URL"
echo ""
echo "或者使用其他托管服务："
echo "- Azure Blob Storage"
echo "- AWS S3"
echo "- Cloudflare R2"
echo ""
