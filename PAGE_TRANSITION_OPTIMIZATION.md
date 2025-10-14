# 页面切换动画优化

## 🎯 问题

在 #all、#nogizaka 等页面切换时：
- ❌ 动画一闪而过
- ❌ 切换不够自然
- ❌ 看不清过渡效果

---

## 🔍 原因分析

### 之前的实现

**Router.js** 直接调用 `loadBlogs()`：
```javascript
// router.js - showGroupPage()
await window.loadBlogs();  // ❌ 没有过渡动画
```

**结果**：
```
点击 #nogizaka
    ↓
旧内容消失 ❌ 瞬间
    ↓
新内容出现
```

---

## ✅ 优化方案

### 1. Router 使用 smoothTransition

**修改：`js/router.js`**

```javascript
// 加载博客列表（使用平滑过渡动画）
if (window.smoothTransition && window.loadBlogs) {
  await window.smoothTransition(async () => {
    await window.loadBlogs();
  });
}
```

**效果**：
```
点击 #nogizaka
    ↓
旧内容淡出 + 向上移动 (750ms) ✅
    ↓
切换内容
    ↓
新内容淡入 + 向下移动 (750ms) ✅
    ↓
总计：1500ms 平滑过渡
```

---

### 2. 优化动画参数

#### 动画时长
```javascript
// js/page-transitions.js
async function smoothTransition(callback, duration = 750) {
  // 淡出：750ms
  // 淡入：750ms
  // 总计：1500ms
}
```

#### 移动距离
```javascript
// 淡出时向上移动
container.style.transform = 'translateY(-10px)';

// 淡入时从0位置出现
container.style.transform = 'translateY(0)';
```

#### 缓动曲线
```javascript
cubic-bezier(0.4, 0, 0.2, 1)  // Material Design 标准
```

---

### 3. 博客卡片渐现

用户还调整了博客卡片的动画：

**CSS 修改**：
```css
.blog-card {
  transition: opacity 1.0s cubic-bezier(0.5, 0, 0.4, 1),
              transform 1.0s cubic-bezier(0.5, 0, 0.4, 1);
}
```

**缓动曲线**：从 `(0.4, 0, 0.2, 1)` → `(0.5, 0, 0.4, 1)`
- 更平缓的加速
- 更舒缓的效果

---

## 📊 完整时间线

### 页面切换流程

```
用户点击 #nogizaka
    ↓
[0ms] 开始切换
    ↓
[0-750ms] 淡出动画
  - blogsContainer opacity: 1 → 0
  - blogsContainer transform: 0 → -10px
    ↓
[750ms] 切换内容
  - 调用 loadBlogs()
  - 清空旧内容
  - 加载新内容（32篇）
    ↓
[750-1500ms] 淡入动画
  - blogsContainer opacity: 0 → 1
  - blogsContainer transform: -10px → 0
    ↓
[1500ms+] 博客卡片渐现
  - 每个卡片从下往上淡入 (1000ms)
  - 延迟 50ms（波浪效果）
    ↓
[2500ms] 完全加载完成
```

---

## 🎬 动画参数总结

| 动画 | 时长 | 缓动 | 效果 |
|------|------|------|------|
| **页面淡出** | 750ms | cubic-bezier(0.4, 0, 0.2, 1) | 向上移动10px |
| **页面淡入** | 750ms | cubic-bezier(0.4, 0, 0.2, 1) | 从-10px到0 |
| **博客卡片** | 1000ms | cubic-bezier(0.5, 0, 0.4, 1) | 从下往上30px |
| **图片淡入** | 700ms | ease-out | 淡入 |

---

## 🧪 测试步骤

### 1. 刷新浏览器
```bash
Cmd + Shift + R
```

### 2. 测试页面切换

#### Test 1: #all → #nogizaka
```
点击 乃木坂46 标签
    ↓
✅ 旧内容淡出 (750ms)
✅ 新内容淡入 (750ms)
✅ 博客卡片渐现 (1000ms)
✅ 总计 2.5秒平滑过渡
```

#### Test 2: #nogizaka → #sakurazaka
```
点击 樱坂46 标签
    ↓
✅ 旧内容淡出
✅ 新内容淡入
✅ 不再一闪而过
```

#### Test 3: #sakurazaka → #all
```
点击 全部 标签
    ↓
✅ 平滑过渡
✅ 切换自然
```

---

## 🎨 效果对比

### 之前
```
速度：█ 一闪而过（<100ms）
效果：❌ 看不清
体验：❌ 不自然
```

### 现在
```
速度：▁▂▃▄▅▆▇█▇▆▅▄▃▂▁ (1500ms)
效果：✅ 清晰可见
体验：✅ 平滑自然
```

---

## 🔧 可调整参数

如果还想调整，可以修改：

### 1. 页面切换速度
```javascript
// js/page-transitions.js line 14
async function smoothTransition(callback, duration = 750) {
```
- 当前：750ms
- 可调：500ms - 1000ms
- **750ms 比较平衡**

### 2. 移动距离
```javascript
// js/page-transitions.js line 24
container.style.transform = 'translateY(-10px)';
```
- 当前：10px
- 可调：5px - 20px
- **10px 明显但不夸张**

### 3. 博客卡片速度
```css
/* css/transitions.css line 47 */
transition: opacity 1.0s ...
```
- 当前：1.0s
- 可调：0.8s - 1.2s
- **1.0s 舒缓自然**

---

## 📝 修改文件

1. ✅ **js/router.js** - 添加 smoothTransition
2. ✅ **js/page-transitions.js** - 优化动画参数
3. ✅ **css/transitions.css** - 博客卡片动画 (用户已调整)

---

## 总结

✅ **页面切换不再一闪而过**
- 淡出 + 淡入共 1500ms
- 移动距离明显（10px）
- 博客卡片渐现 1000ms

✅ **动画更自然**
- 使用 Material Design 缓动
- 平滑过渡
- 波浪效果

✅ **用户体验提升**
- 看得清切换过程
- 不会感觉突兀
- 符合现代 Web 标准
