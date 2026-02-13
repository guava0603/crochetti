import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFirestore } from "firebase/firestore"; // For Database
import { getAuth } from "firebase/auth";           // For Authentication

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCfpdDjvsnbqSRyAdMP1B9AoKkQznGJU5g",
  authDomain: "corchetti-ec876.firebaseapp.com",
  projectId: "corchetti-ec876",
  storageBucket: "corchetti-ec876.firebasestorage.app",
  messagingSenderId: "341091983242",
  appId: "1:341091983242:web:865e85c311510bc8cd3273",
  measurementId: "G-BYYQV4NEZS"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Export services to use them in your components
export const db = getFirestore(app);
export const auth = getAuth(app);
const analytics = getAnalytics(app);
