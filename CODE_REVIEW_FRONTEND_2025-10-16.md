# Frontend Code Review — Hardcoded Values & Duplicate Initialization

## Summary
- **[duplicate_init]** 双语控件 `BilingualControl` 存在重复初始化后的资源清理不全，易导致全局事件监听器累积、移动端控件残留。
- **[hardcoded_endpoints]** 部分 API 调用未统一使用 `API_BASE_URL` 配置，直接写死域名，和 `app.js` 的健康检查与回退策略不一致。
- **[hardcoded_colors]** CSS 中分散存在大量十六进制颜色值，缺少集中化的主题变量管理；同时有较多内联样式，降低可维护性与主题切换一致性。
- **[magic_numbers]** 多处超时、动画间隔、布局尺寸等“魔法数字”散落在代码中，未通过常量或配置集中管理。
- **[fragile_selectors]** 选择器依赖脆弱：通过一组兜底选择器去定位挂载点，容易在结构变动时插入到不期望位置。
- **[duplicated_logic]** 构建“原文链接”的逻辑在 `index.html` 的两个加载函数中重复出现，可抽取为公共方法。

---

## Findings

- **[duplicate_init] 双语控件重复初始化的后遗症**
  - 文件：`sakamichi-blog-frontend/index.html`
    - 在 `loadBlogContentWithData()` 和 `loadBlogContent()` 中均存在实例化 `new BilingualControl()` 的逻辑（先 `destroy()` 再创建）。这两个函数不会在同一次详情渲染中同时执行，但只要多次打开不同博客详情页，就会多次执行该初始化流程。
    - 代码位置参考：
      - `loadBlogContentWithData` 内：`requestAnimationFrame(() => { /* destroy if exists */ window.bilingualControl = new BilingualControl(); })`
      - `loadBlogContent` 内：相同的 `requestAnimationFrame` 初始化块。
  - 文件：`sakamichi-blog-frontend/js/bilingual-control-v2.js`
    - `bindEvents()` 中使用了全局监听：
      - `document.addEventListener('click', ...)` 用于点击外部关闭下拉
      - `document.addEventListener('keydown', ...)` 用于快捷键（1/2/3）
      - 这些是挂在 `document` 的全局监听器，当前 `destroy()` 并未移除，导致每次进入详情页都会新增一组监听器，出现重复触发与内存增长风险。
    - `insertMobileFab()` 插入了带有 `#fabOverlay`, `#fabContainer`, `#fabMain` 的 DOM。`destroy()` 却尝试移除 `#bilingualFab`、`#bilingualModal`（旧版本 ID），与当前实现不匹配，导致移动端 FAB 与遮罩层在多次初始化后残留多份 DOM。
    - `destroy()` 仅删除了 `#languageSelector`（桌面端选择器），未清理：
      - 全局事件监听（document click/keydown）
      - `#fabOverlay`、`#fabContainer`、`#fabMain` 等移动端插入元素
    - 影响：
      - 多次进入不同博客详情页后，文档级事件监听器不断累积，操作一次控件可能触发多次回调；移动端会出现多个重叠的 FAB/遮罩。

- **[hardcoded_endpoints] API 调用未统一**
  - 文件：`sakamichi-blog-frontend/js/router.js`
    - `showBlogDetail(blogId)` 中直接使用：
      - `fetch('https://sakamichi-blog-translator.srzwyuu.workers.dev/api/blogs/${blogId}')`
    - 该调用绕过了 `app.js` 的 `ensureApiBaseUrl()` 与 `API_BASE_URL`/`App.config.apiBaseUrl`，与其余模块不一致。
  - 文件：`sakamichi-blog-frontend/index.html`
    - 多处使用 `const apiBase = window.API_BASE_URL || 'https://sakamichi-blog-translator.srzwyuu.workers.dev';`
    - 与 `app.js` 中通过健康检查动态确定 API 的策略存在重复与分歧，建议统一只读 `App.config.apiBaseUrl`。

- **[hardcoded_colors] 颜色硬编码与内联样式较多**
  - 统计（通过 grep）：
    - `css/main-styles.css`（63 处十六进制颜色）
    - `css/mobile.css`（23 处）
    - `css/dark-theme.css`（21 处）
    - `css/bilingual.css`（20 处）
    - `css/calendar-component.css`（12 处）
    - `css/transitions.css`（3 处）
  - 典型内联样式（`sakamichi-blog-frontend/index.html`）：
    - `style="height: 36px;"`（搜索框）
    - `style="grid-template-columns: 1fr 320px; gap: 32px;"`（详情页两栏布局）
    - `style="position: sticky; top: 80px; ..."`（右侧侧边栏）
  - 文件：`sakamichi-blog-frontend/js/blog-detail-sidebar.js`
    - `refreshStickyPosition()` 中硬编码 `sidebar.style.top = '80px'`。

- **[magic_numbers] 魔法数字分散**
  - 文件：`sakamichi-blog-frontend/js/app.js`
    - 健康检查超时：`setTimeout(..., 5000)`
    - 动画/观察延迟：`setTimeout(..., 50)`、`setTimeout(..., 100)`
    - 自动刷新：`5 * 60 * 1000`
    - 无限滚动观察器：`rootMargin: '200px'`
  - 文件：`sakamichi-blog-frontend/index.html`
    - 事件绑定重试：`maxAttempts = 5`、`setTimeout(bindEvents, 500)`、多处 `100ms`
  - 文件：`sakamichi-blog-frontend/js/utils.js`
    - 提示淡出与移除：`300ms`、`3000ms`
  - 文件：`sakamichi-blog-frontend/js/blog-detail-sidebar.js`
    - 初始化小延迟：`setTimeout(..., 100)`、`setTimeout(..., 100)`

- **[fragile_selectors] 选择器脆弱**
  - 文件：`sakamichi-blog-frontend/js/bilingual-control-v2.js`
    - `insertDesktopSelector()` 通过
      - `document.querySelector('#downloadAllBtn, .action-btn.primary, .download-button, [data-action="download"]')`
    - 这种“猜测式”多选择器在页面结构变更时容易命中错误位置，导致控件插入到不期望的容器附近。

- **[duplicated_logic] 逻辑重复**
  - 文件：`sakamichi-blog-frontend/index.html`
    - 在 `loadBlogContentWithData()` 与 `loadBlogContent()` 中，构建原文链接（乃/樱/日向 3 个域名 + 提取数字 ID）的逻辑重复存在。

- **[reload_navigation] SPA 场景下的强制刷新**
  - 文件：`sakamichi-blog-frontend/js/blog-detail-sidebar.js`
    - NEW ENTRY 列表项 `onclick="location.reload();"` 强制刷新整页，不符合当前 Router 的 SPA 导航模式。
    - 虽然能够规避某些状态问题，但会带来闪烁与状态丢失，可考虑统一走 `Router.navigate('#blog/{id}')`。

---

## Impact
- **可维护性下降**：颜色与布局硬编码分散，主题与暗色模式扩展成本高；
- **稳定性风险**：`BilingualControl` 的全局事件监听与移动端 DOM 未清理，易导致重复触发与 UI 残影；
- **一致性问题**：API 访问路径未统一，出现绕过健康检查与本地/线上切换策略的调用；
- **性能隐患**：文档级监听器累积、重复 DOM 插入，在长时间使用或频繁打开详情页后尤为明显。

---

## Recommendations

- **[fix_destroy] 修复 `BilingualControl.destroy()` 的清理逻辑**
  - 记录并移除全局事件监听器：
    - 为 `document.click`、`document.keydown` 保存引用，在 `destroy()` 中 `removeEventListener`。
  - 对齐 ID：成对清理 `insertMobileFab()` 注入的 `#fabOverlay`、`#fabContainer`、`#fabMain`。
  - 增加“已初始化”守卫：在初始化前检查是否已存在实例，必要时只刷新状态而非重复插入 DOM。

- **[mount_point] 提供稳定挂载点**
  - 在详情页操作区旁提供固定挂载容器（例如：`<div id="bilingualControlsMount"></div>`），避免通过多选择器猜测插入点。

- **[api_unify] 统一 API 基础 URL**
  - 仅使用 `App.config.apiBaseUrl` 或 `window.API_BASE_URL`；
  - `router.js` 中改用该配置，避免直连固定域名。

- **[css_tokens] 引入主题设计令牌**
  - 在 `:root` 与 `.dark-theme` 定义颜色变量（如 `--color-bg`, `--color-text`, `--primary`, `--muted` 等）；
  - 将 `main-styles.css`、`dark-theme.css`、`bilingual.css` 等中的十六进制颜色替换为 CSS 变量；
  - 将 `index.html` 内联样式迁移到样式表中，复用变量与类。

- **[constants] 提取魔法数字**
  - 新增 `js/constants.js`（或集中到 `app.js` 顶部）：
    ```js
    export const TIMEOUTS = { healthCheckMs: 5000, uiBindRetryMs: 500, toastFadeMs: 300, toastShowMs: 3000 };
    export const SCROLL = { rootMargin: '200px' };
    export const LAYOUT = { sidebarTopPx: 80, detailGapPx: 32, detailAsideWidthPx: 320 };
    export const STORAGE_KEYS = { theme: 'sakamichi-theme', bilingualMode: 'bilingualDisplayMode' };
    ```
  - 各处引用常量，便于统一调整与审计。

- **[dedupe_link_builder] 抽取“原文链接”构建函数**
  - 在一个工具函数中完成：根据 `blog.id` / `blog.group_name` 选择域名并拼接数字 ID，减少重复与不一致风险。

- **[spa_nav] 统一使用 Router 导航**
  - 将 `location.reload()` 改为 `Router.navigate('#blog/{id}')`，并在 Router/详情页保证状态刷新与视图更新。

---

## Concrete References
- `sakamichi-blog-frontend/js/bilingual-control-v2.js`
  - `insertMobileFab()` 创建 `#fabOverlay`、`#fabContainer`、`#fabMain`
  - `bindEvents()` 注册到 `document` 的全局监听
  - `destroy()` 仅删除 `#languageSelector`，误删旧 ID（`#bilingualFab`/`#bilingualModal`）
- `sakamichi-blog-frontend/index.html`
  - `window.showBlogDetail()` → `loadBlogContentWithData()`/`loadBlogContent()` 中均在内容渲染后 `new BilingualControl()`
  - 多处内联样式；原文链接构建逻辑重复
- `sakamichi-blog-frontend/js/router.js`
  - `showBlogDetail(blogId)` 直连固定 Worker 域名，未使用 `API_BASE_URL`
- `sakamichi-blog-frontend/js/blog-detail-sidebar.js`
  - `refreshStickyPosition()` 硬编码 `top: 80px`

---

## Suggested Next Steps
- **[P1]** 修复 `BilingualControl.destroy()` 清理与移动端元素 ID 对齐；为全局监听器添加移除逻辑。
- **[P1]** 统一 API 基础 URL 使用，去除硬编码域名。
- **[P2]** 建立 CSS 主题变量体系，替换高频硬编码颜色值；迁移明显的内联样式。
- **[P2]** 抽取“原文链接”工具函数，消除重复逻辑。
- **[P3]** 建立 `constants.js` 并替换分散的魔法数字。
- **[P3]** 将 NEW ENTRY 的导航切换为 Router 导航，避免整页刷新。
