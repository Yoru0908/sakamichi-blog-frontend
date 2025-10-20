# 🚀 Lighthouse 性能测试与优化指南

## 📋 测试方法

### 方法 1：Chrome DevTools（推荐新手）

1. 在 Chrome 中打开网站：`http://localhost:8000`（需要先启动本地服务器）
2. 按 `F12` 打开开发者工具
3. 点击 **Lighthouse** 标签
4. 选择测试类别，点击 **Analyze page load**

### 方法 2：命令行测试（已安装）

```bash
# 测试本地服务器（需要先启动服务）
lighthouse http://localhost:8000 --view

# 测试线上网站
lighthouse https://你的域名.com --view

# 生成 JSON 报告
lighthouse https://你的域名.com --output json --output-path ./lighthouse-report.json

# 只测试性能
lighthouse http://localhost:8000 --only-categories=performance --view

# 测试移动端
lighthouse http://localhost:8000 --preset=mobile --view

# 测试桌面端
lighthouse http://localhost:8000 --preset=desktop --view
```

## 🎯 主要测试指标

### 性能指标 (Performance)
- **FCP (First Contentful Paint)**: 首次内容绘制 - 目标 < 1.8s
- **LCP (Largest Contentful Paint)**: 最大内容绘制 - 目标 < 2.5s
- **TBT (Total Blocking Time)**: 总阻塞时间 - 目标 < 200ms
- **CLS (Cumulative Layout Shift)**: 累积布局偏移 - 目标 < 0.1
- **Speed Index**: 速度指数 - 目标 < 3.4s

### 其他指标
- **Accessibility**: 可访问性（屏幕阅读器、键盘导航等）
- **Best Practices**: 最佳实践（HTTPS、控制台错误等）
- **SEO**: 搜索引擎优化

## 🔍 当前项目潜在问题

基于你的 `index.html` 分析，以下是可能的性能问题：

### 1. 外部资源加载过多
```html
<!-- 问题：多个外部 CDN 资源 -->
<link href="https://cdn.jsdelivr.net/npm/daisyui@4.4.19/dist/full.min.css" rel="stylesheet" />
<script src="https://cdn.tailwindcss.com"></script>
<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+SC..." />
<script src="https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js"></script>
```

**优化建议**：
- 使用本地化资源，减少 DNS 查询
- 合并和压缩 CSS/JS 文件
- 使用构建工具（Vite/Webpack）

### 2. 渲染阻塞资源
```html
<!-- 这些脚本会阻塞页面渲染 -->
<script src="js/config.js"></script>
<script src="js/group-config.js"></script>
```

**优化建议**：
- 添加 `defer` 或 `async` 属性
- 关键脚本保持同步，非关键脚本异步加载

### 3. 图片优化
```html
<link rel="icon" type="image/jpeg" href="/images/sakamichi.jpg">
```

**优化建议**：
- 使用 WebP 格式
- 实现图片懒加载
- 使用 `<picture>` 标签提供多种尺寸

### 4. 字体加载
```html
<link href="https://fonts.googleapis.com/css2?family=Noto+Sans..." />
```

**优化建议**：
- 使用 `font-display: swap`
- 预加载关键字体
- 考虑使用系统字体

## 💡 推荐的性能优化步骤

### 立即可做（无需改代码）
1. 启用 CDN 和缓存
2. 启用 Gzip/Brotli 压缩
3. 优化服务器响应时间

### 短期优化（1-2天）
1. 图片压缩和 WebP 转换
2. 添加 `async/defer` 到非关键脚本
3. 实现图片懒加载
4. 添加资源预加载提示

### 中期优化（1周）
1. 引入构建工具（Vite）
2. 代码分割和按需加载
3. 使用本地化资源替代 CDN
4. 实施 Service Worker 缓存

### 长期优化（持续）
1. 迁移到现代框架（React/Vue）
2. 实现 SSR/SSG
3. 优化数据库查询
4. 实施 CDN 边缘计算

## 🛠️ 使用提供的自动化脚本

```bash
# 运行完整测试（移动端+桌面端）
npm run lighthouse

# 只测试移动端
npm run lighthouse:mobile

# 只测试桌面端
npm run lighthouse:desktop

# 持续监控（每小时自动测试）
npm run lighthouse:monitor
```

## 📊 报告解读

测试完成后会生成 HTML 报告，重点关注：

1. **绿色（90-100分）**: 优秀，保持
2. **橙色（50-89分）**: 需要改进
3. **红色（0-49分）**: 严重问题，优先修复

## 🔗 相关资源

- [Lighthouse 官方文档](https://developer.chrome.com/docs/lighthouse/)
- [Web Vitals](https://web.dev/vitals/)
- [性能优化指南](https://web.dev/fast/)

## 📝 注意事项

1. 测试前确保网站已启动本地服务器
2. 移动端和桌面端测试结果会不同
3. 多次测试取平均值更准确
4. 关闭浏览器扩展避免干扰
5. 在无痕模式下测试更准确
