"use strict";

const {
  default: makeWASocket,
  fetchLatestWaWebVersion,
  useMultiFileAuthState,
} = require("@whiskeysockets/baileys");
const path = require("path");
const fs = require("fs-extra");
const zlib = require("zlib");
const pino = require("pino");

const TEMP_DIR = path.join(__dirname, "pairing_temp");

let _socket = null;
let _code = null;
let _sessionId = null;
let _status = "idle";
let _error = null;
let _busy = false;

function getStatus() {
  return { status: _status, code: _code, sessionId: _sessionId, error: _error };
}

async function cleanup() {
  if (_socket) {
    try { _socket.end(undefined); } catch (_) {}
    _socket = null;
  }
  try { await fs.remove(TEMP_DIR); } catch (_) {}
}

async function cancelPairing() {
  await cleanup();
  _code = null;
  _sessionId = null;
  _error = null;
  _status = "idle";
  _busy = false;
  return getStatus();
}

async function startPairing(rawPhone) {
  if (_busy) {
    _error = "Pairing tayari inaendelea.";
    return getStatus();
  }

  _busy = true;
  await cleanup();
  _code = null;
  _sessionId = null;
  _error = null;
  _status = "requesting";

  const phone = String(rawPhone || "").replace(/\D/g, "");
  if (phone.length < 7 || phone.length > 15) {
    _status = "error";
    _error = "Namba si sahihi. Tumia country code, mfano 255...";
    _busy = false;
    return getStatus();
  }

  try {
    await fs.ensureDir(TEMP_DIR);
    const { version } = await fetchLatestWaWebVersion();
    const { state, saveCreds } = await useMultiFileAuthState(TEMP_DIR);

    _socket = makeWASocket({
      version,
      auth: state,
      logger: pino({ level: "silent" }),
      browser: ["MNYANDWA-MD", "Chrome", "1.0.0"],
      printQRInTerminal: false,
      connectTimeoutMs: 60000,
      defaultQueryTimeoutMs: 30000,
    });

    _socket.ev.on("creds.update", saveCreds);

    _socket.ev.on("connection.update", async ({ connection }) => {
      if (connection === "open") {
        try {
          await saveCreds();
          const credsPath = path.join(TEMP_DIR, "creds.json");
          if (!(await fs.pathExists(credsPath))) {
            throw new Error("Baileys haikuandika creds.json.");
          }
          const credsJson = await fs.readFile(credsPath, "utf8");
          const compressed = zlib.gzipSync(Buffer.from(credsJson, "utf8"));
          _sessionId = "MNYANDWA-MD~" + compressed.toString("base64");
          _status = "success";
          setTimeout(() => { cleanup(); }, 5000);
        } catch (err) {
          _status = "error";
          _error = err.message;
        } finally {
          _busy = false;
        }
      } else if (connection === "close" && _status !== "success") {
        _status = "error";
        _error = "Muunganisho umefungwa kabla pairing kukamilika.";
        _busy = false;
      }
    });

    const rawCode = await _socket.requestPairingCode(phone);
    _code = rawCode?.match(/.{1,4}/g)?.join("-") || rawCode;
    _status = "ready";
    _busy = false;
    return getStatus();
  } catch (err) {
    _status = "error";
    _error = err.message || "Hitilafu ya pairing.";
    _busy = false;
    await cleanup();
    return getStatus();
  }
}

module.exports = { startPairing, cancelPairing, getStatus };
