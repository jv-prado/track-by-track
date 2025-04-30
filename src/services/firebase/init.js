/**
 * Inicialização do Firebase
 *
 * Este arquivo garante que o Firebase seja inicializado corretamente
 * na aplicação para garantir a persistência de autenticação.
 */

import {
  getAuth,
  setPersistence,
  browserLocalPersistence,
  onAuthStateChanged,
} from "firebase/auth";
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// Configuração do Firebase
const firebaseConfig = {
  apiKey: "AIzaSyAF8eeDOfLnaktKiIeKTY1OXNva80JqJO8",
  authDomain: "trackbytrack-57ae6.firebaseapp.com",
  projectId: "trackbytrack-57ae6",
  storageBucket: "trackbytrack-57ae6.firebasestorage.app",
  messagingSenderId: "504754961673",
  appId: "1:504754961673:web:5eca907880c9ec4cec67d8",
  measurementId: "G-RE6EYL95KG",
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

// Configurar persistência para login persistente
setPersistence(auth, browserLocalPersistence)
  .then(() => {
    console.log("Firebase inicializado com persistência local");
  })
  .catch((error) => {
    console.error("Erro ao configurar persistência:", error);
  });

// Monitorar mudanças no estado de autenticação
onAuthStateChanged(auth, (user) => {
  if (user) {
    console.log("Firebase: Usuário autenticado:", user.email);
  } else {
    console.log("Firebase: Usuário não autenticado");
  }
});

export { app, auth, db, storage };
