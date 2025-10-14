// 移动端菜单模块

// 切换移动端菜单
function toggleMobileMenu() {
  const sidebar = document.querySelector('.mobile-sidebar');
  const overlay = document.querySelector('.mobile-overlay');
  
  if (sidebar && overlay) {
    sidebar.classList.toggle('open');
    overlay.classList.toggle('open');
    
    // 防止背景滚动
    if (sidebar.classList.contains('open')) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
  }
}

// 移动端切换团体（同时关闭菜单）
function switchGroupMobile(group) {
  // 更新移动端菜单激活状态
  document.querySelectorAll('.mobile-nav-item').forEach(item => {
    item.classList.remove('active');
    if (item.dataset.group === group) {
      item.classList.add('active');
    }
  });
  
  // 关闭菜单
  toggleMobileMenu();
  
  // 调用主切换函数
  switchGroup(group);
}

// 同步PC端和移动端的激活状态
function syncMenuActiveState(group) {
  // 更新PC端标签
  document.querySelectorAll('.tab-item').forEach(item => {
    item.classList.remove('active');
    if (item.dataset.group === group) {
      item.classList.add('active');
    }
  });
  
  // 更新移动端菜单
  document.querySelectorAll('.mobile-nav-item').forEach(item => {
    item.classList.remove('active');
    if (item.dataset.group === group) {
      item.classList.add('active');
    }
  });
}
