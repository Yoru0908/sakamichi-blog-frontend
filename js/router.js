/**
 * 统一路由管理模块
 * 处理所有页面的路由跳转和状态管理
 */

window.Router = {
  currentView: null,
  currentGroup: 'all',
  currentMember: '',
  currentBlog: null,
  
  /**
   * 初始化路由
   */
  init() {
    console.log('[Router] 初始化路由管理');
    
    // 监听浏览器前进后退
    window.addEventListener('popstate', (event) => {
      console.log('[Router] popstate事件:', event.state, window.location.hash);
      this.handleRoute();
    });
    
    // 监听hash变化
    window.addEventListener('hashchange', (event) => {
      console.log('[Router] hashchange事件:', window.location.hash);
      this.handleRoute();
    });
    
    // 初始路由处理（立即执行）
    this.handleRoute();
  },
  
  /**
   * 处理路由
   */
  handleRoute() {
    const hash = window.location.hash;
    console.log('[Router] 处理路由:', hash);
    
    if (!hash || hash === '#') {
      this.showGroupPage('all');
      return;
    }
    
    // 解析路由
    if (hash.startsWith('#blog/')) {
      // 博客详情页
      const blogId = hash.substring(6);
      this.showBlogDetail(blogId);
    } else if (hash.includes('/member/')) {
      // 成员页面
      const parts = hash.split('/');
      const group = parts[0].substring(1); // 去掉#
      const member = decodeURIComponent(parts[2]);
      this.showMemberPage(member, group);
    } else {
      // 团体页面
      const group = hash.substring(1);
      this.showGroupPage(group);
    }
  },
  
  /**
   * 显示团体页面
   */
  async showGroupPage(group) {
    console.log('[Router] 显示团体页面:', group);
    
    // ✅ 防止重复调用：如果已经在相同的团体页面，不重新加载
    if (this.currentView === 'group' && this.currentGroup === group && window.currentGroup === group) {
      console.log('[Router] 已经在当前团体页面，跳过重新加载');
      return;
    }
    
    this.currentView = 'group';
    this.currentGroup = group;
    this.currentMember = '';

    // 必须先设置全局变量，再加载博客
    window.currentGroup = group;
    window.currentPage = 1;  // 重置为第1页
    window.currentSearch = '';

    // 重置分页
    if (window.Pagination) {
      window.Pagination.reset();
    }

    console.log('[Router] 设置全局变量 currentGroup:', window.currentGroup);

    // ⚠️ 重要：先隐藏其他页面，再调用 switchGroup
    // 隐藏成员页面
    const memberPageContainer = document.getElementById('memberPageContainer');
    if (memberPageContainer) {
      memberPageContainer.classList.add('hidden');
    }

    // 隐藏博客详情页
    const blogDetail = document.getElementById('blogDetail');
    if (blogDetail) {
      console.log('[Router] 移除详情页');
      blogDetail.remove();
    }

    // 显示主页面
    const main = document.querySelector('main');
    if (main) {
      main.style.display = 'block';
    }

    // 恢复博客容器显示
    const blogsContainer = document.getElementById('blogsContainer');
    if (blogsContainer) {
      blogsContainer.style.display = '';
      blogsContainer.innerHTML = ''; // 清空旧内容
    }

    // 显示页脚
    const footer = document.querySelector('footer');
    if (footer) {
      footer.style.display = 'block';
    }

    // ⚠️ 重要：确保 currentGroup 正确传递到 index.html 的 switchGroup
    if (window.switchGroup) {
      // 不使用 await，因为 switchGroup 内部会调用 loadBlogs
      window.switchGroup(group);
      return; // switchGroup 会处理所有后续逻辑
    }

    // 更新标签页状态
    document.querySelectorAll('.tab-item').forEach(tab => {
      tab.classList.remove('active');
      if (tab.dataset.group === group) {
        tab.classList.add('active');
      }
    });

    // 同步移动端菜单
    document.querySelectorAll('.mobile-nav-item').forEach(tab => {
      tab.classList.remove('active');
      if (tab.dataset.group === group) {
        tab.classList.add('active');
      }
    });

    // 显示/隐藏团体信息
    const groupInfo = document.getElementById('groupInfo');
    const memberListSection = document.getElementById('memberListSection');

    if (group !== 'all') {
      if (groupInfo) groupInfo.classList.remove('hidden');
      if (memberListSection) memberListSection.classList.remove('hidden');

      // 加载团体信息
      if (window.loadGroupInfo) {
        await window.loadGroupInfo(group);
      }
    } else {
      if (groupInfo) groupInfo.classList.add('hidden');
      if (memberListSection) memberListSection.classList.add('hidden');
    }

    // 加载博客列表
    if (window.loadBlogs) {
      console.log('[Router] 调用loadBlogs, currentGroup:', window.currentGroup);
      await window.loadBlogs();
    }
  },
  
  /**
   * 显示成员页面
   */
  showMemberPage(member, group) {
    console.log('[Router] 显示成员页面:', member, group);
    this.currentView = 'member';
    this.currentGroup = group;
    this.currentMember = member;
    
    // 隐藏博客详情页
    const blogDetail = document.getElementById('blogDetail');
    if (blogDetail) {
      blogDetail.remove();
    }
    
    // 调用成员页面显示
    if (window.MemberPage && window.MemberPage.showMemberPage) {
      window.MemberPage.showMemberPage(member, group);
    }
  },
  
  /**
   * 显示博客详情页
   */
  async showBlogDetail(blogId) {
    console.log('[Router] 显示博客详情:', blogId);
    this.currentView = 'blog';
    this.currentBlog = blogId;
    
    // 隐藏成员页面
    const memberPageContainer = document.getElementById('memberPageContainer');
    if (memberPageContainer) {
      memberPageContainer.classList.add('hidden');
    }
    
    // 先检查是否已经在详情页
    const existingDetail = document.getElementById('blogDetail');
    if (existingDetail) {
      console.log('[Router] 已经在详情页，更新内容');
      existingDetail.remove();
    }
    
    // 调用博客详情显示
    if (window.showBlogDetail) {
      try {
        // 先获取博客数据
        const response = await fetch(`https://sakamichi-blog-translator.srzwyuu.workers.dev/api/blogs/${blogId}`);
        const data = await response.json();

        if (data.success && data.blog) {
          console.log('[Router] 调用showBlogDetail，传递博客数据避免重复请求');
          // 传递 blogData 参数，避免 loadBlogContent 重复请求
          window.showBlogDetail(data.blog, false, data.blog);
        } else {
          console.error('[Router] 博客不存在:', blogId);
          // 返回主页
          this.navigate('#all');
        }
      } catch (error) {
        console.error('[Router] 加载博客失败:', error);
        // 返回主页
        this.navigate('#all');
      }
    } else {
      console.error('[Router] showBlogDetail函数不存在');
    }
  },
  
  /**
   * 导航到指定路由
   */
  navigate(hash) {
    console.log('[Router] 导航到:', hash);
    window.location.hash = hash;
  },
  
  /**
   * 返回上一页
   */
  back() {
    window.history.back();
  }
};
