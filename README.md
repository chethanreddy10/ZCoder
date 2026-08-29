# ZCoder

ZCoder is a collaborative coding-practice platform. It combines a React interface with an Express/MongoDB backend, real-time Socket.IO rooms, an AI assistant powered by [Groq](https://groq.com), code execution through [OnlineCompiler.io](https://onlinecompiler.io), and problem data from LeetCode.

## Features

- Account registration, login, JWT-protected API access, and editable user profiles.
- Problem dashboard with filters (tags, difficulty, search), bookmarks, and discussion solutions.
- Monaco code editor with C++, Java, Python, and TypeScript execution via OnlineCompiler.io.
- Code execution includes timeout handling, automatic retries, and execution stats (time & memory).
- Authenticated collaborative rooms with shared code/input and persisted chat messages.
- AI assistant (Groq / Qwen 3.6) with markdown rendering, code block copy, suggestion chips, and typing indicators.
- Contest calendar pulling live data from Digitomize (proxied through backend with 10-min cache).
- Three switchable UI themes.

> ZCoder saves submitted solutions; it does not yet include an automated test-case judge or acceptance verdicts.

## Tech Stack

| Layer | Technology |
| --- | --- |
| Frontend | React 19, Vite, Monaco Editor, React Router 7, Axios |
| Backend | Express 5, Node.js, Socket.IO, JWT auth |
| Database | MongoDB (Mongoose) |
| Code Execution | [OnlineCompiler.io](https://onlinecompiler.io) sync API (1M free requests/month) |
| AI Assistant | [Groq](https://groq.com) SDK — `qwen/qwen3.6-27b` |
| Problem Data | LeetCode (via third-party API) |

## Prerequisites

- Node.js 20 or later
- MongoDB (local instance or MongoDB Atlas)
- A [Groq API key](https://console.groq.com) (free tier available)
- An [OnlineCompiler.io API key](https://api.onlinecompiler.io) (free: 1M requests/month, no credit card)

## Setup

### Backend

```bash
cd backend
npm install
cp .env.example .env        # or: Copy-Item .env.example .env on Windows
```

Edit `backend/.env`:

| Variable | Description |
| --- | --- |
| `MONGODB_URI` | MongoDB connection string (default: `mongodb://localhost:27017/zcoder`) |
| `JWT_SECRET` | Random string, 32+ characters |
| `GROQ_API_KEY` | Your Groq API key |
| `COMPILER_API_KEY` | Your OnlineCompiler.io API key |
| `CLIENT_ORIGIN` | Frontend URL for CORS (default: `http://localhost:5173`) |
| `PORT` | Server port (default: `3000`) |

### Frontend

```bash
cd frontend
npm install
cp .env.example .env        # or: Copy-Item .env.example .env on Windows
```

Edit `frontend/.env`:

| Variable | Description |
| --- | --- |
| `VITE_BACKEND_URL` | Backend URL (default: `http://localhost:3000`) |

## Run Locally

Start the backend:

```bash
cd backend
npm start
```

For watch mode during development (Node 20+):

```bash
npm run dev
```

In a second terminal, start the frontend:

```bash
cd frontend
npm run dev
```

Open the Vite URL shown in the terminal, normally `http://localhost:5173`.

## Deployment
> For a detailed step-by-step walkthrough with free hosting, see [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).

### Backend (Render / Railway / Fly.io)

1. Push your code to GitHub
2. Create a new Web Service
3. Set environment variables:
   - `MONGODB_URI` — your MongoDB Atlas connection string
   - `JWT_SECRET` — a strong random secret (32+ chars)
   - `GROQ_API_KEY` — your Groq API key
   - `COMPILER_API_KEY` — your OnlineCompiler.io API key
   - `CLIENT_ORIGIN` — your deployed frontend URL (e.g., `https://your-app.vercel.app`)
   - `PORT` — the port your platform assigns (Render auto-sets this)
4. Start command: `node index.js`

### Frontend (Vercel / Netlify / Cloudflare Pages)

1. Push your code to GitHub
2. Create a new project pointing to the `frontend/` directory
3. Set environment variable:
   - `VITE_BACKEND_URL` — your deployed backend URL (e.g., `https://your-api.onrender.com`)
4. Build command: `npm run build`
5. Output directory: `dist`

### Quick Deploy with Vercel CLI

```bash
cd frontend
npx vercel --prod
```

## Verification

```bash
# Run backend tests
cd backend
npm test

# Lint and build frontend
cd ../frontend
npm run lint
npm run build
```

## Project Structure

```
├── backend/
│   ├── config/          # DB connection, JWT helpers
│   ├── middleware/       # Auth middleware
│   ├── models/          # Mongoose schemas (User, Solution, Bookmarks, Message)
│   ├── routes/          # Express routes (auth, AI, execution, contests, bookmarks, profiles, solutions)
│   ├── test/            # Node.js built-in tests
│   ├── utils/           # Input validation helpers
│   ├── index.js         # Server entry point
│   └── socketHandler.js # Real-time room events
├── frontend/
│   ├── src/
│   │   ├── components/  # Editor, header, language selector, etc.
│   │   ├── lib/         # Auth helpers, API client, HTML sanitizer
│   │   ├── pages/       # Route pages (Home, Dashboard, Rooms, AI, Calendar, etc.)
│   │   └── styles/      # CSS per page/component
│   └── vite.config.js   # Dev proxy, build config
├── docs/
│   ├── CODE_EXECUTION.md  # How code execution works, problems encountered, and fixes
│   └── DEPLOYMENT.md      # Step-by-step deployment guide (Render + Vercel)
```

## Code Execution

See [docs/CODE_EXECUTION.md](docs/CODE_EXECUTION.md) for a detailed explanation of how code execution works, the problems encountered during integration (CORS, API key issues, auth middleware mismatches), and how each was resolved.

**Supported languages:**

| Language | Compiler ID | Monaco Language |
| --- | --- | --- |
| C++ | `g++-15` | `cpp` |
| Java | `openjdk-25` | `java` |
| Python | `python-3.14` | `python` |
| TypeScript | `typescript-deno` | `typescript` |

**Execution features:**
- 30-second timeout per request
- Automatic retry with exponential backoff (up to 2 retries)
- Execution time and memory usage displayed in output panel

## Environment Variables

| File | Variables |
| --- | --- |
| `backend/.env` | `MONGODB_URI`, `JWT_SECRET`, `GROQ_API_KEY`, `COMPILER_API_KEY`, `CLIENT_ORIGIN`, `PORT` |
| `frontend/.env` | `VITE_BACKEND_URL` |

Never commit real `.env` files or secrets.
