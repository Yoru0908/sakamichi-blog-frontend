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
  }, 3000);
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
window.throttle = throttle;
window.debounce = debounce;
window.detectContentFormat = detectContentFormat;
window.extractImageUrls = extractImageUrls;
