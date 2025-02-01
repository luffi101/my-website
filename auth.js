const auth = firebase.auth();
const provider = new firebase.auth.GoogleAuthProvider();

// Login
document.getElementById('login-button').addEventListener('click', () => {
    auth.signInWithPopup(provider)
        .then(result => {
            console.log('User signed in:', result.user);
            localStorage.setItem('user', JSON.stringify(result.user)); // Store user data
            window.location.href = "journal.html"; // Redirect after login
        })
        .catch(error => console.error('Login failed:', error));
});

// Logout
document.getElementById('logout-button').addEventListener('click', () => {
    auth.signOut().then(() => {
        localStorage.removeItem('user');
        window.location.href = "index.html"; // Redirect after logout
    });
});

// Check if user is logged in
auth.onAuthStateChanged(user => {
    if (user) {
        document.getElementById('login-button').style.display = 'none';
        document.getElementById('logout-button').style.display = 'block';
        document.getElementById('welcome-message').innerText = `Welcome, ${user.displayName}`;
        document.getElementById('welcome-message').style.display = 'block';
    } else {
        document.getElementById('login-button').style.display = 'block';
        document.getElementById('logout-button').style.display = 'none';
        document.getElementById('welcome-message').style.display = 'none';
    }
});
