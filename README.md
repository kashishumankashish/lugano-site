# app.lugano.in

Public pages for the Lugano Orders app: home page, privacy policy and terms (Google needs these to show "Lugano" on the sign-in screen). Served by GitHub Pages with the custom domain in `CNAME`.

- `index.html` home page · `privacy.html` privacy policy · `terms.html` terms of use · `style.css` · `logo.png` (square logo for Google's sign-in screen and the browser tab, made from the Lugano wordmark) · `wordmark.png` (header).
- Contact address on the privacy policy and terms: kashishgoel017@gmail.com.
- Short links: `go.js` holds the Order App's public link (the user agreed on 9 Nov 2026; it is the link customers get anyway). `app.lugano.in/app` opens the app, `app.lugano.in/<list id>` (L or S + 10 characters) opens a list; `404.html` and `app/index.html` forward with it. If the Order App gets a new deployment link, change it in `go.js`.
- `share/`: the app opens app.lugano.in/share and posts its files (photo cards, PDF) to it; this page, outside Google's frame, can open the phone's share sheet. Files only from `*-script.googleusercontent.com`, never uploaded.
- Never put the Apps Script backend URL or the secret in this repository.
