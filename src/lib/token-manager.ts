// 跨網域 Token 管理模組
import { getIdToken } from './auth.js';

/**
 * 產生加密的臨時 Token（使用 Base64 編碼 + 時間戳記）
 * @param firebaseToken Firebase ID Token
 * @returns string 加密後的 Token
 */
export function generateTemporaryToken(firebaseToken: string): string {
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
 * @param encodedToken 編碼後的 Token
 * @returns Object|null 解析後的 Token 資料
 */
export function parseTemporaryToken(encodedToken: string): any | null {
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
 * @param url 目標 URL
 * @param token Firebase ID Token（可選，如果不提供會自動取得）
 * @returns Promise<string> 帶有 Token 的 URL
 */
export async function addTokenToUrl(url: string, token?: string): Promise<string> {
  let finalToken: string | null = token || null;
  if (!finalToken) {
    finalToken = await getIdToken();
  }
  
  if (!finalToken) {
    console.error('無法取得 Token');
    return url;
  }
  
  const tempToken = generateTemporaryToken(finalToken);
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}authToken=${encodeURIComponent(tempToken)}`;
}

/**
 * 從 URL 取得 Token
 * @returns string|null Token
 */
export function getTokenFromUrl(): string | null {
  const urlParams = new URLSearchParams(window.location.search);
  const token = urlParams.get('authToken');
  return token || null;
}
