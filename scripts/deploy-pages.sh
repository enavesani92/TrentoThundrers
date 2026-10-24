#!/usr/bin/env bash
# Pubblica la build su GitHub Pages (branch gh-pages).
# Uso: npm run deploy
set -euo pipefail

rev=$(git rev-parse --short HEAD)
npm run build
touch dist/.nojekyll

tmp=$(mktemp -d)
git worktree add "$tmp" gh-pages 2>/dev/null || git worktree add --orphan -b gh-pages "$tmp"
trap 'git worktree remove --force "$tmp"' EXIT

find "$tmp" -mindepth 1 -maxdepth 1 ! -name .git -exec rm -rf {} +
cp -r dist/. "$tmp"/
git -C "$tmp" add -A
git -C "$tmp" commit -q -m "Deploy Thunders Training ($rev)" || { echo "Nessuna modifica da pubblicare"; exit 0; }
git -C "$tmp" push origin gh-pages
echo "Pubblicato: https://enavesani92.github.io/TrentoThundrers/"
