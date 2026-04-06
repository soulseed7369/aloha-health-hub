/**
 * copy-spa.mjs — Copies Vite build output into public/ so Next.js can serve
 * the SPA as a fallback for routes not handled by the App Router.
 *
 * Run between `vite build` and `next build`:
 *   vite build && node scripts/copy-spa.mjs && next build
 *
 * What it does:
 *   dist/index.html     → public/_spa.html   (SPA shell, served via rewrite)
 *   dist/assets/*        → public/assets/*     (JS/CSS bundles)
 */
import { cpSync, copyFileSync, mkdirSync, rmSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const dist = resolve(root, 'dist');
const pub = resolve(root, 'public');

// Clean previous SPA artifacts
const spaHtml = resolve(pub, '_spa.html');
const assetsDir = resolve(pub, 'assets');

if (existsSync(spaHtml)) rmSync(spaHtml);
if (existsSync(assetsDir)) rmSync(assetsDir, { recursive: true });

// Copy SPA shell (renamed so it doesn't conflict with Next.js root page)
copyFileSync(resolve(dist, 'index.html'), spaHtml);

// Copy hashed asset bundles (JS, CSS)
mkdirSync(assetsDir, { recursive: true });
cpSync(resolve(dist, 'assets'), assetsDir, { recursive: true });

console.log('✓ SPA artifacts copied to public/ for Next.js fallback serving');
