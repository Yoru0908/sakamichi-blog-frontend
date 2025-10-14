# 前端模块汇总（index.html + js/app.js）

本文件汇总并梳理 `index.html` 和 `js/app.js` 中的核心模块、关键函数、职责边界与执行逻辑，帮助快速理解页面结构与数据流。文件内引用的路径与行号均为可点击定位。

## 文件范围
- 页面入口与内联逻辑：`sakamichi-blog-frontend（backup）/index.html`
- 主应用逻辑模块：`sakamichi-blog-frontend（backup）/js/app.js`

---

## 全局配置与状态
- API 基础地址选择
  - `determineInitialApiBaseUrl()`：根据 `window.__APP_CONFIG__`、页面来源（localhost、pages.dev）与回退策略计算初始 API 基础地址（`FALLBACK_WORKER_API_URL` 与 `LOCAL_API_URL`）。js/app.js:4, js/app.js:1
  - `ensureApiBaseUrl()`：对候选地址顺序发起 `/api/health` 健康检查，首个可用即采用并暴露 `window.API_BASE_URL`。js/app.js:30
- 页面状态（全局）
  - `window.currentPage`、`window.currentGroup`、`window.currentSearch`、`window.isLoading`、`window.hasMore`、`window.totalPages`、`window.blogsPerPage` 等。js/app.js:70-76
  - 备份页独立状态：`currentGroup`、`currentMember`、`currentPage`、`PAGE_SIZE`、`hasMoreBlogs`、`isLoadingMore`、`totalBlogs`、`totalPages`、`currentDisplayPage`。index.html:321, index.html:1413-1417

执行逻辑
- DOMContentLoaded 阶段先 `ensureApiBaseUrl()` 保障后端连通，再初始化统计与状态显示。js/app.js:116

---

## 路由与初始化
- 页面初始化（内联）
  - DOMContentLoaded 时初始化分页、成员页、路由模块（由 Router 决定是否加载列表或详情，页面本身不直接调用 `loadBlogs`）。index.html:1760-1792
- 入口初始化（app.js）
  - 保证后端可用 → `loadStats()` → `startAutoRefresh()` → `checkSystemStatus()`。js/app.js:116

---

## 团体与成员模块（index.html）
- 团体名称映射
  - `GROUP_CONFIG` 与 `GROUP_NAME_MAP`：英文 key ↔ 中文显示，确保与后端数据库一致。index.html:295-318, index.html:319-336
  - `getChineseGroupName(name)`：英文转中文名。index.html:321
- 团体切换
  - `switchGroup(group)`：关闭详情页、重置分页与成员筛选、同步 PC/移动端菜单、显示/隐藏团体信息区与成员区、拉取数据。index.html:327
- 团体信息加载
  - `loadGroupInfo(group)`：拉取该团体近 500 篇博客，统计今日更新（使用日本时区）、计算每位成员最后更新时间（合并多格式日期），并写入统计卡与筛选器、成员网格。index.html:372
- 成员筛选与展示
  - `populateMemberSelect(groupData, memberLastUpdate)`：按期别生成成员下拉，格式如 `成员名（MM.DD HH:mm 更新）`，无更新则标注“未更新”。index.html:474
  - `renderMemberGrid(members, membersWithBlogs)`：按期别渲染成员网格，无博客的成员半透明显示，点击跳转成员页。index.html:527
  - `filterByMember()`：更新 URL Hash 状态，重置分页并重载数据。index.html:581

核心逻辑要点
- “今日更新”以日本时区日界为准。index.html:430-471
- 最后更新时间按成员聚合，支持 `YYYY/MM/DD HH:mm` 与 `YYYY.MM.DD HH:mm` 等格式归一。index.html:412-470

---

## 博客列表加载模块
- 统一加载（app.js）
  - `window.loadBlogs(append = false)`：构建查询参数（分页、团体、成员），请求 `/api/blogs`，去重（忽略恢复版重复）、按 `publish_date` 降序、渲染列表或追加。根据是否为 `#all` 决定无限滚动或分页显示，更新 `window.totalPages`、`window.currentPage`、空态与加载态。js/app.js:197
  - 去重：`removeDuplicateBlogs(blogs)` 以 `title+member` 作为唯一键，优先保留非恢复版。js/app.js:80
  - 展示：`displayBlogs()`、`appendBlogs()`。js/app.js:322, js/app.js:333
- 备份页加载（index.html）
  - `loadBlogs()`：构建 URL（附 `sort=publish_date&order=desc&count=true`），团体使用中文名，渲染卡片、重置懒加载、更新“第 X 页/共 Y 页”，调用 `updatePagination()`，以及必要时设置无限滚动。index.html:807

数据与状态
- `#all` 页面：采用无限滚动（IntersectionObserver 监听 `#loadingMore`），`hasMore/hasMoreBlogs` 控制是否继续加载。js/app.js:857-885, index.html:1498-1508, index.html:1420-1491
- 其他页面：使用分页组件（外部 `Pagination` 模块或本文件内回退实现）。js/app.js:288-307, index.html:1650-1759

---

## 博客卡片组件
- `createBlogCard(blog)`：
  - UI：海报图（首图）、标题、成员头像（优先 `MemberImages`）、成员名（含粉丝昵称）、相对时间。点击跳转 `#blog/{id}`。js/app.js:343
  - 辅助：`getGroupColor()`、`formatDate()`、`getTranslatedContentPreview()`。js/app.js:408, js/app.js:442, js/app.js:413

---

## 内容渲染模块（index.html 内联 + 统一渲染器）
- 统一入口
  - `renderBlogContent(markdown, groupName)`：若存在 `window.renderMarkdown`（`js/blog-renderer.js`），则走统一渲染；否则后备将 `\n` 转 `<br>`。index.html:600
- 分团体策略（后备/兼容）
  - `renderHinatazakaContent(content)`：按行渲染，空行跳过，`<br>`/`<img>` 原样插入。index.html:611
  - `renderSakurazakaContent(content)`：合并被分割的句子；处理引号块“「…」”；短句/标点/语气词行尾与前行合并；图片与 `<br>` 原样插入。index.html:643, index.html:774
  - `renderNogizakaContent(content)`：以“两个及以上空行”判断段落；单空行作为软换行；图片行单独输出。index.html:721
  - `shouldMergeWithPrevious(line, prevResults)`：合并启发式（标点、短语气词、未完句与短续行、结束引号独行等）。index.html:774

说明
- 生产渲染建议优先使用 `js/blog-renderer.js` 的统一逻辑，内联函数作为迁移期回退与差异化处理。

---

## 搜索与成员建议
- 触发与执行
  - `handleSearch(event)`：回车触发精确成员筛选加载。js/app.js:479
  - `performSearch(query)`：请求 `/api/search`，渲染命中卡片并高亮，失败/空结果渲染空态。js/app.js:488, js/app.js:522
- 成员建议（模糊）
  - `getMemberSuggestions(query)`：请求 `/api/members?search=...`，返回前 5 条（名称、显示名、粉丝昵称、团体、头像）。js/app.js:581
  - `enhanceSearchInput()`：绑定输入框，300ms 防抖实时检索、500ms 防抖成员建议；焦点/失焦控制建议显隐。js/app.js:609
  - `displayMemberSuggestions()`/`hideMemberSuggestions()`/`selectMember()`：渲染下拉建议、选择后更新 group/search 并加载。js/app.js:667, js/app.js:701, js/app.js:707

---

## 博客详情模块（index.html）
- 进入与离开
  - 列表卡片点击后由 `Router.navigate('#blog/{id}')` 决定，或直接 `showBlogDetail(blog)`；返回 `closeBlogDetail()` 恢复列表视图。index.html:924, index.html:951, index.html:1241
- 内容加载
  - `loadBlogContentWithData(blog)`：已有数据时直接渲染正文与图片，设置成员头像与侧边栏，并一次性初始化 `BlogDetailSidebar.init(blog)`。index.html:1261-1329
  - `loadBlogContent(blogId)`：按 ID 获取详情后渲染，随后调用 `BlogDetailSidebar.init(data.blog)`。index.html:1330-1396
- 详情页结构
  - 左侧正文：标题、作者、时间、分享菜单、正文（统一渲染器）、“查看原文”。index.html:951-1453
  - 右侧侧边栏：成员卡片（大图/名字/团体）+ 日历（由 `BlogDetailSidebar` 与相关 CSS/JS 负责）。index.html:951-1453

---

## 分享与下载联动（index.html）
- 分享菜单
  - `toggleShareMenu(event)`：展示/隐藏分享网格，委托点击到 `ShareModule`（微博、X/Twitter、WhatsApp、复制链接、Facebook、Telegram）。index.html:1579-1610, index.html:1793
- 图片下载
  - 详情页里“下载图片”按钮联动 `js/image-download.js` 与移动端下载模块 `js/mobile-download.js`。index.html:951-1453, index.html:1794-1797

---

## 分页与无限滚动
- 无限滚动
  - app.js：`window.setupInfiniteScroll()` 监听 `#loadingMore`，触底后 `loadMoreBlogs()` 自增页并 `window.loadBlogs(true)`。js/app.js:857-885, js/app.js:885-919
  - index.html：`setupInfiniteScroll()` + `loadMoreBlogs()` 使用本地状态 `hasMoreBlogs/isLoadingMore` 与提示显隐。index.html:1498-1508, index.html:1420-1491
- 分页（备份页回退实现）
  - `updatePagination()` 生成上一页/数字页/下一页按钮，`createPageButton()` 高亮当前页，`jumpToPage()` 更新页码与滚动加载状态并调用 `loadBlogs()`。index.html:1650-1759
  - 外部模块：如存在 `window.Pagination` 则优先使用。index.html:1765-1772, js/app.js:288

---

## UI 状态与错误处理（app.js）
- 加载/空态/错误
  - `showLoading()` / `hideLoading()`：主列表加载指示。js/app.js:786, js/app.js:792
  - `showEmptyState()` / `hideEmptyState()`：空数据提示显隐。js/app.js:798, js/app.js:804
  - `showError(message)`：右上角 3 秒自动消失的错误吐司。js/app.js:809

---

## 统计与系统状态（app.js）
- `loadStats()`：拉取 7 天统计，成功后 `updateStatsDisplay()` 与 `updateLastUpdateTime()`。js/app.js:151, js/app.js:167, js/app.js:190
- `startAutoRefresh()`：每 5 分钟自动刷新统计与（首页条件下）博客列表。js/app.js:830
- `checkSystemStatus()`：健康检查状态灯（绿/黄/红）。js/app.js:919

---

## 外部依赖与协作模块
- 配置与数据：
  - `js/group-config.js`（团体配色、别名、API 名映射），`members-data.js`（成员与期别结构）
- 内容渲染：
  - `js/blog-renderer.js`（统一的 Markdown/结构化渲染）
- 页面结构与交互：
  - `js/router.js`（路由）、`js/pagination.js`（分页 UI）
  - `js/member-page.js` / `js/member-detail.js`（成员页/详情）
  - `js/blog-detail-sidebar.js`（详情页右侧成员信息与日历）
  - `js/theme-toggle.js`（主题切换）、`js/mobile-menu.js`（移动端菜单）
  - `js/share-module.js`（统一分享逻辑）
  - `js/image-download.js` / `js/mobile-download.js`（图片下载）
  - `js/page-transitions.js`（转场动画）、`js/sidebar-sticky.js`（侧边栏吸附）

---

## 关键数据流与调用关系（概览）
- 入口
  - DOMReady → `ensureApiBaseUrl()` → `loadStats()` → `Router.init()` 决定进入列表或详情。js/app.js:116, index.html:1760-1792
- 列表页
  - 切换团体：`switchGroup()` → `loadGroupInfo()`（统计+筛选）→ `loadBlogs()`（拉取列表/分页或无限滚动）。index.html:327, index.html:372, index.html:807
  - 搜索：`handleSearch()`/`enhanceSearchInput()` → `performSearch()` 或回退到 `loadBlogs()`。
- 详情页
  - 卡片点击 → `Router.navigate('#blog/{id}')` → `showBlogDetail()` → `loadBlogContentWithData()` 或 `loadBlogContent()` → `renderMarkdown()` → `BlogDetailSidebar.init()`。
- 分享/下载
  - `toggleShareMenu()` → 交给 `ShareModule`；“下载图片” → `image-download.js` / `mobile-download.js`。

---

## 注意事项与边界处理
- 团体名称：对外查询需使用中文名（与数据库一致），内部路由与 UI 使用英文字段。index.html:807-846
- 日期处理：统计“今日更新”按日本时区进行；成员最后更新时间做格式归一与补零。index.html:430-471
- 去重策略：优先保留正常版，过滤 `id` 含 `restore` 的恢复版重复项。js/app.js:80
- 渲染策略：优先统一渲染器；内联分团体渲染仅作兼容回退或差异化需求。
- 分页/无限滚动：`#all` 使用无限滚动，其余使用分页；两处实现存在但优先统一 `Pagination`/`Router` 模块。

---

## 快速定位（函数清单）
- index.html（函数声明起始行）
  - `getChineseGroupName` index.html:321
  - `switchGroup` index.html:327
  - `loadGroupInfo` index.html:372
  - `populateMemberSelect` index.html:474
  - `renderMemberGrid` index.html:527
  - `filterByMember` index.html:581
  - `renderBlogContent` index.html:600
  - `renderHinatazakaContent` index.html:611
  - `renderSakurazakaContent` index.html:643
  - `renderNogizakaContent` index.html:721
  - `shouldMergeWithPrevious` index.html:774
  - `loadBlogs` index.html:807
  - `renderBlogItem` index.html:914
  - `showBlogDetail` index.html:951
  - `closeBlogDetail` index.html:1241
  - `loadBlogContentWithData` index.html:1261
  - `loadBlogContent` index.html:1330
  - `loadMoreBlogs` index.html:1420
  - `setupInfiniteScroll` index.html:1498
  - `filterBlogs` index.html:1547
  - `toggleShareMenu` index.html:1579
  - `updatePagination` index.html:1650
  - `createPageButton` index.html:1719
  - `jumpToPage` index.html:1730
- js/app.js（函数声明起始行）
  - `determineInitialApiBaseUrl` js/app.js:4
  - `ensureApiBaseUrl` js/app.js:30
  - `removeDuplicateBlogs` js/app.js:80
  - DOMContentLoaded init js/app.js:116
  - `loadStats` js/app.js:151
  - `updateStatsDisplay` js/app.js:167
  - `updateLastUpdateTime` js/app.js:190
  - `window.loadBlogs` js/app.js:197
  - `displayBlogs` js/app.js:322
  - `appendBlogs` js/app.js:333
  - `createBlogCard` js/app.js:343
  - `getGroupColor` js/app.js:408
  - `getTranslatedContentPreview` js/app.js:413
  - `formatDate` js/app.js:442
  - `filterByGroup` js/app.js:465
  - `handleSearch` js/app.js:479
  - `performSearch` js/app.js:488
  - `displaySearchResults` js/app.js:522
  - `showSearchResults` js/app.js:557
  - `getMemberSuggestions` js/app.js:581
  - `enhanceSearchInput` js/app.js:609
  - `displayMemberSuggestions` js/app.js:667
  - `hideMemberSuggestions` js/app.js:701
  - `selectMember` js/app.js:707
  - `refreshBlogs` js/app.js:730
  - `updateLoadMoreButton` js/app.js:737
  - `updatePagination` js/app.js:742
  - `goToPage` js/app.js:749
  - `toggleBlogContent` js/app.js:756
  - `openImageModal` js/app.js:762
  - `showLoading` js/app.js:786
  - `hideLoading` js/app.js:792
  - `showEmptyState` js/app.js:798
  - `hideEmptyState` js/app.js:804
  - `showError` js/app.js:809
  - `startAutoRefresh` js/app.js:830
  - `window.setupInfiniteScroll` js/app.js:857
  - `loadMoreBlogs` js/app.js:885
  - `checkSystemStatus` js/app.js:919

---

如需我继续把其他 `js/*.js` 模块（如 Router、Pagination、BlogDetailSidebar、MemberPage 等）也一并整合进这份文档，请告诉我，我可以追加它们的职责与逻辑细节。

