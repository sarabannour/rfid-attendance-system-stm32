// ============================================================
// firebase-config.js — Configuration Firebase
// Remplacez les valeurs par celles de VOTRE projet Firebase
// ============================================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth }      from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getDatabase }  from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

//  REMPLACEZ AVEC VOS VRAIES VALEURS (depuis Project Settings → Your apps)
const firebaseConfig = {
  apiKey:            "putyours",
  authDomain:        "esp32-deb13.firebaseapp.com",
  databaseURL:       "putyours",
  projectId:         "esp32-deb13",
  storageBucket:     "esp32-deb13.firebasestorage.app",
  messagingSenderId: "putyours",
  appId:             "putyours"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// Export both Firestore AND Realtime Database
// Le dashboard utilise Firestore (collection "operators")
export const db      = getFirestore(app);
export const rtdb    = getDatabase(app);
export { auth };
export default app;
