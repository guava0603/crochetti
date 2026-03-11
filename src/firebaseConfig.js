import { initializeApp } from "firebase/app";
import { getStorage } from "firebase/storage";
// 1. 改用 initializeAuth 以便自定義環境設定
import {
  initializeAuth,
  indexedDBLocalPersistence,
  getAuth
} from "firebase/auth";
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager
} from "firebase/firestore";
import { Capacitor } from "@capacitor/core";

const firebaseConfig = {
  apiKey: "AIzaSyDPW7mIWU2BkEgxpyFya_gYVtXBEZ_Ia_o",
  authDomain: "crochetti-a8cd5.firebaseapp.com",
  projectId: "crochetti-a8cd5",
  storageBucket: "crochetti-a8cd5.firebasestorage.app",
  messagingSenderId: "961609224168",
  appId: "1:961609224168:web:942ac0168280b7eb4c1e5d",
  measurementId: "G-RFKS5HQ7RY"
};

const app = initializeApp(firebaseConfig);

// export const db = getFirestore(app);
// ✅ 啟用離線持久化快取
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager()
  })
});

// 2. 針對原生 App 環境，使用 indexedDB 且不載入瀏覽器彈窗解析器
let authInstance;
if (Capacitor.isNativePlatform()) {
  authInstance = initializeAuth(app, {
    persistence: indexedDBLocalPersistence
  });
} else {
  authInstance = getAuth(app);
}

export const auth = authInstance;

export const storage = getStorage(app);

// 3. ⚠️ 重要：暫時移除 getAnalytics(app)
// Analytics 在 iOS Webview 中常會觸發 CORS 錯誤導致白屏

