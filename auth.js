// auth.js

// Monitor authentication state:
firebase.auth().onAuthStateChanged((user) => {
    if (user) {
        console.log("User signed in:", user.uid);
        // Update UI elements if needed. For example, show a welcome message:
        document.getElementById("welcome-message").innerText = `Welcome, ${user.displayName}!`;
        document.getElementById("welcome-message").style.display = "block";
        document.getElementById("logout-button").style.display = "inline-block";
    } else {
        console.log("No user signed in");
        document.getElementById("welcome-message").style.display = "none";
        document.getElementById("logout-button").style.display = "none";
    }
});
  
// Function to sign in with Google:
function signInWithGoogle() {
    const provider = new firebase.auth.GoogleAuthProvider();
    firebase.auth().signInWithPopup(provider)
      .then((result) => {
          console.log("Signed in as:", result.user.displayName);
          // Optionally update user document in Firestore here.
      })
      .catch((error) => {
          console.error("Error during Google sign-in:", error);
      });
}
  
// Expose the function to the global scope so you can call it from your HTML:
window.signInWithGoogle = signInWithGoogle;

// Optionally, add a logout function:
function signOut() {
    firebase.auth().signOut().then(() => {
        console.log("User signed out");
    }).catch((error) => {
        console.error("Sign out error:", error);
    });
}
window.signOut = signOut;

// Attach logout functionality to the logout button if present:
document.getElementById("logout-button")?.addEventListener("click", signOut);
