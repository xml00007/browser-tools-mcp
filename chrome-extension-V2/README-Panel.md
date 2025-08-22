# Browser Tools Panel - Vue3 Component

## 概述

这个项目将原来的HTML面板转换为Vue3组件，提供了更好的响应式数据管理和用户体验。

## 主要功能

### 1. Quick Actions（快速操作）
- **Capture Screenshot**: 捕获屏幕截图
- **Wipe All Logs**: 清除所有日志
- **Allow Auto-paste to Cursor**: 允许自动粘贴到Cursor

### 2. Screenshot Settings（截图设置）
- 配置截图保存路径
- 默认保存到下载文件夹

### 3. Server Connection Settings（服务器连接设置）
- 配置服务器主机和端口
- 自动发现服务器功能
- 连接测试功能
- 实时连接状态显示

### 4. Advanced Settings（高级设置）
- 可折叠的高级设置面板
- 日志限制配置
- 查询限制配置
- 字符串大小限制
- 最大日志大小设置
- 请求/响应头显示选项

## 技术特性

### Vue3 Composition API
- 使用 `<script setup>` 语法
- 响应式数据管理
- 生命周期钩子
- 数据监听和持久化

### Chrome Extension Integration
- Chrome存储API集成
- 设置自动保存和恢复
- 类型安全的Chrome API调用

### 响应式设计
- 现代化的UI设计
- 深色主题
- 平滑的动画效果
- 可折叠的设置面板

## 文件结构

```
entrypoints/popup/
├── App.vue              # 主应用组件
├── Panel.vue            # 面板组件（新）
├── main.ts              # Vue应用入口
├── panel.html           # HTML模板（已更新）
└── style.css            # 全局样式
```

## 使用方法

1. **开发模式**:
   ```bash
   npm run dev
   ```

2. **构建生产版本**:
   ```bash
   npm run build
   ```

3. **打包扩展**:
   ```bash
   npm run zip
   ```

## 数据持久化

所有设置都会自动保存到Chrome的同步存储中，包括：
- 服务器连接设置
- 截图路径配置
- 高级设置参数
- 用户偏好选项

## 组件状态管理

使用Vue3的响应式系统管理组件状态：
- `settings`: 所有配置选项
- `connectionStatus`: 连接状态信息
- `advancedSettingsVisible`: 高级设置面板显示状态

## 错误处理

组件包含完善的错误处理机制：
- Chrome API可用性检查
- 异步操作的错误捕获
- 用户友好的错误提示

## 样式系统

使用Vue3的scoped样式：
- 组件级别的样式隔离
- 响应式设计
- 现代化的UI组件
- 一致的视觉主题
