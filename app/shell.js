/*
 * app.lugano.in/app: Lugano Orders as an installable app. The Order App (Google Apps Script) is shown full screen in
 * a frame on Lugano's own site, so it can be installed on the phone's home screen and opens without the address bar.
 *
 * The app says hello from inside the frame ("lugano-app-ready"). If it doesn't (not signed in to Google yet, the
 * browser keeps Google's sign-in out of other sites' frames as iPhones do, or an old version of the app), this page
 * opens the app the usual way, as a page of its own, and skips the frame on this phone for FRAME_PAUSE_H hours.
 * Files the app shares (photo cards, PDF) come here and are shared from this page (share/share.js).
 */
var SHELL = { ready: false, started: Date.now(), FRAME_PAUSE_H: 6, LOAD_GRACE_MS: 8000, MAX_WAIT_MS: 35000 };
function shellTarget() { return luganoTarget('/app', location.search); }
function shellStore(k, v) { try { if (v === undefined) return localStorage.getItem(k); if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) { return null; } }
/** True when the frame failed on this phone a short while ago: open the app directly instead. */
function shellPaused() { var t = Number(shellStore('lugano_noframe') || 0); return t > 0 && Date.now() - t < SHELL.FRAME_PAUSE_H * 3600000; }
function shellOpenDirect(remember) {
  if (SHELL.ready) return;
  if (remember) shellStore('lugano_noframe', String(Date.now()));
  location.replace(shellTarget());
}
function shellReady(e) {
  try { e.source.postMessage({ type: 'lugano-shell' }, e.origin); } catch (x) { /* the app works without */ }
  if (SHELL.ready) return;
  SHELL.ready = true;
  shellStore('lugano_noframe', null);
  document.getElementById('splash').hidden = true;
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
(function () {
  window.addEventListener('message', shellMessage);
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
  frame.addEventListener('load', function () { setTimeout(function () { shellOpenDirect(true); }, SHELL.LOAD_GRACE_MS); });   // loaded, but no hello
  setTimeout(function () { shellOpenDirect(true); }, SHELL.MAX_WAIT_MS);
  setTimeout(function () { if (!SHELL.ready) msg.textContent = 'Still opening (Google can be slow the first time)'; }, 9000);
})();
