# Router 冲突修复报告

## 🐛 发现的问题

### 问题1：切换到 nogizaka 显示旧博客（排序错误）
### 问题2：切换到 sakurazaka 有时不显示博客

---

## 🔍 根本原因

### 冲突：双重切换逻辑

**Router.js (line 126-130)**:
```javascript
if (window.switchGroup) {
  window.switchGroup(group);  // ← 调用 index.html 的函数
  return;  // ← 提前返回，后面的代码不执行
}

// 下面的代码永远不会执行！
await window.smoothTransition(...);
```

**index.html (line 301-344)**:
```javascript
async function switchGroup(group) {
  window.currentGroup = group;
  window.currentPage = 1;
  
  // ... 更新UI ...
  
  await loadBlogs();  // ← 直接调用，没有 smoothTransition
}
```

---

## ⚠️ 导致的问题

### 1. 没有平滑过渡动画
- Router 想用 `smoothTransition`
- 但实际调用的是 index.html 的 `switchGroup`
- `switchGroup` 直接调用 `loadBlogs()`
- **结果**：没有淡入淡出动画

### 2. 容器被清空两次
```
Router.showGroupPage(group)
    ↓
line 116: blogsContainer.innerHTML = '';  // ← 清空1
    ↓
line 128: window.switchGroup(group);
    ↓
switchGroup() 调用 loadBlogs()
    ↓
loadBlogs() 调用 displayBlogs()
    ↓
displayBlogs() 又清空: container.innerHTML = '';  // ← 清空2
```

### 3. 可能的竞态条件
```
Router 清空容器
    ↓
调用 switchGroup
    ↓
switchGroup 设置 window.currentGroup
    ↓
调用 loadBlogs()
    ↓
但此时 blogsContainer 可能处于不一致状态
    ↓
导致：有时不显示博客
```

### 4. 排序问题
```
Router: window.currentPage = 1
    ↓
switchGroup: window.currentPage = 1  // ← 重复设置
    ↓
loadBlogs() 使用 window.currentGroup
    ↓
但如果 currentGroup 还是旧值？
    ↓
加载了错误团体的数据
    ↓
显示旧博客
```

---

## ✅ 修复方案

### 移除冲突的调用

**修改：js/router.js (line 125-130)**

```javascript
// ❌ 删除这段代码
if (window.switchGroup) {
  window.switchGroup(group);
  return;
}

// ✅ 让 Router 直接执行后续逻辑
// 更新标签页状态
document.querySelectorAll('.tab-item').forEach(tab => {
  ...
});

// 使用平滑过渡加载博客
await window.smoothTransition(async () => {
  await window.loadBlogs();
});
```

---

## 📊 修复后的流程

### 新的切换流程

```
用户点击 #nogizaka 标签
    ↓
Router.navigate('#nogizaka')
    ↓
触发 hashchange 事件
    ↓
Router.handleRoute()
    ↓
Router.showGroupPage('nogizaka')
    ↓
[1] 防重复检查
    if (当前已经是 nogizaka) return;  ← 避免重复加载
    ↓
[2] 设置全局变量
    window.currentGroup = 'nogizaka'
    window.currentPage = 1
    window.currentSearch = ''
    ↓
[3] 清理页面
    隐藏成员页面
    移除详情页
    清空 blogsContainer
    ↓
[4] 更新标签状态
    设置 active 类
    ↓
[5] 显示/隐藏团体信息
    if (nogizaka !== 'all') {
      显示团体信息
      加载 loadGroupInfo()
    }
    ↓
[6] 平滑过渡加载博客 ✅
    await smoothTransition(async () => {
      await loadBlogs();
    });
    ↓
[7] loadBlogs() 执行
    - 使用 window.currentGroup = 'nogizaka'
    - offset = (1-1) * 32 = 0
    - limit = 32
    - 请求 API: /api/blogs?group=nogizaka&limit=32&offset=0
    ↓
[8] 数据处理
    - 去重
    - 排序（按日期降序）✅
    - displayBlogs() 显示
    ↓
[9] 滚动渐现动画
    - 每个卡片淡入 (1000ms)
    - 延迟 50ms（波浪效果）
    ↓
完成！
```

---

## 🧪 测试验证

### Test 1: nogizaka 排序问题

**测试步骤**：
1. 访问 #all
2. 点击 乃木坂46 标签
3. 检查博客顺序

**期望结果**：
- ✅ 显示32篇博客
- ✅ 按日期降序（最新的在前）
- ✅ 没有重复博客
- ✅ 有平滑过渡动画

**调试命令**：
```javascript
// 在控制台执行
console.log('当前团体:', window.currentGroup);
console.log('当前页码:', window.currentPage);

// 检查博客日期
const dates = Array.from(document.querySelectorAll('.blog-card time')).map(t => t.textContent);
console.log('博客日期:', dates);
```

---

### Test 2: sakurazaka 不显示问题

**测试步骤**：
1. 访问 #all
2. 点击 樱坂46 标签
3. 观察是否显示博客

**期望结果**：
- ✅ 显示32篇博客
- ✅ 有平滑过渡动画
- ✅ 不会出现空白

**可能的错误日志**（如果还有问题）：
```
[Router] 已经在当前团体页面，跳过重新加载
```
→ 说明防重复逻辑触发了

---

### Test 3: 快速切换

**测试步骤**：
1. 快速点击：#all → #nogizaka → #sakurazaka → #hinatazaka
2. 观察切换是否正常

**期望结果**：
- ✅ 每次切换都有动画
- ✅ 不会卡住
- ✅ 数据正确

---

## 🔧 额外优化

### 1. 添加加载状态日志

**修改：js/app.js loadBlogs()**

```javascript
console.log('[loadBlogs] 开始加载', {
  group: window.currentGroup,
  page: window.currentPage,
  append: append,
  blogsPerPage: getBlogsPerPage()
});
```

### 2. 添加排序验证

```javascript
// 排序后验证
uniqueBlogs.sort((a, b) => {
  const dateA = new Date(a.publish_date || 0);
  const dateB = new Date(b.publish_date || 0);
  return dateB - dateA;
});

// 验证排序
if (uniqueBlogs.length > 1) {
  console.log('[loadBlogs] 排序验证:', {
    first: uniqueBlogs[0].publish_date,
    last: uniqueBlogs[uniqueBlogs.length - 1].publish_date
  });
}
```

---

## 📝 修改文件

1. ✅ **js/router.js** - 移除对 `window.switchGroup` 的调用

---

## 🎯 预期改进

### 修复前
```
切换团体：
- ❌ 有时显示旧博客
- ❌ 有时不显示博客
- ❌ 没有平滑动画
- ❌ 容器被清空两次
```

### 修复后
```
切换团体：
- ✅ 总是显示最新博客
- ✅ 总是正确显示
- ✅ 有平滑过渡动画 (1500ms)
- ✅ 容器只清空一次
- ✅ 避免竞态条件
```

---

## 总结

**根本原因**：Router 和 index.html 的 `switchGroup` 冲突

**解决方法**：让 Router 完全接管切换逻辑

**副作用**：
- index.html 的 `switchGroup` 函数现在不会被调用
- 可以删除或保留（作为备用）

**建议**：
- 保留 `switchGroup` 作为向后兼容
- 但不要从 Router 调用它
- 所有切换统一通过 Router.navigate()
