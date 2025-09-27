// Student Portal functionality (clean, single-file)
document.addEventListener('DOMContentLoaded', function() {
    // DOM elements
    const profilePhotoImg = document.getElementById('profilePhoto');
    const photoInput = document.getElementById('photoInput');
    const studentNameElement = document.getElementById('studentName');
    const regNumberElement = document.getElementById('regNumber');
    const studentEmailElement = document.getElementById('studentEmail');

    function showToast(msg) {
        const existing = document.querySelector('.toast'); if (existing) existing.remove();
        const t = document.createElement('div'); t.className = 'toast'; t.textContent = msg; document.body.appendChild(t);
        setTimeout(() => t.remove(), 3000);
    }

    // debug panel helper
    function debug(msg, show) {
        try {
            const el = document.getElementById('portalDebug');
            if (!el) return;
            el.style.display = show ? 'block' : 'none';
            el.textContent = msg;
            console.log('[portal-debug]', msg);
        } catch (e) {}
    }

    // Populate UI from a data object (safe setter)
    function populateUI(data, authUser) {
        if (!studentNameElement || !regNumberElement || !studentEmailElement || !profilePhotoImg) return;
        studentNameElement.textContent = (data && (data.name || data.displayName)) || (authUser && authUser.displayName) || localStorage.getItem('profileName') || 'Not set';
        regNumberElement.textContent = (data && (data.reg || data.regNumber)) || localStorage.getItem('profileReg') || 'Not set';
        studentEmailElement.textContent = (data && data.email) || (authUser && authUser.email) || localStorage.getItem('profileEmail') || 'Not set';

        // photo priority: firestore photo/photoURL -> auth.photoURL -> localStorage -> default image
        const photo = (data && (data.photo || data.photoURL)) || (authUser && authUser.photoURL) || localStorage.getItem('studentProfilePhoto');
        profilePhotoImg.src = photo || '../images/nophoto.jpg';
    }

    // Fallback when firebase isn't available: read from localStorage
    function populateFromLocal() {
        const data = {
            name: localStorage.getItem('profileName') || null,
            reg: localStorage.getItem('profileReg') || null,
            email: localStorage.getItem('profileEmail') || null,
            photo: localStorage.getItem('studentProfilePhoto') || null
        };
        populateUI(data, null);
    }

    // Main load: populate from local immediately so UI isn't stuck on "Loading..."
    populateFromLocal();

    // If Firebase not available, show debug and stop
    if (typeof firebase === 'undefined' || !firebase.auth) {
        debug('Firebase SDK not found - using local data', true);
        return;
    }

    // Firebase is available — wait for auth
    firebase.auth().onAuthStateChanged(function(user) {
        if (!user) {
            debug('No authenticated user - redirecting to login', true);
            // not signed in — redirect to login
            window.location.href = '../login.html';
            return;
        }
        debug('Authenticated user: ' + (user.email || user.uid), true);

        // Try to read Firestore user doc (signup writes fields: name, reg, email)
        if (firebase.firestore) {
            firebase.firestore().collection('users').doc(user.uid).get()
                .then(function(doc) {
                    const data = (doc && doc.exists) ? doc.data() : null;
                    debug('Firestore doc loaded: ' + (doc && doc.exists ? 'exists' : 'missing'), true);
                    if (!data) {
                        // create minimal doc to keep normalization
                        firebase.firestore().collection('users').doc(user.uid).set({ name: user.displayName || null, email: user.email || null }, { merge: true }).catch(() => {});
                    }
                    populateUI(data, user);
                })
                .catch(function(err) {
                    console.error('Error reading user doc:', err);
                    debug('Error loading profile from server, using cached values', true);
                    showToast('Could not load profile from server — using cached values.');
                    populateFromLocal();
                });
        } else {
            debug('Firestore not available, using cached data', true);
            populateFromLocal();
        }
    });

    // Photo upload handler (works with Firebase Storage if present, otherwise saves dataURL to localStorage)
    if (photoInput) {
        photoInput.addEventListener('change', function(e) {
            const file = e.target.files && e.target.files[0];
            if (!file) return;

            // validation
            if (!file.type.startsWith('image/')) { showToast('Please choose an image file'); return; }
            if (file.size > 5 * 1024 * 1024) { showToast('Max file size is 5MB'); return; }

            // Read preview immediately
            const reader = new FileReader();
            reader.onload = function(ev) {
                profilePhotoImg.src = ev.target.result;
                // Save to Firebase Storage if available and user signed in
                const authUser = (firebase.auth && firebase.auth().currentUser) ? firebase.auth().currentUser : null;
                if (authUser && firebase.storage) {
                    const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
                    const storageRef = firebase.storage().ref();
                    const photoRef = storageRef.child(`profile-photos/${authUser.uid}.${ext}`);
                    showToast('Uploading photo...');
                    photoRef.put(file).then(function(snapshot) {
                        return snapshot.ref.getDownloadURL();
                    }).then(function(downloadURL) {
                        // write download URL to Firestore user doc (use field photoURL)
                        if (firebase.firestore) {
                            firebase.firestore().collection('users').doc(authUser.uid).update({ photoURL: downloadURL }).catch(() => {});
                        }
                        // update auth profile if possible
                        if (authUser.updateProfile) authUser.updateProfile({ photoURL: downloadURL }).catch(() => {});
                        // persist to localStorage as fallback cache
                        try { localStorage.setItem('studentProfilePhoto', downloadURL); } catch (e) {}
                        showToast('Photo uploaded');
                    }).catch(function(err) {
                        console.error('Upload failed:', err);
                        try { localStorage.setItem('studentProfilePhoto', ev.target.result); } catch(e) {}
                        showToast('Upload failed — saved locally');
                    });
                } else {
                    // no firebase/storage available — save dataURL locally
                    try { localStorage.setItem('studentProfilePhoto', ev.target.result); showToast('Saved photo locally'); } catch(e) { showToast('Could not save photo locally'); }
                }
            };
            reader.readAsDataURL(file);
        });
    }

    // Add small debug controls to the portalDebug panel (useful for testing)
    try {
        const dbg = document.getElementById('portalDebug');
        if (dbg) {
            const useLocalBtn = document.createElement('button');
            useLocalBtn.textContent = 'Use local data';
            useLocalBtn.style.marginRight = '6px'; useLocalBtn.style.padding = '6px'; useLocalBtn.style.fontSize = '12px';
            useLocalBtn.onclick = function() { populateFromLocal(); showToast('Loaded local data'); debug('Loaded local data', true); };

            const showLsBtn = document.createElement('button');
            showLsBtn.textContent = 'Show localStorage';
            showLsBtn.style.padding = '6px'; showLsBtn.style.fontSize = '12px';
            showLsBtn.onclick = function() {
                const keys = ['profileName','profileReg','profileEmail','isLoggedIn','studentProfilePhoto'];
                let out = '';
                keys.forEach(k => { out += k + ': ' + (localStorage.getItem(k) || '(empty)') + '\n'; });
                alert(out);
            };

            dbg.appendChild(useLocalBtn);
            dbg.appendChild(showLsBtn);
        }
    } catch (e) { console.error('Could not add debug controls', e); }

});