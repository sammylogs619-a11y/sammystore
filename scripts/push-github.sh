#!/usr/bin/env bash
# Pushes the current branch to GitHub using the GITHUB_PAT secret.
# Called by the "Sync to GitHub" Replit workflow.
set -euo pipefail

if [ -z "${GITHUB_PAT:-}" ]; then
  echo "❌ GITHUB_PAT secret is not set. Add it in the Replit Secrets tab."
  exit 1
fi

# Strip all whitespace/newlines
PAT_CLEAN=$(printf '%s' "$GITHUB_PAT" | tr -d '[:space:]')
if [ -z "$PAT_CLEAN" ]; then
  echo "❌ GITHUB_PAT is blank after trimming. Please re-add it in Secrets."
  exit 1
fi

echo "🚀 Pushing to GitHub via API (bypasses git object negotiation)…"
node scripts/push-github-api.mjs
