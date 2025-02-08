// firebase-config.js
const firebaseConfig = {
    apiKey: "AIzaSyD6H6PO-d3u8INKpRTu6HwjkZWsCtaH4dU",
    authDomain: "personal-website-73f1a.firebaseapp.com",
    projectId: "personal-website-73f1a",
    storageBucket: "personal-website-73f1a.firebasestorage.app",
    messagingSenderId: "509418834116",
    appId: "1:509418834116:web:a51aed5c1750ade077a191"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Initialize Firebase services
const auth = firebase.auth();
const db = firebase.firestore();
