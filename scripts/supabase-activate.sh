#!/usr/bin/env bash
# Activate Supabase for Qwerty Learner when credentials are available.
#
# Required env:
#   SUPABASE_ACCESS_TOKEN  — https://supabase.com/dashboard/account/tokens
#   SUPABASE_PROJECT_REF   — project ref (subdomain before .supabase.co)
#
# Optional:
#   SUPABASE_DB_PASSWORD   — if linking remote DB for `db push`
#
# Usage:
#   export SUPABASE_ACCESS_TOKEN=...
#   export SUPABASE_PROJECT_REF=...
#   ./scripts/supabase-activate.sh

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [[ -z "${SUPABASE_ACCESS_TOKEN:-}" ]]; then
  echo "error: SUPABASE_ACCESS_TOKEN is not set"
  echo "Create a token at https://supabase.com/dashboard/account/tokens"
  exit 1
fi

if [[ -z "${SUPABASE_PROJECT_REF:-}" ]]; then
  echo "Listing Supabase projects..."
  npx supabase projects list
  echo ""
  echo "error: SUPABASE_PROJECT_REF is not set (project ref from the list above)"
  exit 1
fi

echo "==> Checking project status for ${SUPABASE_PROJECT_REF}"
STATUS="$(npx supabase projects list 2>/dev/null | rg "${SUPABASE_PROJECT_REF}" | rg -o 'ACTIVE|INACTIVE|PAUSED|COMING_UP' | head -1 || true)"
echo "    status: ${STATUS:-unknown}"

if [[ "${STATUS}" == "INACTIVE" || "${STATUS}" == "PAUSED" ]]; then
  echo "==> Restoring paused project..."
  curl -fsS -X POST "https://api.supabase.com/v1/projects/${SUPABASE_PROJECT_REF}/restore" \
    -H "Authorization: Bearer ${SUPABASE_ACCESS_TOKEN}" \
    -H "Content-Type: application/json"
  echo ""
  echo "    restore requested — waiting 30s for services to start..."
  sleep 30
fi

echo "==> Linking remote project"
npx supabase link --project-ref "${SUPABASE_PROJECT_REF}" --yes

echo "==> Pushing migrations"
npx supabase db push --yes

echo "==> Done. Run scripts/verify-supabase.sql in SQL Editor to confirm 8 tables."
echo ""
echo "Next: add to Vercel Environment Variables:"
echo "  VITE_SUPABASE_URL=https://${SUPABASE_PROJECT_REF}.supabase.co"
echo "  VITE_SUPABASE_ANON_KEY=<anon key from Dashboard → Settings → API>"
