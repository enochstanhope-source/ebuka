// Student Portal functionality
document.addEventListener('DOMContentLoaded', () => {
    const profileForm = document.getElementById('profileForm');
    const changePhotoBtn = document.getElementById('changePhoto');
    const profilePhotoImg = document.getElementById('profilePhoto');
    const regNoInput = document.getElementById('regNo');

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
                // try to read reg from Firestore users/{uid}
                if (firebase.firestore) {
                    try {
                        firebase.firestore().collection('users').doc(user.uid).get().then(doc => {
                            if (doc && doc.exists) {
                                const data = doc.data() || {};
                                if (data.reg && regNoInput) regNoInput.value = data.reg;
                                if (data.photo && profilePhotoImg) profilePhotoImg.src = data.photo;
                            }
                        }).catch(() => {});
                    } catch (e) {}
                }
                // also prefer firebase user photoURL if set
                if (user.photoURL && profilePhotoImg) profilePhotoImg.src = user.photoURL;
            }
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
    }

    function saveProfileData() {
        const phone = document.getElementById('phone').value;
        const dob = document.getElementById('dob').value;

        // If signed-in user, save under per-user keys; otherwise use generic keys
        const fbUser = (typeof firebase !== 'undefined' && firebase.auth) ? firebase.auth().currentUser : null;
        const phoneKey = fbUser ? `studentPhone_${fbUser.uid}` : 'studentPhone';
        const dobKey = fbUser ? `studentDob_${fbUser.uid}` : 'studentDob';

        if (phone && phone.trim() !== '') localStorage.setItem(phoneKey, phone); else localStorage.removeItem(phoneKey);
        if (dob && dob.trim() !== '') localStorage.setItem(dobKey, dob); else localStorage.removeItem(dobKey);

        // Optionally, if signed-in and Firestore available, write the fields to users/{uid}
        if (fbUser && typeof firebase !== 'undefined' && firebase.firestore) {
            try {
                const payload = {};
                if (phone && phone.trim() !== '') payload.phone = phone;
                if (dob && dob.trim() !== '') payload.dob = dob;
                if (Object.keys(payload).length) firebase.firestore().collection('users').doc(fbUser.uid).set(payload, { merge: true }).catch(() => {});
            } catch (e) {}
        }

        showToast('Profile updated successfully!');
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