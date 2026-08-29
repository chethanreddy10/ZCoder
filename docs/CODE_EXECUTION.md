# External API Integrations — How It Works

This document covers all external API integrations in ZCoder: code execution, AI assistant, and contest calendar. Each integration is proxied through the Express backend to keep API keys secret and avoid CORS issues.

---

## Architecture Overview

```
┌──────────────┐       ┌──────────────────┐       ┌─────────────────────┐
│              │──────▶│                  │──────▶│  OnlineCompiler.io  │
│              │       │                  │       │  (Code Execution)   │
│              │◀──────│                  │◀──────│                     │
│              │       │                  │       └─────────────────────┘
│   Frontend   │       │  Express Backend │
│  (React/Vite)│──────▶│   (Node.js)      │       ┌─────────────────────┐
│              │       │                  │──────▶│     Groq API        │
│              │◀──────│                  │◀──────│  (AI Assistant)     │
│              │       │                  │       └─────────────────────┘
│              │──────▶│                  │       ┌─────────────────────┐
│              │       │                  │──────▶│  Digitomize API     │
│              │◀──────│                  │◀──────│  (Contest Calendar) │
└──────────────┘       └──────────────────┘       └─────────────────────┘
     Browser                Your Server              External APIs
```

**All three integrations follow the same pattern:**
- Frontend calls your backend (e.g., `POST /api/execute`)
- Backend validates auth, adds API key, calls the external service
- Backend returns the response to the frontend
- API keys never leave the server

---

## 1. Code Execution — OnlineCompiler.io

### How it works

The user writes code in the Monaco editor and clicks "Run". The frontend sends the code to your backend, which proxies it to OnlineCompiler.io.

```
┌─────────┐  POST /api/execute   ┌─────────┐  POST /api/run-code-sync/  ┌──────────────────┐
│ Browser │ ───────────────────▶ │ Backend │ ─────────────────────────▶ │ OnlineCompiler.io│
│         │ ◀─────────────────── │         │ ◀───────────────────────── │                  │
└─────────┘    JSON response     └─────────┘    JSON response           └──────────────────┘
```

### Request flow

**Step 1 — Frontend collects code and sends request**
```js
// frontend/src/components/ProbCodeEditor.jsx
const response = await axios.post("/api/execute", {
  compiler: COMPILER_IDS[language],  // e.g., "g++-15"
  code: value.trim(),
  input: inputValue,
}, {
  headers: { Authorization: `Bearer ${token}` },
  signal: controller.signal,  // for 30s timeout
});
```

**Step 2 — Backend validates auth and proxies**
```js
// backend/routes/execute.js
router.post("/execute", auth, async (req, res) => {
  const { compiler, code, input } = req.body;
  const response = await axios.post(COMPILER_API_URL, { compiler, code, input }, {
    headers: { Authorization: apiKey, "Content-Type": "application/json" },
    timeout: 35000,
  });
  res.json(response.data);
});
```

**Step 3 — Frontend displays results**
```js
setExecStats({ time: data.time, memory: data.memory });  // shown as ⏱ and 💾
if (data.status === "success") setOutput(data.output);
else setOutput(`Error: ${data.error}`);
```

### Execution features

- **30-second timeout** — `AbortController` cancels the request if it takes too long
- **Automatic retry** — up to 2 retries with exponential backoff (1s, 2s delays)
- **Skip retry on auth errors** — 401, 403, 429 responses are not retried
- **Execution stats** — time (⏱) and memory (💾) displayed above the output panel

### Supported languages

| Language   | Compiler ID     | Monaco Language | Snippet Template              |
|------------|-----------------|-----------------|-------------------------------|
| C++        | `g++-15`        | `cpp`           | `#include <bits/stdc++.h>`    |
| Java       | `openjdk-25`    | `java`          | `public class Main`           |
| Python     | `python-3.14`   | `python`        | `print("Hello World !")`      |
| TypeScript | `typescript-deno`| `typescript`    | `console.log("Hello World!")` |

### Key files

| File | Purpose |
|------|---------|
| `backend/routes/execute.js` | Express route — proxies code execution to OnlineCompiler.io |
| `backend/middleware/auth.js` | Auth middleware — extracts and verifies JWT from Bearer token |
| `frontend/src/components/ProbCodeEditor.jsx` | Monaco editor — Run button, output panel, timeout/retry logic |
| `frontend/src/components/constants.js` | Compiler IDs mapping (`cpp` → `g++-15`, etc.) |
| `frontend/src/components/LanguageSelector.jsx` | Language dropdown — shows human-readable names (C++, Java, etc.) |
| `frontend/vite.config.js` | Dev proxy — `/api` → `http://localhost:3000` |

### OnlineCompiler.io API reference

**Endpoint:** `POST https://api.onlinecompiler.io/api/run-code-sync/`

**Headers:**
```
Authorization: <your-api-key>
Content-Type: application/json
```

**Request:**
```json
{
  "compiler": "g++-15",
  "code": "#include <iostream>\nint main() { std::cout << \"Hello\"; }",
  "input": ""
}
```

**Response:**
```json
{
  "output": "Hello",
  "error": "",
  "status": "success",
  "exit_code": 0,
  "signal": null,
  "time": "0.0248",
  "total": "0.0330",
  "memory": "8192"
}
```

**Free tier limits:**
- 1,000,000 requests/month
- 30-second timeout per execution
- 100KB max code size
- 100KB max input size
- 4 concurrent sync requests
- No network access inside sandbox

---

## 2. AI Assistant — Groq (Qwen 3.6)

### How it works

The user types a coding question and the frontend sends it to your backend, which calls the Groq API with the `qwen/qwen3.6-27b` model.

```
┌─────────┐  POST /api/ask-ai    ┌─────────┐  POST /chat/completions  ┌──────────┐
│ Browser │ ───────────────────▶ │ Backend │ ───────────────────────▶ │ Groq API │
│         │ ◀─────────────────── │         │ ◀─────────────────────── │          │
└─────────┘    JSON response     └─────────┘    JSON response         └──────────┘
```

### Request flow

**Step 1 — Frontend sends message**
```js
// frontend/src/pages/AskAIPage.jsx
const response = await axios.post(`${backendUrl}/api/ask-ai`,
  { message },
  { headers: { Authorization: `Bearer ${token}` } }
);
const aiMessage = { sender: "ai", text: response.data.answer, timestamp: Date.now() };
```

**Step 2 — Backend validates, rate-limits, and calls Groq**
```js
// backend/routes/AskAI.js
router.post("/ask-ai", auth, rateLimit, async (req, res) => {
  const { message } = req.body;
  const chatCompletion = await groq.chat.completions.create({
    messages: [{ role: "user", content: message }],
    model: "qwen/qwen3.6-27b",
  });
  res.json({ answer: chatCompletion.choices[0]?.message?.content });
});
```

**Step 3 — Frontend renders markdown response**
```js
// Uses ReactMarkdown with custom code block rendering
<ReactMarkdown components={{ code({ inline, className, children }) {
  // Fenced code blocks get a header bar with language + copy button
  // Inline code gets styled separately
}}}>{msg.text}</ReactMarkdown>
```

### Features

- **Markdown rendering** — AI responses render as formatted markdown (headers, lists, bold, code blocks)
- **Code block copy** — every fenced code block has a "Copy" button in the header
- **Typing indicator** — animated bouncing dots while waiting for response
- **Suggestion chips** — 4 pre-filled coding questions on the empty state
- **Auto-scroll** — conversation scrolls to bottom on new messages
- **Clear conversation** — "✕ Clear" button resets the chat
- **Rate limiting** — 10 requests per minute per user (429 error if exceeded)

### Model history

| Date | Model | Status |
|------|-------|--------|
| Original | `llama-3.3-70b-versatile` | Deprecated Aug 16, 2026 |
| Current | `qwen/qwen3.6-27b` | Active — recommended replacement |

### Key files

| File | Purpose |
|------|---------|
| `backend/routes/AskAI.js` | Express route — auth, rate limiting, Groq API call |
| `frontend/src/pages/AskAIPage.jsx` | Chat UI — messages, markdown, suggestions, typing indicator |
| `frontend/src/styles/askAI.css` | Chat styles — bubbles, code blocks, typing anima

tion |

### Groq API reference

**Endpoint:** POST https://api.groq.com/openai/v1/chat/completions

**Headers:**
```
Authorization: Bearer <your-groq-api-key>
Content-Type: application/json
```

**Request:**
```json
{
  "messages": [{ "role": "user", "content": "How do I reverse a linked list?" }],
  "model": "qwen/qwen3.6-27b"
}
```

**Response:**
```json
{
  "choices": [{
    "message": { "role": "assistant", "content": "To reverse a linked list..." }
  }]
}
```

---

## 3. Contest Calendar - Digitomize Proxy

### How it works

The calendar page shows upcoming programming contests from LeetCode, Codeforces, CodeChef, AtCoder, etc. The data comes from the Digitomize API, proxied through your backend with 10-minute caching.

### Caching behavior

- **First request** - fetches from Digitomize, caches the response in memory
- **Next 10 minutes** - returns cached data (no external API call)
- **After 10 minutes** - next request fetches fresh data
- **API down** - serves stale cache instead of returning an error

### Key files

| File | Purpose |
|------|---------|
| `backend/routes/contests.js` | Express route - proxies Digitomize API with 10-minute in-memory cache |
| `frontend/src/pages/Calendar.jsx` | Calendar UI - month grid, contest indicators, sidebar |

### Backend route: GET /api/contests

**No authentication required** - public endpoint.

**Response format:**
```json
{
  "total": 26,
  "results": [
    {
      "host": "leetcode",
      "name": "Weekly Contest 517",
      "url": "https://leetcode.com/contest/weekly-contest-517",
      "startTimeUnix": 1788057000,
      "duration": 90
    }
  ]
}
```

---

## Environment Variables

### Backend (backend/.env)

| Variable | Description | Required |
|----------|-------------|----------|
| `COMPILER_API_KEY` | OnlineCompiler.io API key (free: 1M req/month) | For code execution |
| `GROQ_API_KEY` | Groq API key (free tier) | For AI assistant |
| `JWT_SECRET` | Random string, 32+ characters | Always |
| `MONGODB_URI` | MongoDB connection string | Always |
| `CLIENT_ORIGIN` | Frontend URL for CORS (default: http://localhost:5173) | Optional |
| `PORT` | Server port (default: 3000) | Optional |

### Frontend (frontend/.env)

| Variable | Description | Required |
|----------|-------------|----------|
| `VITE_BACKEND_URL` | Backend URL (default: http://localhost:3000) | Always |

---

## Problems Encountered and Solutions

### Problem 1: Piston API is now whitelist-only

**Error:** Public Piston API is now whitelist only as of 2/15/2026.

**Solution:** Switched to OnlineCompiler.io (free: 1M requests/month, no credit card).

### Problem 2: CORS - Browser blocks direct requests to OnlineCompiler.io

**Error:** Network Error

**Solution:** Moved the API call to the backend (POST /api/execute). Browser talks to backend, backend talks to OnlineCompiler.io.

### Problem 3: 500 error - Quotes in API key

**What happened:** .env had API key wrapped in quotes. dotenv includes quotes as part of the value.

**Solution:** Removed quotes. Lesson: Never put quotes around values in .env files.

### Problem 4: 500 error - verifyToken is not an Express middleware

**What happened:** Route used verifyToken from config/auth.js as middleware, but its a plain function.

**Solution:** Reused the existing middleware/auth.js middleware.

### Problem 5: Groq model deprecated

**Error:** Failed to get AI response

**What happened:** llama-3.3-70b-versatile was decommissioned on August 16, 2026.

**Solution:** Migrated to qwen/qwen3.6-27b (Groqs recommended replacement).

### Problem 6: Digitomize API called directly from browser

**What happened:** Calendar page called api.digitomize.com directly. Risks CORS breakage.

**Solution:** Created backend/routes/contests.js with 10-minute caching and stale-data fallback.

### Problem 7: Markdown not rendering in AI responses

**What happened:** CSS targeted .react-markdown but ReactMarkdown v10+ does not add that class.

**Solution:** Wrapped ReactMarkdown output in .markdown-content div, updated all CSS selectors.

---

## Key Files Summary

| File | Purpose |
|------|---------|
| `backend/routes/execute.js` | Code execution proxy to OnlineCompiler.io |
| `backend/routes/AskAI.js` | AI assistant proxy to Groq (Qwen 3.6) |
| `backend/routes/contests.js` | Contest calendar proxy to Digitomize (cached) |
| `backend/middleware/auth.js` | JWT auth middleware (shared by all protected routes) |
| `backend/index.js` | Server entry - registers all routes |
| `frontend/src/components/ProbCodeEditor.jsx` | Monaco editor with Run, output, timeout/retry |
| `frontend/src/components/constants.js` | Compiler IDs and language display names |
| `frontend/src/components/LanguageSelector.jsx` | Language dropdown |
| `frontend/src/pages/AskAIPage.jsx` | AI chat UI with markdown rendering |
| `frontend/src/pages/Calendar.jsx` | Contest calendar with month grid |
| `frontend/vite.config.js` | Dev proxy - /api to backend |
