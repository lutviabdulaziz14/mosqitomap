
import { initializeApp } from "https://www.gstatic.com/firebasejs/13.3.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/13.3.0/firebase-auth.js";
import { getDatabase } from "https://www.gstatic.com/firebasejs/13.3.0/firebase-database.js";

const firebaseConfig = {
    apiKey: "AIzaSyCz8QTS_aZkpPoBpNMClRCaaKV9lojiWqY",
    authDomain: "mosquitomap-b7810.firebaseapp.com",
    databaseURL: "https://mosquitomap-b7810-default-rtdb.firebaseio.com",
    projectId: "mosquitomap-b7810",
    storageBucket: "mosquitomap-b7810.firebasestorage.app",
    messagingSenderId: "328515573063",
    appId: "1:328515573063:web:db27e14a804539d2be2862",
    measurementId: "G-74X3NBE9N0"
};

const app = initializeApp(firebaseConfig);

const auth = getAuth(app);
const database = getDatabase(app);

export { app, auth, database };
