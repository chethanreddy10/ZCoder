# CODEFLOW.md — System Architecture

This document explains how the entire ZCoder codebase works: how files connect, how data flows through the system, and how each feature operates end-to-end.

---

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         BROWSER (React)                         │
│                                                                 │
│  App.jsx ──▶ Router ──▶ Pages ──▶ Components ──▶ API calls      │
│                                                                 │
│  lib/auth.js     — JWT token helpers (localStorage)             │
│  lib/api.js      — Axios instance with auth interceptor         │
│  lib/sanitizeHtml.js — XSS sanitization for LeetCode HTML      │
└──────────────────────────────┬──────────────────────────────────┘
                               │
                    HTTP (axios) + WebSocket (socket.io)
                               │
┌──────────────────────────────▼──────────────────────────────────┐
│                      SERVER (Express + Node)                     │
│                                                                 │
│  index.js ──▶ Routes ──▶ Controllers ──▶ MongoDB                │
│           ──▶ Socket.IO ──▶ socketHandler.js                    │
│                                                                 │
│  config/auth.js    — JWT sign/verify                            │
│  config/db.js      — MongoDB connection                         │
│  middleware/auth.js — Express auth middleware                    │
│  utils/validation.js — Input validation helpers                 │
└──────────────────────────────┬──────────────────────────────────┘
                               │
                    MongoDB Atlas / OnlineCompiler.io / Groq / Digitomize
```

---

## File-by-File Breakdown

### Backend Files

#### Entry point: `backend/index.js`

This is the server entry point. It:

1. Creates an Express app and HTTP server
2. Configures CORS (allows only `CLIENT_ORIGIN`)
3. Sets up Socket.IO on the HTTP server
4. Registers all route handlers
5. Authenticates WebSocket connections (JWT from `socket.handshake.auth.token`)
6. Connects to MongoDB, then starts listening

**Route registration order:**

```javascript
app.use("/api", aiRoute)           // POST /api/ask-ai
app.use("/", loginRoute)           // POST /register/, POST /login/, GET /api/auth/me
app.use("/api/solutions", ...)     // POST /submit, GET /:problemSlug, POST /vote
app.use("/user", profileRoute)     // POST /profile/update, GET /profile, GET /:id
app.use("/bookmarks", ...)         // GET /, POST /toggle
app.use("/users", usersRoute)      // GET /:username
app.use("/api", executeRoute)      // POST /api/execute
app.use("/api", contestsRoute)     // GET /api/contests
```

**Startup flow:**

```
index.js loads
  → connectDB() (MongoDB)
    → success: server.listen(PORT)
    → failure: process.exit(1)
```

---

#### `config/auth.js` — JWT helpers

Two pure functions, no Express dependency:

- `signToken(payload)` → creates JWT (7-day expiry)
- `verifyToken(token)` → decodes JWT or throws

Used by:

- `LoginRoute.js` — signs tokens on login
- `middleware/auth.js` — verifies tokens on protected routes
- `index.js` — verifies tokens on WebSocket connections
- `socketHandler.js` — accesses `socket.data.user` (set by index.js)

---

#### `middleware/auth.js` — Express auth middleware

Used as `router.post("/path", auth, handler)` on protected routes.

Extracts `Bearer <token>` from `Authorization` header → calls `verifyToken()` → attaches decoded payload to `req.user` → calls `next()`.

**Used by:** AskAI, Solutions, Profile, Bookmarks, execute routes.

---

#### `config/db.js` — MongoDB connection

Single function `connectDB()` that calls `mongoose.connect()`. Called once at startup in `index.js`.

**Schema-less by design** — Mongoose handles validation at the model level.

---

#### `utils/validation.js` — Input validation

Pure functions, no side effects:

- `isValidRoomId(value)` — alphanumeric + hyphens/underscores, max 64 chars
- `isValidProblemSlug(value)` — lowercase alphanumeric + hyphens, max 128 chars
- `isValidSolutionPayload({problemSlug, code, language})` — validates all three fields
- `escapeRegex(value)` — escapes special characters for safe MongoDB regex

**Used by:**

- `socketHandler.js` — validates room IDs on join
- `Solutions.js` — validates solution submissions
- `Bookmarks.js` — validates problem slugs
- `usersRoute.js` — escapes search input before regex

---

#### `routes/LoginRoute.js` — Auth routes

| Method | Path | Auth | What it does |
|--------|------|------|-------------|
| POST | `/register/` | No | Validates input → checks for duplicates → hashes password (bcrypt, 12 rounds) → saves User → 201 |
| POST | `/login/` | No | Finds user by Username → compares password → signs JWT → returns token |
| GET | `/api/auth/me` | Yes | Returns current user profile (used by SolutionDetail to check ownership) |

**Password flow:** Plain text → bcrypt.hash(password, 12) → stored as `HashedPassword` (select: false by default)

---

#### `routes/execute.js` — Code execution proxy

| Method | Path | Auth | What it does |
|--------|------|------|-------------|
| POST | `/api/execute` | Yes | Validates compiler+code → forwards to OnlineCompiler.io → returns result |

**Data flow:**

```
Frontend sends { compiler, code, input }
  → auth middleware verifies JWT
  → backend adds COMPILER_API_KEY as Authorization header
  → POST to api.onlinecompiler.io/api/run-code-sync/
  → response forwarded to frontend
```

---

#### `routes/AskAI.js` — AI assistant proxy

| Method | Path | Auth | What it does |
|--------|------|------|-------------|
| POST | `/api/ask-ai` | Yes | Rate limits (10/min/user) → calls Groq API → returns AI response |

**Data flow:**

```
Frontend sends { message }
  → auth middleware verifies JWT
  → rateLimit() checks 10 req/min per user_id
  → groq.chat.completions.create({ messages, model: "qwen/qwen3.6-27b" })
  → response.choices[0].message.content returned to frontend
```

---

#### `routes/contests.js` — Calendar proxy

| Method | Path | Auth | What it does |
|--------|------|------|-------------|
| GET | `/api/contests` | No | Checks cache → if stale/empty, fetches from Digitomize → caches 10 min |

**Caching:**

```
In-memory: { data, fetchedAt }
if (data && now - fetchedAt < 10 min) → return cache
else → fetch from api.digitomize.com → store in cache → return
if fetch fails but stale cache exists → return stale cache
```

---

#### `routes/Solutions.js` — Solution CRUD

| Method | Path | Auth | What it does |
|--------|------|------|-------------|
| POST | `/submit` | Yes | Validates payload → saves Solution → returns success |
| DELETE | `/:id` | Yes | Checks ownership → deletes |
| GET | `/:problemSlug` | No | Returns all solutions for a problem (populated with author) |
| GET | `/detail/:id` | No | Returns single solution |
| POST | `/vote` | Yes | Upvote/downvote with duplicate prevention |

---

#### `routes/Profile.js` — User profiles

| Method | Path | Auth | What it does |
|--------|------|------|-------------|
| POST | `/profile/update` | Yes | Whitelisted field updates → findByIdAndUpdate |
| GET | `/profile` | Yes | Returns full profile (minus HashedPassword) |
| GET | `/:id` | No | Returns public profile info |
| POST | `/profile/update-password` | Yes | Verifies current password → hashes new → saves |

---

#### `routes/Bookmarks.js` — Problem bookmarks

| Method | Path | Auth | What it does |
|--------|------|------|-------------|
| GET | `/` | Yes | Returns user's bookmarked problem slugs |
| POST | `/toggle` | Yes | Adds or removes a problem slug from bookmarks |

---

#### `routes/usersRoute.js` — User search

| Method | Path | Auth | What it does |
|--------|------|------|-------------|
| GET | `/:username` | No | Regex search for users by Username (escaped, limited to 10) |

---

#### `socketHandler.js` — Real-time rooms

Handles all Socket.IO events. In-memory `rooms` Map stores:

```javascript
rooms = Map {
  "room-id" => {
    users: Map { "username" => connectionCount },
    sharedText: "...",
    sharedInput: "..."
  }
}
```

**Events:**

- `join-room` — validates room ID, loads last 100 messages from MongoDB, emits `room-init` with users, sharedText, and messages
- `chat-msg` — saves to MongoDB, broadcasts to all others
- `text-edit` — updates sharedText and broadcasts to others
- `input-change` — updates sharedInput and broadcasts
- `disconnect` — removes user from room, if room empty deletes it

---

### Frontend Files

#### `App.jsx` — Router

All routes defined here. `protectedPage()` wraps protected routes with `ProtectedRoute`.

**Protected routes:**

- `/` (Dashboard)
- `/dashboard`
- `/problem/:titleSlug`
- `/discussions/:titleSlug`
- `/solution/:id`
- `/rooms`
- `/rooms/:roomId`
- `/askAI`
- `/calendar`
- `/profile`
- `/user/:id`
- `/bookmarks`
- `/code-editor`

**Public routes:**

- `/login`
- `/register`

---

#### `components/ProtectedRoute.jsx` — Auth guard

Checks `isAuthenticated()` (JWT in localStorage). No token → redirect to `/login`.

---

#### `lib/auth.js` — Token helpers

`getToken()`, `isAuthenticated()`, `clearSession()` — all operate on localStorage key `jwtoken`.

---

#### `lib/api.js` — Axios instance

Creates Axios instance with base URL and auth interceptor. Most pages still use manual axios calls.

---

#### `lib/sanitizeHtml.js` — XSS protection

`sanitizeProblemHtml()` strips `<script>`, `<iframe>`, `on*` attributes, unsafe `href`/`src` from LeetCode HTML.

---

#### `components/Header.jsx` — Navigation

Navbar with links. Theme switching (style‑1, style‑2, style‑3). Logout clears localStorage.

---

#### `components/constants.js` — Shared constants

**Compiler IDs:**

- C++ → `g++-15`
- Java → `openjdk-25`
- Python → `python-3.14`
- TypeScript → `typescript-deno`

**Display names:** C++, Java, Python, TypeScript.  
**CODE_SNIPPETS:** default code templates per language.

---

#### `components/ProbCodeEditor.jsx` — Monaco editor

Core editor component: Monaco instance, language selector, Run with timeout/retry, output panel, snippet insertion, theme/font customisation.

---

#### `components/SoloCodeEditor.jsx` — Standalone editor wrapper

Wraps `ProbCodeEditor` for rooms and `/code-editor`. Manages local code/input state.

---

#### `pages/Login.jsx` / `Register.jsx`

POST to `/login/` or `/register/`. Store JWT in localStorage on success.

---

#### `pages/Home.jsx`

Hero section, feature tabs, statistics, user search (`GET /users/:query`), footer.

---

#### `pages/Dashboard.jsx`

Problem list from LeetCode API. Tag/difficulty/search filters, problem limit, random problem picker. Filters saved in localStorage.

---

#### `pages/ProblemDetail.jsx`

Split panel: problem description (sanitized HTML) + `ProbCodeEditor` + Submit button. Resizable divider.

---

#### `pages/RoomPage.jsx`

Two modes: **Chat** (messages + input) and **Editor** (`SoloCodeEditor` with shared code/input via Socket.IO).

---

#### `pages/AskAIPage.jsx`

Chat UI: message bubbles, Markdown rendering, code block copy, typing indicator, suggestion chips.

---

#### `pages/Calendar.jsx`

Month grid with contest indicators. Sidebar for selected date. Fetches from `/api/contests`.

---

#### `pages/ProfilePage.jsx`

Displays user info, skills, degrees, experience, languages. Editable with update form.

---

#### `pages/BookmarksPage.jsx`

Lists bookmarked problems; each can be opened directly.

---

#### `pages/CodeEditorPage.jsx`

Standalone editor using `SoloCodeEditor` – no room context.

---

## Data Flow Diagrams

### Authentication Flow

1. User submits login → `POST /login/ { username, password }`
2. Backend finds user, compares bcrypt hash
3. `signToken({ username, user_id })` → JWT (7‑day expiry)
4. Frontend stores JWT in localStorage
5. All requests include: `Authorization: Bearer <token>`
6. `middleware/auth.js` verifies token → `req.user = { username, user_id }`

---

### Code Execution Flow

1. User clicks Run → `POST /api/execute { compiler, code, input }`
2. Backend auth middleware verifies JWT
3. Backend calls OnlineCompiler.io with API key
4. Docker sandbox runs code
5. Returns `{ output, error, status, time, memory }`
6. Frontend displays output + stats

---

### Real-Time Room Flow

1. User navigates to `/rooms/my-room`
2. `RoomPage` connects Socket.IO with JWT auth
3. Client emits `join-room { roomId }`
4. Server validates, loads last 100 messages from MongoDB
5. Emits `room-init` with users, sharedText, messages
6. Chat: `chat-msg` → save to MongoDB → broadcast
7. Editor: `text-edit` → broadcast to others
8. Disconnect: remove from room → delete if empty

---

## Database Models

### User
```javascript
{
  Username: { type: String, unique: true },
  HashedPassword: { type: String, select: false },
  email: { type: String, unique: true },
  name: String,
  profilePicture: String,
  role: String,             // e.g., "student", "professional"
  skills: [String],
  degrees: [String],
  experience: [String],
  languages: [String],
  timestamps: true
}
```

### Solution
```javascript
{
  problemSlug: String,
  code: String,
  language: String,
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  votes: { type: Number, default: 0 },
  voterChoices: [String],   // usernames who voted
  createdAt: Date
}
```

### Message
```javascript
{
  roomId: String,
  username: String,
  message: String,
  timestamp: Date
}
```

### Bookmarks
```javascript
{
  username: { type: String, unique: true },
  bookmarks: [String],      // problem slugs
  timestamps: true
}
```

---

## Environment Variables

### Backend

| Variable | Purpose | Default |
|----------|---------|---------|
| `MONGODB_URI` | MongoDB connection string | `mongodb://localhost:27017/zcoder` |
| `JWT_SECRET` | JWT signing secret (32+ chars) | **required** |
| `COMPILER_API_KEY` | OnlineCompiler.io API key | required for code execution |
| `GROQ_API_KEY` | Groq API key | required for AI |
| `CLIENT_ORIGIN` | Allowed CORS origins | `http://localhost:5173` |
| `PORT` | Server port | `3000` |

### Frontend

| Variable | Purpose | Default |
|----------|---------|---------|
| `VITE_BACKEND_URL` | Backend server URL | `http://localhost:3000` |

---

## Dev vs Production

### Development
- Vite dev server on port `5173`, proxy `/api/*` to `localhost:3000`
- Backend on port `3000` with watch mode (`nodemon`)
- HMR for frontend

### Production
- Frontend built to `dist/` (static), served by Vercel/Netlify/Cloudflare
- Backend on Render/Railway/Fly.io
- Frontend sets `VITE_BACKEND_URL`, backend sets `CLIENT_ORIGIN`
- No proxy – frontend calls backend via absolute URL

---

## Testing & Deployment Notes

- **API rate limiting** is applied to `/api/ask-ai` (10 requests per minute per user)
- **CORS** is strict – only `CLIENT_ORIGIN` is allowed
- **WebSocket** connections are authenticated using the same JWT as HTTP
- **Passwords** are never sent in plain text; always hashed with bcrypt (12 rounds)
- **Input validation** is performed at the API boundary (see `utils/validation.js`)
- **XSS protection** via `sanitizeHtml` on all LeetCode‑supplied HTML content