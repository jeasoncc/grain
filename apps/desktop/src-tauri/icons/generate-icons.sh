#!/bin/bash

# 生成图标脚本
# 需要安装: ImageMagick 或 inkscape

ICON_DIR="$(cd "$(dirname "$0")" && pwd)"
SVG_FILE="$ICON_DIR/icon.svg"

echo "开始生成图标文件..."

# 检查是否安装了必要的工具
if command -v convert &> /dev/null; then
    echo "使用 ImageMagick 生成图标..."
    CONVERTER="imagemagick"
elif command -v inkscape &> /dev/null; then
    echo "使用 Inkscape 生成图标..."
    CONVERTER="inkscape"
else
    echo "错误: 请先安装 ImageMagick 或 Inkscape"
    echo "  Ubuntu/Debian: sudo apt-get install imagemagick"
    echo "  或: sudo apt-get install inkscape"
    echo ""
    echo "  macOS: brew install imagemagick"
    echo "  或: brew install --cask inkscape"
    exit 1
fi

# 生成 PNG 图标
generate_png() {
    local size=$1
    local output=$2
    
    if [ "$CONVERTER" = "imagemagick" ]; then
        convert -background none -density 300 "$SVG_FILE" -resize "${size}x${size}" "$output"
    elif [ "$CONVERTER" = "inkscape" ]; then
        inkscape --export-type=png --export-filename="$output" -w "$size" -h "$size" "$SVG_FILE" 2>/dev/null || \
        inkscape "$SVG_FILE" --export-png="$output" -w "$size" -h "$size" 2>/dev/null
    fi
    
    if [ -f "$output" ]; then
        echo "✓ 生成 $output (${size}x${size})"
    else
        echo "✗ 失败: $output"
    fi
}

# 生成各种尺寸的 PNG
generate_png 32 "$ICON_DIR/32x32.png"
generate_png 128 "$ICON_DIR/128x128.png"
generate_png 256 "$ICON_DIR/128x128@2x.png"
generate_png 512 "$ICON_DIR/icon.png"

# 生成 ICO (Windows)
if command -v convert &> /dev/null; then
    convert "$ICON_DIR/icon.png" -define icon:auto-resize=256,128,64,48,32,16 "$ICON_DIR/icon.ico"
    if [ -f "$ICON_DIR/icon.ico" ]; then
        echo "✓ 生成 icon.ico"
    fi
fi

# 生成 ICNS (macOS) - 需要 iconutil 或使用在线工具
if command -v iconutil &> /dev/null; then
    echo "提示: macOS 图标可以使用以下命令生成:"
    echo "  mkdir icon.iconset"
    echo "  cp 32x32.png icon.iconset/icon_16x16.png"
    echo "  cp 128x128.png icon.iconset/icon_128x128.png"
    echo "  cp icon.png icon.iconset/icon_512x512.png"
    echo "  iconutil -c icns icon.iconset"
    echo "  rm -rf icon.iconset"
fi

echo ""
echo "图标生成完成！"
echo ""
echo "注意:"
echo "  - ICO 文件已生成（如果 ImageMagick 可用）"
echo "  - ICNS 文件需要在 macOS 上使用 iconutil 生成"
echo "  - 或者可以使用在线工具: https://convertio.co/png-ico/ 或 https://convertio.co/png-icns/"




