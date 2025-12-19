#!/usr/bin/env node
const express = require("express");
const fetch = require("node-fetch");
const fs = require("fs").promises;
const path = require("path");

const PORT = process.env.PORT || 5174;
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

  // Try cache candidates: include both the normalized name and the variant with/without trailing 's'
  const alt = normalized.endsWith("s")
    ? normalized.slice(0, -1)
    : `${normalized}s`;
  const candidates = Array.from(
    new Set([normalized, alt].map((c) => String(c).replace(/-+$/g, ""))),
  );

  for (const cand of candidates) {
    const fn = path.join(CACHE_DIR, `${cand}-lan.json`);
    try {
      const st = await fs.stat(fn);
      const age = Date.now() - st.mtimeMs;
      if (age <= MAX_AGE_MS) {
        const content = await fs.readFile(fn, "utf8");
        try {
          const parsed = JSON.parse(content);
          res.setHeader("Content-Type", "application/json");
          return res.send(parsed);
        } catch (err) {
          // Corrupt cache — remove and continue to next candidate
          try {
            await fs.unlink(fn);
          } catch (e) {}
        }
      }
    } catch (err) {
      // missing file or stat error — ignore and continue
    }
  }

  // Otherwise attempt to fetch from upstream trying both candidate forms (with and without 's')
  try {
    for (const cand of candidates) {
      const apiLanCandidate = `${cand}-lan`;
      const url = `https://www.henrikhjelm.se/api/getdata.php?lan=${encodeURIComponent(apiLanCandidate)}`;
      try {
        const resp = await fetch(url, { timeout: 10000 });
        if (!resp.ok) continue; // try next candidate
        const contentType =
          (resp.headers &&
            resp.headers.get &&
            resp.headers.get("content-type")) ||
          "";
        const bodyText = await resp.text();
        if (!contentType.includes("application/json")) {
          continue;
        }
        let parsed;
        try {
          parsed = JSON.parse(bodyText);
        } catch (err) {
          continue;
        }

        // Save to cache file for this candidate
        const filenameForCache = path.join(CACHE_DIR, `${cand}-lan.json`);
        try {
          await fs.writeFile(filenameForCache, JSON.stringify(parsed), "utf8");
        } catch (err) {
          console.error("Failed to write cache file", err);
        }

        res.setHeader("Content-Type", "application/json");
        return res.send(parsed);
      } catch (fetchErr) {
        // try next candidate
        continue;
      }
    }

    // If we reach here no candidate succeeded
    return res
      .status(502)
      .json({ error: "Upstream did not return JSON for any lan variant" });
  } catch (err) {
    console.error("Fetch error", err);
    return res.status(500).json({ error: "Fetch failed" });
  }
});

app.listen(PORT, () => {
  console.log(`Fuel cache server listening on http://localhost:${PORT}`);
});
