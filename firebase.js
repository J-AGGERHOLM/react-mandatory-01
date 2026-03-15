// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAnalytics } from "firebase/analytics";
import { getStorage} from "firebase/storage";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyB_lL12RY1E8KSZY4HnUR4O_goH7lQ7UmY",
  authDomain: "myfistproject-5fbe3.firebaseapp.com",
  projectId: "myfistproject-5fbe3",
  storageBucket: "myfistproject-5fbe3.firebasestorage.app",
  messagingSenderId: "175604539579",
  appId: "1:175604539579:web:a3220358dcb8a3a20a499e",
  measurementId: "G-FF3FXCRDH7"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const storage = getStorage(app)
const database = getFirestore(app) //so we may use the database directly in the code
export { app, storage, database };