// 儀表板頁面邏輯（使用 Firebase compat SDK）
console.log('開始載入儀表板模組...');

let currentUser = null;
let settingsDocRef = null;

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

  // 設定快速操作按鈕
  setupQuickActions();

  // 初始化系統設定文件參考
  settingsDocRef = db.collection('settings').doc('global');

  // 載入現有專案列表
  loadProjects();
}

// 設定單一專案卡片的點擊事件
function attachProjectCardClick(card) {
  if (!card) return;

  card.addEventListener('click', async function() {
    const url = this.getAttribute('data-url');
    const isSimpleLink = this.getAttribute('data-simple-link') === 'true';
    
    console.log('點擊專案卡片，URL:', url, '簡單連結:', isSimpleLink);
    
    if (!url) {
      console.error('找不到 URL');
      return;
    }
    
    // 如果是簡單連結，直接跳轉，不帶任何參數
    if (isSimpleLink) {
      window.open(url, '_blank');
      return;
    }
    
    // 否則使用原本的 Token 驗證流程
    const finalUrl = url;
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
      console.error('取得驗證 Token 失敗:', error);
      alert('無法取得驗證 Token，請重新登入');
    }
  });
}

// 設定專案卡片點擊事件（套用到所有現有卡片）
function setupProjectCards() {
  const projectCards = document.querySelectorAll('.project-card');
  projectCards.forEach(card => attachProjectCardClick(card));
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

// 設定快速操作按鈕
function setupQuickActions() {
  const addProjectBtn = document.getElementById('quickAddProject');
  const systemSettingsBtn = document.getElementById('quickSystemSettings');
  const analyticsBtn = document.getElementById('quickAnalytics');

  if (addProjectBtn) {
    addProjectBtn.addEventListener('click', openAddProjectModal);
  }

  if (systemSettingsBtn) {
    systemSettingsBtn.addEventListener('click', openSystemSettingsModal);
  }

  if (analyticsBtn) {
    analyticsBtn.addEventListener('click', openAnalyticsModal);
  }

  // Modal 關閉與表單事件
  const addProjectClose = document.getElementById('addProjectClose');
  const addProjectCancel = document.getElementById('addProjectCancel');
  const addProjectForm = document.getElementById('addProjectForm');

  if (addProjectClose) addProjectClose.addEventListener('click', closeAddProjectModal);
  if (addProjectCancel) addProjectCancel.addEventListener('click', closeAddProjectModal);
  if (addProjectForm) addProjectForm.addEventListener('submit', handleAddProjectSubmit);

  const systemSettingsClose = document.getElementById('systemSettingsClose');
  const systemSettingsCancel = document.getElementById('systemSettingsCancel');
  const systemSettingsForm = document.getElementById('systemSettingsForm');

  if (systemSettingsClose) systemSettingsClose.addEventListener('click', closeSystemSettingsModal);
  if (systemSettingsCancel) systemSettingsCancel.addEventListener('click', closeSystemSettingsModal);
  if (systemSettingsForm) systemSettingsForm.addEventListener('submit', handleSystemSettingsSubmit);

  const analyticsClose = document.getElementById('analyticsClose');
  const analyticsCloseBottom = document.getElementById('analyticsCloseBottom');

  if (analyticsClose) analyticsClose.addEventListener('click', closeAnalyticsModal);
  if (analyticsCloseBottom) analyticsCloseBottom.addEventListener('click', closeAnalyticsModal);
}

// 專案列表：從 Firestore 載入
async function loadProjects() {
  try {
    await waitForFirebase();
    const snapshot = await db.collection('projects').get();
    if (snapshot.empty) return;

    snapshot.forEach(doc => {
      const data = doc.data();
      renderProjectCard({
        id: doc.id,
        name: data.name,
        description: data.description,
        url: data.url
      });
    });
  } catch (error) {
    console.error('載入專案列表時發生錯誤:', error);
  }
}

// 在畫面上渲染單一專案卡片
function renderProjectCard(project) {
  const container = document.getElementById('projectList');
  if (!container || !project || !project.url) return;

  const card = document.createElement('div');
  card.className = 'bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-xl transition cursor-pointer project-card';
  card.setAttribute('data-url', project.url);

  card.innerHTML = `
    <div class="h-48 bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center">
      <i class="fas fa-project-diagram text-white text-6xl"></i>
    </div>
    <div class="p-6">
      <h3 class="text-xl font-bold text-gray-800 mb-2">${project.name || '未命名專案'}</h3>
      <p class="text-gray-600 text-sm mb-4">${project.description || '自訂專案入口'}</p>
      <div class="flex items-center justify-between">
        <span class="text-sm text-gray-500">
          <i class="fas fa-external-link-alt mr-1"></i>前往管理
        </span>
        <i class="fas fa-chevron-right text-indigo-600"></i>
      </div>
    </div>
  `;

  container.appendChild(card);
  attachProjectCardClick(card);
}

// 新增專案 Modal 控制
function openAddProjectModal() {
  const modal = document.getElementById('addProjectModal');
  if (modal) modal.classList.remove('hidden');
}

function closeAddProjectModal() {
  const modal = document.getElementById('addProjectModal');
  if (modal) modal.classList.add('hidden');
}

async function handleAddProjectSubmit(event) {
  event.preventDefault();
  await waitForFirebase();

  const nameInput = document.getElementById('projectName');
  const descInput = document.getElementById('projectDescription');
  const urlInput = document.getElementById('projectUrl');
  const submitBtn = document.getElementById('addProjectSubmit');

  if (!nameInput || !urlInput || !submitBtn) return;

  const name = nameInput.value.trim();
  const description = descInput ? descInput.value.trim() : '';
  const url = urlInput.value.trim();

  if (!name || !url) {
    alert('請輸入完整的專案名稱與後台管理網址');
    return;
  }

  submitBtn.disabled = true;

  try {
    const docRef = await db.collection('projects').add({
      name,
      description,
      url,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      createdBy: currentUser ? currentUser.email : null
    });

    renderProjectCard({ id: docRef.id, name, description, url });

    if (nameInput) nameInput.value = '';
    if (descInput) descInput.value = '';
    if (urlInput) urlInput.value = '';

    closeAddProjectModal();
    alert('專案已建立成功');
  } catch (error) {
    console.error('新增專案時發生錯誤:', error);
    alert('新增專案失敗，請稍後再試');
  } finally {
    submitBtn.disabled = false;
  }
}

// 系統設定 Modal 控制
function openSystemSettingsModal() {
  const modal = document.getElementById('systemSettingsModal');
  if (modal) modal.classList.remove('hidden');
  loadSystemSettings();
}

function closeSystemSettingsModal() {
  const modal = document.getElementById('systemSettingsModal');
  if (modal) modal.classList.add('hidden');
}

async function loadSystemSettings() {
  try {
    await waitForFirebase();
    if (!settingsDocRef) {
      settingsDocRef = db.collection('settings').doc('global');
    }

    const snapshot = await settingsDocRef.get();
    const data = snapshot.exists ? snapshot.data() : {};

    const maintenanceInput = document.getElementById('maintenanceMode');
    const emailInput = document.getElementById('contactEmail');

    if (maintenanceInput) maintenanceInput.checked = !!data.maintenanceMode;
    if (emailInput) emailInput.value = data.contactEmail || '';
  } catch (error) {
    console.error('載入系統設定時發生錯誤:', error);
  }
}

async function handleSystemSettingsSubmit(event) {
  event.preventDefault();
  await waitForFirebase();

  if (!settingsDocRef) {
    settingsDocRef = db.collection('settings').doc('global');
  }

  const maintenanceInput = document.getElementById('maintenanceMode');
  const emailInput = document.getElementById('contactEmail');
  const submitBtn = document.getElementById('systemSettingsSubmit');

  if (!submitBtn) return;

  submitBtn.disabled = true;

  try {
    const maintenanceMode = maintenanceInput ? maintenanceInput.checked : false;
    const contactEmail = emailInput ? emailInput.value.trim() : '';

    await settingsDocRef.set(
      {
        maintenanceMode,
        contactEmail,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
        updatedBy: currentUser ? currentUser.email : null
      },
      { merge: true }
    );

    closeSystemSettingsModal();
    alert('系統設定已更新');
  } catch (error) {
    console.error('儲存系統設定時發生錯誤:', error);
    alert('儲存系統設定失敗，請稍後再試');
  } finally {
    submitBtn.disabled = false;
  }
}

// 數據分析 Modal 控制
function openAnalyticsModal() {
  const modal = document.getElementById('analyticsModal');
  if (modal) modal.classList.remove('hidden');
  loadAnalytics();
}

function closeAnalyticsModal() {
  const modal = document.getElementById('analyticsModal');
  if (modal) modal.classList.add('hidden');
}

async function loadAnalytics() {
  try {
    await waitForFirebase();

    const [projectsSnap, adminsSnap] = await Promise.all([
      db.collection('projects').get(),
      db.collection('users').where('role', '==', 'admin').get()
    ]);

    const projectCountEl = document.getElementById('analyticsProjectCount');
    const adminCountEl = document.getElementById('analyticsAdminCount');

    if (projectCountEl) projectCountEl.textContent = String(projectsSnap.size);
    if (adminCountEl) adminCountEl.textContent = String(adminsSnap.size);
  } catch (error) {
    console.error('載入數據分析時發生錯誤:', error);
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
