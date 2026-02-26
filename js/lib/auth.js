// 認證與權限管理模組
import { signInWithEmailAndPassword, signOut as firebaseSignOut, onAuthStateChanged as firebaseOnAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from './firebase.js';
/**
 * 檢查使用者是否為管理員
 * 使用 Email 作為 Firestore 文件 ID
 * @param user Firebase User 物件
 * @returns Promise<boolean> 是否為管理員
 */
export async function checkAdminRole(user) {
    try {
        // 使用 Email 作為文件 ID
        if (!user.email) {
            return false;
        }
        const userDocRef = doc(db, 'users', user.email);
        const userDoc = await getDoc(userDocRef);
        if (!userDoc.exists()) {
            return false;
        }
        const userData = userDoc.data();
        return userData.role === 'admin';
    }
    catch (error) {
        console.error('檢查管理員權限時發生錯誤:', error);
        return false;
    }
}
/**
 * 驗證並強制登出非管理員使用者
 * @param user Firebase User 物件
 * @returns Promise<boolean> 是否為管理員
 */
export async function enforceAdminRole(user) {
    const isAdmin = await checkAdminRole(user);
    if (!isAdmin) {
        console.warn('使用者不具備管理員權限，強制登出');
        await firebaseSignOut(auth);
        return false;
    }
    return true;
}
/**
 * 監聽認證狀態變化
 * @param callback 回調函數
 */
export function onAuthStateChanged(callback) {
    return firebaseOnAuthStateChanged(auth, async (user) => {
        if (user) {
            const isAdmin = await checkAdminRole(user);
            await callback(user, isAdmin);
        }
        else {
            await callback(null, false);
        }
    });
}
/**
 * 登入
 * @param email 電子郵件
 * @param password 密碼
 * @returns Promise<{success: boolean, error?: string, user?: User}>
 */
export async function signIn(email, password) {
    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        // 檢查是否為管理員
        const isAdmin = await checkAdminRole(user);
        if (!isAdmin) {
            await firebaseSignOut(auth);
            return {
                success: false,
                error: '您不是管理員'
            };
        }
        return {
            success: true,
            user
        };
    }
    catch (error) {
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
        return {
            success: false,
            error: errorMessage
        };
    }
}
/**
 * 登出
 * @returns Promise<{success: boolean, error?: string}>
 */
export async function signOut() {
    try {
        await firebaseSignOut(auth);
        return { success: true };
    }
    catch (error) {
        console.error('登出時發生錯誤:', error);
        return {
            success: false,
            error: error.message
        };
    }
}
/**
 * 取得當前使用者
 * @returns User | null
 */
export function getCurrentUser() {
    return auth.currentUser;
}
/**
 * 取得 Firebase ID Token
 * @returns Promise<string|null> ID Token
 */
export async function getIdToken() {
    try {
        const user = auth.currentUser;
        if (!user) {
            return null;
        }
        // 強制刷新 token 以確保是最新的
        const token = await user.getIdToken(true);
        return token;
    }
    catch (error) {
        console.error('取得 ID Token 時發生錯誤:', error);
        return null;
    }
}
