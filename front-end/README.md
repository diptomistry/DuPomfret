# Hackathon Starter

Next.js frontend starter for AI API hackathons. Includes auth (Supabase), global state (Zustand), theming, and a clean structure. No app-specific features—ready to extend.

## Stack

- **Next.js** (App Router) + **TypeScript**
- **Tailwind CSS** + **shadcn/ui** + **Lucide**
- **Supabase Auth** (Email magic link + Google OAuth)
- **Zustand** (global state)
- **Mobile-first** responsive layout

## Quick start

1. **Clone and install**

   ```bash
   npm install
   ```

2. **Configure Supabase**

   - Create a [Supabase](https://supabase.com) project.
   - Enable Email and Google in **Authentication → Providers**.
   - Add redirect URL: `http://localhost:3000/auth/callback` (and your production URL).

3. **Env**

   ```bash
   cp .env.example .env.local
   ```

   Set:

   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`

4. **Run**

   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000). Sign in (magic link or Google), then use the dashboard.

## Project structure

```
app/           # Routes (layout, page, auth, dashboard)
components/    # UI (shadcn), auth, layout
store/         # Zustand (auth, UI)
lib/           # Supabase clients, auth helpers, constants
hooks/         # useAuth, useMounted
styles/        # Theme CSS variables
middleware.ts  # Auth protection, redirects
```

## Auth

- **Email:** Magic link via `signInWithOtp`.
- **Google:** OAuth via `signInWithOAuth`.
- Session in Supabase; user state in `useAuthStore`.
- **Protected routes:** Middleware redirects unauthenticated users from `/dashboard` to `/auth/login`, and authenticated users from `/auth/login` to `/dashboard`.

## Theming

- Light / dark / system. Stored in `localStorage`, applied via `ThemeProvider` and `ThemeToggle`.
- Uses Tailwind + CSS variables in `styles/theme.css` and `app/globals.css`.

## Hackathon rules

See **[instruction.md](./instruction.md)**. Key points:

- No hardcoded API URLs; use env-based base URL for backend calls.
- No direct external API calls from the frontend.
- Auth only via Supabase; global state only via Zustand.
- Keep feature logic in feature folders; avoid unused deps.

## Deploy (Vercel)

1. Push to GitHub and import in Vercel.
2. Add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
3. Add your production redirect URL in Supabase (e.g. `https://your-app.vercel.app/auth/callback`).

---

**Ready for hackathons.** Add your features, keep [instruction.md](./instruction.md) in mind, and ship.
