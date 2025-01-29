console.log("Firebase SDK Loaded:", firebase);

// Get Firebase authentication and Firestore instances
const auth = firebase.auth();
const db = firebase.firestore();
const provider = new firebase.auth.GoogleAuthProvider();

// Login Button
document.getElementById('login-button').addEventListener('click', () => {
    auth.signInWithPopup(provider)
        .then(result => {
            console.log('User signed in:', result.user);
            document.getElementById('login-button').style.display = 'none';
            document.getElementById('logout-button').style.display = 'block';
            document.getElementById('journal-form').style.display = 'block';
            document.getElementById('welcome-message').innerText = `Welcome, ${result.user.displayName}`;
            document.getElementById('welcome-message').style.display = 'block';
        })
        .catch(error => console.error('Login failed:', error));
});

// Logout Button
document.getElementById('logout-button').addEventListener('click', () => {
    auth.signOut().then(() => {
        console.log('User signed out');
        document.getElementById('login-button').style.display = 'block';
        document.getElementById('logout-button').style.display = 'none';
        document.getElementById('journal-form').style.display = 'none';
        document.getElementById('welcome-message').style.display = 'none';
    });
});
