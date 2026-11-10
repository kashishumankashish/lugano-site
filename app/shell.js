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
function shellTarget() { return luganoTarget('/app', location.search); }
function shellStore(k, v) { try { if (v === undefined) return localStorage.getItem(k); if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) { return null; } }
/** Misses in a row on this phone: {n, t}. */
function shellMisses() { try { var m = JSON.parse(shellStore('lugano_noframe') || 'null'); return m && typeof m.n === 'number' ? m : { n: 0, t: 0 }; } catch (e) { return { n: 0, t: 0 }; } }
/** True when the frame missed twice in a row a short while ago: open the app directly instead. */
function shellPaused() { var m = shellMisses(); return m.n >= 2 && Date.now() - m.t < SHELL.FRAME_PAUSE_H * 3600000; }
/** Seconds since the page opened, for the check line and the last-miss record. */
function shellSecs() { return Math.round((Date.now() - SHELL.started) / 100) / 10; }
function shellOpenDirect(remember, why) {
  if (SHELL.ready || SHELL.leaving) return;
  if (SHELL.check) { shellCheckLine(); return; }                                // check mode: stay and show what happened
  SHELL.leaving = true;
  shellStore('lugano_lastmiss', JSON.stringify({ at: new Date().toISOString(), why: why || 'paused', load: SHELL.loadAt || null, secs: shellSecs() }));
  if (remember) shellStore('lugano_noframe', JSON.stringify({ n: shellMisses().n + 1, t: Date.now() }));
  location.replace(shellTarget());
}
function shellReady(e) {
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
function shellMessage(e) {
  if (!luganoAppOrigin(e.origin) || !e.data) return;
  if (e.data.type === 'lugano-app-ready') shellReady(e);
  else if (e.data.type === 'lugano-share') shellShare(e);
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
