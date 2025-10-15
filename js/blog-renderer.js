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

  // 2-4. 使用统一的 Markdown 处理器
  if (typeof MarkdownProcessor !== 'undefined') {
    content = MarkdownProcessor.process(content);
  } else {
    // 后备方案：基本处理
    console.warn('MarkdownProcessor 未加载，使用基本处理');
    content = content.replace(/!\[(.*?)\]\((.*?)\)/g, '<img src="$2" alt="$1" />');
    content = content.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  }

  // 5. 根据团体类型选择不同的渲染函数（旧版兼容）
  if (groupName && groupName.includes('乃木坂')) {
    return renderNogizakaContent(content);
  } else if (groupName && (groupName.includes('櫻坂') || groupName.includes('樱坂'))) {
    return renderSakurazakaContent(content);
  } else {
    // 日向坂46和其他：使用默认渲染
    return renderHinatazakaContent(content);
  }
}

// 日向坂46渲染函数（默认，每行独立）
function renderHinatazakaContent(content) {
  const lines = content.split('\n');
  const result = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmedLine = line.trim();

    // 跳过空行
    if (trimmedLine === '') {
      continue;
    }

    // <br>标签直接添加
    if (trimmedLine === '<br>' || trimmedLine === '<br/>') {
      result.push('<br>');
    }
    // 图片行直接添加
    else if (line.includes('<img')) {
      result.push(line);
    }
    // 所有文本行都独立显示，保持原文的行结构
    else {
      result.push(trimmedLine);
      result.push('\n');
    }
  }

  return result.join('');
}

// 樱坂46渲染函数（智能合并被分割的句子）
function renderSakurazakaContent(content) {
  const lines = content.split('\n');
  const result = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmedLine = line.trim();

    // 跳过空行
    if (trimmedLine === '') {
      i++;
      continue;
    }

    // <br>标签直接添加
    if (trimmedLine === '<br>' || trimmedLine === '<br/>') {
      result.push('<br>');
      i++;
    }
    // 图片行直接添加
    else if (line.includes('<img')) {
      result.push(line);
      i++;
    }
    // 文本行处理
    else {
      // 特殊处理：合并引号内容
      if (trimmedLine.startsWith('「') && !trimmedLine.includes('」')) {
        // 收集到」为止的所有内容
        let mergedContent = trimmedLine;
        i++;
        while (i < lines.length) {
          const nextLine = lines[i].trim();
          if (nextLine === '' || nextLine === '<br>' || nextLine === '<br/>') {
            i++;
            continue;
          }
          mergedContent += nextLine;
          i++;
          if (nextLine.includes('」')) {
            break;
          }
        }
        result.push(mergedContent);
      }
      // 检查是否应该与前一行合并
      else if (shouldMergeWithPrevious(trimmedLine, result)) {
        // 合并到前一行
        const lastIndex = result.length - 1;
        if (lastIndex >= 0 && result[lastIndex] !== '<br>' && !result[lastIndex].includes('<img')) {
          result[lastIndex] = result[lastIndex] + trimmedLine;
        } else {
          result.push(trimmedLine);
        }
        i++;
      }
      // 独立段落
      else {
        result.push(trimmedLine);
        i++;
      }
    }
    
    // 在合适的位置添加换行
    if (i < lines.length && result[result.length - 1] !== '<br>' && !result[result.length - 1]?.includes('<img')) {
      const nextLine = lines[i]?.trim();
      // 如果下一行不是被合并的内容，则添加换行
      if (nextLine && !shouldMergeWithPrevious(nextLine, result)) {
        result.push('\n');
      }
    }
  }

  return result.join('');
}

// 乃木坂46渲染函数（通过空行识别段落）
function renderNogizakaContent(content) {
  const lines = content.split('\n');
  const result = [];
  let currentParagraph = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmedLine = line.trim();

    // 空行或<br>表示段落结束
    if (trimmedLine === '' || trimmedLine === '<br>' || trimmedLine === '<br/>') {
      if (currentParagraph.length > 0) {
        // 输出当前段落
        result.push(currentParagraph.join(''));
        result.push('<br><br>');
        currentParagraph = [];
      } else if (trimmedLine === '<br>' || trimmedLine === '<br/>') {
        result.push('<br>');
      }
    }
    // 图片行单独处理
    else if (line.includes('<img')) {
      // 先输出之前的段落
      if (currentParagraph.length > 0) {
        result.push(currentParagraph.join(''));
        result.push('<br>');
        currentParagraph = [];
      }
      result.push(line);
      result.push('<br>');
    }
    // 收集段落内容
    else {
      currentParagraph.push(trimmedLine);
    }
  }

  // 处理最后一个段落
  if (currentParagraph.length > 0) {
    result.push(currentParagraph.join(''));
  }

  return result.join('');
}



// ===== Phase 3: 命名空间迁移 =====

// 创建 App 全局命名空间（如果不存在）
if (typeof window.App === 'undefined') {
  window.App = {};
}

// 创建 App.render 子命名空间
window.App.render = {
  // 主入口：Markdown 渲染
  markdown: renderMarkdown,
  
  // 结构化渲染器（如果已加载）
  get structured() {
    return typeof renderStructuredContent !== 'undefined' 
      ? renderStructuredContent 
      : null;
  }
};

// 过渡期：保留 window 映射（向后兼容）
window.renderMarkdown = App.render.markdown;

console.log('[blog-renderer] ✅ 已迁移到 App.render 命名空间');
