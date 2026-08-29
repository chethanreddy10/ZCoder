const express = require("express");
const axios = require("axios");

const router = express.Router();

const DIGITOMIZE_API = "https://api.digitomize.com/contests";
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

let cache = { data: null, fetchedAt: 0 };

// GET /api/contests — proxy Digitomize contest data with caching
router.get("/contests", async (req, res) => {
  const now = Date.now();

  // Return cached data if fresh
  if (cache.data && now - cache.fetchedAt < CACHE_TTL_MS) {
    return res.json(cache.data);
  }

  try {
    const response = await axios.get(DIGITOMIZE_API, { timeout: 10000 });
    cache = { data: response.data, fetchedAt: now };
    res.json(response.data);
  } catch (err) {
    // If we have stale cache, serve it rather than failing
    if (cache.data) {
      return res.json(cache.data);
    }
    const message = err.response?.data?.error || err.message || "Failed to fetch contests";
    res.status(502).json({ error: message });
  }
});

module.exports = router;
