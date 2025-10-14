# 前端修复 Review 汇总（index.html + js/app.js 及相关模块）

本报告基于最新代码现状，对既有冲突清单（CONFLICT_DETAILS_PART1/2）与 MODULES.md 的建议逐项核对，给出“已解决/仍待处理”的结果与具体建议。仅文档汇总，不直接修改代码。

更新时间以仓库当前文件为准：sakamichi-blog-frontend/index.html 与 js/*.js。

## 总览结论
- 主要冲突（loadBlogs、卡片渲染、无限滚动、导航方式）大部分已按建议收敛到 app.js 或 Router，整体方向正确。
- 仍有少量残留不一致（页码起始、API 基础地址引用、group 参数映射、个别直改 hash、搜索建议中的分组信息引用），建议按下文逐项优化，以完全消除潜在冲突与隐藏 bug。

---

## 冲突核对与状态

1) loadBlogs 实现来源
- 现状：index.html 已删除本地 loadBlogs 实现，统一使用 app.js 的 `window.loadBlogs`（符合预期）。
- 结论：已解决。

2) 卡片渲染来源与结构
- 现状：app.js 中 `displayBlogs/appendBlogs` 优先使用 `window.renderBlogItem`（index.html 提供），否则回退 `createBlogCard`（app.js）。index.html 暴露 `window.renderBlogItem`，统一样式来源。点击事件两侧均改为优先 Router（app.js: createBlogCard；index.html: renderBlogItem）。
- 结论：已解决（样式统一且导航统一）。

3) 导航方式（Router vs 直接改 hash）
- 现状：
  - app.js 的 `createBlogCard` 与 `toggleBlogContent` 已优先使用 `Router.navigate`，再回退 hash（js/app.js:364-380, 744-752）。
  - index.html 的 `renderBlogItem` 使用 `Router.navigate`。
  - 仍有个别处直接使用 `window.location.hash`：
    - `js/member-page.js:828` 日期筛选直接 `window.location.hash = #blog/{id}`。
    - `js/member-page.js:678` 回退分支也会 `window.location.hash = currentGroup`。
    - `js/member-detail.js:643/647` 多处 `window.location.hash = ...`。
- 结论：部分已解决。建议：这些直改 hash 的调用点也统一改为 Router.navigate（保留回退分支）。

4) 分页/无限滚动策略统一
- 现状：
  - index.html 中的 `loadMoreBlogs/setupInfiniteScroll` 已删除，改为使用 app.js 的统一实现与 `#loadingMore` 哨兵（index.html:1278-1279 的注释）。
  - app.js 中仅在 `#all` 页面启用无限滚动，其他页面使用分页（js/app.js:857-919）。
- 结论：已解决。

5) 团体参数（API 使用的 group）统一
- 现状：
  - app.js 在 `loadBlogs()` 中使用 `GroupConfig.getApiName(currentGroup)`（js/app.js:213-219），符合建议。
  - index.html 的 `loadGroupInfo(group)` 使用 `GroupConfig.getDisplayName(group)` 作为 API 参数（index.html:339-353）。若后端按中文存储，此用法可工作，但与全站“统一使用 API 名称映射”的策略不一致。
- 风险：不同模块对 group 参数使用“显示名/接口名”不一致，易埋隐性 bug。
- 结论：部分已解决。建议：统一改用 `GroupConfig.getApiName(group)` 作为请求参数，显示时再用 DisplayName。

6) 页码与全局状态（0/1 起始、window.*）
- 现状：
  - app.js 使用 `window.currentPage`（从 1 开始）。
  - index.html 中切换/筛选处仍设置 `currentPage = 0` 且同时操作 `hasMoreBlogs/isLoadingMore`（index.html:303-305, 552-554）。这些变量未以 `window.` 明确挂载，且 0 基页码会导致 app.js 的偏移量变为 -32（严重）。
- 结论：未解决（高优先级）。建议：
  - 将 index.html 中的相关赋值改为 `window.currentPage = 1`，并移除/避免直接写 `hasMoreBlogs/isLoadingMore`（统一由 app.js 管理 `window.hasMore`）。
  - 切换或筛选后应仅导航（或仅一次 `loadBlogs`），避免重复触发与状态错乱。

7) API 基础地址统一（window.API_BASE_URL）
- 现状：
  - index.html 详情加载等已改为 `const apiBase = window.API_BASE_URL || 'https://...'`（index.html:1169, 1243），总体 OK。
  - `js/blog-detail-sidebar.js:211` 仍使用硬编码 `const API_BASE = 'https://...'`。
  - `js/member-detail.js:578` 使用 `window.API_BASE`（未定义），应为 `window.API_BASE_URL`。
- 结论：部分已解决。建议：统一改为 `const apiBase = window.API_BASE_URL || FALLBACK`，并优先通过 `GroupConfig.getApiName()` 生成查询参数。

8) 搜索与建议（服务端 vs 本地）
- 现状：
  - app.js 的 `enhanceSearchInput/performSearch` 已启用服务端搜索与成员建议，行为符合预期。
  - 细节问题：
    - `performSearch()` 传参 `group: currentGroup !== 'all' ? currentGroup : ''`（js/app.js:531-538），未统一用 `GroupConfig.getApiName()`。
    - `displayMemberSuggestions()` 使用未定义的 `GROUP_INFO`（js/app.js:716-719）。应改用 `window.GroupConfig`（`getByName`/`getDisplayName`/扩展配置）。
- 结论：大方向已解决；存在两处小 bug。建议：
  - 搜索时 group 参数也用 `GroupConfig.getApiName(currentGroup)`；
  - 将 `GROUP_INFO[...]` 替换为 `window.GroupConfig` 的相应取值。

9) 详情页侧边栏数据加载
- 现状：
  - `js/blog-detail-sidebar.js` 使用硬编码 API 地址，且 group 直接用 `blog.group_name`（js/blog-detail-sidebar.js:211-221）。
- 结论：未解决。建议：
  - 使用 `window.API_BASE_URL`；
  - 对 group 参数使用 `GroupConfig.getApiName(blog.group_name)`（若 `blog.group_name` 为显示名则需先映射）。

10) 成员详情页加载与导航
- 现状：
  - `js/member-detail.js:578` 使用 `window.API_BASE`（未定义）；
  - 多处仍直接 `window.location.hash`（js/member-detail.js:643, 647）。
- 结论：未解决。建议：
  - 统一改用 `window.API_BASE_URL`；
  - 导航统一优先 `Router.navigate`，保留回退分支。

11) 备份型分页函数残留
- 现状：index.html 中 `updatePagination/createPageButton/jumpToPage` 等仍在（index.html:1368-1484），但 app.js 只调用外部 `Pagination` 模块，不使用这些函数。
- 结论：可清理。建议：如未被调用，后续可删除以降低维护成本，或显式接入 Pagination 模块。

12) 图片提取依赖的跨脚本变量可见性
- 现状：index.html 中 `let currentBlogData = null;`（index.html:1291 左右），`js/image-download.js` 直接读取 `currentBlogData` 全局。
- 风险：顶层 `let` 不是 `window` 属性，在部分环境可能出现跨脚本可见性问题。
- 建议：采用 `window.currentBlogData` 读写，确保与下载模块一致。

---

## 与 CONFLICT_DETAILS_PART1/2 的一致性核对
- PART1 中关于 loadBlogs、卡片渲染、API 配置、导航方式统一的建议基本已落地；新增的“团体参数一致性”“无限滚动哨兵一致性”也已按建议处理。
- PART2 中关于搜索、无限滚动、初始化流程与团体配置的建议基本正确；本次 review 补充了：
  - 页码起始与全局状态残留（currentPage=0 造成负偏移）；
  - 搜索建议中 `GROUP_INFO` 未定义；
  - blog-detail-sidebar 与 member-detail 的 API_BASE 未统一；
  - 个别直改 hash 的导航未统一 Router。

---

## 建议的最小改动清单（不在此处提交，仅供参考）
- index.html
  - switchGroup/filterByMember：将 `currentPage = 0` 调整为 `window.currentPage = 1`；避免直接写 `hasMoreBlogs/isLoadingMore`；调用导航或一次 `loadBlogs` 即可。
  - loadGroupInfo：请求参数 `group` 改为 `GroupConfig.getApiName(group)`，显示名通过 `getDisplayName` 获取。
  - 若 Pagination 模块可用，移除未用的本地分页函数。
- js/app.js
  - performSearch：`group` 参数使用 `GroupConfig.getApiName(currentGroup)`；
  - displayMemberSuggestions：替换 `GROUP_INFO[...]` 为 `window.GroupConfig` 的取值（emoji/name）。
- js/blog-detail-sidebar.js
  - 统一使用 `window.API_BASE_URL` + `GroupConfig.getApiName(...)`。
- js/member-page.js / js/member-detail.js
  - 导航统一优先 `Router.navigate`，保留回退；
  - member-detail：将 `window.API_BASE` 改为 `window.API_BASE_URL`；group 参数走 `getApiName`。
- 图片下载
  - 将 `currentBlogData` 切换为 `window.currentBlogData`（index.html 与 image-download.js 对齐）。

---

## 结语
整体修复方向正确：核心加载、渲染、滚动、导航已以 app.js/Router 为中心。建议优先处理“页码起始/全局状态写入（index.html 仍写 0 基页码）”“API 地址与 group 映射一致性（侧边栏/成员详情）”“搜索建议 GROUP_INFO 未定义”三处高影响问题，以确保所有路径一致、避免偶发错误。

