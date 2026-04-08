#!/usr/bin/env node
/**
 * meta-upload-and-publish.mjs
 * End-to-end: uploads local files to Supabase Storage, then publishes to Instagram.
 * Combines media-upload.mjs + meta-publish.mjs in a single command.
 *
 * Usage:
 *   node meta-upload-and-publish.mjs --caption "..." --files <file1> [<file2> ...] [--dry-run]
 *
 *   Single post:
 *     node meta-upload-and-publish.mjs \
 *       --caption "Aloha from Big Island 🌺" \
 *       --files ./post-cover.jpg
 *
 *   Carousel (up to 10 slides):
 *     node meta-upload-and-publish.mjs \
 *       --caption "Swipe to explore 🌺" \
 *       --files ./slide1.png ./slide2.png ./slide3.png
 *
 *   Dry run (uploads to Supabase, skips Meta publish):
 *     node meta-upload-and-publish.mjs \
 *       --caption "..." \
 *       --files ./slide1.png \
 *       --dry-run
 *
 * Env vars required (in .env.local or shell):
 *   SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *   META_ACCESS_TOKEN
 *   INSTAGRAM_USER_ID
 *
 * Logs:
 *   logs/media-upload.jsonl   — one entry per uploaded file
 *   logs/meta-publish.jsonl   — one entry for the publish result
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync, appendFileSync, mkdirSync } from 'fs';
import { basename } from 'path';

// ── Config ─────────────────────────────────────────────────────────────────
const BUCKET = 'social-assets';
const GRAPH_API_VERSION = 'v22.0';
const BASE_URL = `https://graph.facebook.com/${GRAPH_API_VERSION}`;
const UPLOAD_LOG = './logs/media-upload.jsonl';
const PUBLISH_LOG = './logs/meta-publish.jsonl';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const accessToken = process.env.META_ACCESS_TOKEN;
const igUserId = process.env.INSTAGRAM_USER_ID;

// ── Mime type lookup ───────────────────────────────────────────────────────
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

// ── Logging ────────────────────────────────────────────────────────────────
function writeLog(file, entry) {
  mkdirSync('./logs', { recursive: true });
  appendFileSync(file, JSON.stringify(entry) + '\n');
}

// ── Supabase upload ────────────────────────────────────────────────────────
async function uploadFile(supabase, filePath) {
  const sanitized = basename(filePath)
    .toLowerCase()
    .replace(/[^a-z0-9._]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

  const timestamp = Date.now();
  const storagePath = `instagram/${timestamp}-${sanitized}`;
  const contentType = getMimeType(filePath);
  const buffer = readFileSync(filePath);

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
    writeLog(UPLOAD_LOG, entry);
    console.error(JSON.stringify(entry));
    throw new Error(entry.error);
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
  writeLog(UPLOAD_LOG, entry);
  console.log(`  ✓ Uploaded ${basename(filePath)} → ${publicUrl}`);
  return publicUrl;
}

// ── Meta API helpers ───────────────────────────────────────────────────────
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function apiPost(path, body) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...body, access_token: accessToken }),
  });
  const json = await res.json();
  if (json.error) {
    throw new Error(`Meta API error [code ${json.error.code}]: ${json.error.message}`);
  }
  return json;
}

async function apiGet(path) {
  const res = await fetch(`${BASE_URL}${path}&access_token=${accessToken}`);
  return res.json();
}

// ── Publish to Instagram ───────────────────────────────────────────────────
async function publishToInstagram({ caption, mediaUrls, dryRun }) {
  const type = mediaUrls.length > 1 ? 'carousel' : 'single';

  const baseEntry = {
    timestamp: new Date().toISOString(),
    mode: dryRun ? 'dry-run' : 'publish',
    type,
    captionPreview: caption.slice(0, 60),
    captionLength: caption.length,
    mediaUrls,
    igUserId,
    graphApiVersion: GRAPH_API_VERSION,
  };

  if (dryRun) {
    const entry = { ...baseEntry, result: 'dry-run' };
    writeLog(PUBLISH_LOG, entry);
    console.log(JSON.stringify(entry));
    return;
  }

  let containerId;

  if (type === 'single') {
    const ext = mediaUrls[0].split('?')[0].split('.').pop().toLowerCase();
    const isVideo = ['mp4', 'mov'].includes(ext);
    const mediaParam = isVideo
      ? { video_url: mediaUrls[0], media_type: 'REELS' }
      : { image_url: mediaUrls[0] };

    const container = await apiPost(`/${igUserId}/media`, { caption, ...mediaParam });
    containerId = container.id;
  } else {
    const childContainers = await Promise.all(
      mediaUrls.map(url =>
        apiPost(`/${igUserId}/media`, { image_url: url, is_carousel_item: true })
      )
    );
    const childIds = childContainers.map(c => c.id).join(',');
    const parent = await apiPost(`/${igUserId}/media`, {
      media_type: 'CAROUSEL',
      caption,
      children: childIds,
    });
    containerId = parent.id;
  }

  // Poll until ready
  console.log('  ⏳ Waiting for media container to be ready...');
  let statusCode = '';
  for (let attempt = 0; attempt < 15; attempt++) {
    await sleep(4000);
    const statusRes = await apiGet(`/${containerId}?fields=status_code`);
    statusCode = statusRes.status_code;
    if (statusCode === 'FINISHED') break;
    if (statusCode === 'ERROR') throw new Error('Media container failed to process');
  }
  if (statusCode !== 'FINISHED') {
    throw new Error('Media container not ready — timed out. Try running meta-publish.mjs with the public URLs directly.');
  }

  const published = await apiPost(`/${igUserId}/media_publish`, { creation_id: containerId });
  const postData = await apiGet(`/${published.id}?fields=permalink`);

  const entry = {
    ...baseEntry,
    result: 'success',
    mediaId: published.id,
    permalink: postData.permalink,
  };
  writeLog(PUBLISH_LOG, entry);
  console.log(JSON.stringify(entry));
  return postData.permalink;
}

// ── Main ───────────────────────────────────────────────────────────────────
async function main() {
  // Validate env
  const missing = [];
  if (!supabaseUrl) missing.push('SUPABASE_URL');
  if (!supabaseKey) missing.push('SUPABASE_SERVICE_ROLE_KEY');
  if (!accessToken) missing.push('META_ACCESS_TOKEN');
  if (!igUserId) missing.push('INSTAGRAM_USER_ID');
  if (missing.length) {
    console.error(`Error: Missing required env vars: ${missing.join(', ')}`);
    process.exit(1);
  }

  // Parse CLI args
  const args = process.argv.slice(2);

  function getArg(flag) {
    const idx = args.indexOf(flag);
    return idx !== -1 ? args[idx + 1] : null;
  }

  const caption = getArg('--caption');
  const dryRun = args.includes('--dry-run');

  const filesStart = args.indexOf('--files');
  const filePaths = [];
  if (filesStart !== -1) {
    for (let i = filesStart + 1; i < args.length; i++) {
      if (args[i].startsWith('--')) break;
      filePaths.push(args[i]);
    }
  }

  if (!caption || filePaths.length === 0) {
    console.error('Usage: node meta-upload-and-publish.mjs --caption "..." --files <file1> [<file2> ...] [--dry-run]');
    process.exit(1);
  }

  if (filePaths.length > 10) {
    console.error('Error: Instagram carousels support a maximum of 10 images.');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  // Step 1: Upload all files
  console.log(`\n📤 Uploading ${filePaths.length} file(s) to Supabase Storage...`);
  const mediaUrls = [];
  for (const filePath of filePaths) {
    const url = await uploadFile(supabase, filePath);
    mediaUrls.push(url);
  }

  // Step 2: Publish to Instagram
  console.log(`\n📸 Publishing to Instagram (${dryRun ? 'dry-run' : 'live'})...`);
  const permalink = await publishToInstagram({ caption, mediaUrls, dryRun });

  if (permalink) {
    console.log(`\n✅ Published: ${permalink}`);
  } else if (dryRun) {
    console.log('\n✅ Dry run complete — no post was published.');
  }
}

main().catch(err => {
  console.error('Fatal error:', err.message);
  process.exit(1);
});
