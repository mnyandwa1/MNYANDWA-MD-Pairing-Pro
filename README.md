# MNYANDWA-MD Pairing Pro

Neon animated frontend and a local Express backend for your Baileys pairing module.

## Run locally
1. Install Node.js (18+ recommended).
2. Extract this folder.
3. In this folder run `npm install`.
4. Run `npm start`.
5. Open `http://127.0.0.1:3000`.

The phone field is prefilled with `255672514834` as requested. Use only a WhatsApp account you own or are authorized to link.

## Important compatibility note
The sample creates a `MNYANDWA-MD~` prefix around compressed `creds.json`. Baileys multi-file auth also stores encryption keys in separate files, so a creds-only string may not be sufficient for every bot/session importer. Make sure the bot that imports the session explicitly supports this format before using it.

The server binds to `127.0.0.1` by default so pairing and session data are not exposed publicly. Do not deploy this endpoint publicly without authentication, rate limits, and HTTPS.
