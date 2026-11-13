/*
 * MOVED (13 Nov 2026): Lugano Orders now runs on Lugano's own server. This site is served by GitHub Pages, which
 * can't pass requests on, so every app page and short link here forwards to the same path there, carrying the
 * phone's sign-in and the bag the old app handed over (after "#handoff=", which browsers never send to a server)
 * so nobody signs in again. To go back to the old app: set LUGANO_MOVED = '' (and switch back on the Server screen).
 */
var LUGANO_MOVED = 'https://lugano-order-app.vercel.app';
(function () {
  if (!LUGANO_MOVED || location.origin === LUGANO_MOVED) return;
  var h = {}, frag = '';
  try {
    var s = localStorage.getItem('lugano_session'); if (s) h.s = s;
    var k = localStorage.getItem('lugano_keep'); if (k && k.length < 200000) h.k = k;
    if (h.s || h.k) frag = '#handoff=' + encodeURIComponent(JSON.stringify(h));
  } catch (e) { /* private mode: they sign in once more */ }
  location.replace(LUGANO_MOVED + location.pathname + location.search + frag);
})();

/*
 * Short links to the Lugano Orders app (the user agreed to keep the Order App's public link here; it is the same
 * link customers receive. Never put the backend's link or the secret in this repository).
 *   app.lugano.in/app            → the app (app/index.html: the app full screen, installable)
 *   app.lugano.in/LK7MP2QX9RT    → app.lugano.in/app/?list=LK7MP2QX9RT (lists and shared selections: L or S + 10 characters)
 * Links stay on app.lugano.in, so a phone with the app installed opens them in the app.
 */
var LUGANO_APP = 'https://script.google.com/macros/s/AKfycbyxmQUfgWAdoBdF3WKMJQXSCf8-ACOzMI6J_KkpL8Upd-k6nlD6vaIcZEn9InrtOJBIOQ/exec';
/*
 * Sign in with Google (Nov 2026): people sign in on this site with Google's own button, and the app comes from the
 * "front" script, which runs as Lugano and asks nobody for permission (no Google "unverified" screen).
 *   LUGANO_FRONT  = the front script's public /exec link (as public as LUGANO_APP)
 *   LUGANO_GSI    = the OAuth client id for app.lugano.in (public by design; there is no secret on this site)
 *   LUGANO_SIGNIN = 'test': only where app.lugano.in/app/?signin was opened once (app.lugano.in/app/?signin=off undoes it)
 *                   'on'  : everyone
 * While either of the first two is empty, nothing changes.
 */
var LUGANO_FRONT = 'https://script.google.com/macros/s/AKfycbz4TAA3R9wQhIiBUtTlcafBm3i5Jd0z36ZUrdJC7AVDmRzzndE7K3Ns6NWxgEoF-xa5/exec';
var LUGANO_GSI = '167967428087-brof0n7r5orhj528cau6shgrottrdnqm.apps.googleusercontent.com';
var LUGANO_SIGNIN = 'on';
function luganoSigninOn(search) {
  if (!LUGANO_FRONT || !LUGANO_GSI) return false;
  var q = String(search || '').match(/[?&]signin(?:=([a-z0-9]*))?(?:&|$)/i);
  try {
    if (q) { if (/^(off|0|no)$/i.test(q[1] || '')) localStorage.removeItem('lugano_signin_test'); else localStorage.setItem('lugano_signin_test', '1'); }
    if (q && /^(off|0|no)$/i.test(q[1] || '')) return false;
    if (LUGANO_SIGNIN === 'on') return true;
    return !!q || localStorage.getItem('lugano_signin_test') === '1';
  } catch (e) { return LUGANO_SIGNIN === 'on' || (!!q && !/^(off|0|no)$/i.test(q[1] || '')); }
}
function luganoTarget(path, search, front) {
  var base = front ? LUGANO_FRONT : LUGANO_APP;
  var p = String(path || '/').replace(/\/+$/, '');
  var m = p.match(/^\/([LS][A-Z2-9]{10})$/i);
  if (m) return base + '?list=' + m[1].toUpperCase();
  if (/^\/app$/i.test(p)) {
    var q = String(search || '').match(/[?&]list=([LS][A-Z2-9]{10})(?:&|$)/i);
    return base + (q ? '?list=' + q[1].toUpperCase() : '');
  }
  return null;
}
/** The page of the app on this site for a short link, or null. */
function luganoRoute(path) {
  var m = String(path || '/').replace(/\/+$/, '').match(/^\/([LS][A-Z2-9]{10})$/i);
  return m ? '/app/?list=' + m[1].toUpperCase() : null;
}
(function () {
  if (window.LUGANO_SHELL) return;                                            // the app page itself uses luganoTarget
  var to = luganoRoute(location.pathname);
  if (to) { location.replace(to); return; }
  var go = document.getElementById('go'), nf = document.getElementById('nf');   // the 404 page: not a Lugano link
  if (go) go.hidden = true;
  if (nf) nf.hidden = false;
})();
