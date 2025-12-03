# Novel Editor 图标文件

本目录包含 Novel Editor 桌面应用的所有图标文件。

## 📋 文件说明

### 必需图标

- `32x32.png` - 32x32 像素 PNG 图标
- `128x128.png` - 128x128 像素 PNG 图标  
- `128x128@2x.png` - 256x256 像素 PNG 图标（高 DPI）
- `icon.png` - 512x512 像素主图标
- `icon.ico` - Windows 图标文件（多尺寸）
- `icon.icns` - macOS 图标文件（需要生成）

### 源文件

- `icon.svg` - SVG 源文件（可编辑）

## 🎨 图标设计

图标采用蓝色背景，白色书本和金色笔的组合，代表小说编辑器的核心功能。

## 🔧 生成图标

### 自动生成所有图标

```bash
cd apps/desktop/src-tauri/icons
./generate-icons.sh
```

### 手动生成

#### 从 SVG 生成 PNG（使用 ImageMagick）

```bash
# 生成 32x32
magick -background none -density 300 icon.svg -resize 32x32 32x32.png

# 生成 128x128
magick -background none -density 300 icon.svg -resize 128x128 128x128.png

# 生成 256x256 (128x128@2x)
magick -background none -density 300 icon.svg -resize 256x256 128x128@2x.png

# 生成 512x512
magick -background none -density 300 icon.svg -resize 512x512 icon.png
```

#### 生成 ICO 文件（Windows）

```bash
magick icon.png -define icon:auto-resize=256,128,64,48,32,16 icon.ico
```

#### 生成 ICNS 文件（macOS）

**在 macOS 上执行：**

```bash
# 创建图标集目录
mkdir -p icon.iconset

# 复制所需尺寸
cp 32x32.png icon.iconset/icon_16x16.png
cp 32x32.png icon.iconset/icon_16x16@2x.png
cp 128x128.png icon.iconset/icon_32x32.png
cp 128x128@2x.png icon.iconset/icon_32x32@2x.png
cp 128x128.png icon.iconset/icon_128x128.png
cp 128x128@2x.png icon.iconset/icon_128x128@2x.png
cp icon.png icon.iconset/icon_256x256.png
cp icon.png icon.iconset/icon_256x256@2x.png
cp icon.png icon.iconset/icon_512x512.png
cp icon.png icon.iconset/icon_512x512@2x.png

# 转换为 ICNS
iconutil -c icns icon.iconset

# 清理临时目录
rm -rf icon.iconset
```

**或使用在线工具：**
- https://convertio.co/png-icns/
- https://cloudconvert.com/png-to-icns

### 使用 Inkscape（如果 ImageMagick 不可用）

```bash
inkscape --export-type=png --export-filename=32x32.png -w 32 -h 32 icon.svg
inkscape --export-type=png --export-filename=128x128.png -w 128 -h 128 icon.svg
# ... 以此类推
```

## ✅ 验证

确保所有文件都已生成：

```bash
ls -lh 32x32.png 128x128.png 128x128@2x.png icon.png icon.ico icon.icns
```

## 📝 更新图标

1. 编辑 `icon.svg` 文件
2. 运行 `./generate-icons.sh` 重新生成所有尺寸
3. 重新构建应用查看效果

## 🔗 相关文档

- [Tauri 图标指南](https://tauri.app/v1/guides/building/icons)
- [ImageMagick 文档](https://imagemagick.org/script/command-line-processing.php)

