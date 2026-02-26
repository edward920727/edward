// 認證與權限管理模組

/**
 * 檢查使用者是否為管理員
 * @returns {Promise<boolean>} 是否為管理員
 */
async function checkAdminRole() {
  const user = auth.currentUser;
  if (!user) {
    return false;
  }

  try {
    const userDoc = await db.collection('users').doc(user.uid).get();
    if (!userDoc.exists) {
      return false;
    }
    
    const userData = userDoc.data();
    return userData.role === 'admin';
  } catch (error) {
    console.error('檢查管理員權限時發生錯誤:', error);
    return false;
  }
}

/**
 * 驗證並強制登出非管理員使用者
 */
async function enforceAdminRole() {
  const user = auth.currentUser;
  if (!user) {
    return false;
  }

  const isAdmin = await checkAdminRole();
  if (!isAdmin) {
    console.warn('使用者不具備管理員權限，強制登出');
    await auth.signOut();
    return false;
  }
  
  return true;
}

/**
 * 監聽認證狀態變化
 * @param {Function} callback 回調函數
 */
function onAuthStateChanged(callback) {
  auth.onAuthStateChanged(async (user) => {
    if (user) {
      const isAdmin = await checkAdminRole();
      callback(user, isAdmin);
    } else {
      callback(null, false);
    }
  });
}

/**
 * 登入
 * @param {string} email 電子郵件
 * @param {string} password 密碼
 * @returns {Promise<{success: boolean, error?: string}>}
 */
async function signIn(email, password) {
  try {
    const userCredential = await auth.signInWithEmailAndPassword(email, password);
    const isAdmin = await checkAdminRole();
    
    if (!isAdmin) {
      await auth.signOut();
      return {
        success: false,
        error: '此帳號不具備管理員權限'
      };
    }
    
    return { success: true };
  } catch (error) {
    let errorMessage = '登入失敗，請檢查您的帳號密碼';
    
    switch (error.code) {
      case 'auth/user-not-found':
        errorMessage = '找不到此使用者';
        break;
      case 'auth/wrong-password':
        errorMessage = '密碼錯誤';
        break;
      case 'auth/invalid-email':
        errorMessage = '電子郵件格式不正確';
        break;
      case 'auth/user-disabled':
        errorMessage = '此帳號已被停用';
        break;
      case 'auth/too-many-requests':
        errorMessage = '嘗試次數過多，請稍後再試';
        break;
    }
    
    return {
      success: false,
      error: errorMessage
    };
  }
}

/**
 * 登出
 */
async function signOut() {
  try {
    await auth.signOut();
    return { success: true };
  } catch (error) {
    console.error('登出時發生錯誤:', error);
    return { success: false, error: error.message };
  }
}

/**
 * 取得 Firebase ID Token（用於跨網域驗證）
 * @returns {Promise<string|null>} ID Token
 */
async function getIdToken() {
  try {
    const user = auth.currentUser;
    if (!user) {
      return null;
    }
    
    // 強制刷新 token 以確保是最新的
    const token = await user.getIdToken(true);
    return token;
  } catch (error) {
    console.error('取得 ID Token 時發生錯誤:', error);
    return null;
  }
}
