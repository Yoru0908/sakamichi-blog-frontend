/**
 * 通用工具函数模块
 */

// 显示Toast提示
function showToast(message) {
  const existingToast = document.querySelector('.toast');
  if (existingToast) {
    existingToast.remove();
  }
  
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;
  document.body.appendChild(toast);
  
  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 300);
  }, window.TOAST_DURATION);
}

// 复制到剪贴板
function copyToClipboard(text) {
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand('copy');
  document.body.removeChild(textarea);
}

// 格式化日期
function formatDate(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
}

// 标准化博客日期时间格式（用于显示）
// 输入: "2025/10/19", "2025.10.19 22:45", "2025-10-19T22:45:00Z"
// 输出: "2025.10.19 22:45" 或 "2025.10.19"（无时间时）
function standardizeBlogDate(dateStr) {
  if (!dateStr) return '';
  
  // 统一分隔符：2025/10/19 或 2025-10-19 → 2025.10.19
  let normalized = dateStr
    .replace(/\//g, '.')  // 斜杠 → 点
    .replace(/-/g, '.');  // 横杠 → 点
  
  // 提取日期和时间部分
  // 支持格式: "2025.10.19 22:45", "2025.10.19T22:45:00Z", "2025.10.19"
  const match = normalized.match(/(\d{4}\.\d{1,2}\.\d{1,2})[\sT]?(\d{1,2}:\d{2})?/);
  
  if (!match) {
    // 如果无法解析，返回原值（降级处理）
    console.warn('[standardizeBlogDate] 无法解析日期:', dateStr);
    return dateStr;
  }
  
  const datePart = match[1];  // 2025.10.19
  const timePart = match[2];   // 22:45 或 undefined
  
  // 格式化日期部分，确保月日为两位数
  const [year, month, day] = datePart.split('.');
  const formattedDate = `${year}.${month.padStart(2, '0')}.${day.padStart(2, '0')}`;
  
  // 如果有时间部分，拼接；否则只返回日期
  return timePart ? `${formattedDate} ${timePart}` : formattedDate;
}

// 解析日期为Date对象（用于比较、计算）
// 输入: "2025/10/19", "2025.10.19", "2025-10-19"
// 输出: Date对象
function parseBlogDate(dateStr) {
  if (!dateStr) return null;
  
  // 统一分隔符为横杠（Date构造函数兼容的格式）
  const normalized = dateStr
    .replace(/\//g, '-')
    .replace(/\./g, '-');
  
  // 提取日期部分（去掉时间）
  const datePart = normalized.split(/[\sT]/)[0];
  
  // 补零：2025-9-5 → 2025-09-05
  const parts = datePart.split('-');
  if (parts.length === 3) {
    const [year, month, day] = parts;
    const standardDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    return new Date(standardDate);
  }
  
  return new Date(dateStr);
}

// 提取年月字符串（用于日历）
// 输入: "2025/10/19 22:45" 或 "2025.10.19"
// 输出: { year: 2025, month: 10, day: 19 }
function extractDateParts(dateStr) {
  if (!dateStr) return null;
  
  // 统一分隔符
  const normalized = dateStr
    .replace(/\//g, '.')
    .replace(/-/g, '.');
  
  // 提取日期部分
  const datePart = normalized.split(/[\sT]/)[0];
  const parts = datePart.split('.');
  
  if (parts.length >= 3) {
    return {
      year: parseInt(parts[0]),
      month: parseInt(parts[1]),
      day: parseInt(parts[2])
    };
  }
  
  return null;
}

// 检查日期是否匹配（用于日历高亮）
// 支持任意格式的日期字符串比较
function isSameDate(dateStr1, dateStr2) {
  if (!dateStr1 || !dateStr2) return false;
  
  const parts1 = extractDateParts(dateStr1);
  const parts2 = extractDateParts(dateStr2);
  
  if (!parts1 || !parts2) return false;
  
  return parts1.year === parts2.year &&
         parts1.month === parts2.month &&
         parts1.day === parts2.day;
}

// 检查日期是否在某年某月（用于日历筛选）
function isInMonth(dateStr, year, month) {
  const parts = extractDateParts(dateStr);
  return parts && parts.year === year && parts.month === month;
}

// 节流函数
function throttle(func, wait) {
  let timeout;
  let lastCall = 0;
  
  return function(...args) {
    const now = Date.now();
    
    if (now - lastCall >= wait) {
      func.apply(this, args);
      lastCall = now;
    } else {
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        func.apply(this, args);
        lastCall = Date.now();
      }, wait - (now - lastCall));
    }
  };
}

// 防抖函数
function debounce(func, wait) {
  let timeout;
  
  return function(...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => {
      func.apply(this, args);
    }, wait);
  };
}

// 检测内容格式
function detectContentFormat(content) {
  // 检查是否包含结构化标记
  const structuredMarkers = ['[TITLE]', '[DATE]', '[CONTENT]', '[IMAGE]'];
  const hasStructuredMarkers = structuredMarkers.some(marker => content.includes(marker));
  
  if (hasStructuredMarkers) {
    return 'structured';
  }
  
  // 检查是否为JSON格式
  try {
    const parsed = JSON.parse(content);
    if (parsed && typeof parsed === 'object') {
      return 'json';
    }
  } catch (e) {
    // 不是JSON，继续检查
  }
  
  // 默认为markdown
  return 'markdown';
}

// 提取图片URLs
function extractImageUrls(content) {
  const urls = [];
  
  // Markdown格式图片
  const markdownRegex = /!\[.*?\]\((.*?)\)/g;
  let match;
  while ((match = markdownRegex.exec(content)) !== null) {
    urls.push(match[1]);
  }
  
  // HTML img标签
  const imgRegex = /<img[^>]+src=["']([^"']+)["']/g;
  while ((match = imgRegex.exec(content)) !== null) {
    if (!urls.includes(match[1])) {
      urls.push(match[1]);
    }
  }
  
  return urls;
}

// 导出给全局使用
window.showToast = showToast;
window.copyToClipboard = copyToClipboard;
window.formatDate = formatDate;
window.standardizeBlogDate = standardizeBlogDate;
window.parseBlogDate = parseBlogDate;
window.extractDateParts = extractDateParts;
window.isSameDate = isSameDate;
window.isInMonth = isInMonth;
window.throttle = throttle;
window.debounce = debounce;
window.detectContentFormat = detectContentFormat;
window.extractImageUrls = extractImageUrls;
