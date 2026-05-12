# My GameHub 🎮

> ⚠️ **Private Project – Do Not Copy or Use**
> This repository is for personal use and documentation purposes only.
> Unauthorized copying, distribution, or usage of the code is prohibited.

**Live site:** https://my-gamehub.com

---

## 🎬 Demo

[![Watch the demo](https://img.youtube.com/vi/mpcSkedvgfk/maxresdefault.jpg)](https://youtu.be/mpcSkedvgfk)

---

## 📌 Project Overview

My GameHub is a production-grade, full-stack web application that unifies your gaming library across **Steam, Xbox, PlayStation, and Epic Games** into a single dashboard.

Track achievements and completion progress, monitor live price drops across storefronts, manage a cross-platform wishlist with email alerts, and connect with friends through a social profile system — all from one place.

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 19 (Vite), TailwindCSS, React Query, React Router v7 |
| **Backend** | Node.js, Express.js |
| **Database** | MongoDB Atlas, Redis |
| **Auth** | Google OAuth 2.0, Session-based auth (express-session) |
| **Email** | Nodemailer (Gmail SMTP) |
| **DevOps** | Docker, GitHub Actions, AWS EC2, AWS IAM |
| **CDN / Edge** | Cloudflare (CDN, DDoS, Brotli, CSP) |
| **Web Server** | Nginx (SPA routing, asset caching, security headers) |
| **Media** | Cloudinary (image upload, transformation, CDN delivery) |
| **Monitoring** | CloudWatch |
| **Price Data** | IsThereAnyDeal API (ITAD) |
| **Game Data** | RAWG API |
| **Documentation** | Swagger / OpenAPI |

---

## 🎮 Features

### Multi-Platform Library Sync
- **Steam** — API-based sync of owned games, playtime, and achievement progress
- **Xbox** — OAuth 2.0 / MSAL flow; syncs library, Gamerscore, and achievements
- **PlayStation (PSN)** — PSN-API integration; syncs trophies and library
- **Epic Games** — OAuth flow via Epic's internal catalog and entitlement APIs

### Achievement & Progress Tracking
- Unified achievement/progress percentages across all 4 platforms
- Completion detection (100% → Platinum Collection on profile)
- Per-platform and cross-platform aggregated view

### Wishlist & Price Tracking
- Add games to a cross-platform wishlist and track prices per store
- Daily cron job fetches live prices from IsThereAnyDeal (batched in chunks of 50)
- Email + in-app notifications when a tracked game drops in price
- Per-store price history tracking with `lastNotifiedPrice`

### Social & Community
- Public profiles with customizable handle, bio, background image, and profile picture
- Spotify theme song embed on profiles
- "Masterpiece" game slot — pin your favourite game with a personal quote
- Favorite games showcase
- Friend requests, accept/reject, and remove friend flows
- Profile likes and community hub leaderboard
- Achievement badges (Completionist, Collector, Social Star, Veteran)
- Privacy controls — profiles can be public or private; `publicID` is stripped from API responses server-side when friend requests are disabled

### Notifications
- In-app notification centre for price drops, friend requests, and token expiry warnings
- All notifications linked to relevant in-app routes

### Automated Background Jobs (Crons)
| Cron | Schedule | Description |
|---|---|---|
| Wishlist price check | Midnight daily | Fetches live prices, creates in-app + email alerts for drops |
| Account purge | 1:00 AM daily | Permanently deletes accounts soft-deleted >30 days ago |
| Admin report | 8:00 AM daily | Emails daily platform metrics report (user counts, platform breakdown) |
| Token refresh | 3:00 AM daily | Silently rotates PSN (~60d) and Xbox (~90d) OAuth tokens; marks invalid and emails user on auth failure |

---

## 🔒 Security

- **CSRF protection** — synchronized token pattern (`csrf-sync`); token required on all state-changing routes
- **Helmet.js** — sets `X-Content-Type-Options`, `X-Frame-Options`, `Strict-Transport-Security`, and more
- **Tiered rate limiting** — global (500 req/15min), auth routes (10 req/15min), sync routes (7 req/15min)
- **AES-256-CBC encryption** — OAuth refresh tokens encrypted at rest in MongoDB via Mongoose getters/setters
- **Field-level `select: false`** — sensitive fields (password, tokens, expiry dates) never returned unless explicitly selected
- **API-level data stripping** — `publicID` deleted from response payload server-side when user has disabled friend requests; frontend condition is an additional UX layer only
- **Nginx CSP** — Content Security Policy set as an HTTP header (not `<meta>` tag) so `frame-ancestors` is enforced by browsers
- **SSH port management** — CI/CD pipeline opens port 22 only for the duration of a deploy, then revokes it immediately via AWS CLI

---

## ⚙️ CI/CD Pipeline

**GitHub Actions** (`/.github/workflows/pipeline.yml`) — path-aware, runs only what changed.

```
Push to master
  └── Detect Changes (frontend / backend paths)
        ├── Frontend changed
        │     └── Run Vitest tests
        │           └── Deploy to Cloudflare Pages
        │
        └── Backend changed
              └── Run Jest tests (with isolated test env)
                    └── Build & push Docker image → DockerHub
                          └── Dynamically whitelist runner IP in AWS Security Group
                                └── SSH into EC2 → docker compose pull → docker compose up -d → prune old images
                                      └── Revoke SSH access (runs even on failure)
```

- Separate test/build/deploy jobs with proper `needs:` dependencies
- Backend tests run with isolated env vars (no real credentials)
- Docker image tagged `latest` on DockerHub (`ahmedadelabouhussein/gamehub-backend`)

---

## 🏗️ Architecture

```
Browser
  │
  ├── Cloudflare (CDN, DDoS, Brotli compression, Edge CSP headers)
  │     │
  │     ├── Cloudflare Pages → Nginx (Docker) → React SPA
  │     │         Nginx: SPA fallback, 1yr immutable cache on hashed assets,
  │     │                gzip, security headers (CSP, X-Frame-Options, etc.)
  │     │
  │     └── API subdomain (api.my-gamehub.com) → AWS EC2 → Docker container
  │               Express.js API
  │                 ├── Redis (session store + game lookup cache)
  │                 ├── MongoDB Atlas (users, games, friends, wishlist)
  │                 └── Cloudinary (image upload & delivery)
  │
  └── External APIs
        ├── Steam Web API
        ├── Xbox / Microsoft Live (MSAL OAuth)
        ├── PSN (psn-api)
        ├── Epic Games (OAuth + catalog API)
        ├── RAWG (game metadata)
        ├── IsThereAnyDeal (pricing)
        └── Google OAuth 2.0
```

---

## 📁 Project Structure

```
MyGameHub/
├── frontend/               # React (Vite) SPA
│   ├── src/
│   │   ├── pages/          # Route-level page components
│   │   ├── components/     # Shared UI components
│   │   ├── contexts/       # Auth context
│   │   └── utils/          # API client, image utils
│   ├── nginx.conf          # Production Nginx config (Docker)
│   └── Dockerfile
│
├── backend/                # Node.js / Express API
│   ├── src/
│   │   ├── controllers/    # Route handlers (auth, games, friends, sync, etc.)
│   │   ├── models/         # Mongoose schemas
│   │   ├── routes/         # Express routers
│   │   ├── middleware/     # Auth, CSRF, rate limiting, Helmet, logging
│   │   ├── config/         # Redis, session, CORS, env
│   │   └── utils/          # Crons, email templates, logger, crypto
│   └── Dockerfile
│
└── .github/workflows/
    └── pipeline.yml        # Main CI/CD pipeline
```

---

## 📄 API Documentation

All endpoints are documented with Swagger.
Access at `/swagger` on the deployed backend or locally at `http://localhost:8080/swagger`.


### API Docs (Swagger)
![Swagger](https://res.cloudinary.com/dvbmaonhc/image/upload/v1777400766/screenshots/swagger.webp)

---

> ⚠️ **Reminder:** This project is private. All code, APIs, and deployment scripts are proprietary and intended for personal documentation and portfolio demonstration only.
