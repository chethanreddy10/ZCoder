const Groq = require("groq-sdk");
const express = require("express");
const router = express.Router();
require('dotenv').config();

// Initialize OpenAI with your API key
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});
const requests = new Map();
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 10;

function rateLimit(req, res, next) {
  const key = req.user.user_id;
  const now = Date.now();
  const active = (requests.get(key) || []).filter((time) => now - time < RATE_LIMIT_WINDOW_MS);
  if (active.length >= RATE_LIMIT_MAX) return res.status(429).json({ error: "Too many AI requests; try again shortly" });
  active.push(now);
  requests.set(key, active);
  next();
}

async function getGroqChatCompletion(message) {
  return groq.chat.completions.create({
    messages: [
      {
        role: "user",
        content: message,
      },
    ],
    model: "qwen/qwen3.6-27b",
  });
}

router.post("/ask-ai", require("../middleware/auth"), rateLimit, async (req, res) => {
  try {
    const { message } = req.body;
    if (typeof message !== "string" || !message.trim() || message.length > 8_000) return res.status(400).json({ error: "A message of up to 8,000 characters is required" });
    const chatCompletion = await getGroqChatCompletion(message);
    let ans = chatCompletion.choices[0]?.message?.content || "";
    res.json({
      answer: ans,
    });
  } catch (error) {
    console.error("AI API error:", error);
    res.status(500).json({ error: "Failed to get AI response" });
  }
});

module.exports = router;
