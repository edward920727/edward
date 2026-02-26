# Edward 中控管理中心 - 設定指南

## 概述

此系統提供一個統一的管理中心，讓您可以管理所有專案，並透過加密 Token 實現跨網域單一登入（SSO）。

## 功能特色

1. **管理員登入**：使用 Firebase Authentication 進行身份驗證
2. **權限檢查**：自動檢查 Firestore 中的 `role: 'admin'` 欄位
3. **儀表板導航**：集中管理所有專案的連結
4. **跨網域 Token 傳遞**：點擊專案連結時自動帶上加密 Token

## 設定步驟

### 1. Firebase 專案設定

#### 1.1 建立 Firebase 專案
1. 前往 [Firebase Console](https://console.firebase.google.com/)
2. 建立新專案或選擇現有專案
3. 啟用 **Authentication** 和 **Firestore Database**

#### 1.2 設定 Authentication
1. 在 Firebase Console 中，前往 **Authentication** > **Sign-in method**
2. 啟用 **Email/Password** 登入方式

#### 1.3 設定 Firestore
1. 在 Firebase Console 中，前往 **Firestore Database**
2. 建立集合 `users`
3. 為每個管理員建立文件，文件 ID 為使用者的 UID
4. 在文件中添加欄位：
   ```json
   {
     "role": "admin",
     "email": "admin@example.com",
     "createdAt": "2024-01-01T00:00:00Z"
   }
   ```

#### 1.4 取得 Firebase 配置
1. 在 Firebase Console 中，前往 **專案設定** > **一般**
2. 在「您的應用程式」區塊中，選擇 Web 應用程式（如果還沒有，請新增一個）
3. 複製 Firebase 配置物件

#### 1.5 更新配置檔案
編輯 `js/firebase-config.js`，將以下值替換為您的 Firebase 配置：

```javascript
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};
```

### 2. 建立管理員帳號

#### 方法一：透過 Firebase Console
1. 前往 **Authentication** > **Users**
2. 點擊「新增使用者」
3. 輸入電子郵件和密碼
4. 記下產生的 UID

#### 方法二：透過程式碼（僅用於開發環境）
```javascript
// 在瀏覽器控制台執行（僅用於開發）
firebase.auth().createUserWithEmailAndPassword('admin@example.com', 'your-password')
  .then(async (userCredential) => {
    const user = userCredential.user;
    // 在 Firestore 中建立使用者文件
    await firebase.firestore().collection('users').doc(user.uid).set({
      role: 'admin',
      email: user.email,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    console.log('管理員帳號建立成功！');
  });
```

### 3. Firestore 安全規則設定

在 Firebase Console 中，前往 **Firestore Database** > **規則**，設定以下規則：

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // 允許已認證的使用者讀取自己的使用者資料
    match /users/{userId} {
      allow read: if request.auth != null && request.auth.uid == userId;
      allow write: if false; // 僅允許透過後端或 Firebase Console 寫入
    }
  }
}
```

## 跨網域 Token 傳遞機制

### 工作原理

1. 使用者在 edward727.com 登入後，系統會取得 Firebase ID Token
2. 點擊專案連結時，系統會：
   - 取得當前的 Firebase ID Token
   - 將 Token 與時間戳記一起編碼（Base64）
   - 將編碼後的 Token 附加到目標 URL 的查詢參數中
3. 目標網站（如 Tung Store）接收 Token 後：
   - 解析 URL 參數中的 Token
   - 驗證 Token 是否過期（預設 5 分鐘）
   - 使用 Firebase Admin SDK 驗證 ID Token
   - 如果驗證成功，自動登入使用者

### 在目標網站上實作 Token 驗證

#### 前端實作（適用於相同 Firebase 專案）

如果目標網站使用相同的 Firebase 專案，可以在前端直接驗證：

```javascript
// 在目標網站上（例如 Tung Store）
async function handleCrossDomainAuth() {
  const urlParams = new URLSearchParams(window.location.search);
  const authToken = urlParams.get('authToken');
  
  if (authToken) {
    try {
      // 解析臨時 Token
      const tokenData = JSON.parse(atob(authToken));
      
      // 檢查是否過期
      if (Date.now() > tokenData.expiry) {
        console.warn('Token 已過期');
        return;
      }
      
      // 使用 Firebase ID Token 進行驗證
      // 注意：這需要在後端使用 Firebase Admin SDK 驗證
      // 前端無法直接使用 ID Token 登入，需要後端 API
      
      // 發送到後端驗證
      const response = await fetch('/api/verify-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token: tokenData.token })
      });
      
      if (response.ok) {
        const result = await response.json();
        // 處理登入成功
        console.log('跨網域登入成功');
      }
    } catch (error) {
      console.error('Token 驗證失敗:', error);
    }
    
    // 清除 URL 中的 Token 參數
    const newUrl = window.location.pathname;
    window.history.replaceState({}, document.title, newUrl);
  }
}

// 頁面載入時執行
handleCrossDomainAuth();
```

#### 後端實作（Node.js + Firebase Admin SDK）

```javascript
// 後端 API 端點（例如 /api/verify-token）
const admin = require('firebase-admin');

// 初始化 Firebase Admin SDK
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

app.post('/api/verify-token', async (req, res) => {
  try {
    const { token } = req.body;
    
    // 驗證 Firebase ID Token
    const decodedToken = await admin.auth().verifyIdToken(token);
    
    // 檢查使用者是否為管理員
    const userDoc = await admin.firestore()
      .collection('users')
      .doc(decodedToken.uid)
      .get();
    
    if (!userDoc.exists || userDoc.data().role !== 'admin') {
      return res.status(403).json({ error: '權限不足' });
    }
    
    // 建立 session 或 JWT token
    // 這裡可以建立您自己的 session 機制
    
    res.json({ 
      success: true, 
      uid: decodedToken.uid,
      email: decodedToken.email 
    });
  } catch (error) {
    console.error('Token 驗證失敗:', error);
    res.status(401).json({ error: 'Token 驗證失敗' });
  }
});
```

## 專案結構

```
edward/
├── login.html              # 登入頁面
├── dashboard.html          # 儀表板頁面
├── js/
│   ├── firebase-config.js # Firebase 配置
│   ├── auth.js            # 認證與權限管理
│   ├── token-manager.js   # Token 管理
│   ├── login.js           # 登入頁面邏輯
│   └── dashboard.js       # 儀表板邏輯
└── ADMIN_SETUP.md         # 本設定文件
```

## 安全注意事項

1. **Token 過期時間**：預設為 5 分鐘，可在 `token-manager.js` 中調整
2. **HTTPS**：生產環境必須使用 HTTPS
3. **Firestore 規則**：確保設定適當的安全規則
4. **Token 加密**：目前使用 Base64 編碼，生產環境建議使用更安全的加密方式
5. **CORS**：如果目標網站不同源，需要設定適當的 CORS 政策

## 故障排除

### 問題：無法登入
- 檢查 Firebase 配置是否正確
- 確認 Firestore 中有對應的使用者文件且 `role` 為 `'admin'`
- 檢查瀏覽器控制台是否有錯誤訊息

### 問題：權限檢查失敗
- 確認 Firestore 集合名稱為 `users`
- 確認文件 ID 為使用者的 UID
- 確認文件中存在 `role: 'admin'` 欄位

### 問題：跨網域 Token 無法使用
- 確認目標網站已實作 Token 驗證邏輯
- 檢查 Token 是否過期（預設 5 分鐘）
- 確認目標網站使用相同的 Firebase 專案或已設定後端驗證 API

## 後續擴充

1. **多專案管理**：在 `dashboard.html` 中添加更多專案卡片
2. **Token 加密強化**：使用 AES 加密取代 Base64
3. **活動日誌**：記錄管理員的登入和操作記錄
4. **雙因素驗證**：增強安全性
5. **權限分級**：支援多種角色（admin, editor, viewer 等）
