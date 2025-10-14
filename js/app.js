const FALLBACK_WORKER_API_URL = 'https://sakamichi-blog-translator.srzwyuu.workers.dev';
const LOCAL_API_URL = 'http://localhost:8787';

function determineInitialApiBaseUrl() {
  try {
    const configUrl = window.__APP_CONFIG__?.API_BASE_URL || window.API_BASE_URL;
    if (configUrl) {
      return configUrl;
    }

    const origin = window.location.origin || '';
    const hostname = window.location.hostname || '';

    // 本地开发环境
    if (!origin.startsWith('http') || origin.includes('localhost') || hostname === '127.0.0.1') {
      return LOCAL_API_URL;
    }

    // ✅ 所有线上环境都使用 Worker API（以后换域名不用改代码）
    return FALLBACK_WORKER_API_URL;
  } catch (_) {
    return LOCAL_API_URL;
  }
}

let API_BASE_URL = determineInitialApiBaseUrl();

async function ensureApiBaseUrl() {
  const tested = new Set();
  const candidates = [API_BASE_URL];
  const configUrl = window.__APP_CONFIG__?.API_BASE_URL || window.API_BASE_URL;

  if (configUrl && !candidates.includes(configUrl)) {
    candidates.push(configUrl);
  }

  if (!candidates.includes(FALLBACK_WORKER_API_URL)) {
    candidates.push(FALLBACK_WORKER_API_URL);
  }

  let lastError = null;

  for (const candidate of candidates) {
    if (!candidate || tested.has(candidate)) {
      continue;
    }

    tested.add(candidate);

    try {
      // 添加5秒超时
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch(`${candidate}/api/health`, { 
        cache: 'no-store',
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);

      if (response.ok) {
        API_BASE_URL = candidate;
        console.log(`[App] API健康检查成功: ${candidate}`);
        return API_BASE_URL;
      }

      lastError = new Error(`健康检查失败: ${response.status}`);
      console.warn(`[App] API健康检查失败 (${candidate}):`, response.status);
    } catch (error) {
      lastError = error;
      console.warn(`[App] 无法连接到 ${candidate}:`, error.message);
    }
  }

  throw lastError || new Error('无法连接到后端服务');
}

// 全局变量
window.currentPage = 1;
window.currentGroup = 'all';
window.currentSearch = '';
window.isLoading = false;
window.hasMore = true;
window.totalPages = 1;
window.blogsPerPage = 16; // 每页16篇博客（4x4布局）
window.allBlogs = []; // 缓存所有博客数据

// 去重函数：移除恢复的重复博客
function removeDuplicateBlogs(blogs) {
  const blogMap = new Map();
  const restoredBlogs = [];
  
  // 首先处理所有博客
  blogs.forEach(blog => {
    // 检查是否是恢复的博客（ID中包含restore）
    const isRestored = blog.id && blog.id.includes('restore');
    
    if (isRestored) {
      restoredBlogs.push(blog);
    } else {
      // 使用标题和成员名作为唯一标识
      const key = `${blog.title}_${blog.member}`;
      blogMap.set(key, blog);
    }
  });
  
  // 检查恢复的博客是否有重复
  const uniqueBlogs = [];
  restoredBlogs.forEach(blog => {
    const key = `${blog.title}_${blog.member}`;
    if (!blogMap.has(key)) {
      // 没有重复，保留这个恢复的博客
      uniqueBlogs.push(blog);
      blogMap.set(key, blog);
    } else {
      console.log(`发现重复博客（删除恢复版）: ${blog.title} - ${blog.member}`);
    }
  });
  
  // 返回所有唯一的博客
  return [...blogMap.values()];
}

// 初始化应用（注意：loadBlogs 由 Router 统一调用，这里只初始化API连接）
document.addEventListener('DOMContentLoaded', async function() {
  console.log('[App] 应用初始化开始');

  try {
    await ensureApiBaseUrl();
    console.log('[App] API基础URL:', API_BASE_URL);
    
    // 暴露 API_BASE_URL 给其他模块
    window.API_BASE_URL = API_BASE_URL;
  } catch (error) {
    console.error('[App] 无法连接后端服务:', error);
    showError('无法连接后端服务，请稍后重试');
    return;
  }

  try {
    console.log('[App] 开始加载统计信息...');
    await loadStats();

    // ⚠️ 注意：不在这里调用 loadBlogs()，由 Router 统一处理
    // console.log('开始加载博客列表...');
    // await loadBlogs();

    // 初始化增强搜索功能
    enhanceSearchInput();
    console.log('[App] 搜索功能已初始化');

    startAutoRefresh();
    // checkSystemStatus();  // 已禁用：前端不需要向用户显示系统状态

    // 初始化 UI 模块（核心系统就绪后才初始化）
    console.log('[App] 开始初始化 UI 模块...');
    if (window.Pagination) {
      window.Pagination.init();
      console.log('[App] 分页组件初始化完成');
    }
    if (window.MemberPage) {
      window.MemberPage.init();
      console.log('[App] 成员页面模块初始化完成');
    }
    if (window.Router) {
      window.Router.init();
      console.log('[App] 路由管理器初始化完成');
    }

    console.log('[App] 应用初始化完成（核心系统 + UI模块）');
  } catch (error) {
    console.error('[App] 应用初始化失败:', error);
    console.error('错误堆栈:', error.stack);
    showError(`应用初始化失败: ${error.message}`);
  }
});

// 加载统计信息
async function loadStats() {
  try {
    const apiBase = window.API_BASE_URL || API_BASE_URL;
    const response = await fetch(`${apiBase}/api/stats?period=7days`);
    const data = await response.json();

    if (data.success) {
      updateStatsDisplay(data.data);
      // updateLastUpdateTime();  // 已禁用：不需要显示应用最后更新时间
    }
  } catch (error) {
    console.error('加载统计信息失败:', error);
  }
}

// 更新统计显示
function updateStatsDisplay(stats) {
  // 检查数据是否存在
  if (!stats) {
    console.warn('[updateStatsDisplay] 统计数据为空');
    return;
  }

  const elements = {
    memberCount: document.getElementById('memberCount'),      // HTML中的实际ID
    todayCount: document.getElementById('todayCount')         // HTML中的实际ID
  };

  // 检查DOM元素是否存在
  if (!elements.memberCount || !elements.todayCount) {
    console.warn('[updateStatsDisplay] 统计信息DOM元素不存在，跳过更新');
    return;
  }

  // 更新今日更新数
  if (stats.blogs || stats.daily) {
    const todayCount = stats.daily?.[0]?.blogs_processed || 0;
    elements.todayCount.textContent = todayCount;
  }

  // 更新成员总数
  if (stats.members) {
    elements.memberCount.textContent = stats.members.active_members || 0;
  }
}

// 更新最后更新时间
function updateLastUpdateTime() {
  const lastUpdateElement = document.getElementById('lastUpdate');
  if (!lastUpdateElement) {
    console.warn('[updateLastUpdateTime] lastUpdate元素不存在，跳过更新');
    return;
  }
  
  const now = new Date();
  const timeString = now.toLocaleString('zh-CN');
  lastUpdateElement.textContent = `最后更新: ${timeString}`;
}

// 加载博客列表
window.loadBlogs = async function(append = false) {
  if (window.isLoading) return;

  window.isLoading = true;
  
  // 只在非追加模式下显示全屏加载状态
  if (!append) {
    showLoading();
  }

  try {
    // 计算偏移量
    const offset = (window.currentPage - 1) * window.blogsPerPage;
    
    const params = new URLSearchParams({
      limit: window.blogsPerPage,
      offset: offset
    });

    // 使用 GroupConfig 获取正确的API名称
    if (window.currentGroup !== 'all') {
      const apiName = window.GroupConfig.getApiName(window.currentGroup);
      params.append('group', apiName);
      console.log(`[loadBlogs] 筛选团体: ${window.currentGroup} -> API: ${apiName}`);
    }

    if (window.currentSearch) {
      params.append('member', window.currentSearch);
    }

    const apiBase = window.API_BASE_URL || API_BASE_URL;
    const url = `${apiBase}/api/blogs?${params}`;
    console.log('[loadBlogs] 请求URL:', url);

    const response = await fetch(url);
    console.log('[loadBlogs] 响应状态:', response.status);

    if (!response.ok) {
      throw new Error(`HTTP错误: ${response.status}`);
    }

    const data = await response.json();
    console.log('[loadBlogs] 响应数据:', data);

    if (data.success && data.blogs) {
      const blogs = data.blogs;
      console.log(`[loadBlogs] 成功加载 ${blogs.length} 篇博客`);

      // 去重处理
      const uniqueBlogs = removeDuplicateBlogs(blogs);
      console.log(`[loadBlogs] 去重后 ${uniqueBlogs.length} 篇博客`);

      // 按发布日期排序
      uniqueBlogs.sort((a, b) => {
        const dateA = new Date(a.publish_date || 0);
        const dateB = new Date(b.publish_date || 0);
        return dateB - dateA; // 降序
      });

      if (append) {
        appendBlogs(uniqueBlogs);
      } else {
        displayBlogs(uniqueBlogs);
      }

      const paginationInfo = data.pagination || {};
      const totalCount = data.total ?? paginationInfo.total ?? paginationInfo.totalCount ?? null;

      // 更新分页 - 只在非'all'页面显示分页
      if (window.currentGroup === 'all') {
        // #all 页面使用无限滚动，隐藏分页
        if (window.Pagination) {
          window.Pagination.hide();
        }

        // 设置无限滚动状态
        if (typeof paginationInfo.hasMore === 'boolean') {
          window.hasMore = paginationInfo.hasMore;
        } else {
          window.hasMore = uniqueBlogs.length >= window.blogsPerPage;
        }

        // 设置无限滚动
        if (window.hasMore && !append) {
          // 显示哨兵元素（IntersectionObserver需要可见元素）
          const sentinel = document.getElementById('scrollSentinel');
          if (sentinel) {
            sentinel.classList.remove('hidden');
          }
          
          // 初始加载完成后，准备无限滚动
          setTimeout(() => {
            if (typeof window.setupInfiniteScroll === 'function') {
              window.setupInfiniteScroll();
            }
          }, 100);
        } else if (!window.hasMore) {
          // 没有更多内容时隐藏哨兵
          const sentinel = document.getElementById('scrollSentinel');
          if (sentinel) {
            sentinel.classList.add('hidden');
          }
        }
      } else {
        // 其他页面使用分页
        if (window.Pagination) {
          window.Pagination.currentPage = window.currentPage;
          window.Pagination.update(uniqueBlogs.length, totalCount);
        }
      }

      if (uniqueBlogs.length === 0 && !append) {
        console.log('[loadBlogs] 没有博客数据');
        showEmptyState();
      } else {
        hideEmptyState();
      }

      if (typeof totalCount === 'number') {
        window.totalPages = Math.max(1, Math.ceil(totalCount / window.blogsPerPage));
      } else if (typeof paginationInfo.totalPages === 'number') {
        window.totalPages = paginationInfo.totalPages;
      }

      if (typeof paginationInfo.currentPage === 'number') {
        window.currentPage = paginationInfo.currentPage;
      }
    } else {
      throw new Error(data.error || '加载博客失败');
    }
  } catch (error) {
    console.error('[loadBlogs] 加载失败:', error);
    showError(`加载博客失败: ${error.message}`);
  } finally {
    window.isLoading = false;
    
    // 只在非追加模式下隐藏加载状态
    if (!append) {
      hideLoading();
    }
  }
}

// 显示博客列表
function displayBlogs(blogs) {
  const container = document.getElementById('blogsContainer');
  container.innerHTML = '';

  blogs.forEach(blog => {
    // 使用 window.renderBlogItem（用户选择的样式）
    const blogCard = window.renderBlogItem ? window.renderBlogItem(blog) : createBlogCard(blog);
    container.appendChild(blogCard);
  });
}

// 追加博客
function appendBlogs(blogs) {
  const container = document.getElementById('blogsContainer');

  blogs.forEach(blog => {
    // 使用 window.renderBlogItem（用户选择的样式）
    const blogCard = window.renderBlogItem ? window.renderBlogItem(blog) : createBlogCard(blog);
    container.appendChild(blogCard);
  });
}

// 创建博客卡片
function createBlogCard(blog) {
  const article = document.createElement('article');
  article.className = 'bg-white rounded-lg shadow-md hover:shadow-lg transition-all duration-300 overflow-hidden fade-in cursor-pointer';
  
  // 点击卡片跳转到详情页
  article.addEventListener('click', (e) => {
    // 使用 Router 统一管理导航（支持过渡动画、滚动管理等）
    if (window.Router && window.Router.navigate) {
      Router.navigate(`#blog/${blog.id}`);
    } else {
      window.location.hash = `#blog/${blog.id}`;
    }
  });

  const groupConfig = window.GroupConfig.getByName(blog.group_name);
  const groupInfo = {
    name: groupConfig ? groupConfig.name : blog.group_name,
    emoji: groupConfig ? groupConfig.emoji : '📝'
  };

  // 构建成员显示信息
  let memberDisplay = blog.member;
  if (blog.member_display_name && blog.member_display_name !== blog.member) {
    memberDisplay = blog.member_display_name;
  }

  // 添加昵称信息
  if (blog.fan_nickname) {
    memberDisplay += ` (${blog.fan_nickname})`;
  }
  
  // 头像与主图
  const displayGroupName = window.GroupConfig.getDisplayName(blog.group_name);
  const avatarUrl = (window.MemberImages && typeof window.MemberImages.getImageUrl === 'function')
    ? (window.MemberImages.getImageUrl(blog.member, displayGroupName) || '')
    : '';
  const firstImageUrl = (blog.images && blog.images.length > 0)
    ? (blog.images[0].r2_url || blog.images[0].original_url)
    : '';


  article.innerHTML = `
    <div>
      <!-- 主图（大图） -->
      ${firstImageUrl ? `
        <div class="w-full">
          <img src="${firstImageUrl}" alt="封面图片" class="w-full aspect-square object-cover" loading="lazy">
        </div>
      ` : ''}

      <!-- 标题 + 成员 + 日期 -->
      <div class="p-4">
        <h2 class="text-base font-semibold text-gray-900 mb-3 line-clamp-2" style="min-height: 3rem;">${blog.title || ''}</h2>

        <div class="flex items-center gap-3 mb-2">
          <div class="w-6 h-6 rounded-full overflow-hidden bg-gray-100 flex items-center justify-center flex-shrink-0">
            ${avatarUrl ? `<img src="${avatarUrl}" alt="${blog.member}" class="w-full h-full object-cover" loading="lazy">` : `<span class="text-xs text-gray-500">${blog.member?.charAt(0) || ''}</span>`}
          </div>
          <span class="text-sm font-medium text-gray-700">${memberDisplay}</span>
        </div>

        <time class="text-xs text-gray-500">${formatDate(blog.publish_date)}</time>
      </div>
    </div>
  `;

  return article;
}

// 获取团体颜色（使用 GroupConfig）
function getGroupColor(groupName) {
  return window.GroupConfig.getColor(groupName);
}

// 获取翻译内容预览
function getTranslatedContentPreview(blog) {
  if (blog.translated_content) {
    let content = typeof blog.translated_content === 'string'
      ? blog.translated_content
      : blog.translated_content.translatedText || '';

    // 移除 frontmatter（--- ... --- 之间的内容）
    content = content.replace(/^---[\s\S]*?---\s*/m, '');
    
    // 移除图片标记
    content = content.replace(/!\[.*?\]\(.*?\)/g, '');
    content = content.replace(/\[IMAGE:\d+\]/g, '');
    content = content.replace(/\[NEWLINE:\d+\]/g, ' ');
    
    // 清理HTML标签
    content = content
      .replace(/<[^>]*>/g, '')
      .replace(/\s+/g, ' ')
      .trim();

    return content.length > 200
      ? content.substring(0, 200) + '...'
      : content;
  }

  return '暂无翻译内容';
}

// 格式化日期
function formatDate(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const diffTime = now - date;
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
    if (diffHours === 0) {
      const diffMinutes = Math.floor(diffTime / (1000 * 60));
      return diffMinutes <= 1 ? '刚刚' : `${diffMinutes}分钟前`;
    }
    return `${diffHours}小时前`;
  } else if (diffDays === 1) {
    return '昨天';
  } else if (diffDays < 7) {
    return `${diffDays}天前`;
  } else {
    return date.toLocaleDateString('zh-CN');
  }
}

// 筛选功能
function filterByGroup(group) {
  currentGroup = group;
  currentPage = 1;

  // 更新标签状态
  document.querySelectorAll('.group-tab').forEach(tab => {
    tab.classList.remove('active');
  });
  event.target.classList.add('active');

  loadBlogs();
}

// 搜索功能
function handleSearch(event) {
  if (event.key === 'Enter') {
    currentSearch = event.target.value.trim();
    currentPage = 1;
    loadBlogs();
  }
}

// 增强搜索功能
async function performSearch(query) {
  if (query.length < 1) {
    showSearchResults([]);
    return;
  }

  try {
    showLoading();

    const params = new URLSearchParams({
      q: query,
      limit: 50,
      group: currentGroup !== 'all' ? currentGroup : ''
    });

    const apiBase = window.API_BASE_URL || API_BASE_URL;
    const response = await fetch(`${apiBase}/api/search?${params}`);
    const data = await response.json();

    if (data.success) {
      displaySearchResults(data.data, query);
    } else {
      throw new Error(data.error || '搜索失败');
    }
  } catch (error) {
    console.error('搜索失败:', error);
    showError('搜索失败，请稍后重试');
    showSearchResults([]);
  } finally {
    hideLoading();
  }
}

// 显示搜索结果
function displaySearchResults(results, query) {
  const container = document.getElementById('blogsContainer');
  container.innerHTML = '';

  if (results.length === 0) {
    container.innerHTML = `
      <div class="text-center py-12">
        <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <h3 class="mt-2 text-sm font-medium text-gray-900">未找到结果</h3>
        <p class="mt-1 text-sm text-gray-500">没有找到与"${query}"相关的博客。</p>
      </div>
    `;
    return;
  }

  // 显示搜索标题
  const searchHeader = document.createElement('div');
  searchHeader.className = 'mb-6 p-4 bg-blue-50 rounded-lg';
  searchHeader.innerHTML = `
    <h3 class="text-lg font-semibold text-blue-900">
      搜索结果: "${query}" (找到 ${results.length} 篇博客)
    </h3>
  `;
  container.appendChild(searchHeader);

  // 显示搜索结果
  results.forEach(blog => {
    const blogCard = createBlogCard(blog);
    blogCard.classList.add('ring-2', 'ring-blue-200'); // 高亮搜索结果
    container.appendChild(blogCard);
  });
}

function showSearchResults(results) {
  const container = document.getElementById('blogsContainer');
  container.innerHTML = '';

  if (results.length === 0) {
    container.innerHTML = `
      <div class="text-center py-12">
        <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <h3 class="mt-2 text-sm font-medium text-gray-900">未找到结果</h3>
        <p class="mt-1 text-sm text-gray-500">没有找到相关的博客。</p>
      </div>
    `;
    return;
  }

  results.forEach(blog => {
    const blogCard = createBlogCard(blog);
    container.appendChild(blogCard);
  });
}

// 成员名搜索建议
async function getMemberSuggestions(query) {
  if (query.length < 2) {
    return [];
  }

  try {
    const apiBase = window.API_BASE_URL || API_BASE_URL;
    const response = await fetch(`${apiBase}/api/members?search=${encodeURIComponent(query)}`);
    const data = await response.json();

    if (data.success) {
      return data.data.slice(0, 5).map(member => ({
        name: member.name,
        displayName: member.displayName,
        fanNickname: member.fanNickname,
        groupName: member.groupName,
        avatar: member.avatar_url
      }));
    }

    return [];
  } catch (error) {
      console.error('获取成员建议失败:', error);
    return [];
  }
}

// 增强搜索输入框
function enhanceSearchInput() {
  const searchInput = document.getElementById('searchInput');
  let searchTimeout;
  let suggestionTimeout;

  // 创建搜索建议容器
  const suggestionContainer = document.createElement('div');
  suggestionContainer.className = 'absolute top-full left-0 w-full bg-white border border-gray-200 rounded-lg shadow-lg z-10 hidden';
  suggestionContainer.id = 'searchSuggestions';

  // 创建成员搜索建议
  searchInput.parentElement.style.position = 'relative';
  searchInput.parentElement.appendChild(suggestionContainer);

  // 实时搜索
  searchInput.addEventListener('input', (event) => {
    const query = event.target.value.trim();

    clearTimeout(searchTimeout);

    searchTimeout = setTimeout(() => {
      if (query.length >= 2) {
        performSearch(query);
      } else {
        // 恢复显示当前筛选的博客
        loadBlogs();
      }
    }, 300);

    // 成员搜索建议
    clearTimeout(suggestionTimeout);
    suggestionTimeout = setTimeout(async () => {
      if (query.length >= 2) {
        const suggestions = await getMemberSuggestions(query);
        displayMemberSuggestions(suggestions);
      } else {
        hideMemberSuggestions();
      }
    }, 500);
  });

  // 失焦时显示
  searchInput.addEventListener('focus', () => {
    if (searchInput.value.trim().length >= 2) {
      const query = searchInput.value.trim();
      performSearch(query);
    }
  });

  // 失焦时隐藏
  searchInput.addEventListener('blur', () => {
    setTimeout(() => {
      hideMemberSuggestions();
    }, 200);
  });
}

// 显示成员建议
function displayMemberSuggestions(suggestions) {
  const container = document.getElementById('searchSuggestions');

  if (suggestions.length === 0) {
    container.classList.add('hidden');
    return;
  }

  container.classList.remove('hidden');
  container.innerHTML = suggestions.map(member => `
    <div class="px-4 py-3 hover:bg-gray-50 cursor-pointer flex items-center space-x-3"
         onclick="selectMember('${member.name}', '${member.groupName}')">
      <div class="flex-shrink-0">
        ${member.avatar ?
          `<img src="${member.avatar}" alt="${member.name}" class="w-8 h-8 rounded-full object-cover">` :
          `<div class="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
            <svg class="w-4 h-4 text-gray-600" fill="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 8zM12 14a7 7 0 00-7 7h14a7 7 0 00-7 7z" />
            </svg>
          </div>`
        }
      </div>
      <div class="flex-1">
        <div class="font-medium text-gray-900">${member.displayName || member.name}</div>
        <div class="text-sm text-gray-600">
          ${GROUP_INFO[member.group_name]?.emoji || ''} ${GROUP_INFO[member.group_name]?.name || member.group_name}
          ${member.fanNickname ? ` (${member.fanNickname})` : ''}
        </div>
      </div>
    </div>
  `).join('');
}

// 隐藏成员建议
function hideMemberSuggestions() {
  const container = document.getElementById('searchSuggestions');
  container.classList.add('hidden');
}

// 选择成员
function selectMember(memberName, groupName) {
  currentGroup = groupName;
  currentSearch = memberName;
  currentPage = 1;

  // 更新筛选标签
  document.querySelectorAll('.group-tab').forEach(tab => {
    tab.classList.remove('active');
  });
  document.querySelector(`[onclick="filterByGroup('${groupName}')"]`)?.classList.add('active');

  // 更新搜索框
  const searchInput = document.getElementById('searchInput');
  searchInput.value = memberName;

  // 加载该成员的博客
  loadBlogs();

  // 隐藏建议
  hideMemberSuggestions();
}

// 刷新博客
function refreshBlogs() {
  currentPage = 1;
  loadBlogs();
  loadStats();
}

// 更新加载更多按钮（已弃用，使用分页）
function updateLoadMoreButton() {
  // 已使用分页组件替代
}

// 更新分页组件（已移至 Pagination 模块）
function updatePagination() {
  if (window.Pagination) {
    window.Pagination.render();
  }
}

// 跳转到指定页（已移至 Pagination 模块）
function goToPage(page) {
  if (window.Pagination) {
    window.Pagination.goToPage(page);
  }
}

// 跳转到博客详情页
function toggleBlogContent(blogId) {
  // 使用 Router 统一管理导航（支持过渡动画、滚动管理等）
  if (window.Router && window.Router.navigate) {
    Router.navigate(`#blog/${blogId}`);
  } else {
    window.location.hash = `#blog/${blogId}`;
  }
}

// 打开图片模态框
function openImageModal(imageUrl) {
  // 创建简单的图片预览
  const modal = document.createElement('div');
  modal.className = 'fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4';
  modal.onclick = () => modal.remove();

  modal.innerHTML = `
    <div class="relative max-w-4xl max-h-full">
      <img src="${imageUrl}"
           alt="博客图片"
           class="max-w-full max-h-full object-contain rounded-lg">
      <button class="absolute top-4 right-4 text-white bg-black bg-opacity-50 rounded-full p-2 hover:bg-opacity-75"
              onclick="this.parentElement.parentElement.remove()">
        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  `;

  document.body.appendChild(modal);
}

// 显示加载状态
function showLoading() {
  document.getElementById('loadingState').classList.remove('hidden');
}

// 隐藏加载状态
function hideLoading() {
  document.getElementById('loadingState').classList.add('hidden');
}

// 显示空状态
function showEmptyState() {
  document.getElementById('emptyState').classList.remove('hidden');
  // loadMoreContainer 已删除，不需要处理
}

// 隐藏空状态
function hideEmptyState() {
  document.getElementById('emptyState').classList.add('hidden');
}

// 显示错误信息
function showError(message) {
  const errorDiv = document.createElement('div');
  errorDiv.className = 'fixed top-4 right-4 bg-red-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 fade-in';
  errorDiv.innerHTML = `
    <div class="flex items-center space-x-2">
      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <span>${message}</span>
    </div>
  `;

  document.body.appendChild(errorDiv);

  // 3秒后自动移除
  setTimeout(() => {
    errorDiv.remove();
  }, 3000);
}

// 自动刷新
function startAutoRefresh() {
  // 每5分钟自动刷新一次
  setInterval(() => {
    console.log('自动刷新数据');
    loadStats();

    // 如果用户在首页，也刷新博客列表
    if (currentPage === 1 && !currentSearch) {
      loadBlogs();
    }
  }, 5 * 60 * 1000);
}

// 无限滚动相关
let scrollObserver;
let isLoadingMore = false;

// 设置无限滚动
window.setupInfiniteScroll = function() {
  console.log('[InfiniteScroll] 设置无限滚动');

  // 清理旧的观察器
  if (scrollObserver) {
    scrollObserver.disconnect();
  }

  // 只在 #all 页面启用无限滚动
  if (window.currentGroup !== 'all') {
    console.log('[InfiniteScroll] 非all页面，不启用无限滚动');
    return;
  }

  // 创建观察器来检测容器底部
  scrollObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting && window.hasMore && !isLoadingMore && !window.isLoading) {
          console.log('[InfiniteScroll] 触发加载更多');
          loadMoreBlogs();
        }
      });
    },
    {
      rootMargin: '200px' // 提前200px开始加载
    }
  );

  // 观察哨兵元素
  const sentinel = document.getElementById('scrollSentinel');
  if (sentinel) {
    scrollObserver.observe(sentinel);
    console.log('[InfiniteScroll] 已设置哨兵观察器');
  }
};

// 加载更多博客（用于无限滚动）
async function loadMoreBlogs() {
  if (isLoadingMore || !window.hasMore || window.isLoading) {
    return;
  }

  console.log('[InfiniteScroll] 开始加载更多博客');
  isLoadingMore = true;

  // 显示加载指示器
  const loadingIndicator = document.getElementById('loadingIndicator');
  if (loadingIndicator) {
    loadingIndicator.classList.remove('hidden');
  }

  try {
    // 增加页码
    window.currentPage++;

    // 使用 append=true 来追加博客
    await window.loadBlogs(true);
  } catch (error) {
    console.error('[InfiniteScroll] 加载更多失败:', error);
    window.hasMore = false;
  } finally {
    isLoadingMore = false;

    // 加载完成后隐藏指示器
    if (loadingIndicator) {
      loadingIndicator.classList.add('hidden');
    }
    
    // 如果没有更多内容，隐藏哨兵
    if (!window.hasMore) {
      const sentinel = document.getElementById('scrollSentinel');
      if (sentinel) {
        sentinel.classList.add('hidden');
      }
    }
  }
}

// 检查系统状态
async function checkSystemStatus() {
  try {
    const apiBase = window.API_BASE_URL || API_BASE_URL;
    const response = await fetch(`${apiBase}/api/health`);
    const data = await response.json();

    const indicator = document.getElementById('statusIndicator');
    const text = document.getElementById('statusText');

    // 检查DOM元素是否存在
    if (!indicator || !text) {
      console.warn('[checkSystemStatus] 状态指示器DOM元素不存在，跳过更新');
      return;
    }

    if (data.success && data.data.status === 'healthy') {
      indicator.className = 'w-3 h-3 bg-green-400 rounded-full animate-pulse';
      text.textContent = '系统正常';
    } else {
      indicator.className = 'w-3 h-3 bg-yellow-400 rounded-full';
      text.textContent = '系统警告';
    }
  } catch (error) {
    const indicator = document.getElementById('statusIndicator');
    const text = document.getElementById('statusText');

    // 检查DOM元素是否存在
    if (indicator && text) {
      indicator.className = 'w-3 h-3 bg-red-400 rounded-full';
      text.textContent = '系统异常';
    }
    console.error('[checkSystemStatus] 系统状态检查失败:', error);
  }
}

