# app.lugano.in

Public pages for the Lugano Orders app: home page, privacy policy and terms (Google needs these to show "Lugano" on the sign-in screen). Served by GitHub Pages with the custom domain in `CNAME`.

- `index.html` home page · `privacy.html` privacy policy · `terms.html` terms of use · `style.css` · `logo.png` (square logo for Google's sign-in screen and the browser tab, made from the Lugano wordmark) · `wordmark.png` (header).
- Contact address on the privacy policy and terms: kashishgoel017@gmail.com.
- Short links: `go.js` holds the Order App's public link (the user agreed on 9 Nov 2026; it is the link customers get anyway). `app.lugano.in/<list id>` (L or S + 10 characters) goes to `app.lugano.in/app/?list=<id>` (`404.html`). If the Order App gets a new deployment link, change it in `go.js`.
- **Installable app** (10 Nov 2026): `app/index.html` + `app/shell.js` show the Order App full screen in a frame (the Order App allows it, and refuses any other site); `manifest.webmanifest`, `sw.js`, `install.js`, `icons/`. If the app doesn't say hello in the frame (not signed in, third-party cookies blocked, as on iPhones), the page opens the app's link directly. The app's photo cards / PDF are shared from this page (share/share.js). Details: DEVELOPER-NOTES in lugano-order-app, "Install".
- `share/`: the app opens app.lugano.in/share and posts its files (photo cards, PDF) to it; this page, outside Google's frame, can open the phone's share sheet. Files only from `*-script.googleusercontent.com`, never uploaded.
- Never put the Apps Script backend URL or the secret in this repository.
