#!/usr/bin/env bash
# build-hybrid.sh — Hybrid Vite + Next.js build for Vercel.
#
# 1. Clean previous SPA artifacts from public/ (prevents Vite copy conflict)
# 2. Run Vite build → dist/
# 3. Copy SPA shell + asset bundles into public/ for Next.js fallback serving
# 4. Run Next.js build → .next/
#
# Routes handled by Next.js App Router get SSR pages.
# Everything else falls through via rewrite to the Vite SPA (_spa.html).

set -e

ROOT="$(cd "$(dirname "$0")/.." && pwd)"

echo "=== Step 1: Clean previous SPA artifacts ==="
rm -rf "$ROOT/public/_spa.html" "$ROOT/public/assets"

echo "=== Step 2: Vite build (SPA) ==="
npx vite build

echo "=== Step 3: Copy SPA artifacts to public/ ==="
cp "$ROOT/dist/index.html" "$ROOT/public/_spa.html"
cp -r "$ROOT/dist/assets" "$ROOT/public/assets"
echo "✓ SPA shell + assets copied"

echo "=== Step 4: Next.js build (SSR) ==="
npx next build

echo "=== Build complete ==="
