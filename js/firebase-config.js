// =========================================
//  CONEXIÓN CON FIREBASE — INDALO
//  La "llave y dirección" del almacén digital
// =========================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-storage.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js";

// La configuración de tu proyecto (tu llave personal)
const firebaseConfig = {
  apiKey: "AIzaSyBwvYGvVsPqfp0u7WUWwmTVXsX2KVdigtQ",
  authDomain: "indalo-cesteria.firebaseapp.com",
  projectId: "indalo-cesteria",
  storageBucket: "indalo-cesteria.firebasestorage.app",
  messagingSenderId: "833976711630",
  appId: "1:833976711630:web:69851d9a3eea52004a539f"
};

// Encendemos la conexión con Firebase
const app = initializeApp(firebaseConfig);

// Activamos los 3 sectores del almacén
export const db = getFirestore(app);    // Los estantes de datos (Firestore)
export const storage = getStorage(app); // El depósito de fotos (Storage)
export const auth = getAuth(app);       // El portero (Authentication)