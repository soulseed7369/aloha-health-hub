import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// ─────────────────────────────────────────────────────────────
// Service-role Supabase client — server-side only.
// SUPABASE_SERVICE_ROLE_KEY has no NEXT_PUBLIC_ prefix so it is
// never bundled into the browser. This file only runs on Vercel.
// ─────────────────────────────────────────────────────────────
function getServiceClient() {
  // API routes run server-side only — use process.env directly, no import.meta.
  // VITE_SUPABASE_URL is available in process.env via webpack DefinePlugin shim;
  // fall back to NEXT_PUBLIC_SUPABASE_URL if not present.
  const url = process.env.VITE_SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

// ─────────────────────────────────────────────────────────────
// Simple in-memory rate limit: 5 reveals per IP per minute.
// Cleanup runs inline to avoid setInterval in serverless env
// (Vercel may kill the process between requests, making
// setInterval unreliable — inline cleanup is safe either way).
// ─────────────────────────────────────────────────────────────
const rateMap = new Map<string, { count: number; resetAt: number }>();

function checkRate(ip: string, max = 5, windowMs = 60_000): boolean {
  const now = Date.now();

  // Inline cleanup: purge expired entries when map exceeds 500 keys
  if (rateMap.size > 500) {
    for (const [k, v] of rateMap) if (now > v.resetAt) rateMap.delete(k);
  }

  const entry = rateMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateMap.set(ip, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (entry.count >= max) return false;
  entry.count++;
  return true;
}

// ─────────────────────────────────────────────────────────────
// GET /api/contact?id=<uuid>&type=practitioner|center&field=phone|email
// ─────────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id    = searchParams.get('id');
  const type  = searchParams.get('type');
  const field = searchParams.get('field');

  // Validate params
  if (!id || !type || !field) {
    return NextResponse.json({ error: 'Missing id, type, or field' }, { status: 400 });
  }
  if (type !== 'practitioner' && type !== 'center') {
    return NextResponse.json({ error: 'type must be practitioner or center' }, { status: 400 });
  }
  if (field !== 'phone' && field !== 'email') {
    return NextResponse.json({ error: 'field must be phone or email' }, { status: 400 });
  }

  // Rate limit by IP
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? 'unknown';
  if (!checkRate(ip)) {
    return NextResponse.json(
      { error: 'Rate limit exceeded. Try again in a minute.' },
      { status: 429, headers: { 'Retry-After': '60' } }
    );
  }

  // Fetch via service role (bypasses column REVOKE on anon)
  const supabase = getServiceClient();
  if (!supabase) {
    return NextResponse.json({ error: 'Service not configured' }, { status: 500 });
  }

  const table = type === 'center' ? 'centers' : 'practitioners';
  const { data, error } = await supabase
    .from(table)
    .select(field)
    .eq('id', id)
    .eq('status', 'published')
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    console.error('[api/contact]', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }

  const value = (data as Record<string, string | null>)?.[field] ?? null;
  if (!value) {
    return NextResponse.json({ error: 'Not listed' }, { status: 404 });
  }

  return NextResponse.json({ [field]: value });
}
