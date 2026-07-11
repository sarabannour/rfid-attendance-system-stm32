// ============================================================
// firebase-config.js — Configuration Firebase
// Remplacez les valeurs par celles de VOTRE projet Firebase
// ============================================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth }      from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getDatabase }  from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

// 🔧 REMPLACEZ AVEC VOS VRAIES VALEURS (depuis Project Settings → Your apps)
const firebaseConfig = {
  apiKey:            "AIzaSyDW8GQHZCRpuwCnu-evQrhILtXK5ZRLJ2Q",
  authDomain:        "esp32-deb13.firebaseapp.com",
  databaseURL:       "https://esp32-deb13-default-rtdb.firebaseio.com",
  projectId:         "esp32-deb13",
  storageBucket:     "esp32-deb13.firebasestorage.app",
  messagingSenderId: "191817478028",
  appId:             "1:191817478028:web:b71090604fdb33a57570a9"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// Export both Firestore AND Realtime Database
// Le dashboard utilise Firestore (collection "operators")
export const db      = getFirestore(app);
export const rtdb    = getDatabase(app);
export { auth };
export default app;