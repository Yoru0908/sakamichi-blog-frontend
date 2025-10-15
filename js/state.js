/**
 * 统一状态管理模块
 * 集中管理所有应用状态，避免重复定义
 * 
 * 解决的问题：
 * - currentGroup 在多处定义（window, Router, MemberPage）
 * - currentPage 在多处定义（window, Pagination）
 * - currentMember 在多处定义（Router, MemberPage）
 * - 等等...
 */

// 创建 App 全局命名空间（如果不存在则创建，否则扩展）
if (typeof window.App === 'undefined') {
  window.App = {};
}
// 保留已存在的子对象（如 App.ui）
window.App = window.App || {};

// ===== 应用状态 =====
window.App.state = {
  // 页面状态
  page: 1,              // 当前页码（1-based）
  group: 'all',         // 当前团体（all/nogizaka/sakurazaka/hinatazaka）
  member: '',           // 当前成员（用于成员页面）
  search: '',           // 搜索关键词
  
  // 加载状态
  loading: false,       // 主加载状态
  loadingMore: false,   // 无限滚动追加加载状态
  hasMore: true,        // 是否还有更多数据
  totalPages: 1,        // 总页数
  
  // 缓存
  blogs: []             // 缓存的博客数据
};

// ===== 应用配置 =====
window.App.config = {
  apiBaseUrl: ''        // API基础URL
};

// ===== 路由状态 =====
window.App.router = {
  view: null,           // 当前视图（group/member/blog）
  blogId: null          // 当前博客ID
};

// ===== 视图数据 =====
window.App.view = {
  currentBlog: null     // 当前显示的博客数据
};

// ===== 双语控件 =====
window.App.bilingual = {
  control: null,        // BilingualControl实例
  Class: null          // BilingualControl类
};

// ===== 向后兼容：保留旧的全局变量引用 =====
// 使用 getter/setter 实现双向同步
Object.defineProperties(window, {
  currentPage: {
    get() { return App.state.page; },
    set(val) { App.state.page = val; },
    configurable: true
  },
  currentGroup: {
    get() { return App.state.group; },
    set(val) { App.state.group = val; },
    configurable: true
  },
  currentSearch: {
    get() { return App.state.search; },
    set(val) { App.state.search = val; },
    configurable: true
  },
  isLoading: {
    get() { return App.state.loading; },
    set(val) { App.state.loading = val; },
    configurable: true
  },
  hasMore: {
    get() { return App.state.hasMore; },
    set(val) { App.state.hasMore = val; },
    configurable: true
  },
  totalPages: {
    get() { return App.state.totalPages; },
    set(val) { App.state.totalPages = val; },
    configurable: true
  },
  allBlogs: {
    get() { return App.state.blogs; },
    set(val) { App.state.blogs = val; },
    configurable: true
  }
});

console.log('[state.js] ✅ 统一状态管理已初始化');
console.log('[state.js] 初始状态:', App.state);
