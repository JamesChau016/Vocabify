# Vocabify Capture extension

This folder contains a standalone Chrome Manifest V3 extension. The TypeScript auth
module in `src/auth.ts` connects with a Vocabify capture token, validates it with
`GET /api/auth/me`, stores it in extension-local storage, and uses it to add words to
a list owned by the user. Captures are committed to IndexedDB first, then synchronized
by the background worker when the API is reachable.

Create and revoke tokens from the signed-in Vocabify app at `/settings/tokens`. The
extension links to that page because token management requires the app's cookie
session. Tokens are shown once when created and expire after 90 days.

For local development, use API URL `http://localhost:3006/` and app URL
`http://localhost:3000/`. For a deployed instance, enter its API and app base URLs in
the popup. The API must include the extension origin in `App:ExtensionOrigins`, for
example `chrome-extension://<extension-id>`.

## Build and install

Install the module's TypeScript compiler and build from `extension/`:

```sh
npm ci
npm run build
```

The build writes the loadable extension to `dist/`.
In Chrome, open `chrome://extensions`, enable Developer mode, and choose **Load
unpacked** with the `dist/` directory. Add the extension ID shown there to the API's
`App:ExtensionOrigins` setting and reload the extension.

Capture tokens can add words only to lists owned by their user. Open the popup from
a page to prefill the selected word, its surrounding sentence, and the source URL.
Choose a cached destination list and save; pending captures retry automatically after
an offline period.

While online, typing at least two characters in the word field shows up to eight
suggestions. Selecting one fills the first English dictionary definition, which you
can edit before saving. Leaving the word field with no definition also attempts a
lookup. Dictionary access is optional for capture: when offline or no match exists,
enter a definition manually or save the word without one.
