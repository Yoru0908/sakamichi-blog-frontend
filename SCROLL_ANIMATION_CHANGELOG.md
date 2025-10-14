# 滚动渐现动画 - 更新日志

## 🎬 实现内容

### 1. 动画时长调整

#### CSS (transitions.css)
- **博客卡片动画**：0.3s → **0.6s** ⏱️
- **图片淡入**：0.3s → **0.5s** ⏱️
- **页面切换**：250ms → **400ms** ⏱️

#### 动画效果
```css
.blog-card {
  opacity: 0;
  transform: translateY(30px);  /* 从30px下方淡入 */
  transition: opacity 0.6s, transform 0.6s;
}

.blog-card.visible {
  opacity: 1;
  transform: translateY(0);
}
```

---

### 2. 滚动渐现系统

#### 新文件：`js/scroll-animations.js`
- 使用 **IntersectionObserver** 监听元素进入视口
- 提前 **100px** 触发动画
- 每个元素延迟 **50ms**（波浪效果）
- 只触发一次（性能优化）

#### 核心逻辑
```javascript
const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry, index) => {
    if (entry.isIntersecting) {
      setTimeout(() => {
        entry.target.classList.add('visible');
      }, index * 50);
      observer.unobserve(entry.target);  // 只触发一次
    }
  });
}, {
  rootMargin: '0px 0px -100px 0px',  // 提前100px触发
  threshold: 0.1
});
```

---

### 3. 自动监听新元素

#### 修改：`js/app.js`

**displayBlogs()** - 首屏加载
```javascript
function displayBlogs(blogs) {
  const cards = [];
  blogs.forEach(blog => {
    const blogCard = window.renderBlogItem(blog);
    container.appendChild(blogCard);
    cards.push(blogCard);
  });
  
  // ✅ 监听所有卡片
  if (window.observeElements) {
    setTimeout(() => window.observeElements(cards), 50);
  }
}
```

**appendBlogs()** - 无限滚动追加
```javascript
function appendBlogs(blogs) {
  const cards = [];
  blogs.forEach(blog => {
    const blogCard = window.renderBlogItem(blog);
    container.appendChild(blogCard);
    cards.push(blogCard);
  });
  
  // ✅ 监听新追加的卡片
  if (window.observeElements) {
    setTimeout(() => window.observeElements(cards), 50);
  }
}
```

---

### 4. HTML 引入

#### 修改：`index.html`
```html
<script src="js/scroll-animations.js"></script>
```

---

## 🎯 实现效果

### 首屏加载
```
页面打开
    ↓
🔄 显示"加载中..."
    ↓
加载16篇博客
    ↓
博客卡片依次从下往上淡入 (0.6s) ✅
每个卡片延迟 50ms（波浪效果）✅
```

### 无限滚动
```
滚动到底部
    ↓
哨兵触发加载
    ↓
追加16篇博客
    ↓
新卡片进入视口时淡入 (0.6s) ✅
每个卡片延迟 50ms ✅
```

### 对比：乃木坂官网
| 效果 | 乃木坂官网 | 我们的实现 |
|------|-----------|-----------|
| 触发时机 | 元素进入视口 | ✅ 提前100px |
| 动画方式 | fadeInUp | ✅ fadeInUp |
| 动画时长 | ~0.5s | ✅ 0.6s |
| 波浪效果 | 有 | ✅ 每个延迟50ms |
| 首屏 | 有动画 | ✅ 有动画 |
| 滚动追加 | 有动画 | ✅ 有动画 |

---

## 📊 修改文件总结

### 修改的文件
1. **css/transitions.css** - 调整动画时长，改用 transition
2. **js/page-transitions.js** - 延长页面切换动画
3. **js/scroll-animations.js** - **新建**，滚动渐现系统
4. **js/app.js** - 自动监听新卡片
5. **index.html** - 引入新JS文件

### 代码行数
- 新增：~90行
- 修改：~30行

---

## 🧪 测试步骤

### 1. 刷新浏览器
```bash
Cmd + Shift + R
```

### 2. 测试首屏加载
- ✅ 博客卡片从下往上淡入
- ✅ 波浪效果（依次出现）
- ✅ 动画时长 0.6秒（不再一闪而过）

### 3. 测试无限滚动
- 滚动到底部
- ✅ 新卡片进入视口时触发动画
- ✅ 从下往上淡入
- ✅ 波浪效果

### 4. 测试页面切换
- 切换团体（#nogizaka → #sakurazaka）
- ✅ 淡出/淡入动画 400ms（比之前长）

---

## 🎨 动画参数说明

### 可调整参数

#### 动画时长
```css
/* css/transitions.css line 47-48 */
transition: opacity 0.6s, transform 0.6s;
```
- 当前：0.6秒
- 可调范围：0.4s - 0.8s
- **0.6s 比较平衡**

#### 移动距离
```css
/* css/transitions.css line 46 */
transform: translateY(30px);
```
- 当前：从30px下方淡入
- 可调范围：20px - 50px
- **30px 比较自然**

#### 提前触发距离
```javascript
// js/scroll-animations.js line 25
rootMargin: '0px 0px -100px 0px'
```
- 当前：元素距离视口底部100px时触发
- 可调范围：50px - 200px
- **100px 提前感刚好**

#### 波浪延迟
```javascript
// js/scroll-animations.js line 18
setTimeout(() => {}, index * 50);
```
- 当前：每个卡片延迟50ms
- 可调范围：30ms - 100ms
- **50ms 波浪效果明显但不拖沓**

---

## 总结

✅ **所有动画时长已延长**
- 博客卡片：0.6秒
- 图片淡入：0.5秒
- 页面切换：0.4秒

✅ **滚动渐现已实现**
- 首屏 + 无限滚动都有动画
- 使用 IntersectionObserver（高性能）
- 乃木坂官网同款效果

✅ **不会冲突**
- 完善了现有动画系统
- 代码模块化，易维护
