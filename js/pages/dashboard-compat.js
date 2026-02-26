// 儀表板頁面邏輯（使用 Firebase compat SDK）
console.log('開始載入儀表板模組...');

let currentUser = null;

// 等待 Firebase 初始化
function waitForFirebase() {
  return new Promise((resolve) => {
    if (typeof firebase !== 'undefined' && firebase.auth && firebase.firestore) {
      resolve();
    } else {
      const checkInterval = setInterval(() => {
        if (typeof firebase !== 'undefined' && firebase.auth && firebase.firestore) {
          clearInterval(checkInterval);
          resolve();
        }
      }, 100);
    }
  });
}

// 檢查使用者是否為管理員
async function checkAdminRole(user) {
  try {
    await waitForFirebase();
    if (!user.email) {
      return false;
    }
    const userDocRef = db.collection('users').doc(user.email);
    const userDoc = await userDocRef.get();
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

// 監聽認證狀態變化
async function setupAuthListener() {
  await waitForFirebase();
  
  auth.onAuthStateChanged(async (user) => {
    console.log('儀表板認證狀態檢查:', { user: user?.email });
    
    if (!user) {
      console.log('未登入，導向登入頁面');
      window.location.href = './login.html';
      return;
    }
    
    const isAdmin = await checkAdminRole(user);
    console.log('是否為管理員:', isAdmin);
    
    if (!isAdmin) {
      console.log('不是管理員，強制登出');
      await auth.signOut();
      window.location.href = './login.html?error=unauthorized';
      return;
    }
    
    // 已登入且為管理員，顯示儀表板
    console.log('已登入且為管理員，載入儀表板');
    currentUser = user;
    loadDashboard();
  });
}

// 載入儀表板內容
function loadDashboard() {
  // 顯示使用者資訊
  const userEmailElement = document.getElementById('userEmail');
  if (currentUser && currentUser.email && userEmailElement) {
    userEmailElement.textContent = currentUser.email;
  }
  
  // 隱藏載入動畫，顯示主要內容
  const loadingScreen = document.getElementById('loadingScreen');
  const mainContent = document.getElementById('mainContent');
  
  if (loadingScreen) loadingScreen.classList.add('hidden');
  if (mainContent) mainContent.classList.remove('hidden');
  
  // 設定專案卡片點擊事件
  setupProjectCards();
  
  // 設定登出按鈕
  setupLogoutButton();
}

// 設定專案卡片點擊事件
function setupProjectCards() {
  const projectCards = document.querySelectorAll('.project-card');
  
  projectCards.forEach(card => {
    card.addEventListener('click', async function() {
      const url = this.getAttribute('data-url');
      console.log('點擊專案卡片，URL:', url);
      
      if (!url) {
        console.error('找不到 URL');
        return;
      }
      
      // 確保 URL 包含 /admin 路徑
      let finalUrl = url;
      if (!finalUrl.endsWith('/admin')) {
        // 如果 URL 沒有以 /admin 結尾，確保加上
        finalUrl = finalUrl.replace(/\/$/, '') + '/admin';
      }
      
      console.log('最終 URL:', finalUrl);
      
      await waitForFirebase();
      
      try {
        const user = auth.currentUser;
        if (!user) {
          alert('無法取得使用者資訊，請重新登入');
          return;
        }
        
        const token = await user.getIdToken();
        if (!token) {
          alert('無法取得驗證 Token，請重新登入');
          return;
        }
        
        // 為 URL 添加 Token
        const urlWithToken = await addTokenToUrl(finalUrl, token);
        console.log('帶 Token 的 URL:', urlWithToken);
        
        // 在新分頁開啟
        window.open(urlWithToken, '_blank');
      } catch (error) {
        console.error('取得 Token 失敗:', error);
        alert('無法取得驗證 Token，請重新登入');
      }
    });
  });
}

// 為 URL 添加 Token 參數
async function addTokenToUrl(url, token) {
  if (!token) {
    const user = auth.currentUser;
    if (user) {
      token = await user.getIdToken();
    }
  }
  
  if (!token) {
    console.error('無法取得 Token');
    return url;
  }
  
  // 產生臨時 Token（5 分鐘有效期）
  const timestamp = Date.now();
  const expiry = timestamp + (5 * 60 * 1000);
  
  const tokenData = {
    token: token,
    timestamp: timestamp,
    expiry: expiry,
    domain: window.location.hostname
  };
  
  const tempToken = btoa(JSON.stringify(tokenData));
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}authToken=${encodeURIComponent(tempToken)}`;
}

// 設定登出按鈕
function setupLogoutButton() {
  const logoutButton = document.getElementById('logoutButton');
  if (logoutButton) {
    logoutButton.addEventListener('click', async function() {
      if (confirm('確定要登出嗎？')) {
        await waitForFirebase();
        try {
          await auth.signOut();
          window.location.href = './login.html';
        } catch (error) {
          alert('登出失敗：' + (error.message || '未知錯誤'));
        }
      }
    });
  }
}

// 定期檢查權限（每 5 分鐘）
setInterval(async () => {
  await waitForFirebase();
  const user = auth.currentUser;
  if (!user) return;
  
  const isAdmin = await checkAdminRole(user);
  if (!isAdmin) {
    alert('您的管理員權限已被撤銷，將自動登出');
    await auth.signOut();
    window.location.href = './login.html';
  }
}, 5 * 60 * 1000);

// 初始化
setupAuthListener();
