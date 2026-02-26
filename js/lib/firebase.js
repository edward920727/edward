// Firebase 配置和初始化
import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
// Firebase 配置
const firebaseConfig = {
    apiKey: "AIzaSyBNpAmZjxZgb9Ub7qZLH6htzgmKHXHWpiI",
    authDomain: "tung-315.firebaseapp.com",
    projectId: "tung-315",
    storageBucket: "tung-315.firebasestorage.app",
    messagingSenderId: "269133618540",
    appId: "1:269133618540:web:1cfc7a35a1a3b790b6e749",
    measurementId: "G-NRY3EEPQDB"
};
// 初始化 Firebase（避免重複初始化）
let app;
if (getApps().length === 0) {
    app = initializeApp(firebaseConfig);
}
else {
    app = getApps()[0];
}
// 初始化服務
export const auth = getAuth(app);
export const db = getFirestore(app);
export default app;
