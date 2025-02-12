// auth.js

// Function to update the authentication UI.
function updateAuthUI(user) {
    const authInfo = document.getElementById("auth-info");
    if (user) {
      authInfo.innerHTML = `<span>Welcome, ${user.displayName}</span>
                            <button id="logout-button">Logout</button>`;
      document.getElementById("logout-button").addEventListener("click", signOut);
    } else {
      authInfo.innerHTML = `<button id="login-button" onclick="signInWithGoogle()">Login with Google</button>`;
    }
  }
  
  // Monitor authentication state:
  firebase.auth().onAuthStateChanged((user) => {
      updateAuthUI(user);
  });
  
  // Function to sign in with Google.
  function signInWithGoogle() {
      const provider = new firebase.auth.GoogleAuthProvider();
      firebase.auth().signInWithPopup(provider)
        .then((result) => {
            console.log("Signed in as:", result.user.displayName);
            updateAuthUI(result.user);
        })
        .catch((error) => {
            console.error("Error during Google sign-in:", error);
        });
  }
    
  // Expose signInWithGoogle globally.
  window.signInWithGoogle = signInWithGoogle;
  
  // Function to sign out.
  function signOut() {
      firebase.auth().signOut().then(() => {
          console.log("User signed out");
          updateAuthUI(null);
      }).catch((error) => {
          console.error("Sign out error:", error);
      });
  }
  window.signOut = signOut;
  