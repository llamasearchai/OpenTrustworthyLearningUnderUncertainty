## Frontend environment variables

The frontend uses Vite environment variables (must be prefixed with `VITE_`).

### Required for local development (backend running on localhost:8000)

- `VITE_API_BASE_URL`: `http://localhost:8000/api`
- `VITE_WS_BASE_URL`: `ws://localhost:8000/ws`

### Notes

- These variables are read by Vite at build time. For local dev (`pnpm dev`) they are available via `.env` files.
- In Docker, these are passed as build args in `docker-compose.yml` so the production build points at your backend.

