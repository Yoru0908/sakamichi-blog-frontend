# 坂道博客翻译 - 前端

乃木坂46、樱坂46、日向坂46 成员博客的中文翻译展示前端。纯静态站点，部署在 Cloudflare Pages，通过调用后端 Cloudflare Workers API 获取翻译后的博客内容。

线上地址：<https://blog.sakamichi-tools.cn>

## 功能特性

- **博客浏览**：按团体（乃木坂46 / 樱坂46 / 日向坂46）、成员筛选博客列表，支持分页
- **博客详情**：双语对照阅读、博客详情侧边栏、分享功能
- **成员页面**：成员资料与博客归档，按期别排序展示
- **成员互动分析**（`interactions.html`）：成员提及关系、互动排行、期别互动分析，支持 API（生产）与静态 JSON（本地）双模式加载
- **数据统计**（`stats.html`）：更新量、成员数等统计信息展示
- **双语切换**：简体中文 / 繁体中文一键切换（基于 OpenCC，动态加载）
- **暗色模式**：全站暗色主题切换，含 FOUC 防闪烁处理
- **图片优化**：通过 Cloudinary 进行图片压缩、格式自动转换（WebP）、按需缩放
- **图片下载**：使用 JSZip + FileSaver 支持博客图片批量下载（含移动端下载）
- **响应式布局**：桌面 / 平板 / 手机自适应，移动端独立菜单与样式
- **SEO 优化**：`sitemap.xml`、`robots.txt`、结构化数据、语义化 HTML
- **性能优化**：关键 CSS 同步加载、非关键 CSS 异步预加载、CDN 缓存策略、cache-busting 版本号

## 技术栈

| 类别 | 技术 |
| --- | --- |
| 标记 / 样式 | HTML5、Tailwind CSS 3、DaisyUI 5、原生 CSS |
| 脚本 | 原生 JavaScript（无前端框架），ES Modules |
| 图片优化 | Cloudinary（`res.cloudinary.com`） |
| 第三方库 | JSZip、FileSaver、OpenCC（均通过 CDN 动态加载） |
| 构建 | 无打包步骤，静态文件直接部署；Tailwind 通过 PostCSS 输出 `css/tailwind-output.css` |
| 部署 | Cloudflare Pages |
| 后端 API | Cloudflare Workers（`https://api.sakamichi-tools.cn`） |
| 性能测试 | Lighthouse |

## 项目结构

```
.
├── index.html              # 博客列表 / 详情主页面（SPA 路由）
├── interactions.html       # 成员互动分析页面
├── stats.html              # 数据统计页面
├── privacy.html            # 隐私政策
├── terms.html              # 使用条款
├── robots.txt              # 爬虫规则
├── sitemap.xml             # 站点地图
├── _headers                # Cloudflare Pages 缓存策略
├── tailwind.config.js      # Tailwind / DaisyUI 配置
├── package.json            # 依赖与性能测试脚本
├── css/
│   ├── main-styles.css     # 全局基础样式（关键 CSS）
│   ├── tailwind-output.css # Tailwind 编译输出
│   ├── mobile.css          # 移动端样式
│   ├── dark-theme.css      # 暗色主题
│   ├── dark-mode.css       # 暗色模式适配
│   ├── bilingual.css       # 双语对照样式
│   ├── transitions.css     # 过渡动画
│   ├── calendar-component.css
│   └── input.css           # Tailwind 源码入口
├── js/
│   ├── config.js           # 全局配置（API 地址、分页、Cloudinary 等）
│   ├── group-config.js     # 团体配置
│   ├── router.js           # 前端路由
│   ├── app.js              # 应用主逻辑
│   ├── state.js            # 状态管理
│   ├── members-api.js      # 成员数据 API（ES Module）
│   ├── members-data.js     # 成员数据回退
│   ├── member-page.js      # 成员页面
│   ├── member-detail.js    # 成员详情
│   ├── blog-renderer.js    # 博客渲染
│   ├── blog-detail-sidebar.js
│   ├── blog-cache.js       # 博客缓存
│   ├── structured-renderer.js  # 结构化内容渲染
│   ├── pagination.js       # 分页
│   ├── sidebar-sticky.js   # 侧边栏吸顶
│   ├── interactions.js     # 互动分析
│   ├── theme-toggle.js     # 暗色模式切换
│   ├── language-toggle.js  # 简繁切换
│   ├── bilingual-control-v2.js
│   ├── scroll-animations.js
│   ├── page-transitions.js
│   ├── share-module.js     # 分享
│   ├── seo-manager.js      # SEO 管理
│   ├── image-download.js   # 图片下载
│   ├── mobile-download.js  # 移动端下载
│   ├── mobile-menu.js      # 移动端菜单
│   ├── member-default-images.js
│   ├── utils.js / utils/   # 工具函数
├── data/
│   ├── interactions.json   # 互动分析静态数据（本地回退）
│   └── member-images.json  # 成员图片数据（自动更新）
├── images/                 # 静态图片资源
├── scripts/
│   └── fetch-member-images.js  # 成员图片抓取脚本（Playwright）
├── .github/workflows/
│   └── update-member-images.yml  # 每周自动更新成员图片数据
└── doc/                    # 架构文档与代码评审记录
```

## 后端 API

前端通过 `js/config.js` 中定义的 `API_BASE` 调用后端 Workers API：

```javascript
const API_BASE = 'https://api.sakamichi-tools.cn';
```

主要端点：

- `GET /api/blogs` — 获取博客列表（支持 `group`、`member` 等筛选参数）
- `GET /api/blogs/{id}` — 获取单篇博客详情
- `GET /api/members/{group}` — 获取指定团体成员
- `GET /api/members/all` — 获取全部成员
- `POST /api/notify` — 通知相关接口

本地开发时可切换至 `LOCAL_API`（`http://localhost:8787`）。

## 本地运行

无需构建步骤，使用任意静态服务器即可：

```bash
# 使用项目内置脚本（Python 静态服务器）
npm run serve
# 或
python3 -m http.server 8000
```

然后访问 <http://localhost:8000>。

> 注意：本地访问博客列表 / 成员数据需要后端 API。可启动对应的后端 Workers（本地默认 `http://localhost:8787`），否则部分功能（如博客列表）将无法加载，互动分析页面会自动回退到 `data/interactions.json` 静态数据。

### Tailwind 重新编译（可选）

修改了 Tailwind 相关样式后，重新生成 `css/tailwind-output.css`：

```bash
npx tailwindcss -i ./css/input.css -o ./css/tailwind-output.css --minify
```

## 性能测试

项目内置 Lighthouse 测试脚本：

```bash
npm run lighthouse         # 移动端 + 桌面端
npm run test:perf          # 仅性能
npm run test:seo           # 仅 SEO
npm run test:a11y          # 仅无障碍
```

## 部署

### 自动部署

仓库连接 Cloudflare Pages，每次 push 到 `main` 分支自动触发部署。

### 手动部署

```bash
wrangler pages deploy . --project-name=sakamichi-blog
```

### 缓存策略

通过 `_headers` 配置 Cloudflare Pages 缓存：

- `/css/*`、`/js/*`、`/images/*`、静态图片 / 字体：1 年 immutable 缓存
- `*.html`、根路径：1 小时短缓存（便于内容更新）

> 因静态资源使用长期缓存，更新 JS / CSS 时需在引用处添加 `?v=` 版本号进行 cache-busting。

## 自动化

`.github/workflows/update-member-images.yml` 每周一（UTC 02:00 / 北京时间 10:00）通过 Playwright 抓取最新成员图片数据，更新 `data/member-images.json` 并自动提交。

## 相关链接

- 后端仓库：<https://github.com/Yoru0908/sakamichi-blog-backend>
- 线上前端：<https://blog.sakamichi-tools.cn>
- Workers API：<https://api.sakamichi-tools.cn>

## License

MIT
