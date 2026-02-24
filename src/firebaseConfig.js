import { initializeApp } from "firebase/app";
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
  apiKey: "AIzaSyCfpdDjvsnbqSRyAdMP1B9AoKkQznGJU5g",
  authDomain: "corchetti-ec876.firebaseapp.com",
  projectId: "corchetti-ec876",
  storageBucket: "corchetti-ec876.firebasestorage.app",
  messagingSenderId: "341091983242",
  appId: "1:341091983242:web:865e85c311510bc8cd3273",
  measurementId: "G-BYYQV4NEZS"
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

// 3. ⚠️ 重要：暫時移除 getAnalytics(app)
// Analytics 在 iOS Webview 中常會觸發 CORS 錯誤導致白屏

