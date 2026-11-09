/*
 * app.lugano.in/share: the Lugano Orders app runs inside Google's frame, which may not open the phone's share sheet.
 * The app opens this page, which says it is ready; the app sends its files (photo cards, a PDF) here, and this page,
 * being a normal tab on Lugano's own site, shares them with WhatsApp or any app when the person taps the button.
 * Files are only taken from the app's own frame (*-script.googleusercontent.com) and are never uploaded anywhere.
 */
var LUGANO_SHARE = { files: [], title: '' };
function luganoAppOrigin(o) { return /^https:\/\/[a-z0-9-]+-script\.googleusercontent\.com$/.test(String(o || '')); }
function luganoShareMessage(e) {
  if (!luganoAppOrigin(e.origin) || !e.data || e.data.type !== 'lugano-share' || !Array.isArray(e.data.files)) return false;
  LUGANO_SHARE.files = e.data.files.filter(function (f) { return f && typeof f.size === 'number' && f.name; }).slice(0, 100);
  LUGANO_SHARE.title = String(e.data.title || 'Lugano').slice(0, 100);
  luganoShareShow();
  return true;
}
var LUGANO_GROUP = 10;                         // Chrome on Android shares at most 10 files at a time
function luganoCanShare(files) {
  try { return !!(navigator.canShare && navigator.share && navigator.canShare({ files: files })); } catch (e) { return false; }
}
/** The files in groups of at most 10 (one share each): [[0, 10], [10, 20], …]. */
function luganoGroups(n) { var g = []; for (var i = 0; i < n; i += LUGANO_GROUP) g.push([i, Math.min(n, i + LUGANO_GROUP)]); return g; }
function luganoShareShow() {
  var files = LUGANO_SHARE.files, n = files.length, el = document.getElementById('box');
  var pics = files.filter(function (f) { return /^image\//.test(f.type); });
  var what = pics.length === n ? (n === 1 ? '1 photo' : n + ' photos') : (n === 1 ? '1 file' : n + ' files');
  var groups = luganoGroups(n), can = luganoCanShare(files.slice(0, LUGANO_GROUP));
  var label = function (g) { return groups.length === 1 ? 'Share on WhatsApp' : 'Share ' + (g[1] - g[0] === 1 ? 'photo ' + (g[0] + 1) : (g[0] + 1) + '–' + g[1]) + ' on WhatsApp'; };
  el.innerHTML = '<h1>' + what + ' ready</h1>' +
    (can ? groups.map(function (g, i) { return '<button class="big" data-g="' + i + '">' + label(g) + '</button>'; }).join('') +
           '<p class="small">' + (groups.length > 1 ? 'WhatsApp takes up to 10 at a time: tap each button in turn and pick the same chat. ' : '') + 'Pick WhatsApp (or any app), then the chat.</p>'
         : '<p>This phone\'s browser can\'t share files. Long-press a photo below to share or save it.</p>') +
    '<div class="thumbs">' + files.map(function (f, i) {
      return /^image\//.test(f.type) ? '<img alt="" data-i="' + i + '">' : '<div class="file">' + f.name.replace(/[<>&"]/g, '') + '</div>';
    }).join('') + '</div><p><button id="back" class="ghost">Back to the app</button></p>';
  Array.prototype.forEach.call(el.querySelectorAll('img[data-i]'), function (im) { im.src = URL.createObjectURL(files[Number(im.getAttribute('data-i'))]); });
  Array.prototype.forEach.call(el.querySelectorAll('button[data-g]'), function (b) {
    b.onclick = function () {
      var g = groups[Number(b.getAttribute('data-g'))];
      navigator.share({ files: files.slice(g[0], g[1]), title: LUGANO_SHARE.title }).then(function () {
        b.textContent = groups.length === 1 ? '✓ Shared · share again' : '✓ ' + (g[1] - g[0] === 1 ? 'Photo ' + (g[0] + 1) : 'Photos ' + (g[0] + 1) + '–' + g[1]) + ' shared'; b.classList.add('done');
      }, function (err) {
        if (err && err.name === 'AbortError') return;
        b.insertAdjacentHTML('afterend', '<p class="small">Couldn\'t share (' + (err && err.name || 'error') + '). Long-press a photo to share or save it.</p>');
      });
    };
  });
  document.getElementById('back').onclick = function () { window.close(); setTimeout(function () { document.getElementById('back').textContent = 'Close this tab to go back'; }, 300); };
}
(function () {
  window.addEventListener('message', luganoShareMessage);
  if (window.opener) { try { window.opener.postMessage({ type: 'lugano-share-ready' }, '*'); } catch (e) { /* no app */ } }
  else document.getElementById('box').innerHTML = '<h1>Nothing to share</h1><p>Open this from the Lugano Orders app: Share → Photo cards or PDF.</p><p><a href="/">Lugano Orders</a></p>';
})();
