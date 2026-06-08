// =============================================
// FIREBASE CONFIGURATION
// Les clés "client" Firebase sont publiques par conception (elles sont visibles
// dans tout site web qui utilise Firebase). La sécurité réelle se fait via les
// règles Firestore, pas en cachant ces clés.
//
// => Valeurs par défaut intégrées : le déploiement fonctionne SANS rien configurer.
//    (Les variables d'environnement Vercel, si présentes, restent prioritaires.)
// =============================================

import { initializeApp } from 'firebase/app'
import { getFirestore, doc, setDoc, onSnapshot } from 'firebase/firestore'

const env = import.meta.env || {}

const firebaseConfig = {
  apiKey:            env.VITE_FIREBASE_API_KEY            || 'AIzaSyAxQ3F_Ct0IqmC7gbpXVgk2Jj_Nggr8aX0',
  authDomain:        env.VITE_FIREBASE_AUTH_DOMAIN        || 'carechallenge-24abd.firebaseapp.com',
  projectId:         env.VITE_FIREBASE_PROJECT_ID         || 'carechallenge-24abd',
  storageBucket:     env.VITE_FIREBASE_STORAGE_BUCKET     || 'carechallenge-24abd.firebasestorage.app',
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID|| '326009970241',
  appId:             env.VITE_FIREBASE_APP_ID             || '1:326009970241:web:4533dde4fdb47ec41cb0c0',
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
  console.warn('[Firebase] Init échouée, mode localStorage activé', err)
}

export { db, isConfigured, doc, setDoc, onSnapshot }
