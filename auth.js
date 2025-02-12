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
      // Toggle central login button on index page.
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
        // Force account selection prompt every time.
        provider.setCustomParameters({ prompt: 'select_account' });
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
        firebase.auth().signOut()
          .then(() => {
              console.log("User signed out");
              updateAuthUI(null);
              // If on journal.html, redirect to index.html.
              if (window.location.pathname.indexOf("journal.html") !== -1) {
                  window.location.href = "index.html";
              }
          })
          .catch((error) => {
              console.error("Sign out error:", error);
          });
    }
    window.signOut = signOut;
  });
  