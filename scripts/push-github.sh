#!/usr/bin/env bash
# Pushes the current branch to GitHub using the GITHUB_PAT secret.
# Called by the "Sync to GitHub" Replit workflow.
set -euo pipefail

if [ -z "${GITHUB_PAT:-}" ]; then
  echo "❌ GITHUB_PAT secret is not set. Add it in the Replit Secrets tab."
  exit 1
fi

if [ -z "${GITHUB_REPO:-}" ]; then
  echo "❌ GITHUB_REPO secret is not set. Format: username/repo-name  e.g. johndoe/sammy-store"
  exit 1
fi

PAT_CLEAN=$(printf '%s' "$GITHUB_PAT" | tr -d '[:space:]')
if [ -z "$PAT_CLEAN" ]; then
  echo "❌ GITHUB_PAT is blank after trimming. Please re-add it in Secrets."
  exit 1
fi

# Normalise GITHUB_REPO — strip any leading https://github.com/ so both
# "username/repo" and "https://github.com/username/repo" work.
REPO_CLEAN=$(printf '%s' "$GITHUB_REPO" | sed 's|https://github\.com/||g' | sed 's|http://github\.com/||g' | tr -d '[:space:]')
REMOTE_URL="https://${PAT_CLEAN}@github.com/${REPO_CLEAN}.git"

git config --local user.email "replit-sync@sammystore.app" || true
git config --local user.name  "Replit Auto-Sync" || true

git remote set-url origin "$REMOTE_URL" 2>/dev/null \
  || git remote add origin "$REMOTE_URL"

git add -A

if git diff --cached --quiet; then
  echo "✅ Nothing new to commit — repo is up to date."
  exit 0
fi

TIMESTAMP=$(date -u +"%Y-%m-%d %H:%M UTC")
git commit -m "chore: auto-sync from Replit — ${TIMESTAMP}"

# Push; fall back to plain --force if lease check fails (first push)
git push origin HEAD:main --force-with-lease \
  || git push origin HEAD:main --force

echo "✅ Pushed successfully to github.com/${GITHUB_REPO}"
