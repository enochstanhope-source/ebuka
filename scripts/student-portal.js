// Student Portal functionality
document.addEventListener('DOMContentLoaded', () => {
    const profileForm = document.getElementById('profileForm');
    const changePhotoBtn = document.getElementById('changePhoto');
    const profilePhotoImg = document.getElementById('profilePhoto');
    const regNoInput = document.getElementById('regNo');
        const fullNameInput = document.getElementById('fullName');
        const emailInput = document.getElementById('email');

    // Load saved profile data (per-user if signed in)
    // If firebase auth is available and user is signed in, load per-user keys
    if (typeof firebase !== 'undefined' && firebase.auth) {
        const fbUser = firebase.auth().currentUser;
        if (fbUser) {
            loadProfileData(fbUser.uid);
        } else {
            // wait for onAuthStateChanged before loading to avoid mixing another user's data
            firebase.auth().onAuthStateChanged(user => {
                loadProfileData(user ? user.uid : null);
            });
        }
    } else {
        // No firebase: use generic storage keys
        loadProfileData(null);
    }

    // If Firebase auth is present, also try to populate reg number and photo from Firestore/user profile
    if (typeof firebase !== 'undefined' && firebase.auth) {
        firebase.auth().onAuthStateChanged(user => {
            if (user) {
                // Prefer Firestore user doc for authoritative data
                if (firebase.firestore) {
                    try {
                        firebase.firestore().collection('users').doc(user.uid).get().then(doc => {
                            const data = (doc && doc.exists) ? (doc.data() || {}) : {};
                            // Prefer fields from Firestore, otherwise fall back to firebase.auth() fields
                            if (fullNameInput) fullNameInput.value = data.name || data.displayName || user.displayName || localStorage.getItem(`profileName_${user.uid}`) || '';
                            if (emailInput) emailInput.value = data.email || user.email || localStorage.getItem(`profileEmail_${user.uid}`) || '';
                            if (regNoInput) regNoInput.value = data.reg || localStorage.getItem(`profileReg_${user.uid}`) || '';
                            if (data.photo && profilePhotoImg) profilePhotoImg.src = data.photo;
                            else if (user.photoURL && profilePhotoImg) profilePhotoImg.src = user.photoURL;
                        }).catch(() => {
                            // Firestore read failed — fall back to auth fields
                            if (fullNameInput) fullNameInput.value = user.displayName || localStorage.getItem(`profileName_${user.uid}`) || '';
                            if (emailInput) emailInput.value = user.email || localStorage.getItem(`profileEmail_${user.uid}`) || '';
                            if (regNoInput) regNoInput.value = localStorage.getItem(`profileReg_${user.uid}`) || '';
                            if (user.photoURL && profilePhotoImg) profilePhotoImg.src = user.photoURL;
                        });
                    } catch (e) {
                        if (fullNameInput) fullNameInput.value = user.displayName || localStorage.getItem(`profileName_${user.uid}`) || '';
                        if (emailInput) emailInput.value = user.email || localStorage.getItem(`profileEmail_${user.uid}`) || '';
                        if (regNoInput) regNoInput.value = localStorage.getItem(`profileReg_${user.uid}`) || '';
                        if (user.photoURL && profilePhotoImg) profilePhotoImg.src = user.photoURL;
                    }
                } else {
                    // No Firestore: use auth fields then localStorage
                    if (fullNameInput) fullNameInput.value = user.displayName || localStorage.getItem(`profileName_${user.uid}`) || '';
                    if (emailInput) emailInput.value = user.email || localStorage.getItem(`profileEmail_${user.uid}`) || '';
                    if (regNoInput) regNoInput.value = localStorage.getItem(`profileReg_${user.uid}`) || '';
                    if (user.photoURL && profilePhotoImg) profilePhotoImg.src = user.photoURL;
                }
            } else {
                // Not signed in: clear fields
                if (fullNameInput) fullNameInput.value = '';
                if (emailInput) emailInput.value = '';
                if (regNoInput) regNoInput.value = '';
            }
        });
    } else {
        // No firebase: try localStorage generic keys
        document.addEventListener('DOMContentLoaded', () => {
            if (fullNameInput) fullNameInput.value = localStorage.getItem('profileName') || '';
            if (emailInput) emailInput.value = localStorage.getItem('profileEmail') || '';
            if (regNoInput) regNoInput.value = localStorage.getItem('profileReg') || '';
            if (localStorage.getItem('studentProfilePhoto') && profilePhotoImg) profilePhotoImg.src = localStorage.getItem('studentProfilePhoto');
        });
    }

    // Handle form submission
    profileForm.addEventListener('submit', (e) => {
        e.preventDefault();
        saveProfileData();
    });

    // Handle photo change
    changePhotoBtn.addEventListener('click', () => {
        // Create a file input
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (ev) => {
                    // Update the image preview immediately
                    const dataUrl = ev.target.result;
                    profilePhotoImg.src = dataUrl;

                    // If Firebase Storage available and user signed-in, upload and save URL to Firestore
                    const currentUser = (typeof firebase !== 'undefined' && firebase.auth && firebase.auth().currentUser) ? firebase.auth().currentUser : null;
                    if (currentUser && typeof firebase !== 'undefined' && firebase.storage) {
                        try {
                            const storageRef = firebase.storage().ref();
                            const ext = file.name.split('.').pop() || 'jpg';
                            const photoRef = storageRef.child(`profilePhotos/${currentUser.uid}.${ext}`);
                            // upload the raw file (not the dataURL)
                            photoRef.put(file).then(snapshot => {
                                return snapshot.ref.getDownloadURL();
                            }).then(downloadURL => {
                                // Save download URL to Firestore user doc and localStorage (per-user key)
                                if (firebase.firestore) {
                                    firebase.firestore().collection('users').doc(currentUser.uid).set({ photo: downloadURL }, { merge: true }).catch(() => {});
                                }
                                try {
                                    const photoKeyToUse = currentUser ? `studentProfilePhoto_${currentUser.uid}` : 'studentProfilePhoto';
                                    localStorage.setItem(photoKeyToUse, downloadURL);
                                } catch(e) {}
                                // also update profile photoURL if possible
                                if (currentUser.updateProfile) currentUser.updateProfile({ photoURL: downloadURL }).catch(() => {});
                            }).catch(() => {
                                // fallback: save dataURL locally (per-user key when possible)
                                try {
                                    const photoKeyToUse = currentUser ? `studentProfilePhoto_${currentUser.uid}` : 'studentProfilePhoto';
                                    localStorage.setItem(photoKeyToUse, dataUrl);
                                } catch(e) {}
                            });
                        } catch (err) {
                            try {
                                const photoKeyToUse = currentUser ? `studentProfilePhoto_${currentUser.uid}` : 'studentProfilePhoto';
                                localStorage.setItem(photoKeyToUse, dataUrl);
                            } catch(e) {}
                        }
                    } else {
                        // fallback: save image data to localStorage (no firebase user)
                        try { localStorage.setItem('studentProfilePhoto', dataUrl); } catch(e) {}
                    }
                };
                reader.readAsDataURL(file);
            }
        };
        
        input.click();
    });

    function loadProfileData(uid) {
        // uid - if provided, read per-user keys; otherwise read generic keys
        const phoneKey = uid ? `studentPhone_${uid}` : 'studentPhone';
        const dobKey = uid ? `studentDob_${uid}` : 'studentDob';
        const photoKey = uid ? `studentProfilePhoto_${uid}` : 'studentProfilePhoto'; // photo is per-user when signed in
        const regKey = 'profileReg'; // reg may come from sign-up and Firestore

    const savedPhoto = localStorage.getItem(photoKey);
    // reg is stored per-user when possible; do NOT fall back to a global profileReg for signed-in users
    let savedReg = null;
    if (uid) savedReg = localStorage.getItem(`${regKey}_${uid}`) || null;

        // If uid is provided, populate per-user phone/dob; otherwise leave them blank
        if (uid) {
            const savedPhone = localStorage.getItem(phoneKey);
            const savedDob = localStorage.getItem(dobKey);
            if (savedPhone) document.getElementById('phone').value = savedPhone; else document.getElementById('phone').value = '';
            if (savedDob) document.getElementById('dob').value = savedDob; else document.getElementById('dob').value = '';
        } else {
            // Ensure blank for new visitors (avoid showing another user's saved info)
            document.getElementById('phone').value = '';
            document.getElementById('dob').value = '';
        }

        if (savedPhoto) profilePhotoImg.src = savedPhoto;
        if (uid) {
            if (savedReg && regNoInput) regNoInput.value = savedReg; else if (regNoInput) regNoInput.value = '';
        } else {
            // keep registration blank for anonymous/new visitors
            if (regNoInput) regNoInput.value = '';
        }
            // try to populate fullName and email from localStorage fallback
            const nameKey = `profileName_${uid}`;
            const emailKey = `profileEmail_${uid}`;
            if (fullNameInput) fullNameInput.value = localStorage.getItem(nameKey) || '';
            if (emailInput) emailInput.value = localStorage.getItem(emailKey) || '';
    }

    function saveProfileData() {
            // Fields are read-only and managed by registration. Inform the user.
            showToast('Profile fields are managed during registration and cannot be edited here.');
    }

    function showToast(message) {
        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.textContent = message;
        document.body.appendChild(toast);

        setTimeout(() => {
            toast.remove();
        }, 3000);
    }
});