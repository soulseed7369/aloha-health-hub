#!/usr/bin/env bash
# copy-spa.sh — Copies Vite build output into public/ so Next.js can serve
# the SPA as a fallback for routes not handled by the App Router.
#
# Run between `vite build` and `next build`:
#   vite build && bash scripts/copy-spa.sh && next build
#
# What it does:
#   dist/index.html  → public/_spa.html   (SPA shell, served via rewrite)
#   dist/assets/*    → public/assets/*     (JS/CSS bundles)

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(dirname "$SCRIPT_DIR")"

# Clean previous SPA artifacts
rm -f "$ROOT/public/_spa.html"
rm -rf "$ROOT/public/assets"

# Copy SPA shell (renamed so it doesn't conflict with Next.js root page)
cp "$ROOT/dist/index.html" "$ROOT/public/_spa.html"

# Copy hashed asset bundles (JS, CSS)
cp -r "$ROOT/dist/assets" "$ROOT/public/assets"

echo "✓ SPA artifacts copied to public/ for Next.js fallback serving"
