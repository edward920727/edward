// 登入頁面邏輯

// 檢查是否已登入
onAuthStateChanged(async (user, isAdmin) => {
  if (user && isAdmin) {
    // 已登入且為管理員，導向儀表板
    window.location.href = './dashboard.html';
  }
});

// 顯示錯誤訊息
function showError(message) {
  const errorDiv = document.getElementById('errorMessage');
  const errorText = document.getElementById('errorText');
  errorText.textContent = message;
  errorDiv.classList.remove('hidden');
  
  // 3 秒後自動隱藏
  setTimeout(() => {
    errorDiv.classList.add('hidden');
  }, 3000);
}

// 隱藏錯誤訊息
function hideError() {
  document.getElementById('errorMessage').classList.add('hidden');
}

// 切換密碼顯示
document.getElementById('togglePassword').addEventListener('click', function() {
  const passwordInput = document.getElementById('password');
  const eyeIcon = document.getElementById('eyeIcon');
  
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

// 處理登入表單提交
document.getElementById('loginForm').addEventListener('submit', async function(e) {
  e.preventDefault();
  
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;
  const loginButton = document.getElementById('loginButton');
  const loginButtonText = document.getElementById('loginButtonText');
  const loginButtonLoading = document.getElementById('loginButtonLoading');
  
  // 隱藏之前的錯誤訊息
  hideError();
  
  // 顯示載入狀態
  loginButton.disabled = true;
  loginButtonText.classList.add('hidden');
  loginButtonLoading.classList.remove('hidden');
  
  // 執行登入
  const result = await signIn(email, password);
  
  // 恢復按鈕狀態
  loginButton.disabled = false;
  loginButtonText.classList.remove('hidden');
  loginButtonLoading.classList.add('hidden');
  
  if (result.success) {
    // 登入成功，導向儀表板
    window.location.href = './dashboard.html';
  } else {
    // 顯示錯誤訊息
    showError(result.error || '登入失敗，請稍後再試');
  }
});
