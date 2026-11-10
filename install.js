/*
 * Installing Lugano Orders on a phone: registers the service worker (sw.js) and keeps Chrome's install prompt so a
 * page can offer an Install button (Chrome on Android and computers; iPhones install from Safari's Share menu).
 */
var LUGANO_INSTALL = { prompt: null, done: false, onChange: null };
function luganoInstalled() {
  try { return LUGANO_INSTALL.done || matchMedia('(display-mode: standalone)').matches || navigator.standalone === true; } catch (e) { return false; }
}
function luganoInstallChanged() { if (LUGANO_INSTALL.onChange) LUGANO_INSTALL.onChange(); }
/** Shows Chrome's install question; resolves true when the person installs. */
function luganoInstall() {
  var p = LUGANO_INSTALL.prompt;
  if (!p) return Promise.resolve(false);
  LUGANO_INSTALL.prompt = null;
  p.prompt();
  return p.userChoice.then(function (c) { luganoInstallChanged(); return !!(c && c.outcome === 'accepted'); }, function () { return false; });
}
function luganoIsIphone() { return /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1); }
(function () {
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(function () { /* the site works without it */ });
  window.addEventListener('beforeinstallprompt', function (e) { e.preventDefault(); LUGANO_INSTALL.prompt = e; luganoInstallChanged(); });
  window.addEventListener('appinstalled', function () { LUGANO_INSTALL.prompt = null; LUGANO_INSTALL.done = true; luganoInstallChanged(); });
})();
