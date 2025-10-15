# 统一状态管理测试清单

## 修改内容
- 创建 `js/state.js` - 统一状态管理
- 修复 `currentGroup` 重复定义（app.js, router.js, index.html, member-page.js）
- 修复 `currentMember` 重复定义（router.js, member-page.js）

## 测试项目

### 1. 基础加载 ✅
- [ ] 打开 http://localhost:8080
- [ ] 检查控制台无错误
- [ ] 看到 "[state.js] ✅ 统一状态管理已初始化"
- [ ] 默认显示 "全部" 博客列表

### 2. 团体切换功能 ✅
- [ ] 点击 "乃木坂46" - 博客列表更新
- [ ] 点击 "樱坂46" - 博客列表更新
- [ ] 点击 "日向坂46" - 博客列表更新
- [ ] 点击 "全部" - 返回所有博客
- [ ] 检查 `App.state.group` 值正确

### 3. 成员页面功能 ✅
- [ ] 选择一个团体（如乃木坂46）
- [ ] 点击一个成员名字
- [ ] 成员页面正确显示
- [ ] 检查 `App.state.member` 值正确
- [ ] 成员博客列表加载正常

### 4. 成员页面翻页 ✅
- [ ] 在成员页面翻页
- [ ] 翻页正常工作
- [ ] URL 更新正确

### 5. 返回团体页面 ✅
- [ ] 在成员页面点击返回
- [ ] 正确返回到团体页面
- [ ] 检查 `App.state.member` 被清空

### 6. 博客详情 ✅
- [ ] 点击一篇博客
- [ ] 博客详情正确显示
- [ ] 中日对照功能正常（如果有）

### 7. 浏览器前进后退 ✅
- [ ] 浏览器后退按钮
- [ ] 浏览器前进按钮
- [ ] 状态正确同步

## 验证状态管理

打开浏览器控制台，输入：
```javascript
// 查看当前状态
App.state

// 应该看到：
// {
//   page: 1,
//   group: 'all' 或其他团体,
//   member: '' 或成员名,
//   search: '',
//   loading: false,
//   loadingMore: false,
//   hasMore: true,
//   totalPages: 1,
//   blogs: [...]
// }

// 验证向后兼容
window.currentGroup  // 应该等于 App.state.group
window.currentPage   // 应该等于 App.state.page
```

## 预期结果
- ✅ 所有功能正常工作
- ✅ 无控制台错误
- ✅ 状态同步正确
- ✅ 向后兼容正常
