/*
 * Link previews for app.lugano.in/<list id> (Netlify edge function; the site's files are the same as on GitHub Pages).
 * WhatsApp, Telegram, Facebook, iMessage and the like read a link's page once to draw a preview and don't run its
 * scripts, so the preview has to be in the page itself. For those readers this asks the Lugano backend
 * (?preview=<id>: title, a short line, one photo; nothing else) and answers a small page with Open Graph tags.
 * People are sent straight on to /app/?list=<id>, as before, without waiting for the backend.
 * LUGANO_BACKEND (Netlify → Site configuration → Environment variables) = the backend's /exec link; it stays out of
 * the repository. Without it, or when the backend is slow, the preview is Lugano's logo.
 */
const LIST = /^\/([LS][A-Z2-9]{10})\/?$/i;
const BOTS = /whatsapp|facebookexternalhit|facebot|twitterbot|telegrambot|slackbot|linkedinbot|discordbot|skypeuripreview|pinterest|googlebot|bingbot|applebot|embedly|vkshare|redditbot|snapchat|viber|line\//i;
const LOGO = 'https://app.lugano.in/icons/og.png';
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export default async (request, context) => {
  const url = new URL(request.url);
  const m = url.pathname.match(LIST);
  if (!m) return context.next();
  const id = m[1].toUpperCase(), to = '/app/?list=' + id;
  const ua = request.headers.get('user-agent') || '';
  if (!BOTS.test(ua)) return Response.redirect(new URL(to, url), 302);          // a person: straight to the app
  let p = null;
  const backend = (globalThis.Netlify && Netlify.env.get('LUGANO_BACKEND')) || '';
  if (backend) {
    try {
      const ctl = new AbortController(), t = setTimeout(() => ctl.abort(), 4500);
      const r = await fetch(backend + (backend.includes('?') ? '&' : '?') + 'preview=' + id, { redirect: 'follow', signal: ctl.signal });
      clearTimeout(t);
      if (r.ok) p = await r.json();
    } catch (e) { p = null; }
  }
  const found = p && p.found;
  const title = found ? p.title : 'Designs from Lugano';
  const desc = found ? p.desc : 'Tap to open them in the Lugano Orders app.';
  const image = found && p.image ? p.image : LOGO;
  const html = '<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">' +
    '<title>' + esc(title) + '</title><meta name="description" content="' + esc(desc) + '">' +
    '<meta property="og:type" content="website"><meta property="og:site_name" content="Lugano">' +
    '<meta property="og:title" content="' + esc(title) + '"><meta property="og:description" content="' + esc(desc) + '">' +
    '<meta property="og:url" content="https://app.lugano.in/' + id + '"><meta property="og:image" content="' + esc(image) + '">' +
    (image === LOGO ? '<meta property="og:image:width" content="1200"><meta property="og:image:height" content="630">' : '') +
    '<meta name="twitter:card" content="summary_large_image"><link rel="icon" href="/logo.png">' +
    '</head><body><p><a href="' + to + '">Open in the Lugano app</a></p><script>location.replace(' + JSON.stringify(to) + ')</script></body></html>';
  return new Response(html, { headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'public, max-age=600' } });
};

export const config = {
  path: '/*',
  excludedPath: ['/app/*', '/share/*', '/icons/*', '/*.js', '/*.css', '/*.png', '/*.html', '/*.webmanifest', '/']
};
