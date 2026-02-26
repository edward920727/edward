/**
 * 跨網域認證範例
 * 此檔案展示如何在目標網站（如 Tung Store）上接收和驗證來自 edward727.com 的 Token
 * 
 * 使用方式：
 * 1. 將此檔案複製到目標網站
 * 2. 根據您的後端 API 調整驗證邏輯
 * 3. 在頁面載入時呼叫 handleCrossDomainAuth()
 */

/**
 * 解析臨時 Token
 * @param {string} encodedToken 編碼後的 Token
 * @returns {Object|null} 解析後的 Token 資料
 */
function parseTemporaryToken(encodedToken) {
  try {
    const decoded = JSON.parse(atob(encodedToken));
    
    // 檢查是否過期
    if (Date.now() > decoded.expiry) {
      console.warn('Token 已過期');
      return null;
    }
    
    return decoded;
  } catch (error) {
    console.error('解析 Token 時發生錯誤:', error);
    return null;
  }
}

/**
 * 從 URL 取得 Token
 * @returns {string|null} Token
 */
function getTokenFromUrl() {
  const urlParams = new URLSearchParams(window.location.search);
  const token = urlParams.get('authToken');
  return token || null;
}

/**
 * 處理跨網域認證
 * 此函數會在頁面載入時檢查 URL 中是否有 authToken 參數
 * 如果有，則驗證並自動登入
 */
async function handleCrossDomainAuth() {
  const authToken = getTokenFromUrl();
  
  if (!authToken) {
    // 沒有 Token，正常載入頁面
    return;
  }
  
  console.log('偵測到跨網域認證 Token');
  
  // 解析 Token
  const tokenData = parseTemporaryToken(authToken);
  
  if (!tokenData) {
    console.error('Token 無效或已過期');
    // 清除 URL 中的 Token 參數
    clearTokenFromUrl();
    return;
  }
  
  // 方法一：發送到後端驗證（推薦）
  // 這需要您的後端實作 /api/verify-token 端點
  try {
    const response = await fetch('/api/verify-token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        token: tokenData.token,
        sourceDomain: tokenData.domain 
      })
    });
    
    if (response.ok) {
      const result = await response.json();
      
      // 建立 session 或儲存認證資訊
      if (result.success) {
        console.log('跨網域登入成功');
        
        // 這裡可以儲存使用者資訊到 localStorage 或 sessionStorage
        localStorage.setItem('user', JSON.stringify({
          uid: result.uid,
          email: result.email,
          role: result.role,
          authenticated: true
        }));
        
        // 觸發自訂事件，通知其他模組已登入
        window.dispatchEvent(new CustomEvent('userAuthenticated', {
          detail: result
        }));
        
        // 清除 URL 中的 Token 參數
        clearTokenFromUrl();
        
        // 可選：重新載入頁面以套用新的認證狀態
        // window.location.reload();
      } else {
        console.error('Token 驗證失敗:', result.error);
        clearTokenFromUrl();
      }
    } else {
      console.error('後端驗證失敗');
      clearTokenFromUrl();
    }
  } catch (error) {
    console.error('驗證 Token 時發生錯誤:', error);
    clearTokenFromUrl();
  }
  
  // 方法二：如果目標網站也使用相同的 Firebase 專案
  // 可以直接使用 Firebase ID Token（需要後端支援）
  /*
  try {
    // 發送到後端，使用 Firebase Admin SDK 驗證
    const response = await fetch('/api/auth/verify-firebase-token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ idToken: tokenData.token })
    });
    
    const result = await response.json();
    if (result.success) {
      // 處理登入成功
    }
  } catch (error) {
    console.error('Firebase Token 驗證失敗:', error);
  }
  */
}

/**
 * 清除 URL 中的 Token 參數
 */
function clearTokenFromUrl() {
  const url = new URL(window.location.href);
  url.searchParams.delete('authToken');
  window.history.replaceState({}, document.title, url.pathname + (url.search || ''));
}

/**
 * 檢查使用者是否已認證
 * @returns {boolean} 是否已認證
 */
function isAuthenticated() {
  const user = localStorage.getItem('user');
  if (!user) return false;
  
  try {
    const userData = JSON.parse(user);
    return userData.authenticated === true;
  } catch (error) {
    return false;
  }
}

/**
 * 登出
 */
function logout() {
  localStorage.removeItem('user');
  window.dispatchEvent(new CustomEvent('userLoggedOut'));
  // 可選：重新導向到登入頁面
  // window.location.href = '/login';
}

// 頁面載入時自動執行
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', handleCrossDomainAuth);
} else {
  handleCrossDomainAuth();
}

// 匯出函數供其他模組使用
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    handleCrossDomainAuth,
    parseTemporaryToken,
    getTokenFromUrl,
    clearTokenFromUrl,
    isAuthenticated,
    logout
  };
}
