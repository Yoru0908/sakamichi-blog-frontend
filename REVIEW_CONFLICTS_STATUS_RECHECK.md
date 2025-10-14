# 前端冲突修复二次复核报告（sakamichi-blog-frontend）

基于当前仓库最新代码复核 index.html 与 js/*.js 的合流冲突修复情况，核对既有清单与实际实现，不做任何代码改动，仅出具分析汇总。

**复核范围**
- 页面与入口：`sakamichi-blog-frontend/index.html`
- 模块与逻辑：`sakamichi-blog-frontend/js/*.js`

**结论概览**
- 核心路径（加载、渲染、无限滚动、路由优先）已基本按方案统一，整体方向正确。
- 仍有若干不一致与残留点未收敛（API 基础地址统一、搜索建议 GROUP_INFO、成员/详情侧边栏 API、分页遗留函数、个别直改 hash 导航、group 参数来源混用等）。
- 高优先级建议集中在：API 基础地址统一、搜索建议依赖修复、分页/页码一致性、导航统一 Router。

---

**已解决**
- 加载函数统一
  - `index.html` 已不再自带 `loadBlogs`，通过 `app.js` 的 `window.loadBlogs` 加载；偏移量基于 1 起始页码计算，避免负偏移（`js/app.js:250`）。
- 卡片渲染统一
  - 列表渲染优先使用 `window.renderBlogItem`，否则退回 `createBlogCard`（`js/app.js:372`, `js/app.js:383`）。
  - `index.html` 的卡片点击已使用 `Router.navigate`（`sakamichi-blog-frontend/index.html:779` 起）。
- 无限滚动策略
  - 仅 `#all` 页面启用无限滚动，使用 `#loadingMore` 哨兵 + `IntersectionObserver`（`js/app.js:919` 起；哨兵元素见 `sakamichi-blog-frontend/index.html:250` 附近）。
- 团体参数（核心加载路径）
  - 列表加载统一使用 `GroupConfig.getApiName(window.currentGroup)` 作为后端查询参数（`js/app.js:259`）。

---

**部分已解决**
- 页码与全局状态
  - 切换与筛选已将页码重置为 1（`sakamichi-blog-frontend/index.html:303`, `sakamichi-blog-frontend/index.html:553`）。
  - 但 `index.html` 仍保留本地分页函数，且 `jumpToPage()` 将 `currentPage` 设置为 0 基（`sakamichi-blog-frontend/index.html:1453-1461`），并操作未统一的变量 `hasMoreBlogs/isLoadingMore`，与 `app.js` 的 `window.hasMore/window.isLoading` 存在割裂。
- 团体参数（其他路径）
  - `loadGroupInfo()` 仍用显示名作为请求参数（`sakamichi-blog-frontend/index.html:339-346`），与“统一使用 API 名称”的策略不一致。
- 搜索相关
  - 搜索请求的 `group` 仍直接使用 `currentGroup` 而非 `GroupConfig.getApiName(currentGroup)`（`js/app.js:540-556`）。
  - 成员建议渲染依赖未定义的 `GROUP_INFO`（`js/app.js:719-749`）。
- 导航统一
  - 主要点击路径已优先 `Router.navigate`；但成员页按日期跳转仍直接改 hash（`sakamichi-blog-frontend/js/member-page.js:820-833`），回退分支也有直改 hash（`sakamichi-blog-frontend/js/member-page.js:675-678`）。

---

**未解决**
- API 基础地址统一（应使用 `window.API_BASE_URL`）
  - 详情页获取：`js/router.js:211` 仍使用硬编码 Worker URL。
  - 详情侧边栏：`js/blog-detail-sidebar.js:211-216` 使用硬编码 `API_BASE`；group 参数直接用 `blog.group_name`。
  - 成员详情（标注“已弃用”模块）：`js/member-detail.js:578-585` 使用 `window.API_BASE`（未定义）。
  - 图片下载：`js/image-download.js:12`、`js/mobile-download.js:233` 使用 `API_BASE` 未统一。
- 分页遗留与事件绑定可能冲突
  - `index.html` 中保留 `updatePagination/createPageButton/jumpToPage` 与对 `prev/next` 的 `onclick` 绑定（`sakamichi-blog-frontend/index.html:1373-1484`）。
  - 同时 `js/pagination.js` 也对 `prev/next` 使用 `addEventListener` 绑定（`sakamichi-blog-frontend/js/pagination.js:20-33`），存在重复触发风险与状态不一致（0/1 基页码、hasMore 变量名不同）。
- 成员/详情侧边数据加载参数
  - 详情侧边栏列表与成员详情页对 `group` 仍使用显示名或原始值，未通过 `GroupConfig.getApiName` 统一（见上文相关文件）。
- 其他导航直改 hash 残留
  - 成员详情返回/跳转等仍直接 `window.location.hash = ...`（`sakamichi-blog-frontend/js/member-detail.js:639-647`）。

---

**新增发现（前次清单未明确指出）**
- `js/router.js:211` 获取博客详情时未走 `window.API_BASE_URL`，应与其他模块一致。
- `sakamichi-blog-frontend/index.html:1287` 顶层 `let currentBlogData = null` 用于下载模块共享；跨脚本可见性在大多数环境可用，但非 `window` 属性，稳定性略逊。与 `js/image-download.js` 的直接标识符访问配合可工作，但建议明确为 `window.currentBlogData` 以避免环境差异。

---

**优先修复建议（不在此处提交代码）**
- 统一 API 基础地址与团体参数
  - 将 `js/router.js:211`、`js/blog-detail-sidebar.js:211-216`、`js/member-detail.js:578`、`js/image-download.js:12`、`js/mobile-download.js:233` 等改为：`const apiBase = window.API_BASE_URL || FALLBACK`，并通过 `GroupConfig.getApiName(...)` 生成 `group` 参数。
- 移除或并入旧分页逻辑
  - 若已采用 `js/pagination.js`，删除 `sakamichi-blog-frontend/index.html:1373-1484` 的旧分页代码，避免事件与状态冲突；或改写为单点调用 Pagination 模块。
- 搜索一致性
  - `js/app.js:540-556` 中搜索参数 `group` 使用 `GroupConfig.getApiName(currentGroup)`。
  - 将 `js/app.js:719-749` 内 `GROUP_INFO[...]` 替换为 `window.GroupConfig` 的 `getByName/getDisplayName/getEmoji` 等取值。
- 导航统一
  - 将成员页的日期/返回等跳转统一走 `Router.navigate`，保留直改 hash 作为降级回退（`sakamichi-blog-frontend/js/member-page.js:675-678, 820-833`，`sakamichi-blog-frontend/js/member-detail.js:639-647`）。
- 图片下载共享数据
  - 将 `sakamichi-blog-frontend/index.html:1287` 的 `currentBlogData` 提升为 `window.currentBlogData`，并在引用处使用同名以增强跨脚本一致性。

---

**验证要点（供后续自测）**
- `#all` 无限滚动触发与分页页面切换是否互不干扰（观察 `loadingMore` 哨兵与 `Pagination` 显隐）。
- 搜索与成员建议：不同团体筛选下，搜索结果与建议中的团体名称/emoji 是否正确展示且无控制台错误（`GROUP_INFO` 相关）。
- 详情页侧边栏与成员详情页：API 请求 URL 是否均走 `window.API_BASE_URL`，`group` 参数是否映射为接口名。
- 分页跳页后偏移量是否正确（页码以 1 为基），按钮是否只触发一次请求。

---

本次二次复核确认：核心主线已稳定，剩余问题集中在“API 地址统一 + 团体参数映射”“搜索建议依赖修复”“旧分页遗留清理”“少量直改 hash 导航”。优先完成上述项即可全面收敛。

