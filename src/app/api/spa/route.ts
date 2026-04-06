import { readFileSync } from 'fs';
import { join } from 'path';
import { NextResponse } from 'next/server';

/**
 * API route that serves the Vite-built SPA shell.
 *
 * The fallback rewrite in next.config.mjs sends all non-SSR routes here.
 * This returns the SPA's index.html, which loads the Vite JS/CSS bundles
 * from /assets/. React Router in the SPA handles client-side routing.
 *
 * Why an API route instead of a static file rewrite?
 * Next.js rewrites go through the page routing system, not the static file
 * server. A rewrite to /_spa.html would try to render it as a Next.js page
 * (with layout, hydration, etc.) instead of serving the raw HTML file.
 */

let cachedHtml: string | null = null;

export async function GET() {
  if (!cachedHtml) {
    try {
      cachedHtml = readFileSync(
        join(process.cwd(), 'public', '_spa.html'),
        'utf-8',
      );
    } catch {
      // Fallback: try dist/ directly (in case public/ copy didn't work)
      try {
        cachedHtml = readFileSync(
          join(process.cwd(), 'dist', 'index.html'),
          'utf-8',
        );
      } catch {
        return new NextResponse('SPA shell not found', { status: 500 });
      }
    }
  }

  return new NextResponse(cachedHtml, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, max-age=0, must-revalidate',
    },
  });
}
