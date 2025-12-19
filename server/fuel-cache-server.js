#!/usr/bin/env node
const express = require("express");
const fetch = require("node-fetch");
const fs = require("fs").promises;
const path = require("path");

const PORT = process.env.PORT || 5176;
const CACHE_DIR = path.join(__dirname, "..", "fuel-cache");
const MAX_AGE_MS = 8 * 60 * 60 * 1000; // 8 hours

const app = express();

app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  next();
});

const normalizeLanForFile = (lan) => {
  if (!lan) return "";
  let v = String(lan).toLowerCase().trim();
  v = v.replace(/[åä]/g, "a").replace(/ö/g, "o");
  v = v.replace(/\s+/g, "-");
  v = v.replace(/[^a-z0-9\-]/g, "");
  // remove trailing -lan if present
  v = v.replace(/-?lan$/, "");
  return v;
};

const pruneOldFiles = async () => {
  try {
    const files = await fs.readdir(CACHE_DIR);
    const now = Date.now();
    await Promise.all(
      files.map(async (f) => {
        const p = path.join(CACHE_DIR, f);
        try {
          const st = await fs.stat(p);
          if (now - st.mtimeMs > MAX_AGE_MS) {
            await fs.unlink(p);
          }
        } catch (err) {
          // ignore
        }
      }),
    );
  } catch (err) {
    // ignore
  }
};

app.get("/api/fuel", async (req, res) => {
  const lan = req.query.lan || "";
  const normalized = normalizeLanForFile(lan);
  if (!normalized)
    return res.status(400).json({ error: "Missing lan parameter" });

  try {
    await fs.mkdir(CACHE_DIR, { recursive: true });
  } catch (err) {
    // ignore
  }

  // prune old files in background (best-effort)
  pruneOldFiles().catch(() => {});

  const filename = path.join(CACHE_DIR, `${normalized}-lan.json`);

  // Serve from cache if fresh
  try {
    const st = await fs.stat(filename);
    const age = Date.now() - st.mtimeMs;
    if (age <= MAX_AGE_MS) {
      const content = await fs.readFile(filename, "utf8");
      // Validate cached content is JSON. If not, remove cache and continue to fetch upstream.
      try {
        const parsed = JSON.parse(content);
        res.setHeader("Content-Type", "application/json");
        return res.send(parsed);
      } catch (err) {
        // Corrupt or HTML cached file — remove and fallback to fetching fresh data
        try {
          await fs.unlink(filename);
        } catch (e) {}
      }
    }
  } catch (err) {
    // file doesn't exist or stat failed
  }

  // Otherwise fetch from external API
  try {
    // The external API expects å/ä/ö replaced by a/a/o, 'county' -> 'lan', and spaces -> '-' per requirement
    const apiLan = String(lan)
      .toLowerCase()
      .replace(/[åä]/g, "a")
      .replace(/ö/g, "o")
      .replace(/\bcounty\b$/, "lan")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-+|-+$/g, "");
    const url = `https://www.henrikhjelm.se/api/getdata.php?lan=${encodeURIComponent(apiLan)}`;
    const resp = await fetch(url, { timeout: 10000 });
    if (!resp.ok) return res.status(502).json({ error: "Upstream error" });

    const contentType =
      (resp.headers && resp.headers.get && resp.headers.get("content-type")) ||
      "";
    const bodyText = await resp.text();

    // Ensure upstream returned JSON — if not, return an error
    if (!contentType.includes("application/json")) {
      console.error("Upstream returned non-JSON content-type:", contentType);
      return res
        .status(502)
        .json({ error: "Upstream returned non-JSON response" });
    }

    // Validate JSON
    let parsed;
    try {
      parsed = JSON.parse(bodyText);
    } catch (err) {
      console.error("Upstream returned invalid JSON body");
      return res.status(502).json({ error: "Upstream returned invalid JSON" });
    }

    // Save to cache file
    try {
      await fs.writeFile(filename, JSON.stringify(parsed), "utf8");
    } catch (err) {
      console.error("Failed to write cache file", err);
    }

    res.setHeader("Content-Type", "application/json");
    return res.send(parsed);
  } catch (err) {
    console.error("Fetch error", err);
    return res.status(500).json({ error: "Fetch failed" });
  }
});

app.listen(PORT, () => {
  console.log(`Fuel cache server listening on http://localhost:${PORT}`);
});
