# Tung Store 跨網域認證修正指南

## 問題說明

錯誤訊息：`Firebase: Invalid assertion format. 3 dot separated segments required. (auth/invalid-custom-token)`

**原因**：Tung Store 使用了 `signInWithCustomToken()`，但中控中心傳遞的是 **Firebase ID Token**（不是 Custom Token）。

## 解決方案

### 方法一：使用後端 API 驗證（推薦）

在 Tung Store 的 `admin.html` 或相關頁面中，加入以下程式碼：

```javascript
// 在 Tung Store 的 admin.html 或主要 JS 檔案中

/**
 * 處理來自中控中心的跨網域認證
 */
async function handleCrossDomainAuth() {
  // 從 URL 取得 authToken
  const urlParams = new URLSearchParams(window.location.search);
  const authToken = urlParams.get('authToken');
  
  if (!authToken) {
    return; // 沒有 Token，正常載入頁面
  }
  
  console.log('偵測到跨網域認證 Token');
  
  try {
    // 解析 Base64 編碼的 Token
    const tokenData = JSON.parse(atob(authToken));
    
    // 檢查是否過期（5 分鐘有效期）
    if (Date.now() > tokenData.expiry) {
      console.warn('Token 已過期');
      clearTokenFromUrl();
      return;
    }
    
    // 發送到後端 API 驗證 Firebase ID Token
    const response = await fetch('/api/verify-token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        token: tokenData.token,  // 這是 Firebase ID Token
        sourceDomain: tokenData.domain 
      })
    });
    
    if (response.ok) {
      const result = await response.json();
      
      if (result.success) {
        console.log('跨網域登入成功', result);
        
        // 儲存使用者資訊到 localStorage 或 sessionStorage
        localStorage.setItem('adminUser', JSON.stringify({
          uid: result.uid,
          email: result.email,
          role: result.role,
          authenticated: true,
          token: result.sessionToken // 如果有後端產生的 session token
        }));
        
        // 清除 URL 中的 Token 參數
        clearTokenFromUrl();
        
        // 重新載入頁面以套用新的認證狀態
        window.location.reload();
      } else {
        console.error('Token 驗證失敗:', result.error);
        alert('登入失敗：' + (result.error || '未知錯誤'));
        clearTokenFromUrl();
      }
    } else {
      const error = await response.json();
      console.error('後端驗證失敗:', error);
      alert('登入失敗：無法驗證身份');
      clearTokenFromUrl();
    }
  } catch (error) {
    console.error('處理跨網域認證時發生錯誤:', error);
    alert('登入失敗：' + error.message);
    clearTokenFromUrl();
  }
}

/**
 * 清除 URL 中的 Token 參數
 */
function clearTokenFromUrl() {
  const url = new URL(window.location.href);
  url.searchParams.delete('authToken');
  window.history.replaceState({}, document.title, url.pathname + (url.search || ''));
}

// 頁面載入時自動執行
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', handleCrossDomainAuth);
} else {
  handleCrossDomainAuth();
}
```

### 方法二：後端 API 實作（Node.js + Firebase Admin SDK）

在 Tung Store 的後端建立 `/api/verify-token` 端點：

```javascript
// 例如：pages/api/verify-token.js (Next.js) 或 routes/auth.js (Express)

const admin = require('firebase-admin');

// 初始化 Firebase Admin SDK（如果還沒初始化）
if (!admin.apps.length) {
  const serviceAccount = require('./path/to/serviceAccountKey.json');
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

// Next.js API Route 範例
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { token, sourceDomain } = req.body;

    if (!token) {
      return res.status(400).json({ 
        success: false, 
        error: '缺少 Token' 
      });
    }

    // 驗證 Firebase ID Token
    const decodedToken = await admin.auth().verifyIdToken(token);

    // 檢查使用者是否為管理員（從 Firestore）
    const userDoc = await admin.firestore()
      .collection('users')
      .doc(decodedToken.email) // 或 decodedToken.uid，根據你的資料結構
      .get();

    if (!userDoc.exists) {
      return res.status(403).json({ 
        success: false, 
        error: '使用者不存在' 
      });
    }

    const userData = userDoc.data();

    if (userData.role !== 'admin') {
      return res.status(403).json({ 
        success: false, 
        error: '權限不足' 
      });
    }

    // 建立 session token（可選，使用 JWT 或其他方式）
    // 這裡簡單回傳使用者資訊，前端可以儲存到 localStorage
    // 或者你可以建立自己的 session 機制

    res.json({ 
      success: true,
      uid: decodedToken.uid,
      email: decodedToken.email,
      role: userData.role,
      // sessionToken: 'your-session-token-here' // 如果有實作 session
    });

  } catch (error) {
    console.error('Token 驗證失敗:', error);
    
    if (error.code === 'auth/id-token-expired') {
      return res.status(401).json({ 
        success: false, 
        error: 'Token 已過期' 
      });
    }
    
    if (error.code === 'auth/argument-error') {
      return res.status(401).json({ 
        success: false, 
        error: 'Token 格式錯誤' 
      });
    }

    res.status(401).json({ 
      success: false, 
      error: 'Token 驗證失敗：' + error.message 
    });
  }
}
```

### 方法三：Express.js 後端範例

```javascript
// routes/auth.js
const express = require('express');
const admin = require('firebase-admin');
const router = express.Router();

router.post('/verify-token', async (req, res) => {
  try {
    const { token, sourceDomain } = req.body;

    if (!token) {
      return res.status(400).json({ 
        success: false, 
        error: '缺少 Token' 
      });
    }

    // 驗證 Firebase ID Token
    const decodedToken = await admin.auth().verifyIdToken(token);

    // 檢查使用者是否為管理員
    const userDoc = await admin.firestore()
      .collection('users')
      .doc(decodedToken.email)
      .get();

    if (!userDoc.exists || userDoc.data().role !== 'admin') {
      return res.status(403).json({ 
        success: false, 
        error: '權限不足' 
      });
    }

    res.json({ 
      success: true,
      uid: decodedToken.uid,
      email: decodedToken.email,
      role: userDoc.data().role
    });

  } catch (error) {
    console.error('Token 驗證失敗:', error);
    res.status(401).json({ 
      success: false, 
      error: 'Token 驗證失敗：' + error.message 
    });
  }
});

module.exports = router;
```

## 重要提醒

1. **不要使用 `signInWithCustomToken()`**：這個方法需要的是 Custom Token（由 Firebase Admin SDK 產生），不是 ID Token。

2. **ID Token 必須在後端驗證**：前端無法直接使用 ID Token 登入 Firebase，必須透過後端 API 使用 Firebase Admin SDK 驗證。

3. **Token 格式**：
   - 中控傳遞的 `authToken` 是 Base64 編碼的 JSON 物件
   - 解析後，`tokenData.token` 才是真正的 Firebase ID Token（JWT 格式，有 3 個點分隔）

4. **安全性**：
   - Token 有效期為 5 分鐘
   - 驗證後應清除 URL 中的 Token 參數
   - 建議使用 HTTPS

## 測試步驟

1. 在中控中心點擊「Tung Store 管理」
2. 檢查瀏覽器網址是否包含 `?authToken=...`
3. 檢查瀏覽器 Console 是否有錯誤訊息
4. 確認後端 API `/api/verify-token` 是否正確接收和驗證 Token
5. 確認登入成功後，使用者資訊是否正確儲存

## 如果 Tung Store 使用相同的 Firebase 專案

如果 Tung Store 也使用相同的 Firebase 專案（`tung-315`），你可以：

1. 在後端驗證 ID Token 後，建立自己的 session
2. 或者，使用 Firebase Admin SDK 產生 Custom Token，然後在前端用 `signInWithCustomToken()` 登入

```javascript
// 後端產生 Custom Token（不推薦，因為需要額外的 API 呼叫）
const customToken = await admin.auth().createCustomToken(decodedToken.uid);
res.json({ success: true, customToken: customToken });

// 前端使用 Custom Token 登入
await signInWithCustomToken(auth, customToken);
```

但**推薦使用方法一**（後端驗證 + 建立 session），因為更簡單且安全。
