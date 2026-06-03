#!/usr/bin/env bash
# Pushes the current branch to GitHub using the GITHUB_PAT secret.
# Called by the "Sync to GitHub" Replit workflow.
set -e

if [ -z "$GITHUB_PAT" ]; then
  echo "❌ GITHUB_PAT secret is not set. Add it in the Replit Secrets tab."
  exit 1
fi

REPO_URL="https://${GITHUB_PAT}@github.com/evilos619-cell/sammystore.git"
BRANCH=$(git --no-optional-locks rev-parse --abbrev-ref HEAD 2>/dev/null || echo "main")

echo "🚀 Pushing branch '${BRANCH}' to GitHub…"
git --no-optional-locks push "$REPO_URL" "${BRANCH}:${BRANCH}" 2>&1 | sed "s/${GITHUB_PAT}/****/g"
echo "✅ Successfully pushed to https://github.com/evilos619-cell/sammystore"
