# Deployment Guide

## Architecture Overview

```
Telegram Client
     │
     ▼
Telegram Mini App (Next.js on Vercel)
     │ REST API + Telegram initData auth
     ▼
Express Backend (Railway)
     │
     ├── PostgreSQL (Railway)
     └── TON Center API (external)
```

## Project Structure

```
tma-project/
├── frontend/                    # Next.js 14 App Router
│   ├── src/
│   │   ├── app/
│   │   │   ├── layout.tsx       # TonConnect provider + Telegram init
│   │   │   ├── page.tsx         # Home with splash screen
│   │   │   ├── accounts/page.tsx
│   │   │   ├── usernames/page.tsx
│   │   │   └── admin/page.tsx
│   │   ├── components/
│   │   │   ├── WalletButton.tsx
│   │   │   └── SplashScreen.tsx
│   │   ├── hooks/
│   │   │   └── useTonConnect.ts
│   │   ├── lib/
│   │   │   └── api.ts
│   │   └── types/
│   │       └── telegram.d.ts
│   ├── public/
│   │   └── tonconnect-manifest.json
│   └── .env.example
│
└── backend/                     # Node.js + Express
    ├── src/
    │   ├── index.ts             # Express app entry point
    │   ├── db.ts                # Prisma singleton
    │   ├── routes/
    │   │   ├── accounts.ts
    │   │   ├── usernames.ts
    │   │   └── admin.ts
    │   ├── middleware/
    │   │   └── auth.ts          # Telegram initData verification
    │   └── services/
    │       └── ton.ts           # TON API + BOC verification
    ├── prisma/
    │   ├── schema.prisma
    │   └── seed.ts
    └── .env.example
```

---

## Step 1: Prerequisites

- Node.js 20+
- A Telegram Bot (via @BotFather)
- A TON wallet address (merchant wallet)
- TON Center API key (https://toncenter.com)
- Vercel account
- Railway account

---

## Step 2: Create Telegram Bot & Mini App

1. Open @BotFather in Telegram
2. `/newbot` → choose name/username → get **BOT_TOKEN**
3. `/newapp` → choose your bot → set up the Mini App
4. Set the Web App URL to your Vercel domain (configure after deploy)
5. Get your **Telegram user ID** via @userinfobot (for initial admin)

---

## Step 3: Deploy Backend on Railway

### 3.1 Create Railway project

```bash
# Install Railway CLI
npm install -g @railway/cli
railway login
railway init
```

### 3.2 Add PostgreSQL plugin

In Railway dashboard: New → Database → PostgreSQL
Copy the `DATABASE_URL` from the Variables tab.

### 3.3 Set environment variables in Railway

```
DATABASE_URL=postgresql://...  (auto-set by Railway PostgreSQL plugin)
BOT_TOKEN=123456789:AABBCCDDEEFFaabbccddeeff
MERCHANT_WALLET=EQDxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TON_API_KEY=your_toncenter_api_key
TON_API_URL=https://toncenter.com/api/v2
FRONTEND_URL=https://your-app.vercel.app
INITIAL_ADMIN_TELEGRAM_ID=123456789
NODE_ENV=production
```

### 3.4 Deploy

```bash
cd backend
npm install
railway up
```

### 3.5 Run migrations and seed

```bash
railway run npx prisma migrate deploy
railway run npx ts-node prisma/seed.ts
```

Note your backend URL: `https://your-backend.up.railway.app`

---

## Step 4: Deploy Frontend on Vercel

### 4.1 Set environment variables in Vercel

```
NEXT_PUBLIC_API_URL=https://your-backend.up.railway.app
NEXT_PUBLIC_MERCHANT_WALLET=EQDxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
NEXT_PUBLIC_TON_API_URL=https://toncenter.com/api/v2
```

### 4.2 Update tonconnect-manifest.json

Edit `frontend/public/tonconnect-manifest.json`:
```json
{
  "url": "https://your-app.vercel.app",
  "name": "TMA Store",
  "iconUrl": "https://your-app.vercel.app/icon.png"
}
```

### 4.3 Deploy

```bash
cd frontend
npm install
npx vercel --prod
```

Or connect the GitHub repo in Vercel dashboard for automatic deploys.

---

## Step 5: Configure Telegram Mini App

1. Open @BotFather
2. `/myapps` → select your app
3. Set **Web App URL** to `https://your-app.vercel.app`
4. Test via the bot's menu button or direct link:
   `https://t.me/your_bot/app`

---

## Step 6: Admin Access

The admin panel is at `/admin` within the Mini App.
Access is controlled by Telegram ID. The initial admin was seeded in Step 3.5.

To add more admins, use the API directly (authenticated as existing admin):
```bash
curl -X POST https://your-backend.up.railway.app/admin/admins \
  -H "Content-Type: application/json" \
  -H "Authorization: tma <encoded_init_data>" \
  -d '{"telegramId": "987654321"}'
```

---

## Security Notes

1. **initData verification**: Every authenticated request validates the Telegram HMAC signature with `BOT_TOKEN`. Auth data older than 1 hour is rejected.

2. **Anti-fraud**: BOC is broadcast to the TON network immediately; the hash is stored and checked for duplicates before creating any order.

3. **Transaction verification**: The backend polls TON Center for up to 60 seconds to confirm the transaction reached `MERCHANT_WALLET` with the expected amount (±1% tolerance for network fees).

4. **Admin-only routes**: All `/admin/*` and CRUD mutation routes require both valid initData AND the Telegram ID to be in the `Admin` table.

5. **Rate limiting**: 60 req/min per IP globally on the backend.

---

## Environment Variables Reference

### Backend
| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `BOT_TOKEN` | Telegram bot token from @BotFather |
| `MERCHANT_WALLET` | TON address to receive payments |
| `TON_API_KEY` | TON Center API key |
| `TON_API_URL` | TON API base URL |
| `FRONTEND_URL` | Allowed CORS origin |
| `INITIAL_ADMIN_TELEGRAM_ID` | Seed first admin (used once) |

### Frontend
| Variable | Description |
|---|---|
| `NEXT_PUBLIC_API_URL` | Backend base URL |
| `NEXT_PUBLIC_MERCHANT_WALLET` | TON address (for transaction payload) |
| `NEXT_PUBLIC_APP_URL` | This app's URL (for TON Connect manifest) |
| `NEXT_PUBLIC_TON_API_URL` | TON Center URL (for balance display) |
