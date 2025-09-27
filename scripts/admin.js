// Project submission and admin controls (cleaned)
document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('projectForm');
  const preview = document.getElementById('projectPreview');
  const fileInput = document.getElementById('projectImage');
  const statusText = document.getElementById('statusText');
  const duplicateText = document.getElementById('duplicateText');
  const reasonText = document.getElementById('reasonText');
  const submitStatus = document.getElementById('submitStatus');

  const adminPanel = document.getElementById('adminPanel');
  const adminStatus = document.getElementById('adminStatus');
  const adminDuplicate = document.getElementById('adminDuplicate');
  const adminReason = document.getElementById('adminReason');
  const adminSave = document.getElementById('adminSave');
  const submitBtn = document.getElementById('submitProject');

  // Helper: current user id
  function currentUid() {
    try {
      if (typeof firebase !== 'undefined' && firebase.auth && firebase.auth().currentUser) {
        return firebase.auth().currentUser.uid;
      }
    } catch (e) { /* ignore */ }
    return null;
  }

  // Storage key (per-user if signed in)
  function storageKey() {
    const uid = currentUid();
    return uid ? `project_${uid}` : 'project_anon';
  }

  // Firestore collection name
  const COL = 'projectSubmissions';

  // Set status text in Title Case and apply class (accepted/rejected/pending)
  function setStatusText(status) {
    if (!statusText) return;
    const s = (status || 'pending').toString().toLowerCase();
    // Title Case
    const title = s.charAt(0).toUpperCase() + s.slice(1);
    statusText.textContent = title;
    statusText.classList.remove('pending', 'accepted', 'rejected');
    if (s === 'accepted') statusText.classList.add('accepted');
    else if (s === 'rejected') statusText.classList.add('rejected');
    else statusText.classList.add('pending');
  }

  // Modal helpers
  const whatsappModal = document.getElementById('whatsappModal');
  const modalClose = document.getElementById('modalClose');
  const modalOk = document.getElementById('modalOk');
  function showWhatsappModal(msg, status) {
    try {
      if (whatsappModal) {
        const m = document.getElementById('modalMsg');
        if (m) {
          m.textContent = msg || 'Your supervisor will message you on WhatsApp on the one picked.';
          m.classList.remove('accepted','rejected');
          if (status === 'accepted') m.classList.add('accepted');
          else if (status === 'rejected') m.classList.add('rejected');
        }
        whatsappModal.setAttribute('aria-hidden', 'false');
      }
    } catch (e) { console.error(e); }
  }
  function hideWhatsappModal() { if (whatsappModal) whatsappModal.setAttribute('aria-hidden', 'true'); }
  if (modalClose) modalClose.addEventListener('click', hideWhatsappModal);
  if (modalOk) modalOk.addEventListener('click', hideWhatsappModal);

  // Set reason text and color it according to status
  function setReasonText(reason, status) {
    if (!reasonText) return;
    const r = reason || '-';
    reasonText.textContent = r;
    reasonText.classList.remove('accepted', 'rejected', 'pending');
    const s = (status || '').toString().toLowerCase();
    if (s === 'accepted') reasonText.classList.add('accepted');
    else if (s === 'rejected') reasonText.classList.add('rejected');
    else reasonText.classList.add('pending');
  }

  // Set duplicate text and apply styling when duplicate is true
  function setDuplicateText(text, isDuplicate) {
    if (!duplicateText) return;
    duplicateText.textContent = text;
    duplicateText.classList.remove('duplicate', 'no-dup');
    if (isDuplicate) duplicateText.classList.add('duplicate');
    else duplicateText.classList.add('no-dup');
  }

  // Normalize topic string for comparison: lowercase, trim, remove punctuation
  function normalizeTopic(s) {
    if (!s) return '';
    return s
      .toLowerCase()
      .trim()
      .replace(/[\u2018\u2019\u201c\u201d]/g, "'")
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, ' ');
  }

  // Check for duplicates using Firestore (array-contains-any)
  async function checkDuplicateProject(topics) {
    if (typeof firebase === 'undefined' || !firebase.firestore) return false;
    try {
      const q = firebase.firestore().collection(COL).where('topics', 'array-contains-any', topics).limit(1);
      const snap = await q.get();
      return !snap.empty;
    } catch (e) {
      console.error('checkDuplicateProject error', e);
      return false;
    }
  }

  // Save a project doc to Firestore (doc id = uid when available)
  async function saveToFirebase(projectData) {
    if (typeof firebase === 'undefined' || !firebase.firestore) return false;
    const uid = currentUid();
    try {
      const ref = uid ? firebase.firestore().collection(COL).doc(uid) : firebase.firestore().collection(COL).doc();
      await ref.set({ ...projectData, updatedAt: firebase.firestore.FieldValue.serverTimestamp() }, { merge: true });
      return true;
    } catch (e) {
      console.error('saveToFirebase error', e);
      return false;
    }
  }

  // Load submission: try Firestore (if signed in) else localStorage
  async function loadSubmission() {
    try {
      const uid = currentUid();
      let obj = null;
      if (uid && typeof firebase !== 'undefined' && firebase.firestore) {
        const doc = await firebase.firestore().collection(COL).doc(uid).get();
        if (doc.exists) obj = doc.data();
      }
      if (!obj) {
        try { obj = JSON.parse(localStorage.getItem(storageKey()) || 'null'); } catch (e) { obj = null; }
      }

      if (obj) {
        document.getElementById('topic1').value = obj.topics ? (obj.topics[0] || '') : '';
        document.getElementById('topic2').value = obj.topics ? (obj.topics[1] || '') : '';
        document.getElementById('topic3').value = obj.topics ? (obj.topics[2] || '') : '';
        if (obj.image && preview) preview.src = obj.image;

        const loadedStatus = (obj.status || 'pending').toString().toLowerCase();
        setStatusText(loadedStatus);

  setDuplicateText(obj.duplicate ? 'Yes - Similar project exists' : 'No', !!obj.duplicate);
  setReasonText(obj.reason || '-', loadedStatus);
  // Show modal if already accepted or rejected
  if (loadedStatus === 'accepted') {
    showWhatsappModal(null, 'accepted');
  } else if (loadedStatus === 'rejected') {
    const msg = `Rejected project: ${obj.reason || 'No reason provided'}. Please choose another topic.`;
    showWhatsappModal(msg, 'rejected');
  }
      } else {
        // blank state
        if (statusText) { statusText.textContent = '-'; statusText.classList.remove('pending','accepted','rejected'); }
        duplicateText.textContent = '-';
        reasonText.textContent = '-';
      }
    } catch (e) {
      console.error('loadSubmission error', e);
    }
  }

  // Image preview handler
  if (fileInput) {
    fileInput.addEventListener('change', (ev) => {
      const f = ev.target.files && ev.target.files[0];
      if (!f || !preview) return;
      const reader = new FileReader();
      reader.onload = (e) => { preview.src = e.target.result; };
      reader.readAsDataURL(f);
    });
  }

  // Live validation: ensure all 3 topic inputs are filled before enabling submit
  function updateSubmitState() {
    try {
      const v1 = (document.getElementById('topic1') || {}).value || '';
      const v2 = (document.getElementById('topic2') || {}).value || '';
      const v3 = (document.getElementById('topic3') || {}).value || '';
      const enable = v1.trim() !== '' && v2.trim() !== '' && v3.trim() !== '';
      if (submitBtn) submitBtn.disabled = !enable;
    } catch (e) { /* ignore */ }
  }
  ['topic1','topic2','topic3'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('input', updateSubmitState);
  });
  // initialize state
  updateSubmitState();

  // Main submit handler (single)
  if (form) {
    form.addEventListener('submit', async (ev) => {
      ev.preventDefault();
      submitStatus.textContent = '';

      const t1 = (document.getElementById('topic1') || {}).value || '';
      const t2 = (document.getElementById('topic2') || {}).value || '';
      const t3 = (document.getElementById('topic3') || {}).value || '';
      const rawTopics = [t1.trim(), t2.trim(), t3.trim()].filter(Boolean);

      if (rawTopics.length < 1) {
        submitStatus.textContent = 'Please provide at least one topic.';
        return;
      }

      submitStatus.textContent = 'Submitting project...';

      // normalize topics for duplicate detection
      const normalized = rawTopics.map(normalizeTopic).filter(Boolean);
      const uniqueNormalized = Array.from(new Set(normalized));
      const hasInternalDuplicates = uniqueNormalized.length !== normalized.length;

      // Prepare image (if any)
      let imageData = null;
      if (preview && preview.src && !preview.src.includes('nophoto.jpg')) imageData = preview.src;

      // Try to upload file to Firebase Storage if available
      const uid = currentUid();
      if (uid && typeof firebase !== 'undefined' && firebase.storage && fileInput && fileInput.files && fileInput.files[0]) {
        try {
          const file = fileInput.files[0];
          const ext = (file.name.split('.').pop() || 'jpg');
          const ref = firebase.storage().ref().child(`projectSubmissions/${uid}_${Date.now()}.${ext}`);
          const snap = await ref.put(file);
          imageData = await snap.ref.getDownloadURL();
        } catch (e) { console.warn('image upload failed, using local preview', e); }
      }

      // Duplicate check (best-effort). Combine internal duplicate detection and Firestore check.
      const externalDuplicate = await (uniqueNormalized.length ? checkDuplicateProject(uniqueNormalized).catch(() => false) : false);

      // Internal duplicates (same title entered multiple times) are treated as Rejected.
      let statusForDoc = 'accepted';
      let isDup = false;
      let reason = '-';
      if (hasInternalDuplicates) {
        statusForDoc = 'rejected';
        isDup = true;
        reason = 'Duplicate topic titles detected in your submission. Please provide distinct topics.';
      } else if (externalDuplicate) {
        statusForDoc = 'pending';
        isDup = true;
        reason = 'Similar project topics found. Awaiting review.';
      }

      const doc = {
        topics: rawTopics,
        image: imageData,
        status: statusForDoc,
        duplicate: isDup,
        reason: reason,
        submittedAt: new Date().toISOString()
      };

      // Save to Firestore (if available)
      const saved = await saveToFirebase(doc).catch(() => false);

      // Always persist locally as fallback
      try { localStorage.setItem(storageKey(), JSON.stringify(doc)); } catch (e) { /* ignore */ }

  // Update UI immediately and then again after 10s
  setDuplicateText(doc.duplicate ? 'Yes - Similar project exists' : 'No', !!doc.duplicate);
  // If accepted and no explicit reason, show default valid message
  const displayReason = doc.status === 'accepted' && (!doc.reason || doc.reason === '-') ? 'Valid — not used before' : (doc.reason || '-');
  setReasonText(displayReason, doc.status);
      // Update status immediately
      setStatusText(doc.status);
      if (doc.status === 'accepted') {
        submitStatus.textContent = 'Project accepted';
        const icon = document.createElement('i');
        icon.className = 'fas fa-check-circle';
        icon.style.color = '#39c869';
        icon.style.marginLeft = '8px';
        submitStatus.appendChild(icon);
        // show whatsapp modal (green message)
        showWhatsappModal(null, 'accepted');
      } else if (doc.status === 'rejected') {
        // rejected on submit (rare) — show modal with reason
        const rejMsg = `Rejected project: ${doc.reason || 'No reason provided'}. Please choose another topic.`;
        // show whatsapp modal (red message)
        showWhatsappModal(rejMsg, 'rejected');
        submitStatus.textContent = 'Project rejected';
      } else {
        submitStatus.textContent = 'Project submitted for review.';
      }

      // Clear the temporary submit message after 10 seconds
      setTimeout(() => {
        try { submitStatus.textContent = ''; } catch (e) { /* ignore */ }
      }, 10000);
    });
  }

  // Admin UI toggle (query ?admin=1 or local flag)
  try {
    const isAdmin = (new URLSearchParams(window.location.search).get('admin') === '1') || !!localStorage.getItem('isAdmin');
    if (isAdmin && adminPanel) {
      adminPanel.style.display = 'block';
      try { localStorage.setItem('isAdmin','1'); } catch (e) {}
    }
  } catch (e) { /* ignore */ }

  // Admin save handler
  if (adminSave) {
    adminSave.addEventListener('click', async (ev) => {
      ev.preventDefault();
      const key = storageKey();
      let obj = {};
      try { obj = JSON.parse(localStorage.getItem(key) || '{}'); } catch (e) { obj = {}; }
  obj.status = adminStatus ? adminStatus.value : (obj.status || 'pending');
  obj.duplicate = adminDuplicate ? (adminDuplicate.value === 'yes') : (obj.duplicate || false);
  obj.reason = adminReason ? adminReason.value : (obj.reason || '');
      obj.updatedAt = new Date().toISOString();

      try { localStorage.setItem(key, JSON.stringify(obj)); } catch (e) {}
      try {
        const uid = currentUid();
        if (uid && typeof firebase !== 'undefined' && firebase.firestore) {
          await firebase.firestore().collection(COL).doc(uid).set(obj, { merge: true });
        }
      } catch (e) { console.error('admin save firebase error', e); }

  await loadSubmission();
      alert('Saved');
    });
  }

  // initial load
  loadSubmission();

  // If visitor is not admin, clear the form and visible state on page refresh to keep UI clean
  try {
    const pageAdmin = (new URLSearchParams(window.location.search).get('admin') === '1') || !!localStorage.getItem('isAdmin');
    if (!pageAdmin) {
      // clear inputs
      ['topic1','topic2','topic3'].forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
      // clear preview if present
      try { if (preview) { preview.src = ''; } } catch (e) {}
      // reset status/duplicate/reason display
      if (statusText) { statusText.textContent = '-'; statusText.classList.remove('pending','accepted','rejected'); }
      setDuplicateText('-', false);
      try { if (reasonText) { reasonText.textContent = '-'; reasonText.classList.remove('accepted','rejected','pending'); } } catch (e) {}
      // clear temporary status and hide modal
      try { if (submitStatus) submitStatus.textContent = ''; } catch (e) {}
      try { hideWhatsappModal(); } catch (e) {}
      // ensure submit button state is updated
      try { updateSubmitState(); } catch (e) {}
    }
  } catch (e) { /* ignore */ }
});
