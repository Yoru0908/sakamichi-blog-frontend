# 路由和分页机制详解

## 1. 重置页码的作用

### 什么是页码 (currentPage)？

```javascript
window.currentPage = 1;  // 当前显示的是第几页
```

### 为什么需要页码？

**场景示例**：

假设你的博客网站有103篇博客，每页显示16篇：

```
第1页: 博客 1-16   (offset=0,  limit=16)
第2页: 博客 17-32  (offset=16, limit=16)
第3页: 博客 33-48  (offset=32, limit=16)
第4页: 博客 49-64  (offset=48, limit=16)
...
```

**API请求公式**：
```javascript
offset = (currentPage - 1) * blogsPerPage
```

例如：
- `currentPage = 1` → `offset = 0`  → 获取博客 1-16
- `currentPage = 2` → `offset = 16` → 获取博客 17-32
- `currentPage = 3` → `offset = 32` → 获取博客 33-48

---

## 2. 重置页码的场景

### 场景A: Router.showGroupPage() 中的重置

**位置**: `js/router.js` line 82

```javascript
async showGroupPage(group) {
  window.currentPage = 1;  // ← 这里重置
  // ...
  await loadBlogs();
}
```

**作用**: 当**切换团体**时，重置到第1页

**例子**：

```
用户操作流程：

1. 访问 #nogizaka (乃木坂46)
   → currentPage = 1
   → 显示乃木坂博客 1-16

2. 滚动加载更多
   → currentPage = 2
   → 显示乃木坂博客 1-32

3. 用户点击切换到 #sakurazaka (樱坂46)
   → Router.showGroupPage('sakurazaka') 被调用
   → currentPage = 1  ✅ 重置！因为要显示樱坂的第1页，不是第2页
   → 显示樱坂博客 1-16
```

**如果不重置会怎样？**

```
3. 用户点击切换到 #sakurazaka
   → currentPage = 2  ❌ 没有重置！
   → offset = 16
   → 显示樱坂博客 17-32  ❌ 错误！跳过了前16篇
```

---

### 场景B: index.html 的 switchGroup() 中的重置

**位置**: `index.html` line 303

```javascript
async function switchGroup(group) {
  window.currentPage = 1;  // ← 这里也重置
  // ...
  await loadBlogs();
}
```

**作用**: 同样是切换团体时重置

**问题**: 这和 Router 的功能**重复了**！

---

## 3. switchGroup() 函数的功能

### 定义位置
`index.html` line 294-337

### 完整功能

```javascript
async function switchGroup(group) {
  // 1. 关闭博客详情页（如果打开的话）
  if (detailPage) {
    closeBlogDetail();
  }
  
  // 2. 设置全局变量
  window.currentGroup = group;    // 当前团体
  window.currentPage = 1;         // 重置页码
  window.currentSearch = '';      // 清空搜索
  window.hasMore = true;          // 重置"还有更多"标志
  window.isLoading = false;       // 重置加载状态
  
  // 3. 同步菜单状态（高亮当前选中的标签）
  syncMenuActiveState(group);
  
  // 4. 显示/隐藏团体信息
  if (group !== 'all') {
    // 显示团体信息和成员列表
    groupInfo.classList.remove('hidden');
    memberListSection.classList.remove('hidden');
    await loadGroupInfo(group);  // 加载团体的成员数据
  } else {
    // #all 页面不显示团体信息
    groupInfo.classList.add('hidden');
    memberListSection.classList.add('hidden');
  }
  
  // 5. 加载博客列表
  await loadBlogs();
}
```

---

## 4. Router vs switchGroup 的关系

### 当前架构（有重复）

```
用户点击标签 "乃木坂46"
    ↓
标签的 onclick → Router.navigate('#nogizaka')
    ↓
Router 修改 URL → window.location.hash = '#nogizaka'
    ↓
触发 hashchange 事件
    ↓
Router.handleRoute() 被调用
    ↓
Router.showGroupPage('nogizaka') 被调用
    ↓
    调用 → window.switchGroup('nogizaka')  ← index.html 中的函数
    ↓
最终加载博客
```

### 问题：双重重置

```javascript
// router.js
Router.showGroupPage(group) {
  window.currentPage = 1;  // ← 第1次重置
  blogsContainer.innerHTML = '';  // ← 第1次清空
  switchGroup(group);  // 调用 switchGroup
}

// index.html
switchGroup(group) {
  window.currentPage = 1;  // ← 第2次重置（重复！）
  await loadBlogs();
}
```

**这导致了两次重置、两次清空，造成性能浪费。**

---

## 5. 无限滚动时为什么会跳回顶部？

### 问题流程

```
1. 用户在 #all 页面
   currentPage = 1
   显示博客 1-16

2. 用户滚动到底部
   → 触发无限滚动
   → currentPage = 2
   → 加载博客 17-32
   → 追加到页面（现在显示 1-32）

3. ❌ 某个原因触发了 Router.showGroupPage('all')
   → currentPage = 1  （重置！）
   → blogsContainer.innerHTML = ''  （清空！）
   → 重新加载博客 1-16
   → 页面跳回顶部
```

### 可能触发 Router 的原因

1. **hashchange 事件被重复触发**
   - 某个代码修改了 hash
   - 即使 hash 没变，也可能触发事件

2. **手动调用了 switchGroup()**
   - 某个事件监听器调用了它

3. **浏览器的前进/后退按钮**
   - popstate 事件触发

---

## 6. 我的修复方案

### 修复1: 防止 Router 重复调用

```javascript
// router.js line 71-74
async showGroupPage(group) {
  // ✅ 检查：如果已经在当前页面，不重新加载
  if (this.currentView === 'group' && 
      this.currentGroup === group && 
      window.currentGroup === group) {
    console.log('[Router] 已经在当前团体页面，跳过重新加载');
    return;  // 直接返回，不清空，不重置
  }
  
  // 只有真正切换团体时才重置
  window.currentPage = 1;
  blogsContainer.innerHTML = '';
  // ...
}
```

**效果**：
- 第1次访问 #all → 正常加载
- 无限滚动加载更多 → currentPage = 2
- 如果 Router 再次被调用 → 检测到已经在 #all，直接返回
- **不清空容器，不重置页码**
- 页面保持在底部 ✅

---

## 7. 为什么需要两个地方都重置页码？

### 答案：不需要！这是重复的。

**理想架构**：

```
方案A: 只在 Router 中管理状态
- Router 负责所有页面切换
- switchGroup 只负责 UI 更新
- 页码由 Router 统一管理

方案B: 只在 switchGroup 中管理状态
- Router 只做路由解析
- switchGroup 负责所有状态管理
- 页码由 switchGroup 管理
```

**当前架构**（混合，有重复）：
- Router 和 switchGroup 都重置页码
- Router 和 switchGroup 都清空容器
- 导致逻辑混乱

---

## 8. 完整的数据流

### 正常切换团体

```
用户点击 "樱坂46"
    ↓
Router.navigate('#sakurazaka')
    ↓
URL 变为 #sakurazaka
    ↓
Router.handleRoute()
    ↓
Router.showGroupPage('sakurazaka')
    ↓
检查：是否已经在樱坂页面？
    ↓
否 → 重置状态
    window.currentGroup = 'sakurazaka'
    window.currentPage = 1  ← 重置到第1页
    blogsContainer.innerHTML = ''  ← 清空旧博客
    ↓
调用 switchGroup('sakurazaka')
    ↓
加载樱坂的博客 1-16
```

### 无限滚动加载更多

```
用户滚动到底部
    ↓
IntersectionObserver 触发
    ↓
loadMoreBlogs()
    ↓
currentPage++  （从1变成2）
    ↓
loadBlogs(append=true)  ← append=true 很重要！
    ↓
offset = (2-1) * 16 = 16
    ↓
请求 API: /api/blogs?limit=16&offset=16
    ↓
获取博客 17-32
    ↓
appendBlogs(blogs)  ← 追加到现有博客后面
    ↓
页面现在显示 1-32 篇
```

---

## 9. 关键变量总结

| 变量 | 作用 | 何时重置 |
|------|------|---------|
| `window.currentGroup` | 当前显示的团体 (all/nogizaka/sakurazaka/hinatazaka) | 切换团体时 |
| `window.currentPage` | 当前页码 (1, 2, 3, ...) | 切换团体时 |
| `window.currentSearch` | 当前搜索的成员 | 切换团体时或清空搜索时 |
| `window.hasMore` | 是否还有更多博客 | 切换团体时，或加载完所有博客时 |
| `window.isLoading` | 是否正在加载 | 每次请求开始/结束时 |
| `window.blogsPerPage` | 每页显示数量 (16) | 永不改变 |

---

## 10. 总结

### switchGroup 的作用
**旧的页面切换逻辑**，负责：
1. 设置全局状态
2. 更新UI
3. 加载博客

### Router 的作用
**新的统一路由管理**，负责：
1. 监听 URL 变化
2. 决定显示哪个页面
3. 调用对应的显示函数

### 重置页码的原因
**切换团体时必须回到第1页**，否则会跳过前面的博客。

### 我的修复
**防止 Router 重复调用同一个页面**，避免清空容器和跳回顶部。

---

## 调试命令

### 检查当前状态
```javascript
console.log({
  currentGroup: window.currentGroup,
  currentPage: window.currentPage,
  hasMore: window.hasMore,
  routerView: Router.currentView,
  routerGroup: Router.currentGroup
});
```

### 模拟页面切换
```javascript
Router.navigate('#sakurazaka');
```

### 模拟加载下一页
```javascript
window.currentPage++;
await window.loadBlogs(true);
```
