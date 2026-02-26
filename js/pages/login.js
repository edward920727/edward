// 登入頁面邏輯
import { onAuthStateChanged, signIn } from '../lib/auth.js';
console.log('開始載入登入頁面模組...');
// 檢查是否已登入
onAuthStateChanged(async (user, isAdmin) => {
    console.log('認證狀態變化:', { user: user?.email, isAdmin });
    if (user && isAdmin) {
        // 已登入且為管理員，導向儀表板
        window.location.href = './dashboard.html';
    }
});
// 顯示錯誤訊息
function showError(message) {
    const errorDiv = document.getElementById('errorMessage');
    const errorText = document.getElementById('errorText');
    if (errorDiv && errorText) {
        errorText.textContent = message;
        errorDiv.classList.remove('hidden');
        // 3 秒後自動隱藏
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
        }
        else {
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
        // 隱藏之前的錯誤訊息
        hideError();
        // 顯示載入狀態
        loginButton.disabled = true;
        if (loginButtonText)
            loginButtonText.classList.add('hidden');
        if (loginButtonLoading)
            loginButtonLoading.classList.remove('hidden');
        try {
            // 執行登入
            console.log('呼叫 signIn 函數...');
            const result = await signIn(email, password);
            console.log('登入結果:', result);
            // 恢復按鈕狀態
            loginButton.disabled = false;
            if (loginButtonText)
                loginButtonText.classList.remove('hidden');
            if (loginButtonLoading)
                loginButtonLoading.classList.add('hidden');
            if (result.success) {
                console.log('登入成功，準備導向儀表板');
                // 登入成功，導向儀表板
                window.location.href = './dashboard.html';
            }
            else {
                console.error('登入失敗:', result.error);
                // 顯示錯誤訊息（非管理員會顯示「您不是管理員」）
                showError(result.error || '登入失敗，請稍後再試');
            }
        }
        catch (error) {
            console.error('登入過程中發生錯誤:', error);
            loginButton.disabled = false;
            if (loginButtonText)
                loginButtonText.classList.remove('hidden');
            if (loginButtonLoading)
                loginButtonLoading.classList.add('hidden');
            showError('登入時發生錯誤：' + (error.message || '未知錯誤'));
        }
    });
}
else {
    console.error('找不到登入表單元素');
}
