const express = require("express");
const fs = require("fs");
const path = require("path");
const fetch = require("node-fetch");

const app = express();
const PORT = 4000;

// CORS middleware
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET,PUT,POST,DELETE,OPTIONS");
  res.header(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, Content-Length, X-Requested-With",
  );
  if (req.method === "OPTIONS") {
    res.sendStatus(200);
  } else {
    next();
  }
});

// Cache directory
const CACHE_DIR = path.join(__dirname, "fuel-cache");
if (!fs.existsSync(CACHE_DIR)) {
  fs.mkdirSync(CACHE_DIR);
}

// Helper: get cache file path for a län
function getCacheFile(lan) {
  return path.join(CACHE_DIR, `${lan}.json`);
}

// Helper: check if cache is fresh (<8h)
function isCacheFresh(filePath) {
  try {
    const stats = fs.statSync(filePath);
    const ageMs = Date.now() - stats.mtimeMs;
    return ageMs < 8 * 60 * 60 * 1000; // 8 hours
  } catch {
    return false;
  }
}

// API route with caching
app.get("/api/fuel", async (req, res) => {
  const lan = req.query.lan || "";
  if (!lan) {
    return res.status(400).json({ error: "Missing län parameter" });
  }
  const cacheFile = getCacheFile(lan);
  if (isCacheFresh(cacheFile)) {
    // Serve from cache
    try {
      const data = fs.readFileSync(cacheFile, "utf8");
      res.header("Access-Control-Allow-Origin", "*");
      res.type("application/json").send(data);
      return;
    } catch (err) {
      // Fall through to fetch if cache read fails
      console.error("Cache read error:", err);
    }
  }
  // Fetch from remote and update cache
  try {
    const apiUrl = `https://www.henrikhjelm.se/api/getdata.php?lan=${encodeURIComponent(lan)}`;
    const apiRes = await fetch(apiUrl);
    if (!apiRes.ok) throw new Error(`API error: ${apiRes.status}`);
    const json = await apiRes.text();
    fs.writeFileSync(cacheFile, json, "utf8");
    res.header("Access-Control-Allow-Origin", "*");
    res.type("application/json").send(json);
    console.log(`[CACHE MISS] Updated ${cacheFile}`);
  } catch (err) {
    // On error, try to serve stale cache if available
    if (fs.existsSync(cacheFile)) {
      const data = fs.readFileSync(cacheFile, "utf8");
      res.header("Access-Control-Allow-Origin", "*");
      res.type("application/json").send(data);
      console.warn(`[STALE CACHE] Served for ${cacheFile} due to error:`, err);
    } else {
      res
        .status(502)
        .json({ error: "Failed to fetch fuel data", details: err.message });
    }
  }
});

app.listen(PORT, () => {
  console.log(`Proxy server running at http://localhost:${PORT}`);
});
