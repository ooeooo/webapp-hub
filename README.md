# WebApp Hub

轻量级跨平台网页小程序容器应用。将任意网页嵌入为独立窗口运行的桌面小程序。

## 功能特性

- 🚀 **轻量级** - 基于 Tauri 2，使用系统 WebView，资源占用低
- 🌍 **跨平台** - 支持 Windows、macOS、Linux
- 🔗 **网页转小程序** - 将任意网址转换为独立桌面应用
- ⌨️ **全局快捷键** - 为每个小程序绑定快捷键，快速呼出
- 🌐 **代理支持** - 支持 HTTP/HTTPS/SOCKS5 代理
- 📊 **智能窗口管理** - LRU 策略自动管理活跃窗口数量

## 技术栈

- **后端**: Tauri 2 + Rust
- **前端**: React 18 + TypeScript + Vite
- **UI**: Tailwind CSS + Radix UI
- **状态管理**: Zustand

## 开发

### 环境要求

- Node.js >= 18
- Rust >= 1.70
- 系统依赖 (参考 [Tauri Prerequisites](https://v2.tauri.app/start/prerequisites/))

### 安装依赖

```bash
# 安装前端依赖
npm install

# Rust 依赖会在首次构建时自动安装
```

### 开发模式

```bash
npm run tauri dev
```

### 构建生产版本

```bash
npm run tauri build
```

## 项目结构

```
webapp-hub/
├── src/                      # React 前端
│   ├── components/           # UI 组件
│   ├── stores/               # Zustand 状态
│   ├── hooks/                # 自定义 Hooks
│   ├── types/                # TypeScript 类型
│   └── lib/                  # 工具函数
├── src-tauri/                # Rust 后端
│   ├── src/
│   │   ├── main.rs           # 入口
│   │   ├── commands.rs       # Tauri 命令
│   │   ├── window.rs         # 窗口管理
│   │   ├── proxy.rs          # 代理处理
│   │   └── shortcuts.rs      # 快捷键管理
│   └── tauri.conf.json       # Tauri 配置
└── package.json
```

## 使用说明

### 添加小程序

1. 点击主界面右上角的"添加"按钮
2. 输入小程序名称和网址
3. (可选) 录制快捷键
4. 点击"添加"完成

### 配置代理

1. 进入设置 -> 代理设置
2. 启用代理并填写代理服务器信息
3. 保存设置

### 使用快捷键

- 为小程序设置快捷键后，可在任何地方通过快捷键快速呼出/隐藏小程序窗口
- 快捷键格式示例: `CommandOrControl+Shift+G`

## License

MIT

