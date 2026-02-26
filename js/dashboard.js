// 儀表板頁面邏輯

let currentUser = null;

// 檢查認證狀態並載入儀表板
onAuthStateChanged(async (user, isAdmin) => {
  if (!user) {
    // 未登入，導向登入頁面
    window.location.href = './login.html';
    return;
  }
  
  if (!isAdmin) {
    // 不是管理員，強制登出並導向登入頁面
    await signOut();
    window.location.href = './login.html?error=unauthorized';
    return;
  }
  
  // 已登入且為管理員，顯示儀表板
  currentUser = user;
  loadDashboard();
});

// 載入儀表板內容
function loadDashboard() {
  // 顯示使用者資訊
  if (currentUser && currentUser.email) {
    document.getElementById('userEmail').textContent = currentUser.email;
  }
  
  // 隱藏載入動畫，顯示主要內容
  document.getElementById('loadingScreen').classList.add('hidden');
  document.getElementById('mainContent').classList.remove('hidden');
  
  // 設定專案卡片點擊事件
  setupProjectCards();
}

// 設定專案卡片點擊事件
function setupProjectCards() {
  const projectCards = document.querySelectorAll('.project-card');
  
  projectCards.forEach(card => {
    card.addEventListener('click', async function() {
      const url = this.getAttribute('data-url');
      if (!url) return;
      
      // 取得 Firebase ID Token
      const token = await getIdToken();
      if (!token) {
        alert('無法取得驗證 Token，請重新登入');
        return;
      }
      
      // 為 URL 添加 Token
      const urlWithToken = await addTokenToUrl(url, token);
      
      // 在新分頁開啟
      window.open(urlWithToken, '_blank');
    });
  });
}

// 登出按鈕事件
document.getElementById('logoutButton').addEventListener('click', async function() {
  if (confirm('確定要登出嗎？')) {
    const result = await signOut();
    if (result.success) {
      window.location.href = './login.html';
    } else {
      alert('登出失敗：' + (result.error || '未知錯誤'));
    }
  }
});

// 定期檢查權限（每 5 分鐘）
setInterval(async () => {
  const isAdmin = await checkAdminRole();
  if (!isAdmin) {
    alert('您的管理員權限已被撤銷，將自動登出');
    await signOut();
    window.location.href = './login.html';
  }
}, 5 * 60 * 1000);
