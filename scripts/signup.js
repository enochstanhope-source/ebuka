// Signup logic (uses global firebase initialized in scripts/firebase-init.js)
const authAvailable = (typeof firebase !== 'undefined' && firebase.auth);
if (authAvailable) {
	firebase.auth().onAuthStateChanged((user) => {
		if (user) {
			console.log('User is signed in:', user.email);
			// Avoid auto-redirect when on auth pages
			const path = (window.location.pathname || '').toLowerCase();
			if (!/signup\.html$/.test(path) && !/login\.html$/.test(path)) {
				window.location.href = 'index.html';
			}
		}
	});
}

// Signup logic
document.addEventListener('DOMContentLoaded', function() {
	const signupForm = document.getElementById('signupForm');

	// Uppercase reg-number as user types (normalize letters)
	const regInput = document.getElementById('reg-number');
	if (regInput) {
		regInput.addEventListener('input', function() {
			// Keep slashes, digits, letters; uppercase letters
			this.value = this.value.replace(/[^a-zA-Z0-9\/]/g, '');
			this.value = this.value.toUpperCase();
		});
	}

	if (signupForm) {
			signupForm.addEventListener('submit', function(e) {
				e.preventDefault();
				// Validate reg-number format if provided
				const regEl = document.getElementById('reg-number');
				let regVal = regEl && regEl.value ? regEl.value.trim().toUpperCase() : '';
				if (regVal) {
					// expected pattern: XX/NNNN/AA or similar (slashes required)
					// we allow variable width for middle number but enforce numeric ranges below
					const parts = regVal.split('/');
					if (parts.length !== 3) {
						alert('Registration number must be in the form XX/NNNN/AA (e.g. 23/0001/CS)');
						return;
					}
					const p1 = parts[0];
					const p2 = parts[1];
					const p3 = parts[2];
					// part1 must be numeric 10-99
					if (!/^[0-9]{2}$/.test(p1)) { alert('First part of registration must be two digits (10-99).'); return; }
					const p1num = parseInt(p1, 10);
					if (p1num < 10 || p1num > 99) { alert('First part of registration must be between 10 and 99.'); return; }
					// part2 numeric 1-1000 (allow leading zeros)
					if (!/^[0-9]{1,4}$/.test(p2)) { alert('Middle part of registration must be numeric (1-1000).'); return; }
					const p2num = parseInt(p2, 10);
					if (p2num < 1 || p2num > 1000) { alert('Middle part of registration must be between 1 and 1000.'); return; }
					// part3 must be two letters A-Z
					if (!/^[A-Z]{2}$/.test(p3)) { alert('Last part of registration must be two letters (A-Z). Example: CS'); return; }
					// normalize stored format: pad middle to 4 digits with leading zeros
					const p2pad = String(p2num).padStart(4, '0');
					regVal = `${p1}/${p2pad}/${p3}`;
					// write back normalized value
					if (regEl) regEl.value = regVal;
				}
				const email = document.getElementById('email').value;
				const password = document.getElementById('password').value;
				const confirmPassword = document.getElementById('confirm-password').value;
				if (password !== confirmPassword) {
					alert('Passwords do not match!');
					return;
				}
					// Show loader modal
					if (typeof showSignupLoader === 'function') showSignupLoader();
					if (!authAvailable) {
						// Local fallback: save profile to localStorage and mark logged in, then redirect
						const name = (document.getElementById('username') && document.getElementById('username').value) ? document.getElementById('username').value.trim() : '';
						const reg = (document.getElementById('reg-number') && document.getElementById('reg-number').value) ? document.getElementById('reg-number').value.trim() : '';
						try {
							localStorage.setItem('profileName', name);
							localStorage.setItem('profileReg', reg);
							localStorage.setItem('isLoggedIn', '1');
						} catch (e) { /* ignore storage errors */ }
						if (typeof hideSignupLoader === 'function') hideSignupLoader();
						// show a small feedback toast then redirect
						const t = document.createElement('div');
						t.className = 'signup-toast';
						t.textContent = 'Account created — redirecting...';
						t.style.position = 'fixed';
						t.style.left = '50%';
						t.style.bottom = '28px';
						t.style.transform = 'translateX(-50%)';
						t.style.background = 'rgba(0,0,0,0.8)';
						t.style.color = '#fff';
						t.style.padding = '10px 16px';
						t.style.borderRadius = '8px';
						t.style.zIndex = '99999';
						document.body.appendChild(t);
						setTimeout(() => { t.remove(); window.location.href = 'index.html'; }, 900);
						return;
					}
				firebase.auth().createUserWithEmailAndPassword(email, password)
					.then((userCredential) => {
						// Hide loader modal
						if (typeof hideSignupLoader === 'function') hideSignupLoader();

						// Save display name and registration number so the main UI can show them
						const name = (document.getElementById('username') && document.getElementById('username').value) ? document.getElementById('username').value.trim() : '';
						const reg = (document.getElementById('reg-number') && document.getElementById('reg-number').value) ? document.getElementById('reg-number').value.trim() : '';
						try {
							localStorage.setItem('profileName', name);
							localStorage.setItem('profileReg', reg);
							// mark logged in for local fallback
							localStorage.setItem('isLoggedIn', '1');
						} catch (e) { /* ignore storage errors */ }

						// If Firebase auth is available, update the user's profile and optionally write to Firestore
						const signedUser = (userCredential && userCredential.user) || (typeof firebase !== 'undefined' && firebase.auth && firebase.auth().currentUser);
						if (signedUser && typeof firebase !== 'undefined' && firebase.auth) {
							if (name && signedUser.updateProfile) {
								signedUser.updateProfile({ displayName: name }).catch(() => {});
							}
							if (typeof firebase.firestore !== 'undefined') {
								try {
									firebase.firestore().collection('users').doc(signedUser.uid).set({ name: name || null, reg: reg || null, email: signedUser.email || null }, { merge: true }).catch(() => {});
								} catch (e) { /* ignore */ }
							}
						}

						// Create a small feedback toast and redirect to index quickly
						if (typeof hideSignupLoader === 'function') hideSignupLoader();
						const toast = document.createElement('div');
						toast.className = 'signup-toast';
						toast.textContent = 'Account created — redirecting...';
						toast.style.position = 'fixed';
						toast.style.left = '50%';
						toast.style.bottom = '28px';
						toast.style.transform = 'translateX(-50%)';
						toast.style.background = 'rgba(0,0,0,0.85)';
						toast.style.color = '#fff';
						toast.style.padding = '10px 16px';
						toast.style.borderRadius = '8px';
						toast.style.zIndex = '99999';
						document.body.appendChild(toast);
						setTimeout(() => { toast.remove(); window.location.href = 'index.html'; }, 900);
								})
								.catch((error) => {
										alert(error.message);
								});
		});
	}
});
