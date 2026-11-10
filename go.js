/*
 * Short links to the Lugano Orders app (the user agreed to keep the Order App's public link here; it is the same
 * link customers receive. Never put the backend's link or the secret in this repository).
 *   app.lugano.in/app            → the app (app/index.html: the app full screen, installable)
 *   app.lugano.in/LK7MP2QX9RT    → app.lugano.in/app/?list=LK7MP2QX9RT (lists and shared selections: L or S + 10 characters)
 * Links stay on app.lugano.in, so a phone with the app installed opens them in the app.
 */
var LUGANO_APP = 'https://script.google.com/macros/s/AKfycbyxmQUfgWAdoBdF3WKMJQXSCf8-ACOzMI6J_KkpL8Upd-k6nlD6vaIcZEn9InrtOJBIOQ/exec';
function luganoTarget(path, search) {
  var p = String(path || '/').replace(/\/+$/, '');
  var m = p.match(/^\/([LS][A-Z2-9]{10})$/i);
  if (m) return LUGANO_APP + '?list=' + m[1].toUpperCase();
  if (/^\/app$/i.test(p)) {
    var q = String(search || '').match(/[?&]list=([LS][A-Z2-9]{10})(?:&|$)/i);
    return LUGANO_APP + (q ? '?list=' + q[1].toUpperCase() : '');
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
