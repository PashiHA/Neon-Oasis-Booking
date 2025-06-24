import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
    apiKey: "AIzaSyBoEr8hdYTI4L28-CADOzRagtF_gd1qDlE",
    authDomain: "pashiha-38a8c.firebaseapp.com",
    projectId: "pashiha-38a8c",
    storageBucket: "pashiha-38a8c.firebasestorage.app",
    messagingSenderId: "579741317466",
    appId: "1:579741317466:web:f67385ea1d866b1c93db63",
    measurementId: "G-5ZWWHKR3M5",
    databaseURL: "https://pashiha-38a8c-default-rtdb.firebaseio.com"
  };

  const app = initializeApp(firebaseConfig);
  const db = getDatabase(app);
  export const auth = app;
  
  export { db };