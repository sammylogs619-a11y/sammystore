# Deployment notes

This project expects the following environment variables to be set in production/dev when running the server (server/api.ts) and building/running the app:

- DATABASE_URL
- VITE_SUPABASE_URL (or SUPABASE_URL)
- SUPABASE_SERVICE_ROLE_KEY
- PAYSTACK_SECRET_KEY
- NOWPAYMENTS_API_KEY
- ADMIN_EMAIL
- ADMIN_API_TOKEN
- VITE_SITE_URL (optional)

Runtime notes:
- The Express server (server/api.ts) writes uploaded files into `public/uploads`. Ensure `public/uploads` exists before accepting uploads (the repo contains a tracked `.gitkeep` to keep the folder present).
- Vite proxies `/api` to the API server on port 3001 in development (vite.config.ts). Make sure the server is listening on 3001 or set API_PORT/PORT accordingly.

If you want me to, I can open a PR that includes these cleanup changes and a suggested PR description instructing deletion of the legacy filename.
