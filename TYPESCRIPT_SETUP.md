# TypeScript Firebase 設定說明

## 已建立的檔案

### TypeScript 源碼
- `src/lib/firebase.ts` - Firebase 配置和初始化（已配置 tung-315 專案）
- `src/lib/auth.ts` - 認證與權限管理模組
- `src/pages/login.ts` - 登入頁面邏輯

### 編譯後的 JavaScript
- `js/lib/firebase.js` - 編譯後的 Firebase 配置
- `js/lib/auth.js` - 編譯後的認證模組
- `js/pages/login.js` - 編譯後的登入邏輯

### HTML 頁面
- `login.html` - 已更新為使用新的 TypeScript 模組
- `login-ts.html` - 備用版本（功能相同）

## 功能說明

### 1. Firebase 初始化
`src/lib/firebase.ts` 已配置您的 Firebase 專案（tung-315）：
- 使用 Firebase SDK v10+ 的模組化 API
- 自動避免重複初始化
- 匯出 `auth` 和 `db` 供其他模組使用

### 2. 權限檢查
`src/lib/auth.ts` 實作了完整的權限管理：
- `checkAdminRole(user)` - 檢查使用者是否為管理員
- `enforceAdminRole(user)` - 強制登出非管理員使用者
- `signIn(email, password)` - 登入並自動檢查權限
- `onAuthStateChanged(callback)` - 監聽認證狀態變化

### 3. 登入流程
1. 使用者輸入電子郵件和密碼
2. 呼叫 `signIn()` 進行 Firebase Authentication
3. 登入成功後，自動檢查 Firestore 的 `users` 集合
4. 檢查該使用者的 `role` 欄位是否為 `'admin'`
5. 如果是管理員，導向儀表板
6. 如果不是管理員，顯示錯誤訊息並自動登出

## 使用方式

### 開發模式

1. **編譯 TypeScript**：
```bash
npm run build:ts
```

2. **監聽模式（自動編譯）**：
```bash
npm run watch:ts
```

3. **啟動開發伺服器**：
```bash
npm run dev
```

4. **訪問登入頁面**：
打開瀏覽器訪問 `http://localhost:3000/login.html`

### 生產模式

1. 編譯 TypeScript：
```bash
npm run build:ts
```

2. 部署所有檔案到伺服器

## Firestore 資料結構

確保在 Firestore 中有以下結構：

**集合：`users`**
- **文件 ID**：使用者的 UID（Firebase Auth 產生的）
- **欄位**：
  ```json
  {
    "role": "admin",
    "email": "admin@example.com",
    "createdAt": "2024-01-01T00:00:00Z"
  }
  ```

## 建立管理員帳號

### 方法一：透過 Firebase Console
1. 前往 Firebase Console > Authentication > Users
2. 新增使用者（輸入電子郵件和密碼）
3. 記下產生的 UID
4. 前往 Firestore > users 集合
5. 建立新文件，文件 ID 為 UID
6. 添加欄位：`role: "admin"`

### 方法二：透過程式碼（開發環境）
在瀏覽器控制台執行：
```javascript
import { auth, db } from './js/lib/firebase.js';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';

// 建立使用者
const email = 'admin@example.com';
const password = 'your-password';

createUserWithEmailAndPassword(auth, email, password)
  .then(async (userCredential) => {
    const user = userCredential.user;
    
    // 在 Firestore 中建立使用者文件
    await setDoc(doc(db, 'users', user.uid), {
      role: 'admin',
      email: user.email,
      createdAt: new Date().toISOString()
    });
    
    console.log('管理員帳號建立成功！', user.uid);
  })
  .catch((error) => {
    console.error('建立帳號失敗:', error);
  });
```

## 錯誤處理

登入頁面會處理以下錯誤情況：
- 找不到使用者
- 密碼錯誤
- 電子郵件格式不正確
- 帳號已被停用
- 嘗試次數過多
- 網路連線失敗
- **權限不足（非管理員）** - 會自動登出並顯示錯誤訊息

## 安全注意事項

1. **Firestore 安全規則**：
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read: if request.auth != null && request.auth.uid == userId;
      allow write: if false; // 僅允許透過後端或 Firebase Console 寫入
    }
  }
}
```

2. **HTTPS**：生產環境必須使用 HTTPS

3. **環境變數**：考慮將 Firebase 配置移到環境變數（需要建置工具支援）

## 故障排除

### 問題：模組載入失敗
- 確保使用 `type="module"` 的 script 標籤
- 檢查瀏覽器控制台的錯誤訊息
- 確認所有依賴都已安裝：`npm install`

### 問題：權限檢查失敗
- 確認 Firestore 中有對應的使用者文件
- 確認文件 ID 為使用者的 UID
- 確認 `role` 欄位值為 `'admin'`（字串）

### 問題：TypeScript 編譯錯誤
- 執行 `npm install` 確保所有依賴已安裝
- 檢查 `tsconfig.json` 配置
- 確認 Firebase SDK 版本正確

## 下一步

1. 建立管理員帳號並設定 Firestore 資料
2. 測試登入功能
3. 根據需要調整 UI 樣式
4. 整合到現有的儀表板系統
