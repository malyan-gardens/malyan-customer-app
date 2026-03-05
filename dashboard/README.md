# Malyan Dashboard — لوحة تحكم مليان

Company internal dashboard (React + TypeScript + Vite + Tailwind). RTL, Arabic.

## Run locally

```bash
cd dashboard
npm install
npm run dev
```

Open http://localhost:5173. Without Supabase env vars, login accepts any email ending with `@malyangardens.com` (demo mode).

## Build for production

```bash
npm run build
```

Output in `dist/`. Deploy to Vercel, Netlify, or any static host.

## Environment (optional)

Copy `.env.example` to `.env.local` and set:

- `VITE_SUPABASE_URL` — your Supabase project URL
- `VITE_SUPABASE_ANON_KEY` — your Supabase anon key

Then login uses real Supabase Auth; only `@malyangardens.com` emails are allowed (see `src/lib/auth.ts`).

## Structure

- `src/pages/` — Login, Dashboard, Orders, OrderDetail, Projects, Inventory, Finance, Team, Settings
- `src/components/` — Layout, Sidebar
- `src/lib/` — supabase client, auth (useAuth, requireMalyanEmail)

All inside the same **مليان** folder.
