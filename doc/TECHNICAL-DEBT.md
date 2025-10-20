# 技术债务清单

> 记录已知的代码质量问题和待优化项，按优先级排序

---

## ✅ 已完成的优化

### P0 - 严重问题（已修复 2025-10-19）

#### 1. BilingualControl 事件监听器内存泄漏 ✅
- **问题**：`document.addEventListener` 的监听器在 `destroy()` 中未清理
- **影响**：每次路由切换累积监听器，导致内存泄漏
- **修复**：
  - 保存监听器引用（`documentClickHandler`, `keydownHandler`）
  - 在 `destroy()` 中正确调用 `removeEventListener`
- **提交**：`bd214c6`

#### 2. SPA 导航强制刷新 ✅
- **问题**：侧边栏的 NEW ENTRY 和日历使用 `location.reload()`
- **影响**：破坏 SPA 体验，页面闪烁，状态丢失
- **修复**：
  - 使用 `Router.navigate()` 替代 `location.reload()`
  - 添加 `event.preventDefault()` 防止默认行为
- **提交**：`bd214c6`

#### 3. 脆弱选择器 ✅
- **问题**：双语控件使用 4 个备选选择器猜测挂载点
- **影响**：页面结构变化时可能插入到错误位置
- **修复**：
  - 添加固定挂载点 `<div id="bilingualControlMount"></div>`
  - 简化挂载逻辑，移除脆弱的多选择器
- **提交**：`bd214c6`

---

## ⚠️ 待优化项（P2 - 可维护性改进）

### 1. 颜色硬编码

**现状**：
- 共 **152 处硬编码颜色值** 分布在 6 个 CSS 文件
  - `main-styles.css`: 73 处
  - `mobile.css`: 23 处
  - `dark-theme.css`: 21 处
  - `bilingual.css`: 20 处
  - `calendar-component.css`: 12 处
  - `transitions.css`: 3 处

**问题**：
- ❌ 颜色分散在各文件，难以统一调整
- ❌ 暗色主题需要逐个覆盖，维护成本高
- ❌ 品牌色调整需要全局搜索替换

**典型案例**：
```css
/* main-styles.css - 硬编码示例 */
body {
  background-color: #fafafa;  /* 应该使用变量 */
  color: #333;                /* 应该使用变量 */
}

.blog-card {
  background: white;          /* 应该使用变量 */
  border: 1px solid #e8e8e8;  /* 应该使用变量 */
}
```

**建议方案**：
```css
/* 渐进式引入 CSS 变量（2 层结构） */
:root {
  /* 基础色板 */
  --white: #ffffff;
  --gray-50: #fafafa;
  --gray-800: #333;
  
  /* 语义色（直接应用，避免多层继承） */
  --bg-page: var(--gray-50);
  --bg-card: var(--white);
  --text-primary: var(--gray-800);
  --border-default: #e8e8e8;
}

.dark-theme {
  --bg-page: #1a1a1a;
  --bg-card: #242424;
  --text-primary: #e5e7eb;
  --border-default: #374151;
}

/* 使用变量 */
body {
  background-color: var(--bg-page);
  color: var(--text-primary);
}
```

**优先级**：P2  
**建议时机**：下次 UI 大改版时  
**预计工作量**：2-3 小时  
**实施策略**：
1. 先创建 `css/variables.css` 定义 20-30 个核心变量
2. 渐进式迁移高频颜色值（背景、文字、边框）
3. 下次添加新组件时优先使用变量

---

### 2. 魔法数字分散

**现状**：
- 共 **31 处 `setTimeout` 调用** 分布在 9 个 JS 文件
  - `app.js`: 8 处
  - `member-page.js`: 6 处
  - `utils.js`: 4 处
  - `page-transitions.js`: 3 处
  - 其他文件：10 处

**问题**：
- ❌ 相同语义的数值不一致（如延迟有 50ms、100ms、200ms）
- ❌ 修改时需要全局搜索，容易遗漏
- ❌ 缺乏语义化命名，难以理解用途

**典型案例**：
```javascript
// app.js - 时间魔法数字
setTimeout(() => controller.abort(), 5000);        // 健康检查超时
setTimeout(() => window.observeElements(cards), 50); // 动画延迟
setTimeout(() => errorDiv.remove(), 3000);         // 错误提示

// utils.js - 相同语义但不同值
setTimeout(() => {
  toast.style.opacity = '0';
  setTimeout(() => toast.remove(), 300);  // 淡出时间
}, 3000);  // 显示时长

// blog-detail-sidebar.js - 布局魔法数字
sidebar.style.top = '80px';  // Sticky 定位
await new Promise(resolve => setTimeout(resolve, 100));  // 延迟
```

**建议方案（简化版）**：
```javascript
// 方案1: 文件级常量（推荐，避免过度设计）

// app.js 顶部
const TIMING = {
  API_TIMEOUT: 5000,
  ANIMATION_DELAY: 50,
  ERROR_DURATION: 3000
};

// utils.js 顶部
const TIMING = {
  TOAST_DURATION: 3000,
  FADE_OUT: 300
};

// blog-detail-sidebar.js 顶部
const LAYOUT = {
  STICKY_TOP: '80px',
  DOM_READY_DELAY: 100
};

// 使用
setTimeout(() => controller.abort(), TIMING.API_TIMEOUT);
setTimeout(() => errorDiv.remove(), TIMING.ERROR_DURATION);
sidebar.style.top = LAYOUT.STICKY_TOP;
```

**不推荐方案**：
```javascript
// ❌ 全局常量系统 - 过度设计
window.AppConstants = {
  TIMEOUT_API_REQUEST: 5000,
  TIMEOUT_HEALTH_CHECK: 5000,
  DURATION_FADE_OUT: 300,
  // ... 40+ 个常量
};
Object.freeze(window.AppConstants);
```

**优先级**：P2  
**建议时机**：发现时间不一致导致问题时，或添加新功能时  
**预计工作量**：30 分钟 - 1 小时  
**实施策略**：
1. **不要**创建全局常量系统
2. 在各文件顶部定义文件级常量
3. 只提取真正需要统一的值（如相同语义的时间）
4. 新代码优先使用常量，旧代码按需重构

---

## 📊 优先级总结

| 问题 | 当前状态 | 真实影响 | 优先级 | 建议时机 |
|------|---------|---------|--------|---------|
| **事件监听器泄漏** | ✅ 已修复 | 内存泄漏 | P0 | - |
| **SPA 强制刷新** | ✅ 已修复 | 用户体验差 | P0 | - |
| **脆弱选择器** | ✅ 已修复 | 插入位置错误 | P0 | - |
| **颜色硬编码** | ⚠️ 待优化 | 主题维护困难 | P2 | UI 改版时 |
| **魔法数字** | ⚠️ 待优化 | 难以统一调整 | P2 | 发现不一致时 |

---

## 🎯 实施原则

1. **简单优先** - 避免过度设计，选择最简单的解决方案
2. **渐进式改进** - 不要一次性重构，按需逐步优化
3. **权衡成本** - 评估收益是否大于投入的时间
4. **保持一致** - 新代码遵循最佳实践，旧代码机会性重构

---

## 📚 参考文档

- [CODE_REVIEW_FRONTEND_2025-10-16.md](./CODE_REVIEW_FRONTEND_2025-10-16.md) - 原始代码审查报告
- [前端问题验证报告](../README.md) - 问题验证和修复记录

---

**最后更新**：2025-10-19  
**维护人**：Development Team
