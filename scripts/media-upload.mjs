#!/usr/bin/env node
/**
 * media-upload.mjs
 * Uploads a local image/video file to Supabase Storage (social-assets bucket)
 * and returns the public URL.
 *
 * Usage:
 *   node media-upload.mjs <file-path> [storage-prefix]
 *
 *   node media-upload.mjs ./image.jpg              → instagram/timestamp-image.jpg
 *   node media-upload.mjs ./image.jpg events       → events/timestamp-image.jpg
 *   node media-upload.mjs ./slide1.png instagram   → instagram/timestamp-slide1.png
 *
 * Env vars required (in .env.local or shell):
 *   SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *
 * Output: JSON line written to logs/media-upload.jsonl + printed to stdout
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync, appendFileSync, mkdirSync } from 'fs';
import { basename } from 'path';

const BUCKET = 'social-assets';
const LOG_FILE = './logs/media-upload.jsonl';

// ── Mime type lookup (no external dependency) ──────────────────────────────
const MIME_TYPES = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  gif: 'image/gif',
  mp4: 'video/mp4',
  mov: 'video/quicktime',
};

function getMimeType(filePath) {
  const ext = filePath.split('.').pop().toLowerCase();
  return MIME_TYPES[ext] || 'application/octet-stream';
}

// ── Supabase client ────────────────────────────────────────────────────────
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY env vars are required.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// ── Upload ─────────────────────────────────────────────────────────────────
async function uploadFile(filePath, prefix = 'instagram') {
  // Sanitize filename: lowercase, collapse special chars to hyphens, trim trailing hyphen
  const sanitized = basename(filePath)
    .toLowerCase()
    .replace(/[^a-z0-9._]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

  const timestamp = Date.now();
  const storagePath = `${prefix}/${timestamp}-${sanitized}`;
  const contentType = getMimeType(filePath);
  const buffer = readFileSync(filePath);

  // Ensure log directory exists
  mkdirSync('./logs', { recursive: true });

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, buffer, { contentType, upsert: false });

  if (error) {
    const entry = {
      timestamp: new Date().toISOString(),
      file: filePath,
      result: 'error',
      error: `Upload failed (HTTP ${error.status ?? '?'}): ${error.message}`,
    };
    appendFileSync(LOG_FILE, JSON.stringify(entry) + '\n');
    console.error(JSON.stringify(entry));
    process.exit(1);
  }

  const { data: { publicUrl } } = supabase.storage.from(BUCKET).getPublicUrl(storagePath);

  const entry = {
    timestamp: new Date().toISOString(),
    file: filePath,
    storagePath,
    bucket: BUCKET,
    sizeBytes: buffer.length,
    contentType,
    publicUrl,
    result: 'success',
  };

  appendFileSync(LOG_FILE, JSON.stringify(entry) + '\n');
  console.log(JSON.stringify(entry));
  return publicUrl;
}

// ── CLI entrypoint ─────────────────────────────────────────────────────────
const [filePath, prefix] = process.argv.slice(2);

if (!filePath) {
  console.error('Usage: node media-upload.mjs <file-path> [storage-prefix]');
  process.exit(1);
}

uploadFile(filePath, prefix);
