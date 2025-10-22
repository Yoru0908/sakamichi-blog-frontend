# Discord 通知配置说明

## 功能说明

前端会在检测到以下异常情况时自动发送 Discord 通知：

1. **缺少结构化标记** - 当博客内容没有 `[NEWLINE:]` 或 `[IMAGE:]` 标记时
2. 其他可扩展的告警类型

## 架构说明

前端 **不直接** 调用 Discord Webhook，而是调用 **后端的通知 API**：

```
前端 → 后端 /api/notify → 后端 discord-notifier 系统 → Discord
```

## 后端 API 端点

```javascript
const BACKEND_NOTIFY_API = 'https://api.sakamichi-tools.cn/api/notify';
```

### 请求格式

```json
{
  "type": "missing_structured_tags",
  "group": "樱坂46",
  "contentPreview": "博客内容预览...",
  "source": "frontend",
  "url": "https://blog.sakamichi-tools.cn/#sakurazaka",
  "userAgent": "Mozilla/5.0...",
  "timestamp": "2025-10-21T10:54:32.000Z"
}
```

## 测试

部署后，如果有博客缺少结构化标记，你会在 Discord 收到类似这样的消息：

```
🚨 前端告警

⚠️ 检测到博客缺少结构化标记，可能导致渲染问题

团体: 樱坂46
时间: 2025-10-21 10:54:32
内容预览: ...
页面URL: https://blog.sakamichi-tools.cn/#sakurazaka
```

## 节流机制

- 相同类型的告警在 5 分钟内只会发送一次
- 避免短时间内大量重复通知

## 本地开发

- 在 `localhost` 或 `127.0.0.1` 环境下**不会**发送通知
- 只在生产环境 (`blog.sakamichi-tools.cn`) 发送

## 后端 API 实现

✅ 后端已实现 `/api/notify` 端点（`src/routes/notify.js`）

**支持的告警类型**：

1. **missing_structured_tags** - 缺少结构化标记
2. **api_error** - API请求错误
3. **render_error** - 渲染错误

**响应格式**：

```json
{
  "success": true,
  "message": "通知已发送"
}
```

## 扩展

前端可以发送更多类型的告警：

```javascript
// API 错误
sendDiscordAlert({
  type: 'api_error',
  message: '无法加载博客数据',
  endpoint: '/api/blogs',
  statusCode: 500
});

// 渲染错误
sendDiscordAlert({
  type: 'render_error',
  message: '博客渲染失败',
  blogId: 'sakurazaka_12345',
  error: error.message
});
```

后端的 discord-notifier 系统需要相应地处理这些类型。
