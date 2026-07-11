import { auth } from "./firebase-config.js";
import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

document.addEventListener("DOMContentLoaded", () => {
  console.log('DOMContentLoaded fired in auth.js');

  // Listen for auth status changes
  onAuthStateChanged(auth, (user) => {
    if (user) {
      console.log("User logged in:", user.email);
      // Call the setupUI function from HTML to manage the full UI
      if (window.setupUI) {
        window.setupUI(user);
      }
    } else {
      console.log("User logged out");
      if (window.setupUI) {
        window.setupUI(null);
      }
    }
  });

  // Login
  const loginForm = document.querySelector('#login-form');
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = loginForm['input-email'].value;
      const password = loginForm['input-password'].value;
      try {
        await signInWithEmailAndPassword(auth, email, password);
        loginForm.reset();
        console.log("Logged in:", email);
      } catch (error) {
        const errorMsg = document.getElementById("error-message");
        if (errorMsg) {
          errorMsg.innerHTML = error.message;
          errorMsg.classList.add('show');
        }
        console.error("Login error:", error.message);
      }
    });
  }

  // Logout
  const logoutLink = document.querySelector('#logout-link');
  if (logoutLink) {
    logoutLink.addEventListener('click', async (e) => {
      e.preventDefault();
      try {
        await signOut(auth);
        console.log("User signed out");
      } catch (error) {
        console.error("Logout error:", error.message);
      }
    });
  }
});