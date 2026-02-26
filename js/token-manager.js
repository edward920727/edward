// 跨網域 Token 管理模組

/**
 * 產生加密的臨時 Token（使用 Base64 編碼 + 時間戳記）
 * @param {string} firebaseToken Firebase ID Token
 * @returns {string} 加密後的 Token
 */
function generateTemporaryToken(firebaseToken) {
  const timestamp = Date.now();
  const expiry = timestamp + (5 * 60 * 1000); // 5 分鐘後過期
  
  const tokenData = {
    token: firebaseToken,
    timestamp: timestamp,
    expiry: expiry,
    domain: window.location.hostname
  };
  
  // 使用 Base64 編碼（實際環境中應使用更安全的加密方式）
  const encoded = btoa(JSON.stringify(tokenData));
  return encoded;
}

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
 * 為 URL 添加 Token 參數
 * @param {string} url 目標 URL
 * @param {string} token Firebase ID Token
 * @returns {string} 帶有 Token 的 URL
 */
async function addTokenToUrl(url, token) {
  if (!token) {
    token = await getIdToken();
  }
  
  if (!token) {
    console.error('無法取得 Token');
    return url;
  }
  
  const tempToken = generateTemporaryToken(token);
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}authToken=${encodeURIComponent(tempToken)}`;
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
 * 使用 Token 進行跨網域登入
 * 注意：此方法需要在目標網站上實現對應的驗證邏輯
 * @param {string} token 臨時 Token
 * @returns {Promise<boolean>} 是否成功登入
 */
async function signInWithToken(token) {
  try {
    const tokenData = parseTemporaryToken(token);
    if (!tokenData) {
      return false;
    }
    
    // 使用 Firebase ID Token 進行登入
    // 注意：這需要在目標網站上實現
    // 目標網站應該使用 Firebase Admin SDK 驗證 ID Token
    return tokenData.token;
  } catch (error) {
    console.error('使用 Token 登入時發生錯誤:', error);
    return false;
  }
}

/**
 * 取得 Firebase ID Token（供目標網站驗證使用）
 * 此方法返回的 Token 可以在目標網站上使用 Firebase Admin SDK 驗證
 * @param {string} token 臨時 Token
 * @returns {Promise<string|false>} Firebase ID Token 或 false
 */
async function getFirebaseIdTokenFromUrl(token) {
  try {
    const tokenData = parseTemporaryToken(token);
    if (!tokenData || !tokenData.token) {
      return false;
    }
    
    return tokenData.token;
  } catch (error) {
    console.error('取得 Firebase ID Token 時發生錯誤:', error);
    return false;
  }
}
