# Vocabify Capture

Chrome Manifest V3 extension for saving vocabulary from any web page to a Vocabify list.
Captures are written to IndexedDB first and synchronized with the API when connectivity is
available.

## Capabilities

- Prefill a word from the current text selection
- Preserve its surrounding sentence and source URL
- Suggest English words and retrieve editable dictionary definitions
- Cache the user's destination lists
- Queue captures while offline and retry them in the background
- Push idempotent local operations and pull server-side changes by cursor
- Connect with a scoped, revocable Vocabify capture token

Dictionary lookup is optional. A word can be saved with a custom definition or without a
definition when the public dictionary services are unavailable.

## Build and install

Requirements: Node.js 18 or newer, Chrome or another Chromium browser, and a running
Vocabify deployment.

From `extension/`:

```bash
npm ci
npm run build
```

The build compiles TypeScript and writes a complete unpacked extension to `dist/`.

1. Open `chrome://extensions`.
2. Enable Developer mode.
3. Select **Load unpacked** and choose `extension/dist`.
4. Copy the generated extension ID.
5. Add `chrome-extension://<extension-id>` to the API's `App:ExtensionOrigins` setting.
6. Restart the API and reload the extension.

The build deletes and recreates `dist/`; do not edit generated files there.

## Connect to Vocabify

1. Sign in to the web application.
2. Open `/settings/tokens` and create a capture token.
3. Copy the token immediately; its secret is displayed only once.
4. Open the extension popup and enter the token, API URL, and app URL.

For local development use:

```text
API URL: http://localhost:3006/
App URL: http://localhost:3000/
```

The extension validates the token with `GET /api/auth/me`. Tokens expire after 90 days
and can be revoked from `/settings/tokens`. A capture token can add or synchronize words
only in lists owned by its user.

## Capture workflow

Select a word on a page and open the extension. The popup attempts to prefill the selected
word, its sentence, and the page URL. Choose a cached list, adjust the fields, and save.

The local write succeeds independently of the network. The background service worker
later calls:

| Route | Purpose |
| --- | --- |
| `POST /api/sync/push` | Upload queued operations with stable IDs |
| `GET /api/sync/pull?cursor=...` | Download changes since the last cursor |
| `GET /api/lists` | Refresh available destination lists |

Server receipts make retries idempotent, so a network interruption does not create
duplicate words.

## Permissions

The manifest requests:

| Permission | Reason |
| --- | --- |
| `storage` | Save connection settings and lightweight extension state |
| `alarms` | Schedule background synchronization retries |
| `activeTab` and `scripting` | Read the current selection and page context after user action |
| Dictionary host access | Query Datamuse and Dictionary API |
| Optional HTTP/HTTPS host access | Connect to the Vocabify API chosen by the user |

The extension does not use the web application's HttpOnly cookie. It sends the capture
token as a Bearer credential only to the configured API base URL.

## Source layout

```text
extension/
|-- manifest.json       Manifest V3 declaration
|-- build.mjs           TypeScript build and static-file copy
|-- src/
|   |-- popup.*         popup UI and orchestration
|   |-- background.ts   alarms and background synchronization
|   |-- auth.ts         connection settings and authenticated requests
|   |-- db.ts           IndexedDB persistence
|   |-- sync.ts         push, pull, and list refresh
|   |-- dictionary.ts   suggestions and definitions
|   |-- normalize.ts    capture normalization
|   `-- uuid.ts         stable local identifiers
`-- test/               Node tests for persistence and dictionary behavior
```

## Tests

```bash
npm test
```

The test command rebuilds the extension, then runs the Node test suite. IndexedDB behavior
uses `fake-indexeddb`, so Chrome is not required for automated tests.

For a build-only check:

```bash
npm run build
```

## Troubleshooting

- **Connection fails:** confirm the API URL includes the correct scheme and port, the
  token is active, and the API is running.
- **CORS error:** add the exact generated extension origin to `App:ExtensionOrigins`, then
  restart the API.
- **No lists appear:** the connected account must own at least one destination list;
  reconnect or retry after the API is reachable.
- **Capture remains pending:** keep the extension installed and verify network access to
  the configured API. Background retries resume automatically.
