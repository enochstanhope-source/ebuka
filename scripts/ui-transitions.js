// Small reusable UI transition helpers (overlay + spinner)
(function(){
  function createOverlay() {
    if (document.getElementById('appTransitionOverlay')) return;
    const overlay = document.createElement('div');
    overlay.id = 'appTransitionOverlay';
    overlay.style.position = 'fixed';
    overlay.style.left = '0';
    overlay.style.top = '0';
    overlay.style.width = '100vw';
    overlay.style.height = '100vh';
    overlay.style.display = 'none';
    overlay.style.alignItems = 'center';
    overlay.style.justifyContent = 'center';
    overlay.style.background = 'rgba(20,20,40,0.6)';
    overlay.style.zIndex = '99999';
    overlay.style.backdropFilter = 'blur(6px)';
  // allow vertical touch scrolling to pass through on mobile devices
  overlay.style.touchAction = 'pan-y';
  overlay.style.webkitOverflowScrolling = 'touch';
    // Add stylesheet for polished spinner card
    if (!document.getElementById('uiTransitionsStyle')) {
      const s = document.createElement('style');
      s.id = 'uiTransitionsStyle';
      s.innerHTML = `
        @keyframes spin { to { transform: rotate(360deg); } }
        #appTransitionOverlay { background: rgba(10,10,20,0.55); }
        #appTransitionOverlay .ui-trans-box { background: linear-gradient(180deg, #ffffff, #fffefc); border-radius:14px; padding:18px 20px; display:flex; gap:14px; align-items:center; box-shadow: 0 12px 40px rgba(6,6,10,0.6); border: 1px solid rgba(0,0,0,0.06); }
        #appTransitionOverlay .ui-spinner { width:48px; height:48px; border-radius:50%; box-sizing:border-box; border:6px solid rgba(0,0,0,0.06); border-top-color: #ffd700; animation: spin 0.9s linear infinite; box-shadow: 0 6px 20px rgba(0,0,0,0.12); }
        #appTransitionOverlay .ui-trans-text { color: #2b1a00; font-weight:800; font-size:16px; }
        /* optional small hint beneath */
        #appTransitionOverlay .ui-trans-sub { display:block; font-size:12px; color:#6b5a3a; margin-top:4px; }
      `;
      document.head.appendChild(s);
    }

    overlay.innerHTML = `
      <div class="ui-trans-box" role="status" aria-live="polite">
        <div class="ui-spinner" aria-hidden="true"></div>
        <div>
          <div class="ui-trans-text">Processing...</div>
          <div class="ui-trans-sub">Please wait while we sign you in</div>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
  }

  function showOverlay(text) {
    createOverlay();
    const overlay = document.getElementById('appTransitionOverlay');
    if (!overlay) return;
    const label = overlay.querySelector('div > div');
    if (label && text) label.textContent = text;
    overlay.style.opacity = '0';
    overlay.style.display = 'flex';
    requestAnimationFrame(() => { overlay.style.transition = 'opacity 260ms ease'; overlay.style.opacity = '1'; });
  }

  function hideOverlay() {
    const overlay = document.getElementById('appTransitionOverlay');
    if (!overlay) return;
    overlay.style.opacity = '0';
    setTimeout(() => { overlay.style.display = 'none'; }, 300);
  }

  // Export to global
  window.uiTransitions = {
    showOverlay,
    hideOverlay
  };

})();
