const express = require("express");
const axios = require("axios");
const auth = require("../middleware/auth");

const router = express.Router();

const COMPILER_API_URL = "https://api.onlinecompiler.io/api/run-code-sync/";

// POST /api/execute — proxy code execution to OnlineCompiler.io
router.post("/execute", auth, async (req, res) => {
  const apiKey = process.env.COMPILER_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "Compiler API key not configured on server." });
  }

  const { compiler, code, input } = req.body;

  if (!compiler || !code) {
    return res.status(400).json({ error: "Missing required fields: compiler, code" });
  }

  try {
    const response = await axios.post(
      COMPILER_API_URL,
      { compiler, code, input: input || "" },
      {
        headers: {
          Authorization: apiKey,
          "Content-Type": "application/json",
        },
        timeout: 35000,
      }
    );

    res.json(response.data);
  } catch (err) {
    const status = err.response?.status || 500;
    const message = err.response?.data?.error || err.message || "Execution failed";
    res.status(status).json({ error: message });
  }
});

module.exports = router;
