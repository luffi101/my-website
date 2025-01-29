// Import Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";
import { getFirestore, collection, addDoc, getDocs, query, where, deleteDoc, doc } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";

// Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyD6H6PO-d3u8INKpRTu6HwjkZWsCtaH4dU",
    authDomain: "personal-website-73f1a.firebaseapp.com",
    projectId: "personal-website-73f1a",
    storageBucket: "personal-website-73f1a.firebasestorage.app",
    messagingSenderId: "509418834116",
    appId: "1:509418834116:web:a51aed5c1750ade077a191"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const provider = new GoogleAuthProvider();

// Select DOM elements
const form = document.getElementById('new-entry-form');
const titleInput = document.getElementById('entry-title');
const contentInput = document.getElementById('entry-content');
const privateInput = document.getElementById('entry-private');
const showPrivateToggle = document.getElementById('show-private'); 
const entriesList = document.getElementById('entries-list');
const loginButton = document.getElementById('login-button');
const logoutButton = document.getElementById('logout-button');

// Handle login
loginButton.addEventListener("click", async () => {
    try {
        const result = await signInWithPopup(auth, provider);
        alert(`Logged in as ${result.user.email}`);
        loadEntries();
    } catch (error) {
        alert("Login Failed: " + error.message);
    }
});

// Handle logout
logoutButton.addEventListener("click", async () => {
    await signOut(auth);
    alert("Logged out");
    entriesList.innerHTML = ""; // Clear UI
});

// Function to load journal entries
async function loadEntries() {
    entriesList.innerHTML = "";
    const user = auth.currentUser;
    const querySnapshot = await getDocs(collection(db, "journals"));

    querySnapshot.forEach((doc) => {
        const entry = doc.data();
        if (!entry.isPrivate || (user && entry.userId === user.uid)) {
            addEntryToPage(entry.title, entry.content, entry.isPrivate, doc.id);
        }
    });
}

// Handle form submission (Save to Firestore)
form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const user = auth.currentUser;

    if (!user) {
        alert("You must be logged in to save journals.");
        return;
    }

    const title = titleInput.value.trim();
    const content = contentInput.value.trim();
    const isPrivate = privateInput.checked;

    await addDoc(collection(db, "journals"), {
        title,
        content,
        isPrivate,
        userId: user.uid
    });

    form.reset();
    loadEntries();
});

// Function to add a journal entry to the page
function addEntryToPage(title, content, isPrivate, docId) {
    const entryItem = document.createElement('div');
    entryItem.classList.add('journal-entry');
    const date = new Date().toLocaleString();
    
    entryItem.innerHTML = `
        <h3>${title}</h3>
        <p>${content}</p>
        <small>${date}</small>
        ${isPrivate ? '<span class="private-label">Private</span>' : ''}
        <button class="delete-entry">Delete</button>
    `;

    entriesList.appendChild(entryItem);

    // Delete entry from Firestore
    entryItem.querySelector('.delete-entry').addEventListener('click', async () => {
        await deleteDoc(doc(db, "journals", docId));
        entryItem.remove();
    });
}

// Monitor authentication state
onAuthStateChanged(auth, (user) => {
    if (user) {
        loginButton.style.display = "none";
        logoutButton.style.display = "block";
        loadEntries();
    } else {
        loginButton.style.display = "block";
        logoutButton.style.display = "none";
        entriesList.innerHTML = "";
    }
});