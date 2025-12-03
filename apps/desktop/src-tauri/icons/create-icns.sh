#!/bin/bash
# 创建 macOS ICNS 文件的辅助脚本
# 注意：此脚本需要在 macOS 上运行，或者使用在线工具转换

ICON_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "创建 macOS ICNS 图标文件..."
echo ""
echo "方法 1: 在 macOS 上使用 iconutil"
echo "---------------------------"
echo "mkdir -p icon.iconset"
echo "cp 32x32.png icon.iconset/icon_16x16.png"
echo "cp 128x128@2x.png icon.iconset/icon_16x16@2x.png"
echo "cp 32x32.png icon.iconset/icon_32x32.png"
echo "cp 128x128@2x.png icon.iconset/icon_32x32@2x.png"
echo "cp 128x128.png icon.iconset/icon_128x128.png"
echo "cp 128x128@2x.png icon.iconset/icon_128x128@2x.png"
echo "cp icon.png icon.iconset/icon_256x256.png"
echo "cp icon.png icon.iconset/icon_256x256@2x.png"
echo "cp icon.png icon.iconset/icon_512x512.png"
echo "cp icon.png icon.iconset/icon_512x512@2x.png"
echo "iconutil -c icns icon.iconset"
echo "rm -rf icon.iconset"
echo ""
echo "方法 2: 使用在线工具"
echo "---------------------------"
echo "访问 https://convertio.co/png-icns/ 或 https://cloudconvert.com/png-to-icns/"
echo "上传 icon.png (512x512) 转换为 icon.icns"
echo ""
echo "当前系统信息:"
uname -a
echo ""
if command -v iconutil &> /dev/null; then
    echo "✓ iconutil 可用，可以生成 ICNS"
    echo ""
    echo "是否现在生成？(y/n)"
    read -r response
    if [[ "$response" =~ ^[Yy]$ ]]; then
        mkdir -p icon.iconset
        cp 32x32.png icon.iconset/icon_16x16.png 2>/dev/null || magick icon.svg -resize 16x16 icon.iconset/icon_16x16.png
        cp 128x128@2x.png icon.iconset/icon_16x16@2x.png 2>/dev/null || magick icon.svg -resize 32x32 icon.iconset/icon_16x16@2x.png
        cp 32x32.png icon.iconset/icon_32x32.png 2>/dev/null || magick icon.svg -resize 32x32 icon.iconset/icon_32x32.png
        cp 128x128@2x.png icon.iconset/icon_32x32@2x.png 2>/dev/null || magick icon.svg -resize 64x64 icon.iconset/icon_32x32@2x.png
        cp 128x128.png icon.iconset/icon_128x128.png 2>/dev/null || magick icon.svg -resize 128x128 icon.iconset/icon_128x128.png
        cp 128x128@2x.png icon.iconset/icon_128x128@2x.png 2>/dev/null || magick icon.svg -resize 256x256 icon.iconset/icon_128x128@2x.png
        cp icon.png icon.iconset/icon_256x256.png 2>/dev/null || magick icon.svg -resize 256x256 icon.iconset/icon_256x256.png
        cp icon.png icon.iconset/icon_256x256@2x.png 2>/dev/null || magick icon.svg -resize 512x512 icon.iconset/icon_256x256@2x.png
        cp icon.png icon.iconset/icon_512x512.png 2>/dev/null || magick icon.svg -resize 512x512 icon.iconset/icon_512x512.png
        cp icon.png icon.iconset/icon_512x512@2x.png 2>/dev/null || magick icon.svg -resize 1024x1024 icon.iconset/icon_512x512@2x.png
        iconutil -c icns icon.iconset
        rm -rf icon.iconset
        echo "✓ ICNS 文件已生成"
    fi
else
    echo "✗ iconutil 不可用（这是 macOS 专用工具）"
    echo ""
    echo "建议使用在线工具转换："
    echo "  1. 访问 https://convertio.co/png-icns/"
    echo "  2. 上传 icon.png 文件"
    echo "  3. 下载转换后的 icon.icns 文件"
    echo "  4. 放到当前目录: $ICON_DIR"
fi
