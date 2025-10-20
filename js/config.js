/**
 * 全局配置文件
 * 统一管理所有硬编码的配置项
 */

// ========== API 配置 ==========
const API_BASE = 'https://api.sakamichi-tools.cn';
const LOCAL_API = 'http://localhost:8787';

// ========== 分页配置 ==========
const PAGE_SIZE = 32;           // 默认列表页大小
const SIDEBAR_LIMIT = 10;       // 侧边栏博客数量
const DETAIL_LIMIT = 50;        // 成员详情页博客数量

// ========== 缓存配置 ==========
const CACHE_TTL = 60 * 60 * 1000;  // 成员数据缓存时长（1小时）

// ========== 超时配置 ==========
const API_TIMEOUT = 5000;       // API 请求超时（5秒）
const TOAST_DURATION = 3000;    // Toast 提示显示时长（3秒）

// ========== 暴露到全局 ==========
window.API_BASE = API_BASE;
window.LOCAL_API = LOCAL_API;
window.PAGE_SIZE = PAGE_SIZE;
window.SIDEBAR_LIMIT = SIDEBAR_LIMIT;
window.DETAIL_LIMIT = DETAIL_LIMIT;
window.CACHE_TTL = CACHE_TTL;
window.API_TIMEOUT = API_TIMEOUT;
window.TOAST_DURATION = TOAST_DURATION;

// 便于调试
console.log('[Config] 配置已加载:', {
  API_BASE,
  PAGE_SIZE,
  CACHE_TTL: `${CACHE_TTL / 1000 / 60}分钟`
});
