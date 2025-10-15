/**
 * 博客内容渲染模块
 * 处理不同团体的博客内容渲染
 */

// 渲染内容 - 使用新的结构化渲染器
function renderMarkdown(markdown, groupName = '') {
  console.log('渲染博客，团体:', groupName);
  console.log('原始内容预览:', markdown.substring(0, 200));

  // 首先总是移除frontmatter（如果存在）
  let cleanMarkdown = markdown;
  if (cleanMarkdown.startsWith('---')) {
    const endIndex = cleanMarkdown.indexOf('---', 3);
    if (endIndex !== -1) {
      cleanMarkdown = cleanMarkdown.substring(endIndex + 3).trim();
    }
  }

  // 优先检查是否包含NEWLINE标记（结构化内容）
  // 注意：即使没有[IMAGE:]标记，如果有[NEWLINE:]也使用结构化渲染器
  if (cleanMarkdown.includes('[NEWLINE:') || cleanMarkdown.includes('[IMAGE:')) {
    console.log('检测到结构化标记，使用结构化渲染器');
    if (typeof renderStructuredContent === 'function') {
      // 提取图片URL（支持Markdown格式）
      let images = [];
      if (typeof extractImageUrlsFromContent === 'function') {
        images = extractImageUrlsFromContent(cleanMarkdown);
      } else if (typeof extractImageUrls === 'function') {
        images = extractImageUrls(cleanMarkdown);
      }
      return renderStructuredContent(cleanMarkdown, images);
    } else {
      console.error('renderStructuredContent 函数未找到！');
    }
  }
  
  // 其次，检测内容格式（如果函数存在）
  if (typeof detectContentFormat === 'function' && typeof renderStructuredContent === 'function') {
    const format = detectContentFormat(cleanMarkdown);
    console.log('检测到内容格式:', format);

    // 如果是结构化格式，使用新渲染器
    if (format === 'structured') {
      console.log('使用结构化渲染器（通过detectContentFormat）');
      // 提取图片URL（支持Markdown格式）
      let images = [];
      if (typeof extractImageUrlsFromContent === 'function') {
        images = extractImageUrlsFromContent(cleanMarkdown);
      } else if (typeof extractImageUrls === 'function') {
        images = extractImageUrls(cleanMarkdown);
      }
      return renderStructuredContent(cleanMarkdown, images);
    }
  }

  // 否则使用旧的渲染逻辑（向后兼容）
  console.log('使用旧版渲染器（向后兼容）');

  // 使用已清理的内容
  let content = cleanMarkdown;

  // 2. 渲染图片：![alt](url) -> <img>
  content = content.replace(/!\[(.*?)\]\((.*?)\)/g, (match, alt, url) => {
    return `<img src="${url}" alt="${alt}" class="w-full my-4 rounded-lg" loading="lazy" />`;
  });

  // 3. 渲染粗体：**text** -> <strong>
  content = content.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

  // 4. 处理URL链接：将http/https链接转换为可点击的链接
  content = content.replace(/(https?:\/\/[^\s<]+)/g, (match) => {
    // 如果已经是<img>标签的一部分，则不处理
    if (match.includes('.jpg') || match.includes('.png') || match.includes('.gif') || match.includes('.jpeg')) {
      return match;
    }
    return `<a href="${match}" target="_blank" class="text-blue-600 hover:underline">${match}</a>`;
  });

  // 5. 后备方案（理论上不应该执行到这里，所有博客都应该有结构化标记）
  console.log('博客内容预览:', content.substring(0, 100));
  
  // 简单处理：保留换行
  return content.replace(/\n/g, '<br>');
}

// 导出给全局使用
window.renderMarkdown = renderMarkdown;
