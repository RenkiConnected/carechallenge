// =============================================
// FIREBASE CONFIGURATION
// Copiez vos credentials depuis la console Firebase
// Project Settings → General → Your apps → SDK setup
// =============================================

import { initializeApp } from 'firebase/app'
import { getFirestore, doc, setDoc, onSnapshot } from 'firebase/firestore'

const firebaseConfig = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId:             import.meta.env.VITE_FIREBASE_APP_ID,
}

let db = null
let isConfigured = false

try {
  if (firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.projectId !== 'undefined') {
    const app = initializeApp(firebaseConfig)
    db = getFirestore(app)
    isConfigured = true
  }
} catch (err) {
  console.warn('[Firebase] Pas configuré, mode localStorage activé', err)
}

export { db, isConfigured, doc, setDoc, onSnapshot }
