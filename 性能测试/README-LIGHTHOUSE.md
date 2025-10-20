# 🚀 Lighthouse 性能测试 - 快速开始

## ✅ 已完成配置

- ✅ Lighthouse CLI 已安装
- ✅ 测试脚本已创建
- ✅ npm 快捷命令已配置
- ✅ 域名已设置: https://blog.sakamichi-tools.cn

## 🎯 测试方法

### 方法 1: 测试线上网站（推荐）

直接测试你的生产环境：

```bash
# 完整测试（移动端 + 桌面端）
npm run lighthouse:prod
```

这会生成两份报告并自动打开，测试完成后会显示评分。

### 方法 2: 测试本地开发版本

先启动本地服务器，然后测试：

```bash
# 终端 1: 启动服务器
npm run serve

# 终端 2: 运行测试
npm run lighthouse:full
```

### 方法 3: Chrome DevTools（最简单）

1. 在 Chrome 中打开 https://blog.sakamichi-tools.cn
2. 按 `F12` 打开开发者工具
3. 点击 **Lighthouse** 标签
4. 选择测试类别，点击 **Analyze page load**

## 📊 单项测试

```bash
# 只测试性能
npm run test:perf

# 只测试 SEO
npm run test:seo

# 只测试可访问性
npm run test:a11y

# 移动端测试
npm run lighthouse:mobile

# 桌面端测试
npm run lighthouse:desktop
```

## 📁 报告位置

所有测试报告保存在 `./lighthouse-reports/` 目录：

```
lighthouse-reports/
├── 20241021_041300-mobile.report.html   # 移动端报告
├── 20241021_041300-mobile.report.json   # 移动端数据
├── 20241021_041300-desktop.report.html  # 桌面端报告
└── 20241021_041300-desktop.report.json  # 桌面端数据
```

## 🎯 关键指标目标

### 性能指标
- ✅ **FCP (首次内容绘制)**: < 1.8 秒
- ✅ **LCP (最大内容绘制)**: < 2.5 秒
- ✅ **TBT (总阻塞时间)**: < 200 毫秒
- ✅ **CLS (累积布局偏移)**: < 0.1
- ✅ **Speed Index (速度指数)**: < 3.4 秒

### 评分标准
- 🟢 **90-100 分**: 优秀
- 🟡 **50-89 分**: 需要改进
- 🔴 **0-49 分**: 差，需要立即优化

## 🔍 基于现有代码的优化建议

### 🔴 高优先级（立即可改）

#### 1. 图片优化
```html
<!-- 当前 -->
<link rel="icon" type="image/jpeg" href="/images/sakamichi.jpg">

<!-- 优化为 -->
<link rel="icon" type="image/png" href="/images/sakamichi-32x32.png" sizes="32x32">
<link rel="apple-touch-icon" href="/images/sakamichi-180x180.png">
```

#### 2. 字体加载优化
```html
<!-- 添加 font-display -->
<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@300;400;500;600;700&family=Noto+Sans+JP:wght@300;400;500;600;700&display=swap" rel="stylesheet">
```

#### 3. 关键资源预加载
```html
<!-- 在 <head> 中添加 -->
<link rel="preload" href="js/config.js" as="script">
<link rel="preload" href="css/main-styles.css" as="style">
```

### 🟡 中优先级（本周可改）

#### 4. 脚本异步加载
```html
<!-- 当前 -->
<script src="https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js"></script>

<!-- 优化为 -->
<script src="https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js" defer></script>
```

#### 5. CSS 优化
```html
<!-- 内联关键 CSS，延迟加载非关键 CSS -->
<style>
  /* 关键 CSS 内联 */
  body { margin: 0; font-family: system-ui; }
</style>
<link rel="preload" href="css/main-styles.css" as="style" onload="this.onload=null;this.rel='stylesheet'">
```

### 🟢 低优先级（长期优化）

#### 6. 考虑使用构建工具
```bash
# 使用 Vite 进行构建优化
npm install -D vite
```

#### 7. 图片懒加载
```html
<img src="placeholder.jpg" data-src="real-image.jpg" loading="lazy" alt="...">
```

## 📈 持续监控

建议每周运行一次完整测试：

```bash
# 每周一测试
npm run lighthouse:prod
```

## 🔗 相关文档

- 📘 [完整使用指南](./lighthouse-guide.md)
- 📊 [测试脚本说明](./lighthouse-test.sh)
- 🔄 [对比测试脚本](./lighthouse-compare.sh)

## 💡 快速命令参考

```bash
# 测试生产环境
npm run lighthouse:prod

# 测试本地环境
npm run lighthouse:full

# 只看性能
npm run test:perf

# 启动本地服务器
npm run serve
```

---

**下一步**: 运行 `npm run lighthouse:prod` 开始测试你的网站性能！
