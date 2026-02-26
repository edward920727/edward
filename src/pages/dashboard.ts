// 儀表板頁面邏輯
import { onAuthStateChanged, signOut, checkAdminRole, getCurrentUser } from '../lib/auth.js';
import { addTokenToUrl } from '../lib/token-manager.js';

let currentUser: any = null;

// 檢查認證狀態並載入儀表板
onAuthStateChanged(async (user, isAdmin) => {
  console.log('儀表板認證狀態檢查:', { user: user?.email, isAdmin });
  
  if (!user) {
    // 未登入，導向登入頁面
    console.log('未登入，導向登入頁面');
    window.location.href = './login.html';
    return;
  }
  
  if (!isAdmin) {
    // 不是管理員，強制登出並導向登入頁面
    console.log('不是管理員，強制登出');
    await signOut();
    window.location.href = './login.html?error=unauthorized';
    return;
  }
  
  // 已登入且為管理員，顯示儀表板
  console.log('已登入且為管理員，載入儀表板');
  currentUser = user;
  loadDashboard();
});

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
    card.addEventListener('click', async function(this: HTMLElement) {
      const url = this.getAttribute('data-url');
      if (!url) return;
      
      // 取得 Firebase ID Token
      const user = getCurrentUser();
      if (!user) {
        alert('無法取得使用者資訊，請重新登入');
        return;
      }
      
      try {
        const token = await user.getIdToken();
        if (!token) {
          alert('無法取得驗證 Token，請重新登入');
          return;
        }
        
        // 為 URL 添加 Token
        const urlWithToken = await addTokenToUrl(url, token);
        
        // 在新分頁開啟
        window.open(urlWithToken, '_blank');
      } catch (error) {
        console.error('取得 Token 失敗:', error);
        alert('無法取得驗證 Token，請重新登入');
      }
    });
  });
}

// 設定登出按鈕
function setupLogoutButton() {
  const logoutButton = document.getElementById('logoutButton');
  if (logoutButton) {
    logoutButton.addEventListener('click', async function() {
      if (confirm('確定要登出嗎？')) {
        const result = await signOut();
        if (result.success) {
          window.location.href = './login.html';
        } else {
          alert('登出失敗：' + (result.error || '未知錯誤'));
        }
      }
    });
  }
}

// 定期檢查權限（每 5 分鐘）
setInterval(async () => {
  const user = getCurrentUser();
  if (!user) return;
  
  const isAdmin = await checkAdminRole(user);
  if (!isAdmin) {
    alert('您的管理員權限已被撤銷，將自動登出');
    await signOut();
    window.location.href = './login.html';
  }
}, 5 * 60 * 1000);
