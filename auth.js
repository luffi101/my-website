document.addEventListener("DOMContentLoaded", function() {
    // Function to update the authentication UI.
    function updateAuthUI(user) {
      const authInfo = document.getElementById("auth-info");
      const centerLogin = document.getElementById("center-login");
      
      if (authInfo) {
        if (user) {
          authInfo.innerHTML = `<span>Welcome, ${user.displayName}</span>
                                <button id="logout-button">Logout</button>`;
          document.getElementById("logout-button").addEventListener("click", signOut);
        } else {
          authInfo.innerHTML = `<span>Not logged in</span>`;
        }
      }
      // If there's a central login button, hide it when logged in, show when not.
      if (centerLogin) {
        centerLogin.style.display = user ? "none" : "block";
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
  });
  