// Login logic (uses global firebase initialized in scripts/firebase-init.js)
const authAvailable = (typeof firebase !== 'undefined' && firebase.auth);
if (authAvailable) {
	firebase.auth().onAuthStateChanged((user) => {
		if (user) {
			console.log('User is signed in:', user.email);
			// Don't auto-redirect if we're already on the login page — allow user to stay and sign out if needed
			const path = (window.location.pathname || '').toLowerCase();
			if (!/login\.html$/.test(path) && !/signup\.html$/.test(path)) {
				window.location.href = 'index.html';
			}
		}
	});
}

// Login logic
document.addEventListener('DOMContentLoaded', function() {
	const loginForm = document.getElementById('loginForm');

	function showTransition(text) {
	  if (window.uiTransitions && typeof window.uiTransitions.showOverlay === 'function') {
	    window.uiTransitions.showOverlay(text || 'Signing in...');
	  }
	}

	function hideTransition() {
	  if (window.uiTransitions && typeof window.uiTransitions.hideOverlay === 'function') {
	    window.uiTransitions.hideOverlay();
	  }
	}

	if (loginForm) {
		loginForm.addEventListener('submit', function(e) {
			e.preventDefault();
			const email = document.getElementById('email').value;
			const password = document.getElementById('password').value;
			
						showTransition('Signing in...');

						if (!authAvailable) {
							// local fallback: set logged-in flag and redirect
							localStorage.setItem('isLoggedIn', '1');
							setTimeout(() => {
								hideTransition();
								window.location.href = 'index.html';
							}, 900);
							return;
						}

						firebase.auth().signInWithEmailAndPassword(email, password)
								.then((userCredential) => {
										// give a short delay so the overlay is visible
										setTimeout(() => {
											hideTransition();
											window.location.href = 'index.html';
										}, 700);
								})
								.catch((error) => {
										hideTransition();
										alert(error.message);
								});
		});
	}
});
