/**
 * 简繁切换模块
 * 支持简体中文/繁体中文切换
 * 仅转换中文内容，不影响日语
 */

(function() {
  'use strict';

  const LANG_KEY = 'sakamichi-chinese-variant';
  const LANG_SIMPLIFIED = 'simplified';
  const LANG_TRADITIONAL = 'traditional';
  
  let converter = null;
  let isOpenCCLoaded = false;

  // 检查 OpenCC 是否加载完成
  function waitForOpenCC(callback, maxAttempts = 50) {
    let attempts = 0;
    const checkInterval = setInterval(() => {
      attempts++;
      if (typeof OpenCC !== 'undefined') {
        clearInterval(checkInterval);
        isOpenCCLoaded = true;
        console.log('[LanguageToggle] OpenCC 已加载');
        callback();
      } else if (attempts >= maxAttempts) {
        clearInterval(checkInterval);
        console.error('[LanguageToggle] OpenCC 加载超时');
      }
    }, 100);
  }

  // 初始化转换器
  function initConverter() {
    if (!isOpenCCLoaded || !OpenCC) {
      console.error('[LanguageToggle] OpenCC 未加载');
      return false;
    }
    
    try {
      // 简体转繁体
      converter = OpenCC.Converter({ from: 'cn', to: 'tw' });
      console.log('[LanguageToggle] 转换器初始化成功');
      return true;
    } catch (e) {
      console.error('[LanguageToggle] 转换器初始化失败:', e);
      return false;
    }
  }

  // 获取当前语言设置
  function getCurrentLanguage() {
    const savedLang = localStorage.getItem(LANG_KEY);
    if (savedLang) {
      return savedLang;
    }
    return LANG_SIMPLIFIED; // 默认简体
  }

  // 判断元素是否为日语或包含日语
  function isJapaneseElement(element) {
    // 检查元素本身的 lang 属性
    if (element.lang === 'ja') {
      return true;
    }
    
    // 检查是否在日语容器内
    if (element.closest('[lang="ja"]')) {
      return true;
    }
    
    return false;
  }

  // 转换文本节点
  function convertTextNode(node, toTraditional) {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent.trim();
      if (text) {
        try {
          node.textContent = toTraditional ? converter(text) : text;
        } catch (e) {
          console.warn('[LanguageToggle] 转换失败:', e);
        }
      }
    }
  }

  // 递归转换元素及其子元素
  function convertElement(element, toTraditional) {
    // 跳过日语元素
    if (isJapaneseElement(element)) {
      return;
    }

    // 转换当前元素的文本节点
    Array.from(element.childNodes).forEach(node => {
      if (node.nodeType === Node.TEXT_NODE) {
        convertTextNode(node, toTraditional);
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        convertElement(node, toTraditional);
      }
    });
  }

  // 应用语言设置
  function applyLanguage(lang) {
    if (!converter && !initConverter()) {
      console.error('[LanguageToggle] 转换器未就绪');
      return;
    }

    const toTraditional = lang === LANG_TRADITIONAL;
    
    console.log('[LanguageToggle] 开始转换:', toTraditional ? '简→繁' : '繁→简');

    // 需要转换的选择器
    const selectors = [
      // 博客内容中文段落
      'p[lang="zh"]',
      // UI 文字
      '.stat-label',
      '.stat-card',
      '.filter-label',
      '.section-title',
      // 标签页
      '.tab-item',
      '.mobile-nav-item',
      // 标题
      'h1', 'h2', 'h3',
      // 按钮和选项
      'button:not([lang="ja"])',
      'option',
      // 成员相关
      '.member-item',
      '.member-name',
      // 其他界面元素
      '.page-info',
      'footer p',
      'label',
      '.dropdown-item'
    ];

    // 转换所有匹配元素
    selectors.forEach(selector => {
      try {
        const elements = document.querySelectorAll(selector);
        elements.forEach(el => {
          if (!isJapaneseElement(el)) {
            convertElement(el, toTraditional);
          }
        });
      } catch (e) {
        console.warn(`[LanguageToggle] 转换选择器 ${selector} 失败:`, e);
      }
    });

    // 保存设置
    localStorage.setItem(LANG_KEY, lang);
    
    // 更新按钮状态
    updateLanguageButtons(lang);
    
    console.log('[LanguageToggle] 转换完成:', lang);
  }

  // 切换语言
  function toggleLanguage() {
    const currentLang = getCurrentLanguage();
    const newLang = currentLang === LANG_SIMPLIFIED ? LANG_TRADITIONAL : LANG_SIMPLIFIED;
    applyLanguage(newLang);
    
    // 显示提示
    showLanguageToast(newLang);
  }

  // 更新按钮状态
  function updateLanguageButtons(lang) {
    // PC端按钮
    const desktopButton = document.getElementById('langToggleDesktop');
    if (desktopButton) {
      const text = desktopButton.querySelector('.lang-text');
      const title = lang === LANG_TRADITIONAL ? '切换到简体中文' : '切换到繁体中文';
      const displayText = lang === LANG_TRADITIONAL ? '繁' : '简';
      
      if (text) {
        text.textContent = displayText;
      } else {
        desktopButton.textContent = displayText;
      }
      
      desktopButton.setAttribute('title', title);
      desktopButton.setAttribute('data-lang', lang);
    }
    
    // 移动端按钮 - 显示完整文字
    const mobileButton = document.getElementById('langToggleMobile');
    if (mobileButton) {
      const text = mobileButton.querySelector('.lang-text');
      const title = lang === LANG_TRADITIONAL ? '切换到简体中文' : '切换到繁体中文';
      const displayText = lang === LANG_TRADITIONAL ? '繁体中文' : '简体中文';
      
      if (text) {
        text.textContent = displayText;
      }
      
      mobileButton.setAttribute('title', title);
      mobileButton.setAttribute('data-lang', lang);
    }
  }

  // 显示语言切换提示
  function showLanguageToast(lang) {
    const message = lang === LANG_TRADITIONAL ? '已切换到繁体中文' : '已切换到简体中文';
    
    if (typeof showToast === 'function') {
      showToast(message);
    } else {
      console.log('[LanguageToggle]', message);
    }
  }

  // 初始化
  function init() {
    console.log('[LanguageToggle] 等待 OpenCC 加载...');
    
    waitForOpenCC(() => {
      initConverter();
      
      // 应用保存的语言设置
      const currentLang = getCurrentLanguage();
      if (currentLang === LANG_TRADITIONAL) {
        applyLanguage(currentLang);
      }
      
      // 绑定按钮事件
      const desktopButton = document.getElementById('langToggleDesktop');
      const mobileButton = document.getElementById('langToggleMobile');
      
      if (desktopButton) {
        desktopButton.addEventListener('click', toggleLanguage);
        console.log('[LanguageToggle] PC端按钮已绑定');
      }
      
      if (mobileButton) {
        mobileButton.addEventListener('click', toggleLanguage);
        console.log('[LanguageToggle] 移动端按钮已绑定');
      }
      
      // 更新按钮显示
      updateLanguageButtons(currentLang);
      
      console.log('[LanguageToggle] 初始化完成');
    });
  }

  // DOM加载完成后初始化
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // 导出到全局
  window.LanguageToggle = {
    toggle: toggleLanguage,
    apply: applyLanguage,
    getCurrent: getCurrentLanguage
  };
})();
