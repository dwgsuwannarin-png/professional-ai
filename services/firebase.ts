import firebase from "firebase/compat/app";
import "firebase/compat/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCSVY8TU5DeQv9PmeK-n7jXojE_ZADiVZ0",
  authDomain: "login-3697a.firebaseapp.com",
  projectId: "login-3697a",
  storageBucket: "login-3697a.firebasestorage.app",
  messagingSenderId: "710615394668",
  appId: "1:710615394668:web:2ccac0117b7395a021eb49",
  measurementId: "G-HYN57SMY9K"
};

if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

export const db = firebase.firestore();