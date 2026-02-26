// 登入頁面邏輯（使用 Firebase compat SDK）
console.log('開始載入登入頁面模組...');

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

// 顯示錯誤訊息
function showError(message) {
  const errorDiv = document.getElementById('errorMessage');
  const errorText = document.getElementById('errorText');
  if (errorDiv && errorText) {
    errorText.textContent = message;
    errorDiv.classList.remove('hidden');
    setTimeout(() => {
      errorDiv.classList.add('hidden');
    }, 3000);
  }
}

// 隱藏錯誤訊息
function hideError() {
  const errorDiv = document.getElementById('errorMessage');
  if (errorDiv) {
    errorDiv.classList.add('hidden');
  }
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
    console.log('認證狀態變化:', { user: user?.email });
    if (user) {
      const isAdmin = await checkAdminRole(user);
      console.log('是否為管理員:', isAdmin);
      if (isAdmin) {
        window.location.href = './dashboard.html';
      }
    }
  });
}

// 切換密碼顯示
const togglePasswordBtn = document.getElementById('togglePassword');
const passwordInput = document.getElementById('password');
const eyeIcon = document.getElementById('eyeIcon');

if (togglePasswordBtn && passwordInput && eyeIcon) {
  togglePasswordBtn.addEventListener('click', () => {
    if (passwordInput.type === 'password') {
      passwordInput.type = 'text';
      eyeIcon.classList.remove('fa-eye');
      eyeIcon.classList.add('fa-eye-slash');
    } else {
      passwordInput.type = 'password';
      eyeIcon.classList.remove('fa-eye-slash');
      eyeIcon.classList.add('fa-eye');
    }
  });
}

// 處理登入表單提交
const loginForm = document.getElementById('loginForm');
if (loginForm) {
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    console.log('表單提交觸發');
    
    await waitForFirebase();
    
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const loginButton = document.getElementById('loginButton');
    const loginButtonText = document.getElementById('loginButtonText');
    const loginButtonLoading = document.getElementById('loginButtonLoading');
    
    if (!emailInput || !passwordInput || !loginButton) {
      console.error('找不到必要的 DOM 元素');
      showError('系統錯誤，請重新整理頁面');
      return;
    }
    
    const email = emailInput.value.trim();
    const password = passwordInput.value;
    
    if (!email || !password) {
      showError('請輸入電子郵件和密碼');
      return;
    }
    
    console.log('開始登入流程，Email:', email);
    hideError();
    
    // 顯示載入狀態
    loginButton.disabled = true;
    if (loginButtonText) loginButtonText.classList.add('hidden');
    if (loginButtonLoading) loginButtonLoading.classList.remove('hidden');
    
    try {
      await waitForFirebase();
      
      const userCredential = await auth.signInWithEmailAndPassword(email, password);
      const user = userCredential.user;
      
      // 檢查是否為管理員
      const isAdmin = await checkAdminRole(user);
      
      if (!isAdmin) {
        await auth.signOut();
        showError('您不是管理員');
        loginButton.disabled = false;
        if (loginButtonText) loginButtonText.classList.remove('hidden');
        if (loginButtonLoading) loginButtonLoading.classList.add('hidden');
        return;
      }
      
      // 登入成功，導向儀表板
      console.log('登入成功，準備導向儀表板');
      window.location.href = './dashboard.html';
      
    } catch (error) {
      console.error('登入過程中發生錯誤:', error);
      loginButton.disabled = false;
      if (loginButtonText) loginButtonText.classList.remove('hidden');
      if (loginButtonLoading) loginButtonLoading.classList.add('hidden');
      
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
        case 'auth/network-request-failed':
          errorMessage = '網路連線失敗，請檢查您的網路';
          break;
      }
      showError(errorMessage);
    }
  });
}

// 初始化
setupAuthListener();
