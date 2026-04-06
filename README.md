# Flourish

A premium compound, peptide, and supplement tracker with AI-powered insights and conversational coaching.

## What's in this build

This is the full Batch 1-4 build. Everything is wired up:

- **Frontend** — Next.js 14 app with full PWA support
- **Auth** — Clerk for user management
- **Database** — Supabase (Postgres) with 15 tables across 4 layers
- **AI** — Claude API with full context retrieval pipeline
- **Memory** — Persistent agent memory with dedup and pattern detection
- **Rules engine** — 12 rule domains for bloodwork, training, recovery analysis
- **Chat** — Full conversational UI with context-aware responses

## Setup (one-time)

### 1. Install dependencies

```bash
npm install
```

### 2. Set up Supabase

1. Create a Supabase project at [supabase.com](https://supabase.com)
2. Open the SQL Editor in your Supabase dashboard
3. Paste the entire `flourish-schema.sql` file (from Batch 1) and run it
4. Verify all 15 tables exist in the Table Editor
5. Copy your project URL and anon/service role keys

### 3. Set up Clerk

1. Create a Clerk app at [clerk.com](https://clerk.com)
2. Copy the publishable and secret keys
3. In Clerk dashboard → Sessions → enable JWT template for Supabase (optional, only if you want client-side Supabase access)

### 4. Get Anthropic API key

Sign up at [console.anthropic.com](https://console.anthropic.com) and create a key.

### 5. Configure environment variables

Copy `.env.example` to `.env.local` and fill in:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
ANTHROPIC_API_KEY=sk-ant-your-key
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_your-key
CLERK_SECRET_KEY=sk_live_your-key
```

### 6. Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — you'll be prompted to sign in via Clerk, then go through onboarding.

## Deploy to Vercel

```bash
git init
git add .
git commit -m "Flourish v1"
```

Push to GitHub, then on [vercel.com](https://vercel.com):

1. New Project → import your repo
2. **Add the same env vars** under Settings → Environment Variables
3. Deploy

## Add to iPhone Home Screen

1. Open your Vercel URL in **Safari** on iPhone
2. Share button → **Add to Home Screen**
3. Launches fullscreen, native-feeling

## Architecture Overview

```
app/
├── api/
│   ├── ai/             — chat endpoint with full context retrieval
│   ├── ai/threads/     — thread management
│   ├── bootstrap/      — single endpoint for home page data
│   ├── compounds/      — compound CRUD
│   ├── cycles/         — cycle management
│   ├── insights/       — rules engine + AI insight generation
│   ├── logs/           — daily log CRUD
│   ├── memory/         — agent memory CRUD + pattern scan
│   ├── profile/        — user profile
│   └── training/       — training session logging
├── globals.css         — design system, animations, card styles
├── layout.js           — root layout with ClerkProvider
└── page.js             — main app, all views, chat UI

lib/
├── auth.js             — Clerk user ID extraction
├── context.js          — context retrieval + system prompt builder
├── memory.js           — memory CRUD, dedup, extraction engines
├── rules.js            — 12 rule domains for bloodwork/recovery analysis
├── supabase.js         — server + client Supabase factories
├── useChat.js          — chat hook
└── useFlourish.js      — main app state hook with optimistic updates

public/
├── manifest.json       — PWA manifest
├── sw.js               — service worker
└── icon-*.png          — app icons

middleware.js           — Clerk auth protecting /api/* routes
```

## What each batch added

- **Batch 1** — Supabase schema (15 tables, RLS, triggers, seed data)
- **Batch 2** — Context-aware AI route, insights engine v1
- **Batch 3** — Memory module with dedup, expanded 12-domain rules engine
- **Batch 4** — Frontend wired to Supabase via hooks, full chat UI, auth guards

## Key concepts

### Memory system
The app extracts persistent facts from your conversations and logs. Visit Settings → "What Flourish Knows" to see them. Examples: "User prefers fasted morning cardio", "SHBG historically runs around 16", "Wants to bulk to 185 while watching lipids".

### Rules engine
Every time you generate insights, 12 rule domains check your data: lipids, androgens/estrogens, liver/kidney, hematology, thyroid, IGF-1, sleep/recovery, mood, training recovery, cycle phase, side effects, dose timing.

### Chat
Tap "Ask Flourish" on the home screen. The chat assembles your full context (compounds, recent metrics, bloodwork markers, training PRs, memories, alerts) and grounds Claude's responses in your actual data.

### Optimistic updates
The frontend updates immediately when you add/edit/delete things, then syncs to the backend in the background. If the backend fails, the UI rolls back automatically.
