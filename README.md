# 坂道博客翻译系统 - 前端

Cloudflare Pages 前端页面，展示翻译后的博客内容。

## 🌟 功能

- 📱 响应式设计，支持移动端
- 🎨 参考樱坂46官网的简约风格
- 🔍 按团体筛选（樱坂46/日向坂46/乃木坂46）
- 👥 按成员筛选
- 📊 显示统计信息（成员数/今日更新）
- 🔗 メンバー別ブログ网格展示

## 🚀 部署

### 自动部署

连接到 Cloudflare Pages 后，每次 push 到 main 分支会自动部署。

### 手动部署

```bash
wrangler pages deploy . --project-name=sakamichi-blog
```

## 🔌 API 连接

前端调用后端 Workers API：

```javascript
const API_BASE = 'https://api.sakamichi-tools.cn';
```

### API 端点

- `GET /api/blogs` - 获取所有博客
- `GET /api/blogs?group=樱坂46` - 按团体筛选
- `GET /api/blogs?member=田村保乃` - 按成员筛选

## 🎨 UI 特性

### 设计风格
- 简约优雅的日式设计
- 细腻的字体和间距
- 流畅的动画效果
- 黑白灰配色方案

### 组件
- DaisyUI - UI 组件库
- Tailwind CSS - 样式框架
- 原生 JavaScript - 无框架依赖

## 📱 响应式布局

- **桌面**: 3列网格
- **平板**: 2列网格
- **手机**: 1列列表

## 🔗 相关链接

- 后端仓库: https://github.com/Yoru0908/sakamichi-blog-backend
- Pages URL: https://c9ab90cd.sakamichi-blog.pages.dev
- Workers API: https://api.sakamichi-tools.cn

## 📄 License

MIT
