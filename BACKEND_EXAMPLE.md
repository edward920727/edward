# 後端 Token 驗證範例

此文件提供後端實作範例，用於驗證來自 edward727.com 的跨網域 Token。

## Node.js + Express + Firebase Admin SDK

### 1. 安裝依賴

```bash
npm install express firebase-admin cors dotenv
```

### 2. 初始化 Firebase Admin SDK

建立 `firebase-admin-config.js`：

```javascript
const admin = require('firebase-admin');
const serviceAccount = require('./path/to/serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

module.exports = admin;
```

**注意**：您需要從 Firebase Console 下載服務帳號金鑰：
1. 前往 Firebase Console > 專案設定 > 服務帳號
2. 點擊「產生新的私密金鑰」
3. 將下載的 JSON 檔案儲存為 `serviceAccountKey.json`

### 3. 建立驗證 API 端點

建立 `routes/auth.js`：

```javascript
const express = require('express');
const router = express.Router();
const admin = require('../firebase-admin-config');

/**
 * 驗證跨網域 Token
 * POST /api/verify-token
 */
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
    let decodedToken;
    try {
      decodedToken = await admin.auth().verifyIdToken(token);
    } catch (error) {
      console.error('Token 驗證失敗:', error);
      return res.status(401).json({ 
        success: false, 
        error: 'Token 無效或已過期' 
      });
    }
    
    // 檢查使用者是否為管理員
    const userDoc = await admin.firestore()
      .collection('users')
      .doc(decodedToken.uid)
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
    
    // 可選：記錄登入活動
    await admin.firestore()
      .collection('login_logs')
      .add({
        uid: decodedToken.uid,
        email: decodedToken.email,
        sourceDomain: sourceDomain || 'unknown',
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        ip: req.ip
      });
    
    // 建立 session token（可選）
    // 這裡可以使用 JWT 或其他 session 管理方式
    
    res.json({
      success: true,
      uid: decodedToken.uid,
      email: decodedToken.email,
      role: userData.role,
      // 可選：返回自訂的 session token
      // sessionToken: generateSessionToken(decodedToken.uid)
    });
    
  } catch (error) {
    console.error('驗證過程中發生錯誤:', error);
    res.status(500).json({ 
      success: false, 
      error: '伺服器錯誤' 
    });
  }
});

module.exports = router;
```

### 4. 主應用程式

建立 `app.js`：

```javascript
const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/auth');

const app = express();

// 中間件
app.use(cors({
  origin: [
    'https://edward727.com',
    'https://tung-store.com',
    // 添加其他允許的來源
  ],
  credentials: true
}));

app.use(express.json());

// 路由
app.use('/api', authRoutes);

// 健康檢查
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`伺服器運行在 port ${PORT}`);
});
```

## Python + Flask + Firebase Admin SDK

### 1. 安裝依賴

```bash
pip install flask firebase-admin python-dotenv
```

### 2. 初始化 Firebase Admin SDK

建立 `firebase_admin_config.py`：

```python
import firebase_admin
from firebase_admin import credentials, auth, firestore
import os

# 初始化 Firebase Admin SDK
cred = credentials.Certificate('path/to/serviceAccountKey.json')
firebase_admin.initialize_app(cred)

db = firestore.client()
```

### 3. 建立驗證 API 端點

建立 `app.py`：

```python
from flask import Flask, request, jsonify
from flask_cors import CORS
from firebase_admin import auth, firestore
import firebase_admin_config as firebase

app = Flask(__name__)
CORS(app, origins=[
    'https://edward727.com',
    'https://tung-store.com',
])

@app.route('/api/verify-token', methods=['POST'])
async def verify_token():
    try:
        data = request.get_json()
        token = data.get('token')
        source_domain = data.get('sourceDomain')
        
        if not token:
            return jsonify({
                'success': False,
                'error': '缺少 Token'
            }), 400
        
        # 驗證 Firebase ID Token
        try:
            decoded_token = auth.verify_id_token(token)
        except Exception as e:
            print(f'Token 驗證失敗: {e}')
            return jsonify({
                'success': False,
                'error': 'Token 無效或已過期'
            }), 401
        
        # 檢查使用者是否為管理員
        user_ref = firebase.db.collection('users').document(decoded_token['uid'])
        user_doc = user_ref.get()
        
        if not user_doc.exists:
            return jsonify({
                'success': False,
                'error': '使用者不存在'
            }), 403
        
        user_data = user_doc.to_dict()
        
        if user_data.get('role') != 'admin':
            return jsonify({
                'success': False,
                'error': '權限不足'
            }), 403
        
        # 記錄登入活動（可選）
        firebase.db.collection('login_logs').add({
            'uid': decoded_token['uid'],
            'email': decoded_token.get('email'),
            'sourceDomain': source_domain or 'unknown',
            'timestamp': firestore.SERVER_TIMESTAMP,
            'ip': request.remote_addr
        })
        
        return jsonify({
            'success': True,
            'uid': decoded_token['uid'],
            'email': decoded_token.get('email'),
            'role': user_data.get('role')
        })
        
    except Exception as e:
        print(f'驗證過程中發生錯誤: {e}')
        return jsonify({
            'success': False,
            'error': '伺服器錯誤'
        }), 500

@app.route('/health', methods=['GET'])
def health():
    return jsonify({'status': 'ok'})

if __name__ == '__main__':
    app.run(port=3000, debug=True)
```

## 安全建議

1. **HTTPS**：生產環境必須使用 HTTPS
2. **CORS**：僅允許信任的來源
3. **Rate Limiting**：實作請求頻率限制
4. **IP 白名單**：可選，限制特定 IP 範圍
5. **Token 過期檢查**：雖然 Firebase 會自動檢查，但建議額外驗證
6. **日誌記錄**：記錄所有驗證嘗試，用於安全審計

## 測試

使用 curl 測試 API：

```bash
curl -X POST http://localhost:3000/api/verify-token \
  -H "Content-Type: application/json" \
  -d '{
    "token": "YOUR_FIREBASE_ID_TOKEN",
    "sourceDomain": "edward727.com"
  }'
```

## 部署建議

1. 使用環境變數儲存敏感資訊（如服務帳號金鑰路徑）
2. 使用反向代理（如 Nginx）處理 HTTPS
3. 設定適當的防火牆規則
4. 定期更新依賴套件
5. 監控 API 效能和錯誤率
