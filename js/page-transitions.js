/**
 * 页面切换动画模块
 * 消除切换时的闪烁，提供流畅的视觉体验
 */

// 页面切换状态
let isTransitioning = false;

/**
 * 平滑切换内容
 * @param {Function} callback - 切换内容的回调函数
 * @param {number} duration - 动画持续时间(ms)
 */
async function smoothTransition(callback, duration = 750) {
  if (isTransitioning) return;

  isTransitioning = true;
  const container = document.getElementById('blogsContainer');

  if (container) {
    // 淡出当前内容 - 使用cubic-bezier缓动
    container.style.transition = `opacity ${duration}ms cubic-bezier(0.4, 0, 0.2, 1), transform ${duration}ms cubic-bezier(0.4, 0, 0.2, 1)`;
    container.style.opacity = '0';
    container.style.transform = 'translateY(-10px)';

    // 等待淡出完成
    await new Promise(resolve => setTimeout(resolve, duration));

    // 执行内容切换
    if (callback) {
      await callback();
    }

    // 重置 transition，准备淡入
    container.style.transition = `opacity ${duration}ms cubic-bezier(0.4, 0, 0.2, 1), transform ${duration}ms cubic-bezier(0.4, 0, 0.2, 1)`;
    
    // 强制重排，确保transition生效
    void container.offsetHeight;
    
    // 淡入新内容
    container.style.opacity = '1';
    container.style.transform = 'translateY(0)';

    // 等待淡入完成
    await new Promise(resolve => setTimeout(resolve, duration));
  } else {
    // 如果没有容器，直接执行回调
    if (callback) {
      await callback();
    }
  }

  isTransitioning = false;
}

/**
 * 为博客详情页添加进入/退出动画 - 使用slide动画
 */
function animateBlogDetail(action = 'enter') {
  const detail = document.getElementById('blogDetail');
  if (!detail) return;

  if (action === 'enter') {
    // 进入动画 - 使用CSS动画类
    detail.style.opacity = '0';
    detail.style.transform = 'translateY(30px)';
    detail.style.transition = 'opacity 0.25s cubic-bezier(0.4, 0, 0.2, 1), transform 0.25s cubic-bezier(0.4, 0, 0.2, 1)';

    // 强制重排
    detail.offsetHeight;

    requestAnimationFrame(() => {
      detail.style.opacity = '1';
      detail.style.transform = 'translateY(0)';
    });
  } else {
    // 退出动画 - slide down
    detail.classList.add('closing');
    detail.style.opacity = '0';
    detail.style.transform = 'translateY(20px)';
    detail.style.transition = 'opacity 0.2s cubic-bezier(0.4, 0, 0.2, 1), transform 0.2s cubic-bezier(0.4, 0, 0.2, 1)';

    setTimeout(() => {
      detail.remove();
    }, 200);
  }
}

/**
 * 添加滚动时Header阴影效果
 */
function initHeaderScrollEffect() {
  const header = document.querySelector('header');
  if (!header) return;
  
  let lastScroll = 0;
  let ticking = false;
  
  window.addEventListener('scroll', () => {
    lastScroll = window.scrollY;
    
    if (!ticking) {
      window.requestAnimationFrame(() => {
        if (lastScroll > 10) {
          header.classList.add('scrolled');
        } else {
          header.classList.remove('scrolled');
        }
        ticking = false;
      });
      
      ticking = true;
    }
  });
}

/**
 * 图片懒加载优化
 */
function initImageLazyLoad() {
  if ('IntersectionObserver' in window) {
    const imageObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const img = entry.target;
          
          // 添加加载动画
          img.style.opacity = '0';
          img.style.transition = 'opacity 0.3s ease';
          
          // 图片加载完成后淡入
          if (img.complete) {
            img.style.opacity = '1';
            img.classList.add('loaded');
          } else {
            img.addEventListener('load', () => {
              img.style.opacity = '1';
              img.classList.add('loaded');
            });
          }
          
          observer.unobserve(img);
        }
      });
    }, {
      rootMargin: '50px'
    });
    
    // 观察所有图片
    document.querySelectorAll('img[loading="lazy"]').forEach(img => {
      imageObserver.observe(img);
    });
  }
}

/**
 * 优化标签切换动画
 */
function initTabSwitchAnimation() {
  const tabs = document.querySelectorAll('.tab-item, .mobile-nav-item');
  
  tabs.forEach(tab => {
    tab.addEventListener('click', function() {
      // 移除其他标签的激活状态
      tabs.forEach(t => {
        if (t !== this) {
          t.style.transition = 'all 0.2s ease';
        }
      });
      
      // 当前标签添加强调动画
      this.style.transition = 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
    });
  });
}

/**
 * 添加内容加载状态
 */
function showLoadingState() {
  const container = document.getElementById('blogsContainer');
  if (container) {
    container.classList.add('loading-state');
  }
}

function hideLoadingState() {
  const container = document.getElementById('blogsContainer');
  if (container) {
    container.classList.remove('loading-state');
  }
}

/**
 * 初始化所有动画效果
 */
function initPageTransitions() {
  // 添加页面加载完成标记
  document.body.classList.add('page-loaded');
  
  // Header滚动效果
  initHeaderScrollEffect();
  
  // 标签切换动画
  initTabSwitchAnimation();
  
  // 图片懒加载
  initImageLazyLoad();
  
  console.log('✨ 页面动画效果已初始化');
}

// 页面加载完成后初始化
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initPageTransitions);
} else {
  initPageTransitions();
}

// 导出给全局使用
window.smoothTransition = smoothTransition;
window.animateBlogDetail = animateBlogDetail;
window.showLoadingState = showLoadingState;
window.hideLoadingState = hideLoadingState;
window.initImageLazyLoad = initImageLazyLoad;
