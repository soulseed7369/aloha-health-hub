#!/usr/bin/env node
/**
 * meta-publish.mjs
 * Publishes a single image or carousel to Instagram via Meta Graph API v22.0.
 *
 * Usage:
 *   node meta-publish.mjs --caption "..." --media <url1> [<url2> ...] [--dry-run]
 *
 *   Single post:
 *     node meta-publish.mjs --caption "Aloha 🌺" --media https://...jpg
 *
 *   Carousel (up to 10 images):
 *     node meta-publish.mjs --caption "Swipe 🌺" --media https://...1.jpg https://...2.jpg
 *
 *   Dry run (no API call, just logs intent):
 *     node meta-publish.mjs --caption "..." --media https://...jpg --dry-run
 *
 * Env vars required (in .env.local or shell):
 *   META_ACCESS_TOKEN      Long-lived Instagram/Page access token
 *   INSTAGRAM_USER_ID      IG Business Account ID (e.g. 17841440357217744)
 *
 * Output: JSON line written to logs/meta-publish.jsonl + printed to stdout
 */

import { appendFileSync, mkdirSync } from 'fs';

const GRAPH_API_VERSION = 'v22.0';
const BASE_URL = `https://graph.facebook.com/${GRAPH_API_VERSION}`;
const LOG_FILE = './logs/meta-publish.jsonl';

const igUserId = process.env.INSTAGRAM_USER_ID;
const accessToken = process.env.META_ACCESS_TOKEN;

// ── Helpers ────────────────────────────────────────────────────────────────
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function logEntry(entry) {
  mkdirSync('./logs', { recursive: true });
  appendFileSync(LOG_FILE, JSON.stringify(entry) + '\n');
  console.log(JSON.stringify(entry));
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

// ── Publish ────────────────────────────────────────────────────────────────
async function publish({ caption, mediaUrls, dryRun }) {
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
    logEntry({ ...baseEntry, result: 'dry-run' });
    return;
  }

  try {
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
      // Carousel: create child containers first (no caption on children), then parent
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

    // Poll until container is FINISHED (Meta needs time to process the image)
    let statusCode = '';
    for (let attempt = 0; attempt < 15; attempt++) {
      await sleep(4000);
      const statusRes = await apiGet(`/${containerId}?fields=status_code`);
      statusCode = statusRes.status_code;
      if (statusCode === 'FINISHED') break;
      if (statusCode === 'ERROR') throw new Error('Media container failed to process');
    }
    if (statusCode !== 'FINISHED') {
      throw new Error('Media container not ready — the image may still be processing. Wait a few seconds and retry the publish step.');
    }

    // Publish the container
    const published = await apiPost(`/${igUserId}/media_publish`, { creation_id: containerId });

    // Fetch permalink
    const postData = await apiGet(`/${published.id}?fields=permalink`);

    logEntry({
      ...baseEntry,
      result: 'success',
      mediaId: published.id,
      permalink: postData.permalink,
    });
  } catch (err) {
    logEntry({ ...baseEntry, result: 'error', error: err.message });
    process.exit(1);
  }
}

// ── CLI arg parsing ────────────────────────────────────────────────────────
const args = process.argv.slice(2);

function getArg(flag) {
  const idx = args.indexOf(flag);
  return idx !== -1 ? args[idx + 1] : null;
}

const caption = getArg('--caption');
const dryRun = args.includes('--dry-run');

// Collect all --media values (everything after --media until the next -- flag)
const mediaStart = args.indexOf('--media');
const mediaUrls = [];
if (mediaStart !== -1) {
  for (let i = mediaStart + 1; i < args.length; i++) {
    if (args[i].startsWith('--')) break;
    mediaUrls.push(args[i]);
  }
}

if (!caption || mediaUrls.length === 0) {
  console.error('Usage: node meta-publish.mjs --caption "..." --media <url1> [<url2> ...] [--dry-run]');
  process.exit(1);
}

if (!igUserId || !accessToken) {
  console.error('Error: INSTAGRAM_USER_ID and META_ACCESS_TOKEN env vars are required.');
  process.exit(1);
}

publish({ caption, mediaUrls, dryRun });
