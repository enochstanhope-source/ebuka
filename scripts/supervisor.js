// Supervisor page functionality
document.addEventListener('DOMContentLoaded', () => {
    const updatesList = document.getElementById('supervisorUpdates');
    const emailButton = document.querySelector('.email-button');

    // Sample updates data (in practice, this would come from a server)
    const updates = [
        {
            date: '2025-09-26',
            message: 'Project review meeting scheduled for next week. Please prepare your progress report.'
        },
        {
            date: '2025-09-24',
            message: 'New research materials uploaded to the shared drive.'
        },
        {
            date: '2025-09-22',
            message: 'Office hours changed to 2-4 PM on Wednesdays.'
        }
    ];

    // Display updates
    displayUpdates(updates);

    // Supervisor assignment and WhatsApp message handling
    // List of available supervisors (update phone numbers as needed)
    const supervisors = [
        { id: 'a', name: 'Uchenna Johnson', phone: '2349162919586' },
        { id: 'b', name: 'Chukwudi ahamefula', phone: '2349162919586' },
        { id: 'c', name: 'Obinna uba', phone: '2349162919586' },
        { id: 'd', name: 'Oladepo sayid', phone: '2349162919586' },
        { id: 'e', name: 'Effiong adaemideji', phone: '2349162919586' }
    ];

    const waButton = document.querySelector('.whatsapp-button');
    const supervisorNameEl = document.querySelector('.supervisor-details h2');
    const departmentEl = document.querySelector('.department');
    const supervisorPhotoEl = document.getElementById('supervisorPhoto');

    // Initialize supervisor for current visitor or user
    async function initSupervisorFor(user) {
        const uid = user && user.uid ? user.uid : null;

        // Try to read assigned supervisor (per-user when signed-in)
        let assigned = null;
        try {
            if (uid) assigned = localStorage.getItem(`assignedSupervisor_${uid}`) || null;
            else assigned = localStorage.getItem('assignedSupervisor') || null;
        } catch (e) { assigned = null; }

        // If Firebase user and Firestore has a supervisor field, prefer it
        if (!assigned && uid && typeof firebase !== 'undefined' && firebase.firestore) {
            try {
                const doc = await firebase.firestore().collection('users').doc(uid).get();
                if (doc && doc.exists) {
                    const data = doc.data() || {};
                    if (data.supervisor) assigned = data.supervisor;
                }
            } catch (e) { /* ignore */ }
        }

        // If not assigned, pick one randomly and persist
        if (!assigned) {
            const pick = supervisors[Math.floor(Math.random() * supervisors.length)];
            assigned = pick.id;
            try {
                if (uid) localStorage.setItem(`assignedSupervisor_${uid}`, assigned);
                else localStorage.setItem('assignedSupervisor', assigned);
            } catch (e) { /* ignore */ }
            // Also write to Firestore users/{uid}.supervisor when available
            if (uid && typeof firebase !== 'undefined' && firebase.firestore) {
                try { firebase.firestore().collection('users').doc(uid).set({ supervisor: assigned }, { merge: true }).catch(() => {}); } catch (e) {}
            }
        }

        // Find supervisor object
        const supObj = supervisors.find(s => s.id === assigned) || supervisors[0];
        renderSupervisor(supObj, user);
    }

    // Render supervisor info and wire whatsapp link
    function renderSupervisor(supervisor, user) {
        if (supervisorNameEl) supervisorNameEl.textContent = supervisor.name || '---';

        // Set supervisor photo based on supervisor id (a->sup1.jpg, b->sup2.jpg, ...)
        try {
            if (supervisorPhotoEl) {
                const idMap = { a: 'sup4.jpg', b: 'sup2.jpg', c: 'sup3.jpg', d: 'sup1.jpg', e: 'sup5.jpg' };
                const fileName = idMap[supervisor.id] || 'nophoto.jpg';
                // Use relative path from pages/ to images folder
                supervisorPhotoEl.setAttribute('src', `../images/${fileName}`);
                supervisorPhotoEl.setAttribute('alt', `${supervisor.name || 'Supervisor'} Photo`);
            }
        } catch (e) { /* ignore image errors */ }

        // Build message using available profile fields (prefer firebase displayName/firestore/localStorage)
        let displayName = '';
        let regNo = '';

        if (user) displayName = user.displayName || '';
        // Try Firestore fallback for name/reg synchronously via get (async may have already run above)
        try { displayName = displayName || localStorage.getItem('profileName') || ''; } catch (e) { displayName = displayName || ''; }
        try { regNo = localStorage.getItem(`profileReg_${user ? user.uid : 'anon'}`) || localStorage.getItem('profileReg') || ''; } catch (e) { regNo = regNo || ''; }

        // Build the message
        const deptText = (departmentEl && departmentEl.textContent) ? departmentEl.textContent.trim() : 'Computer Science';
        const sessionText = 'ND2 (Morning)';
        const message = `Good day Sir,\n\nMy name is ${displayName || '[Your Name]'}\nReg. No: ${regNo || '[Your Reg No]'}\nDepartment: ${deptText} ${sessionText}\n\nI am one of your project students. I would like to kindly introduce myself and seek your guidance concerning my project.`;

        // If name or reg missing, clicking should ask user to complete profile
        const waHref = `https://wa.me/${supervisor.phone}?text=${encodeURIComponent(message)}`;
        if (waButton) {
            waButton.setAttribute('href', waHref);
            waButton.setAttribute('target', '_blank');
            waButton.addEventListener('click', (e) => {
                const hasName = displayName && displayName.trim().length > 0;
                const hasReg = regNo && regNo.trim().length > 0 && regNo.indexOf('[') === -1;
                if (!hasName || !hasReg) {
                    e.preventDefault();
                    alert('Please sign in or complete your profile (name and registration number) before contacting your supervisor.');
                    // redirect to student portal to complete profile
                    window.location.href = '../pages/student-portal.html'.replace(/pages\/pages/, 'pages');
                }
            }, { once: false });
        }
    }

    // Kick off supervisor assignment: if Firebase auth exists, wait for auth state to avoid mixing user data
    if (typeof firebase !== 'undefined' && firebase.auth) {
        const currentUser = firebase.auth().currentUser;
        if (currentUser) initSupervisorFor(currentUser); else firebase.auth().onAuthStateChanged(user => initSupervisorFor(user));
    } else {
        // No firebase available: use anonymous assignment persisted in localStorage
        initSupervisorFor(null);
    }

    // Handle email button click
    emailButton.addEventListener('click', () => {
        window.location.href = 'mailto:supervisor@fpno.edu.ng?subject=Student%20Query%20-%2023/0100/1/CS';
    });

    function displayUpdates(updates) {
        updatesList.innerHTML = updates.map(update => `
            <div class="update-item">
                <div class="update-date">${formatDate(update.date)}</div>
                <div class="update-message">${update.message}</div>
            </div>
        `).join('');
    }

    function formatDate(dateStr) {
        const options = { year: 'numeric', month: 'long', day: 'numeric' };
        return new Date(dateStr).toLocaleDateString('en-US', options);
    }

    // In a real app, you'd set up real-time updates using Firebase
    // Here's a placeholder for that functionality
    function setupRealtimeUpdates() {
        // Firebase real-time updates would go here
        // firebase.database().ref('supervisorUpdates').on('value', (snapshot) => {
        //     const updates = snapshot.val();
        //     displayUpdates(updates);
        // });
    }
});
