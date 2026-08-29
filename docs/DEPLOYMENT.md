# Deployment Guide — ZCoder

Step-by-step guide to deploy ZCoder for **free** using Render (backend), Vercel (frontend), and MongoDB Atlas (database).

---

## Overview

| Service | Provider | Free Tier |
| --- | --- | --- |
| Backend (Express) | [Render](https://render.com) | Web Service — 750 hrs/month |
| Frontend (React/Vite) | [Vercel](https://vercel.com) | Unlimited static hosting |
| Database (MongoDB) | [MongoDB Atlas](https://www.mongodb.com/atlas) | M0 — 512 MB, free forever |
| AI (Groq) | [Groq](https://console.groq.com) | Free tier — generous rate limits |
| Code Execution | [OnlineCompiler.io](https://api.onlinecompiler.io) | 1M requests/month, no credit card |

---

## Step 1: Get Your API Keys

You need two API keys before deploying.

### 1a. Groq API Key (for AI Assistant)

1. Go to [console.groq.com](https://console.groq.com) and sign up (free, no credit card)
2. Go to **API Keys** → **Create API Key**
3. Copy the key (starts with `gsk_...`)
4. Keep it safe — you'll need it for the backend

### 1b. OnlineCompiler.io API Key (for Code Execution)

1. Go to [api.onlinecompiler.io](https://api.onlinecompiler.io) and sign up (free, no credit card)
2. Click **API Keys** → **Create Key**
3. App Name: `ZCoder` (or anything you want)
4. Leave Callback URL and IP Restriction empty
5. Copy the key
6. Keep it safe — you'll need it for the backend

---

## Step 2: Set Up MongoDB Atlas (Free Database)

1. Go to [mongodb.com/atlas](https://www.mongodb.com/atlas) and sign up (free)
2. Click **Build a Database** → choose the **M0 Sandbox (Free)** plan
3. Pick a cloud provider and region close to you
4. Create a **database user**:
   - Go to **Database Access** (left sidebar)
   - Click **Add New Database User**
   - Authentication Method: **Password**
   - Username: `zcoder` (or anything you like)
   - Password: generate a strong one and **save it**
   - Click **Add User**
5. Allow network access:
   - Go to **Network Access** (left sidebar)
   - Click **Add IP Address** → **Allow Access from Anywhere** (`0.0.0.0/0`)
   - Click **Confirm**
6. Get your connection string:
   - Go to **Database** (left sidebar) → click **Connect** on your cluster
   - Choose **Connect your application**
   - Copy the connection string. It looks like:
     ```
     mongodb+srv://zcoder:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
     ```
   - Replace `<password>` with the database user password you created
   - **Save this** — you'll need it for Render

---

## Step 3: Push Your Code to GitHub

If you haven't already, push your project to a GitHub repository.

```bash
cd your-zcoder-folder
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_USERNAME/ZCoder.git
git push -u origin main
```

---

## Step 4: Deploy the Backend on Render

1. Go to [render.com](https://render.com) and sign up (free, can use GitHub login)
2. Click **New** → **Web Service**
3. Connect your GitHub repository
4. Fill in the settings:

| Field | Value |
| --- | --- |
| **Name** | `zcoder-backend` (or anything) |
| **Region** | Singapore / Oregon / Frankfurt (closest to your users) |
| **Branch** | `main` |
| **Runtime** | `Node` |
| **Build Command** | `cd backend && npm install` |
| **Start Command** | `cd backend && node index.js` |
| **Instance Type** | **Free** |

5. Before deploying, click **Advanced** → **Add Environment Variables** and add:

| Key | Value |
| --- | --- |
| `MONGODB_URI` | Your MongoDB Atlas connection string (from Step 2) |
| `JWT_SECRET` | A random string, 32+ characters (e.g., run `openssl rand -hex 32` in terminal) |
| `GROQ_API_KEY` | Your Groq API key (from Step 1a) |
| `COMPILER_API_KEY` | Your OnlineCompiler.io API key (from Step 1b) |
| `CLIENT_ORIGIN` | Leave blank for now — update after frontend is deployed |
| `PORT` | `3000` |

6. Click **Create Web Service**
7. Wait for the deploy to finish (~2-3 minutes)
8. Once live, Render gives you a URL like `https://zcoder-backend.onrender.com`
9. Test it by opening `https://zcoder-backend.onrender.com/ping` — you should see `{"msg":"API is working !!"}`

> ⚠️ **Render free tier spins down after 15 minutes of inactivity.** The first request after idle takes ~30-60 seconds to wake up. This is normal on the free plan.

---

## Step 5: Deploy the Frontend on Vercel

1. Go to [vercel.com](https://vercel.com) and sign up (free, can use GitHub login)
2. Click **Add New** → **Project**
3. Import your GitHub repository
4. Fill in the settings:

| Field | Value |
| --- | --- |
| **Framework Preset** | Vite (auto-detected) |
| **Root Directory** | `frontend` |
| **Build Command** | `npm run build` |
| **Output Directory** | `dist` |

5. Click **Environment Variables** and add:

| Key | Value |
| --- | --- |
| `VITE_BACKEND_URL` | Your Render backend URL (e.g., `https://zcoder-backend.onrender.com`) |

6. Click **Deploy**
7. Wait for the deploy to finish (~1-2 minutes)
8. Once live, Vercel gives you a URL like `https://zcoder-xxxxx.vercel.app`

---

## Step 6: Update Backend CORS

Now that you have your frontend URL, update the backend to allow requests from it:

1. Go to [render.com](https://render.com) → your `zcoder-backend` service
2. Go to **Environment** tab
3. Update the `CLIENT_ORIGIN` variable to your Vercel URL:
   ```
   https://zcoder-xxxxx.vercel.app
   ```
4. Click **Save Changes** — Render auto-redeploys

---

## Step 7: Verify Everything

1. Open your Vercel URL in a browser
2. **Register** a new account
3. **Log in** — you should be redirected to the Home page
4. Go to **Dashboard** — problems should load from LeetCode
5. Click a problem → **Write code** → click **Run** — code should execute
6. Go to **Online IDE** → type code → click **Run** — should work
7. Go to **Ask AI** → send a question — AI should respond with markdown
8. Go to **Rooms** → create a room → share the URL with a friend

---

## Troubleshooting

### "Network Error" on login/register
- Your frontend URL is not in the backend's `CLIENT_ORIGIN` environment variable
- Make sure `CLIENT_ORIGIN` matches your Vercel URL exactly (including `https://`)

### Code execution returns 500
- Check that `COMPILER_API_KEY` is set correctly in Render (no extra quotes)
- The OnlineCompiler.io API key might need to be re-generated

### AI assistant returns "Failed to get AI response"
- Check that `GROQ_API_KEY` is set correctly in Render
- The model `qwen/qwen3.6-27b` is the current model (as of August 2026)

### Backend is slow on first request
- Render free tier spins down after inactivity
- First request takes 30-60 seconds to wake the server
- Subsequent requests are fast

### "Invalid or expired token" errors
- JWT tokens expire after 7 days
- User needs to log in again

### MongoDB connection errors
- Make sure your Atlas IP whitelist includes `0.0.0.0/0`
- Make sure the connection string uses the correct password
- Make sure the database user has read/write access

### Frontend shows blank page
- Check the browser console for errors
- Make sure `VITE_BACKEND_URL` is set correctly in Vercel

---

## Free Tier Limits Summary

| Service | Free Limit | What Happens When Exceeded |
| --- | --- | --- |
| Render | 750 hrs/month | Service pauses (resumes next month) |
| Vercel | Unlimited static deploys | Nothing — it's truly free |
| MongoDB Atlas M0 | 512 MB storage | Read-only mode |
| Groq | Rate-limited (varies by model) | 429 error — retry after delay |
| OnlineCompiler.io | 1M requests/month | Requests rejected |

---

## Cost Estimate

**Total monthly cost: $0**

Everything runs on free tiers. The only potential cost is if you exceed MongoDB Atlas storage (512 MB) or Render hours (750 hrs/month), which is unlikely for a personal project.

---

## Optional: Custom Domain

### Vercel (Frontend)
1. Buy a domain (e.g., from Namecheap, Cloudflare)
2. In Vercel project → **Settings** → **Domains**
3. Add your domain and follow the DNS instructions

### Render (Backend)
1. In Render service → **Settings** → **Custom Domains**
2. Add your domain (e.g., `api.yourdomain.com`)
3. Update `VITE_BACKEND_URL` in Vercel to point to your custom domain

---

## Summary Checklist

- [ ] Groq API key obtained
- [ ] OnlineCompiler.io API key obtained
- [ ] MongoDB Atlas cluster created with database user
- [ ] MongoDB IP whitelist set to 0.0.0.0/0
- [ ] Code pushed to GitHub
- [ ] Backend deployed on Render with all env vars
- [ ] Backend /ping endpoint tested
- [ ] Frontend deployed on Vercel with VITE_BACKEND_URL
- [ ] Backend CLIENT_ORIGIN updated with Vercel URL
- [ ] Registration and login tested
- [ ] Code execution tested
- [ ] AI assistant tested
- [ ] Collaborative rooms tested
