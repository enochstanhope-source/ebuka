// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyA9-SeBMqujxMleatSd23FM5vlLWdOVUPA",
  authDomain: "grandpa-523e1.firebaseapp.com",
  projectId: "grandpa-523e1",
  storageBucket: "grandpa-523e1.firebasestorage.app",
  messagingSenderId: "1049062266843",
  appId: "1:1049062266843:web:6f8b23c5a1f20a7836f9fe"
};

// Initialize Firebase (guard against missing SDK)
if (typeof firebase === 'undefined') {
  console.warn('Firebase SDK not found. Make sure you included firebase-app-compat.js and other compat SDKs before this script.');
} else {
  if (!firebase.apps || !firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
  }

  // Add auth state observer
  if (firebase.auth) {
    firebase.auth().onAuthStateChanged((user) => {
      if (user) {
        console.log('User is signed in:', user.email);
        // restore any guest-disabled links if needed
        restoreGuestTiles();
      } else {
        console.log('User is signed out');
      }
    });
  }
}

// Helper: simulate quick sign-in using email/password (for demo/testing only)
function signInDemo(email, password) {
  if (!firebase || !firebase.auth) return Promise.reject(new Error('Firebase Auth not available'));
  return firebase.auth().signInWithEmailAndPassword(email, password);
}

function signOutDemo() {
  if (!firebase || !firebase.auth) return Promise.reject(new Error('Firebase Auth not available'));
  return firebase.auth().signOut();
}

// Helper: restore tiles' href attributes from data-orighref (used after login)
function restoreGuestTiles() {
  document.querySelectorAll('.tab-icons .tile, .campus-grid .campus-tile').forEach(el => {
    if (el.dataset && el.dataset.orighref && el.tagName.toLowerCase() === 'a') {
      el.setAttribute('href', el.dataset.orighref);
      delete el.dataset.orighref;
      el.classList.remove('disabled-tile');
      const note = el.querySelector('.tile-note'); if (note) note.remove();
    }
  });
}

// Expose helpers for other scripts (attach to window for global access)
window.firebaseHelpers = {
  signInDemo,
  signOutDemo,
  restoreGuestTiles
};
