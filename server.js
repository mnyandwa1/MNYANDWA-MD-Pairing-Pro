"use strict";

const express = require("express");
const path = require("path");
const pairing = require("./pairing");

const app = express();
app.use(express.json({ limit: "10kb" }));
app.use(express.static(path.join(__dirname, "public")));

app.get("/api/status", (_req, res) => {
  const status = pairing.getStatus();
  // Never return a session string until pairing has succeeded.
  res.json(status);
});

app.post("/api/pair/start", async (req, res) => {
  const phone = String(req.body?.phone || "").replace(/\D/g, "");
  if (phone.length < 7 || phone.length > 15) {
    return res.status(400).json({ error: "Weka namba sahihi pamoja na country code." });
  }
  await pairing.startPairing(phone);
  res.json(pairing.getStatus());
});

app.post("/api/pair/cancel", async (_req, res) => {
  await pairing.cancelPairing();
  res.json(pairing.getStatus());
});

// Localhost-only by default so the pairing/session endpoint is not exposed publicly.
const PORT = Number(process.env.PORT || 3000);
app.listen(PORT, "127.0.0.1", () => {
  console.log(`MNYANDWA-MD Pairing Pro: http://127.0.0.1:${PORT}`);
});
