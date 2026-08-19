# Onchain Kitty

A responsive maximalist website for the Onchain Kitty WL campaign and evolving ecosystem. It includes Home, Game, About, Terms, and Privacy views; the official supplied Kitty art; an interactive four-step X task flow; EVM validation; private server-side submission storage; duplicate-wallet protection; a success/share experience; and protected CSV export.

## Run locally

Node.js 20 or newer is required.

```bash
npm install
npm start
```

Open `http://localhost:4173`.

Run all automated checks with:

```bash
npm run check
```

## Before launch

### 1. Connect the campaign post

Open `public/site-config.js` and replace `xPostUrl` with the exact X campaign-post URL. The follow task already points to `https://x.com/Onchain_Kitty`.

### 2. Add promotional images

Place optimized campaign images in `public/assets/campaign/`, then add each public path to `campaignImages` in `public/site-config.js`:

```js
campaignImages: [
  "/assets/campaign/kitty-01.webp",
  "/assets/campaign/kitty-02.webp",
  "/assets/campaign/kitty-03.webp"
]
```

The site randomly selects one image after a successful application. Until the campaign set arrives, the supplied official Kitty visual is used.

### 3. Configure production storage on Vercel

The Vercel deployment uses a **private Vercel Blob store**. In the connected Vercel project, open **Storage**, create a Blob store with private access, and connect it to the project. Vercel supplies `BLOB_READ_WRITE_TOKEN` automatically. Each normalized wallet is stored at its own non-overwritable private pathname, providing durable duplicate-wallet protection without exposing a public database.

`GET /api/health` reports whether production storage credentials are available.

### 4. Configure protected CSV export

Set a long, private admin token in the server environment:

```bash
ADMIN_EXPORT_TOKEN="replace-with-a-long-random-secret" npm start
```

Export applications through the private admin endpoint:

```bash
curl -H "x-admin-token: replace-with-a-long-random-secret" \
  http://localhost:4173/api/admin/export.csv \
  --output onchain-kitty-wl.csv
```

The public interface does not expose this endpoint or token.

## WL data model

Each stored record contains:

- Wallet address and normalized wallet address
- Optional X username
- Submission timestamp
- Follow completion
- Like completion
- Repost completion
- Comment completion

Local development records are saved to `data/wl-submissions.json` by default with owner-only file permissions. Set `WL_DATA_FILE` to change that location. Vercel production records are stored as private Blob objects under `onchain-kitty/wl/submissions/`; the local JSON file is never deployed as the production database.

## X task verification

The current flow opens X and asks the visitor to return and confirm each task. It intentionally does not claim API verification. If verified X actions become a requirement, add X OAuth and server-side API checks; do not trust browser-only task flags as proof.

## Security notes

- Only public wallet addresses are accepted. Never request seed phrases or private keys.
- Duplicate wallets are blocked case-insensitively on the server.
- CSV export is disabled unless `ADMIN_EXPORT_TOKEN` is configured.
- The submission database is never served from the public directory.
- Security headers and a same-origin Content Security Policy are included.
- Terms and Privacy copy should receive a final legal review before public launch.
