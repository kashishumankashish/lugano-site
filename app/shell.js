/*
 * app.lugano.in/app: Lugano Orders as an installable app. The Order App (Google Apps Script) is shown full screen in
 * a frame on Lugano's own site, so it can be installed on the phone's home screen and opens without the address bar.
 *
 * The app says hello from inside the frame ("lugano-app-ready"). If it doesn't (not signed in to Google yet, the
 * browser keeps Google's sign-in out of other sites' frames as iPhones do, or an old version of the app), this page
 * opens the app the usual way, as a page of its own. After two such misses in a row (an iPhone, say; a first visit
 * usually misses once for the Google sign-in) it skips the frame on this phone for FRAME_PAUSE_H hours.
 * Files the app shares (photo cards, PDF) come here and are shared from this page (share/share.js).
 */
var SHELL = { ready: false, started: Date.now(), FRAME_PAUSE_H: 6, LOAD_GRACE_MS: 8000, MAX_WAIT_MS: 35000 };
function shellTarget() { return luganoTarget('/app', location.search, SHELL.signin); }
function shellStore(k, v) { try { if (v === undefined) return localStorage.getItem(k); if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) { return null; } }
/** Misses in a row on this phone: {n, t}. */
function shellMisses() { try { var m = JSON.parse(shellStore('lugano_noframe') || 'null'); return m && typeof m.n === 'number' ? m : { n: 0, t: 0 }; } catch (e) { return { n: 0, t: 0 }; } }
function shellAndroid() { return /Android/i.test(navigator.userAgent) && !luganoIsIphone(); }
/**
 * True when the app should open as Google's page straight away: the person chose "Always open as Google's page"
 * (until), or, not on Android, the frame missed twice in a row a short while ago. On Android every open tries the
 * frame, so allowing app.lugano.in (shellHelp) works at once.
 */
function shellPaused() {
  var m = shellMisses();
  if (m.until && Date.now() < m.until) return true;
  return !shellAndroid() && m.n >= 2 && Date.now() - m.t < SHELL.FRAME_PAUSE_H * 3600000;
}
/** Seconds since the page opened, for the check line and the last-miss record. */
function shellSecs() { return Math.round((Date.now() - SHELL.started) / 100) / 10; }
function shellOpenDirect(remember, why) {
  if (SHELL.ready || SHELL.leaving) return;
  if (SHELL.check) { shellCheckLine(); return; }                                // check mode: stay and show what happened
  shellStore('lugano_lastmiss', JSON.stringify({ at: new Date().toISOString(), why: why || 'paused', load: SHELL.loadAt || null, secs: shellSecs() }));
  if (remember) shellStore('lugano_noframe', JSON.stringify({ n: shellMisses().n + 1, t: Date.now() }));
  if (remember && shellAndroid()) return shellHelp();   // say why, and how to fix it
  shellGo();
}
function shellGo() { SHELL.leaving = true; location.replace(shellTarget()); }
/**
 * Android, the app didn't come up inside the page: usually Chrome keeps Google's sign-in out of other sites
 * (third-party cookies blocked; Google answers 401), or the person isn't signed in to Google yet. Shows how to allow
 * app.lugano.in, and Open the app (Google's own page, as before).
 */
function shellHelp() {
  SHELL.leaving = true;
  document.getElementById('app').src = 'about:blank';
  var sp = document.getElementById('splash');
  sp.hidden = false;
  sp.innerHTML = '<img src="/wordmark.png" alt="LUGANO">' +
    '<div class="help"><h1>Open Lugano Orders</h1>' +
    '<p>Google couldn\'t sign you in inside the app, so it opens as Google\'s page (with Google\'s bar on top).</p>' +
    '<button class="big" id="helpGo" style="background:#111827">Open the app</button>' +
    '<h2>Full screen, without Google\'s bar</h2><ol>' +
    '<li>In <b>Chrome</b>, tap <b>⋮</b> → <b>Settings</b> → <b>Site settings</b> → <b>Third-party cookies</b>.</li>' +
    '<li>Tap <b>Add site exception</b>, type <b>app.lugano.in</b> and tap <b>Add</b>.</li>' +
    '<li>Open the Lugano app again.</li></ol>' +
    '<p class="small">This lets only Lugano\'s site use your Google sign-in. If you have never signed in to Google on this phone, tap Open the app and sign in first.</p>' +
    '<p><a href="#" id="helpAlways">Always open as Google\'s page on this phone</a></p></div>';
  document.getElementById('helpGo').onclick = shellGo;
  document.getElementById('helpAlways').onclick = function (e) {
    e.preventDefault();
    shellStore('lugano_noframe', JSON.stringify({ n: shellMisses().n, t: Date.now(), until: Date.now() + 30 * 86400000 }));
    shellGo();
  };
}
function shellReady(e) {
  if (SHELL.signin) return signReady(e);
  try { e.source.postMessage({ type: 'lugano-shell' }, e.origin); } catch (x) { /* the app works without */ }
  if (SHELL.ready) return;
  SHELL.ready = true; SHELL.helloAt = shellSecs();
  shellStore('lugano_noframe', null);
  document.getElementById('splash').hidden = true;
  if (SHELL.check) shellCheckLine();
  shellInstallBar();
}
/* ---------- Install bar (Chrome's prompt; never inside the installed app) ---------- */
function shellInstallBar() {
  var bar = document.getElementById('inst');
  var no = Number(shellStore('lugano_install_no') || 0), snoozed = no > 0 && Date.now() - no < 14 * 86400000;
  bar.hidden = !SHELL.ready || luganoInstalled() || snoozed || !LUGANO_INSTALL.prompt;
}
/* ---------- Sharing from the app ---------- */
function shellShare(e) {
  var box = document.getElementById('sharebox');
  LUGANO_SHARE.onBack = function () { if (!box.hidden) history.back(); };       // Back to the app = the phone's Back
  if (!luganoShareMessage(e)) return;
  if (box.hidden) { box.hidden = false; box.scrollTop = 0; try { history.pushState({ luganoShare: 1 }, ''); } catch (x) {} }
}
window.addEventListener('popstate', function () { var box = document.getElementById('sharebox'); if (!box.hidden) { box.hidden = true; document.getElementById('box').innerHTML = ''; } });
/**
 * True when a message's sender is the app inside our own frame (Google puts the page two frames deep). Any Apps Script
 * page on the internet has an origin that looks like ours, and one of them could open this site in a new tab and say
 * hello to it; without this check it would be handed the person's sign-in.
 */
function shellFromFrame(src) {
  var f = document.getElementById('app').contentWindow, w = src;
  try { for (var i = 0; i < 6 && w; i++) { if (w === f) return true; if (w === w.parent) return false; w = w.parent; } } catch (e) { /* not ours */ }
  return false;
}
function shellMessage(e) {
  if (!luganoAppOrigin(e.origin) || !e.data || !shellFromFrame(e.source)) return;
  if (e.data.type === 'lugano-app-ready') shellReady(e);
  else if (e.data.type === 'lugano-share') shellShare(e);
  else if (SHELL.signin && e.data.type === 'lugano-session') signSession(e.data);
  else if (SHELL.signin && e.data.type === 'lugano-signin-failed') signFailed(e.data.error);
  else if (SHELL.signin && e.data.type === 'lugano-signout') signOut(e.data.why);
}

/* ---------- Sign in with Google (go.js: LUGANO_FRONT, LUGANO_GSI, LUGANO_SIGNIN) ----------
 * The app in the frame comes from the front script and doesn't know who is using it. This page shows Google's
 * "Sign in with Google" button; Google gives it an ID token (name + email, nothing else), which goes to the app in
 * the frame and from there to Lugano's backend, which checks it with Google and answers with a session for 30 days.
 * The session is kept here (this site's storage on this phone) and handed to the app every time it opens.
 */
var SIGN = { session: null, app: null, credential: null, gsi: 0, waitTimer: null };
function signStored() {
  try { var s = JSON.parse(shellStore('lugano_session') || 'null'); return s && s.email && s.sig && Number(s.exp) > Date.now() + 60000 ? s : null; } catch (e) { return null; }
}
/** Browsers inside other apps (Instagram, Facebook…): Google refuses to sign anyone in there. */
function signInApp() { return /FBAN|FBAV|FB_IAB|Instagram|Line\/|MicroMessenger|Snapchat|LinkedInApp|Twitter|; wv\)/i.test(navigator.userAgent || ''); }
function signStart() {
  SIGN.session = signStored();
  var msg = document.getElementById('splashMsg');
  if (navigator.onLine === false) {
    msg.className = ''; msg.textContent = 'No internet. The app opens when you are back online.';
    window.addEventListener('online', function () { location.reload(); });
    return;
  }
  var frame = document.getElementById('app');
  frame.src = shellTarget();                                   // loads behind the sign-in screen, so it is ready by then
  frame.addEventListener('load', function () { if (SHELL.loadAt == null) SHELL.loadAt = shellSecs(); setTimeout(signStuck, SHELL.LOAD_GRACE_MS + 4000); });
  setTimeout(signStuck, SHELL.MAX_WAIT_MS);
  if (SIGN.session) setTimeout(function () { if (!SHELL.ready) msg.textContent = 'Still opening (Google can be slow the first time)'; }, 9000);
  else signScreen();
}
/** The app in the frame never said hello: nothing to fall back to, so say so and offer to try again. */
function signStuck() {
  if (SIGN.app || SHELL.stuck) return;
  if (!SIGN.session && !SIGN.credential) { SHELL.stuckLater = true; return; }   // on the sign-in screen: only matters once they sign in
  SHELL.stuck = true;
  var sp = document.getElementById('splash');
  sp.hidden = false;
  sp.innerHTML = '<img src="/wordmark.png" alt="LUGANO"><div class="help" style="text-align:center"><h1>The app didn\'t open</h1>' +
    '<p>Check your internet connection and try again.</p><button class="big" id="signRetry" style="background:#111827">Try again</button></div>';
  document.getElementById('signRetry').onclick = function () { location.reload(); };
}
function signScreen(note) {
  var sp = document.getElementById('splash');
  sp.hidden = false;
  var inApp = signInApp(), here = location.origin + location.pathname + location.search;
  sp.innerHTML = '<img src="/wordmark.png" alt="LUGANO"><div class="help" style="text-align:center"><h1>Lugano Orders</h1>' +
    '<p>Sign in to see our designs with live stock and to order.</p>' +
    (inApp ? '<p><b>Google sign-in doesn\'t work inside this app\'s browser.</b> Open this page in ' + (luganoIsIphone() ? 'Safari' : 'Chrome') + ':</p>' +
      (luganoIsIphone() ? '<p>Tap <b>⋯</b> (or the compass) and choose <b>Open in browser</b>.</p>'
        : '<p><a class="big" style="display:inline-block;background:#111827;color:#fff;text-decoration:none" href="intent://' + here.replace(/^https:\/\//, '') + '#Intent;scheme=https;package=com.android.chrome;end">Open in Chrome</a></p>') +
      '<p class="small">Or copy this link into your browser: ' + location.host + location.pathname + '</p>'
      : '<div id="gsiBtn" style="display:flex;justify-content:center;min-height:44px;margin:18px 0"></div>') +
    '<p id="signMsg" class="small" role="status">' + (note || '') + '</p>' +
    '<p class="small">Lugano receives only your name and email address from Google. <a href="/privacy.html">Privacy policy</a></p></div>';
  if (!inApp) signGsi();
}
function signGsi() {
  var draw = function () {
    var box = document.getElementById('gsiBtn');
    if (!box || !window.google || !google.accounts || !google.accounts.id) return;
    if (SIGN.gsi < 2) {
      google.accounts.id.initialize({ client_id: LUGANO_GSI, callback: signCredential, auto_select: true, cancel_on_tap_outside: false, use_fedcm_for_prompt: true, itp_support: true });
      SIGN.gsi = 2;
    }
    google.accounts.id.renderButton(box, { type: 'standard', theme: 'filled_blue', size: 'large', text: 'continue_with', shape: 'pill', logo_alignment: 'left',
      width: Math.max(200, Math.min(320, (window.innerWidth || 360) - 48)) });
    try { google.accounts.id.prompt(); } catch (e) { /* the button is enough */ }
  };
  if (SIGN.gsi >= 1) return draw();
  SIGN.gsi = 1;
  var sc = document.createElement('script');
  sc.src = 'https://accounts.google.com/gsi/client'; sc.async = true;
  sc.onload = draw;
  sc.onerror = function () {
    SIGN.gsi = 0;
    var m = document.getElementById('signMsg');
    if (m) m.innerHTML = 'Couldn\'t load Google\'s sign-in. Check your internet (or switch off an ad blocker for this site). <a href="#" id="signAgain">Try again</a>';
    var a = document.getElementById('signAgain'); if (a) a.onclick = function (e) { e.preventDefault(); signScreen(); };
  };
  document.head.appendChild(sc);
}
/** Google's answer to the button (an ID token). */
function signCredential(resp) {
  if (!resp || !resp.credential) return;
  SIGN.credential = String(resp.credential);
  var m = document.getElementById('signMsg'); if (m) { m.className = 'small dots'; m.textContent = 'Signing you in'; }
  var b = document.getElementById('gsiBtn'); if (b) b.style.visibility = 'hidden';
  signSend();
  if (SHELL.stuckLater) signStuck();
  clearTimeout(SIGN.waitTimer);
  SIGN.waitTimer = setTimeout(function () { if (!SIGN.session) signFailed('Lugano didn\'t answer. Please try again.'); }, 30000);
}
function signSend() {
  if (!SIGN.app || !SIGN.credential) return;                    // the app in the frame isn't up yet: signReady sends it
  try { SIGN.app.win.postMessage({ type: 'lugano-credential', credential: SIGN.credential }, SIGN.app.origin); } catch (e) { signFailed('Please try again.'); }
}
/** The app in the frame said hello: hand it the session if this phone has one, or the token just received. */
function signReady(e) {
  SIGN.app = { win: e.source, origin: e.origin };
  try { e.source.postMessage(SIGN.session ? { type: 'lugano-shell', session: SIGN.session } : { type: 'lugano-shell' }, e.origin); } catch (x) { /* it asks again */ }
  if (SIGN.session) signShow(); else signSend();
}
function signShow() {
  clearTimeout(SIGN.waitTimer);
  SHELL.ready = true; SHELL.helloAt = shellSecs();
  document.getElementById('splash').hidden = true;
  shellInstallBar();
}
/** The backend's session for this person (after signing in, or a renewed one): kept on this phone. */
function signSession(d) {
  var s = d && d.session;
  if (!s || !s.email || !s.sig || !(Number(s.exp) > Date.now())) return;
  SIGN.session = { email: String(s.email), exp: Number(s.exp), sig: String(s.sig) }; SIGN.credential = null;
  shellStore('lugano_session', JSON.stringify(SIGN.session));
  signShow();
}
function signFailed(error) {
  clearTimeout(SIGN.waitTimer);
  SIGN.credential = null;
  signScreen(String(error || 'Sign-in didn\'t work. Please try again.').slice(0, 200));
}
/** why 'expired': the backend no longer takes the session. 'user': Sign out in the app (the app starts afresh). */
function signOut(why) {
  SIGN.session = null; SIGN.credential = null; SHELL.ready = false;
  shellStore('lugano_session', null);
  document.getElementById('inst').hidden = true;
  if (why === 'user') {
    try { google.accounts.id.disableAutoSelect(); } catch (e) { /* not loaded */ }
    SIGN.app = null;
    document.getElementById('app').src = shellTarget();
  }
  signScreen(why === 'user' ? '' : 'Please sign in again.');
}
/*
 * Check mode (app.lugano.in/app/?check): never leaves for Google's page; shows the frame as it is (the app, or
 * Google's "refused to connect" when the sign-in can't happen inside another site) and a line with the timings,
 * the last miss on this phone and the browser.
 */
function shellCheckLine() {
  var el = document.getElementById('checkLine');
  if (!el) {
    el = document.createElement('div'); el.id = 'checkLine';
    el.style.cssText = 'position:fixed;left:0;right:0;bottom:0;z-index:20;background:#111827;color:#fff;font:13px/1.4 system-ui,sans-serif;padding:8px 12px';
    document.body.appendChild(el);
  }
  var last = shellStore('lugano_lastmiss');
  el.textContent = 'Check ' + new Date().toLocaleTimeString() + ' · frame loaded: ' + (SHELL.loadAt != null ? SHELL.loadAt + ' s' : 'not yet') +
    ' · app inside: ' + (SHELL.ready ? 'YES at ' + SHELL.helloAt + ' s' : 'no (yet)') +
    ' · installed: ' + luganoInstalled() + (last ? ' · last miss: ' + last : '') +
    ' · ' + (navigator.userAgent.match(/(Chrome|CriOS|SamsungBrowser|Firefox|Version)\/[\d.]+/g) || []).join(' ');
}
(function () {
  window.addEventListener('message', shellMessage);
  SHELL.check = /[?&]check\b/.test(location.search);
  if (SHELL.check) {
    document.getElementById('splash').hidden = true;
    shellStore('lugano_noframe', null);
    setInterval(shellCheckLine, 1000); shellCheckLine();
  }
  LUGANO_INSTALL.onChange = shellInstallBar;
  document.getElementById('instGo').onclick = function () { luganoInstall().then(shellInstallBar); };
  document.getElementById('instNo').onclick = function () { shellStore('lugano_install_no', String(Date.now())); shellInstallBar(); };
  SHELL.signin = luganoSigninOn(location.search);
  if (SHELL.signin) return signStart();
  if (shellPaused()) return shellOpenDirect(false);
  var msg = document.getElementById('splashMsg');
  if (navigator.onLine === false) {
    msg.className = ''; msg.textContent = 'No internet. The app opens when you are back online.';
    window.addEventListener('online', function () { location.reload(); });
    return;
  }
  var frame = document.getElementById('app');
  frame.src = shellTarget();
  frame.addEventListener('load', function () {                                  // loaded, but no hello
    if (SHELL.loadAt == null) SHELL.loadAt = shellSecs();
    setTimeout(function () { shellOpenDirect(true, 'no hello ' + SHELL.LOAD_GRACE_MS / 1000 + ' s after load'); }, SHELL.LOAD_GRACE_MS);
  });
  setTimeout(function () { shellOpenDirect(true, 'no hello in ' + SHELL.MAX_WAIT_MS / 1000 + ' s'); }, SHELL.MAX_WAIT_MS);
  setTimeout(function () { if (!SHELL.ready) msg.textContent = 'Still opening (Google can be slow the first time)'; }, 9000);
})();
