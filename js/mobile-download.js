/**
 * 移动端下载优化
 * 提供更适合手机的下载方式
 */

// 检测是否为移动设备
function isMobileDevice() {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

// 检测是否支持 Web Share API
function canUseWebShare() {
  return navigator.share !== undefined;
}

/**
 * 移动端批量下载图片（改进方案）
 * 统一使用图片浏览模式，让用户长按保存到相册
 */
async function mobileDownloadImages(images, blogData) {
  if (!isMobileDevice()) {
    // 非移动设备，使用原来的ZIP下载
    return null;
  }
  
  console.log('📱 检测到移动设备，使用图片浏览模式');
  
  if (images.length === 0) {
    showToast('没有找到可保存的图片');
    return 'cancelled';
  }
  
  // 所有情况都打开图片浏览模式，让用户长按保存到相册
  console.log(`打开图片浏览器 (${images.length} 张图片)`);
  openImageGallery(images, blogData);
  return 'gallery';
}

/**
 * 显示移动端下载选项
 */
function showMobileDownloadChoice(imageCount) {
  return new Promise((resolve) => {
    // 创建自定义对话框
    const dialog = document.createElement('div');
    dialog.className = 'mobile-download-dialog';
    dialog.innerHTML = `
      <div class="mobile-download-overlay"></div>
      <div class="mobile-download-content">
        <h3>📱 下载 ${imageCount} 张图片</h3>
        <p class="dialog-desc">请选择下载方式：</p>
        
        <button class="download-option-btn primary" data-choice="gallery">
          <div class="option-icon">🖼️</div>
          <div class="option-text">
            <div class="option-title">图片浏览模式（推荐）</div>
            <div class="option-subtitle">一屏显示所有图片，快速长按保存</div>
          </div>
        </button>
        
        <button class="download-option-btn" data-choice="sequential">
          <div class="option-icon">⬇️</div>
          <div class="option-text">
            <div class="option-title">逐张下载</div>
            <div class="option-subtitle">自动下载到"下载"文件夹</div>
          </div>
        </button>
        
        <button class="download-option-btn cancel" data-choice="cancel">
          <div class="option-text">
            <div class="option-title">取消</div>
          </div>
        </button>
      </div>
    `;
    
    document.body.appendChild(dialog);
    
    // 添加样式
    if (!document.getElementById('mobile-download-styles')) {
      const styles = document.createElement('style');
      styles.id = 'mobile-download-styles';
      styles.textContent = `
        .mobile-download-dialog {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          z-index: 10000;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
        }
        
        .mobile-download-overlay {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: rgba(0, 0, 0, 0.5);
        }
        
        .mobile-download-content {
          position: relative;
          background: white;
          border: 1px solid #e8e8e8;
          padding: 24px;
          max-width: 400px;
          width: 100%;
        }
        
        .mobile-download-content h3 {
          margin: 0 0 8px 0;
          font-size: 1.25rem;
          font-weight: 600;
          color: #222;
        }
        
        .dialog-desc {
          margin: 0 0 20px 0;
          color: #666;
          font-size: 0.875rem;
        }
        
        .download-option-btn {
          width: 100%;
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 16px;
          margin-bottom: 8px;
          background: white;
          border: 1px solid #e8e8e8;
          cursor: pointer;
          transition: all 0.2s;
          text-align: left;
        }
        
        .download-option-btn:hover {
          background: #f5f5f5;
          border-color: #d0d0d0;
        }
        
        .download-option-btn.primary {
          border-color: #333;
          background: #fafafa;
        }
        
        .download-option-btn.cancel {
          justify-content: center;
          border-color: #ccc;
          color: #666;
        }
        
        .option-icon {
          font-size: 24px;
          line-height: 1;
        }
        
        .option-text {
          flex: 1;
        }
        
        .option-title {
          font-size: 1rem;
          font-weight: 500;
          color: #222;
          margin-bottom: 2px;
        }
        
        .option-subtitle {
          font-size: 0.8125rem;
          color: #666;
        }
      `;
      document.head.appendChild(styles);
    }
    
    // 处理点击
    dialog.addEventListener('click', (e) => {
      const btn = e.target.closest('.download-option-btn');
      if (btn) {
        const choice = btn.dataset.choice;
        document.body.removeChild(dialog);
        resolve(choice);
      } else if (e.target.classList.contains('mobile-download-overlay')) {
        document.body.removeChild(dialog);
        resolve('cancel');
      }
    });
  });
}

/**
 * 逐张下载图片
 */
async function downloadImagesSequentially(images) {
  showToast('开始逐张下载...');
  let successCount = 0;
  
  for (let i = 0; i < images.length; i++) {
    try {
      updateProgressDialog(`下载第 ${i + 1}/${images.length} 张`, (i / images.length) * 100);
      
      const fileName = String(i + 1).padStart(2, '0');
      await downloadSingleImage(images[i].url, fileName);
      
      successCount++;
      
      // 延迟避免浏览器限制
      if (i < images.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    } catch (error) {
      console.error(`图片 ${i + 1} 下载失败:`, error);
    }
  }
  
  hideProgressDialog();
  showToast(`完成！成功下载 ${successCount}/${images.length} 张图片`);
  return 'completed';
}

/**
 * 下载单张图片
 */
async function downloadSingleImage(url, fileName) {
  try {
    // 通过后端代理获取图片
    const apiBase = App.config.apiBaseUrl || window.API_BASE_URL || 'https://sakamichi-blog-translator.srzwyuu.workers.dev';
    const proxyUrl = `${apiBase}/api/proxy/image?url=${encodeURIComponent(url)}`;
    const response = await fetch(proxyUrl);
    
    if (!response.ok) {
      throw new Error('下载失败');
    }
    
    const blob = await response.blob();
    const ext = url.split('.').pop().split('?')[0] || 'jpg';
    
    // 创建下载链接
    const downloadUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = downloadUrl;
    a.download = `${fileName}.${ext}`;
    a.style.display = 'none';
    
    document.body.appendChild(a);
    a.click();
    
    // 清理
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(downloadUrl);
    }, 100);
    
    return true;
  } catch (error) {
    console.error('下载单张图片失败:', error);
    throw error;
  }
}

/**
 * 打开图片浏览模式
 */
function openImageGallery(images, blogData) {
  // 创建全屏图片浏览器
  const gallery = document.createElement('div');
  gallery.className = 'image-gallery-viewer';
  gallery.innerHTML = `
    <div class="gallery-header">
      <button class="gallery-close-btn" onclick="closeImageGallery()">
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="24" height="24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
        </svg>
      </button>
      <h3>${blogData.title || '图片浏览'}</h3>
      <div class="gallery-info">${images.length} 张图片</div>
    </div>
    
    <div class="gallery-tip">
      <div class="tip-title">📱 如何保存图片到相册</div>
      <div class="tip-steps">
        <div class="tip-step">1️⃣ 长按任意图片</div>
        <div class="tip-step">2️⃣ 选择"<strong>存储图像</strong>"或"<strong>添加到照片</strong>"</div>
        <div class="tip-step">3️⃣ 图片会直接保存到相册 ✨</div>
      </div>
    </div>
    
    <div class="gallery-grid">
      ${images.map((img, index) => `
        <div class="gallery-image-wrapper">
          <img 
            src="${img.url}" 
            alt="Image ${index + 1}"
            loading="lazy"
            class="gallery-image"
          />
          <div class="image-number">${index + 1}</div>
        </div>
      `).join('')}
    </div>
  `;
  
  document.body.appendChild(gallery);
  document.body.style.overflow = 'hidden';
  
  // 添加样式
  if (!document.getElementById('gallery-styles')) {
    const styles = document.createElement('style');
    styles.id = 'gallery-styles';
    styles.textContent = `
      .image-gallery-viewer {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100vh;
        background: #fafafa;
        z-index: 10001;
        overflow-y: auto;
        -webkit-overflow-scrolling: touch;
      }
      
      .gallery-header {
        position: sticky;
        top: 0;
        background: white;
        border-bottom: 1px solid #e8e8e8;
        padding: 12px 16px;
        display: flex;
        align-items: center;
        gap: 12px;
        z-index: 10;
      }
      
      .gallery-close-btn {
        width: 36px;
        height: 36px;
        border: 1px solid #e8e8e8;
        background: white;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        flex-shrink: 0;
      }
      
      .gallery-close-btn:active {
        background: #f5f5f5;
      }
      
      .gallery-header h3 {
        flex: 1;
        margin: 0;
        font-size: 1rem;
        font-weight: 600;
        color: #222;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      
      .gallery-info {
        font-size: 0.875rem;
        color: #666;
        flex-shrink: 0;
      }
      
      .gallery-tip {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        padding: 16px;
        margin: 16px;
        border-radius: 8px;
        color: white;
      }
      
      .tip-title {
        font-size: 1rem;
        font-weight: 600;
        margin-bottom: 12px;
        text-align: center;
      }
      
      .tip-steps {
        display: flex;
        flex-direction: column;
        gap: 6px;
      }
      
      .tip-step {
        font-size: 0.875rem;
        line-height: 1.6;
        padding-left: 8px;
      }
      
      .tip-step strong {
        color: #ffd700;
        font-weight: 600;
      }
      
      .gallery-grid {
        padding: 0 16px 16px;
        display: grid;
        grid-template-columns: 1fr;
        gap: 16px;
      }
      
      .gallery-image-wrapper {
        position: relative;
        background: white;
        border: 1px solid #e8e8e8;
        overflow: hidden;
      }
      
      .gallery-image {
        width: 100%;
        display: block;
        user-select: none;
        -webkit-user-select: none;
      }
      
      .image-number {
        position: absolute;
        top: 8px;
        left: 8px;
        background: rgba(0, 0, 0, 0.6);
        color: white;
        padding: 4px 8px;
        font-size: 0.75rem;
        font-weight: 600;
      }
      
      @media (min-width: 640px) {
        .gallery-grid {
          grid-template-columns: repeat(2, 1fr);
        }
      }
    `;
    document.head.appendChild(styles);
  }
  
  // Toast消息会在gallery-tip中显示，无需额外提示
}

/**
 * 关闭图片浏览器
 */
function closeImageGallery() {
  const gallery = document.querySelector('.image-gallery-viewer');
  if (gallery) {
    document.body.removeChild(gallery);
    document.body.style.overflow = '';
  }
}

/**
 * 显示手动下载提示
 */
function showManualDownloadTip() {
  const tip = `📱 手动保存方法：\n\n1️⃣ 向下滚动查看图片\n2️⃣ 长按任意图片\n3️⃣ 选择"保存图像"或"添加到照片"\n\n✨ 优点：\n• 100%原图质量\n• 直接保存到相册\n• 可以选择喜欢的图片`;
  alert(tip);
  showToast('向下滚动后长按图片保存');
}

// 导出给全局使用
window.mobileDownloadImages = mobileDownloadImages;
window.isMobileDevice = isMobileDevice;
window.closeImageGallery = closeImageGallery;
