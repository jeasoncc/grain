# 构建错误修复总结

## 🐛 发现的问题

### 1. lunr 类型定义缺失
**错误信息**:
```
error TS7016: Could not find a declaration file for module 'lunr'
```

**原因**: 缺少 lunr 的 TypeScript 类型定义

**修复**:
```bash
npm install --save-dev @types/lunr
```

---

### 2. lunr 回调函数中的 this 类型错误
**错误信息**:
```
error TS2683: 'this' implicitly has type 'any' because it does not have a type annotation
```

**原因**: lunr 的回调函数中 `this` 指向 `lunr.Builder`，但没有类型注解

**修复**:
```typescript
// 修复前
this.sceneIndex = lunr(function () {
  this.ref("id");
  // ...
});

// 修复后
this.sceneIndex = lunr(function (this: lunr.Builder) {
  this.ref("id");
  // ...
});
```

**应用到的位置**:
- `src/services/search.ts` 中的 3 个 lunr 索引构建函数

---

### 3. editor-history store 的 persist 配置错误
**错误信息**:
```
error TS2353: Object literal may only specify known properties, and 'serialize' does not exist in type 'PersistOptions'
error TS7006: Parameter 'state' implicitly has an 'any' type
error TS7006: Parameter 'str' implicitly has an 'any' type
```

**原因**: Zustand persist 中间件不支持自定义 `serialize` 和 `deserialize` 选项

**修复**: 使用自定义 `storage` 对象替代

```typescript
// 修复前
{
  name: "novel-editor-history",
  serialize: (state) => { /* ... */ },
  deserialize: (str) => { /* ... */ },
  partialize: (state) => ({ /* ... */ }),
}

// 修复后
{
  name: "novel-editor-history",
  partialize: (state) => ({
    undoStack: Array.from(state.undoStack.entries()),
    redoStack: Array.from(state.redoStack.entries()),
  }),
  storage: {
    getItem: (name) => {
      const str = localStorage.getItem(name);
      if (!str) return null;
      const parsed = JSON.parse(str);
      return {
        state: {
          ...parsed.state,
          undoStack: new Map(parsed.state.undoStack),
          redoStack: new Map(parsed.state.redoStack),
        },
      };
    },
    setItem: (name, value) => {
      const serialized = {
        state: {
          undoStack: Array.from((value.state as any).undoStack.entries()),
          redoStack: Array.from((value.state as any).redoStack.entries()),
        },
      };
      localStorage.setItem(name, JSON.stringify(serialized));
    },
    removeItem: (name) => localStorage.removeItem(name),
  },
}
```

---

## ✅ 修复结果

### 构建成功
```bash
npm run build
# ✓ 4151 modules transformed
# ✓ Build successful
```

### 修改的文件
1. `package.json` - 添加 @types/lunr 依赖
2. `src/services/search.ts` - 添加 lunr.Builder 类型注解
3. `src/stores/editor-history.ts` - 修复 persist 配置

---

## 📦 构建产物

构建成功后生成的文件：
- `dist/index.html` - 主 HTML 文件
- `dist/assets/*.css` - 样式文件（~108KB）
- `dist/assets/*.js` - JavaScript 模块（4151个）

总大小：约 10-15MB（未压缩）

---

## 🚀 下一步：Tauri 构建

现在可以运行 Tauri 构建：

```bash
npm run tauri build
```

这将：
1. 构建前端（已完成）
2. 编译 Rust 代码
3. 打包成桌面应用
4. 生成安装包（AppImage, DEB, RPM 等）

---

## 🔍 潜在问题

### 1. Rust 编译环境
确保已安装：
- Rust toolchain
- 系统依赖（Linux: webkit2gtk, libssl-dev 等）

### 2. 构建时间
首次构建可能需要 5-10 分钟（编译 Rust 依赖）

### 3. 内存使用
构建过程可能需要 2-4GB 内存

---

## 📝 构建命令参考

```bash
# 开发模式
npm run dev

# 前端构建
npm run build

# Tauri 开发模式
npm run tauri dev

# Tauri 生产构建
npm run tauri build

# 仅构建特定平台
npm run tauri build -- --target x86_64-unknown-linux-gnu
```

---

## 🐛 常见构建错误

### 错误 1: Rust 未安装
```
error: rustc not found
```
**解决**: 安装 Rust
```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
```

### 错误 2: 系统依赖缺失（Linux）
```
error: failed to run custom build command for `webkit2gtk-sys`
```
**解决**: 安装系统依赖
```bash
# Ubuntu/Debian
sudo apt install libwebkit2gtk-4.0-dev libssl-dev libgtk-3-dev libayatana-appindicator3-dev librsvg2-dev

# Fedora
sudo dnf install webkit2gtk4.0-devel openssl-devel gtk3-devel libappindicator-gtk3-devel librsvg2-devel

# Arch
sudo pacman -S webkit2gtk gtk3 libappindicator-gtk3 librsvg
```

### 错误 3: 内存不足
```
error: linking with `cc` failed: signal: 9, SIGKILL: kill
```
**解决**: 增加交换空间或使用更多内存

---

## ✨ 优化建议

### 1. 减小构建产物大小
```javascript
// vite.config.ts
export default {
  build: {
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
      },
    },
  },
};
```

### 2. 代码分割
```javascript
// vite.config.ts
export default {
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor': ['react', 'react-dom'],
          'editor': ['lexical', '@lexical/react'],
        },
      },
    },
  },
};
```

### 3. 启用压缩
```javascript
// vite.config.ts
import viteCompression from 'vite-plugin-compression';

export default {
  plugins: [
    viteCompression({
      algorithm: 'gzip',
      ext: '.gz',
    }),
  ],
};
```

---

**修复时间**: 2024-11-30  
**状态**: ✅ 构建成功  
**下一步**: 运行 `npm run tauri build`

