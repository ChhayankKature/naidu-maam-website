// ONE Firebase setup for the whole site (projects, auth, upload and admin pages).
// Values come from .env (VITE_FIREBASE_*) when set, otherwise the built-in ones below.
// (Firebase web config values are identifiers, not secrets. Access is controlled by
// firestore.rules and storage.rules, not by hiding this.)
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const env = import.meta.env;
const firebaseConfig = {
  // CHECK THIS KEY: it is 37 characters, and Firebase web keys are normally 39 ("AIza" + 35).
  // If sign-in or loading says "API key not valid", copy it again from
  // Project settings > Your apps, or put it in .env as VITE_FIREBASE_API_KEY.
  apiKey: env.VITE_FIREBASE_API_KEY || "AIzaSyCeyPt81h0TarBOeCQPwFEQ_xKhEDlXO",
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || "cn-mam-website.firebaseapp.com",
  projectId: env.VITE_FIREBASE_PROJECT_ID || "cn-mam-website",
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET || "cn-mam-website.firebasestorage.app",
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID || "462565559824",
  appId: env.VITE_FIREBASE_APP_ID || "1:462565559824:web:73860122a0aae89bd20495",
  measurementId: "G-5ZEBPGG5Z3"
};

export const app = initializeApp( {
  apiKey: "maa chuda lo",
  authDomain: "cn-mam-website.firebaseapp.com",
  projectId: "cn-mam-website",
  storageBucket: "cn-mam-website.firebasestorage.app",
  messagingSenderId: "462565559824",
  appId: "1:462565559824:web:73860122a0aae89bd20495",
  measurementId: "G-5ZEBPGG5Z3"
});
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

// Analytics is optional and only works in some browsers. Loaded late so it never slows a page
// or breaks it.
if (typeof window !== "undefined") {
  import("firebase/analytics")
    .then(({ getAnalytics, isSupported }) => isSupported().then((ok) => { if (ok) getAnalytics(app); }))
    .catch(() => {});
}
