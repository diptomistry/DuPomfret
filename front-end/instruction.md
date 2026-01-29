# Hackathon rules — follow always

These rules apply to all work done in this repo during hackathons. Do not break them.

## API & networking

- **No hardcoded API URLs.** Use env-based config only (e.g. `NEXT_PUBLIC_API_BASE_URL`).
- **All backend calls** must go through an env-defined base URL. Create a small client or `fetch` wrapper that reads from `process.env.NEXT_PUBLIC_API_BASE_URL` (or similar).
- **No direct external API calls from the frontend** for business logic. Call your own backend; the backend calls external APIs if needed.

## Auth

- **All auth via Supabase.** Use `lib/supabase/client` and `lib/supabase/server` only. No custom auth or other providers.
- Keep using the existing `useAuthStore`, `useAuth`, and middleware for protection and redirects.

## State & architecture

- **Zustand only for global state.** No Redux, Context for app-wide state, or other global stores. Use `store/` and add new slices as needed.
- **Feature-specific logic stays in feature folders.** Don’t put feature code in `lib/` or random shared modules. Use `components/`, `hooks/`, or feature-specific folders.

## Dependencies & code quality

- **No unused dependencies.** Remove packages you add but don’t use.
- **Readable, hackathon-friendly code.** Prefer clear and simple over clever. Easy to hand off or demo.
- **Comment only where logic is non-obvious.** Avoid redundant comments.

## Summary

| Do | Don’t |
|----|--------|
| Env-based API base URL | Hardcoded API URLs |
| Backend calls via base URL | Direct external API calls from frontend |
| Supabase for auth | Custom auth or other auth providers |
| Zustand for global state | Redux, Context, or other global state |
| Feature logic in feature folders | Feature logic in generic `lib/` |
| Remove unused deps | Leave unused dependencies |
| Clear, minimal code | Overengineered or cryptic code |
| Comments only when needed | Comment the obvious |
