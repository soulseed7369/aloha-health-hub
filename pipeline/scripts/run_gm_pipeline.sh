#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# run_gm_pipeline.sh
# Full Google Maps ingestion pipeline: search → details → classify →
# Claude re-classify → dedup → upsert → enrich draft → score leads → name extraction
#
# Usage:
#   cd pipeline
#   bash scripts/run_gm_pipeline.sh [--island big_island] [--dry-run]
#   bash scripts/run_gm_pipeline.sh --island all          # all 4 islands
#   bash scripts/run_gm_pipeline.sh --skip-nearby         # faster, fewer results
#   bash scripts/run_gm_pipeline.sh --skip-claude         # skip Haiku re-classify step
#   bash scripts/run_gm_pipeline.sh --skip-enrich         # skip website enrichment
#
# Options:
#   --island        big_island | maui | oahu | kauai | all  (default: big_island)
#   --dry-run       No API calls, no DB writes
#   --skip-nearby   Skip radial nearby-search pass in step 1 (faster)
#   --skip-claude   Skip Claude Haiku re-classification in step 3b
#   --skip-enrich   Skip website enrichment (steps 6–9) — useful for quick runs
#   --min-ratings N Minimum Google review count to include (default: 3)
# ─────────────────────────────────────────────────────────────────────────────

set -uo pipefail

ISLAND="big_island"
DRY_RUN=""
SKIP_NEARBY=""
SKIP_CLAUDE=""
SKIP_ENRICH=""
MIN_RATINGS=3

# Parse args — support both --flag=value and --flag value styles
while [[ $# -gt 0 ]]; do
  case $1 in
    --island=*)      ISLAND="${1#*=}" ;;
    --island)        ISLAND="$2"; shift ;;
    --min-ratings=*) MIN_RATINGS="${1#*=}" ;;
    --min-ratings)   MIN_RATINGS="$2"; shift ;;
    --dry-run)       DRY_RUN="--dry-run" ;;
    --skip-nearby)   SKIP_NEARBY="--skip-nearby" ;;
    --skip-claude)   SKIP_CLAUDE="1" ;;
    --skip-enrich)   SKIP_ENRICH="1" ;;
  esac
  shift
done

echo "═══════════════════════════════════════════════════════"
echo " Google Maps Pipeline  |  island=${ISLAND}  |  min-ratings=${MIN_RATINGS}${DRY_RUN:+  |  DRY RUN}"
echo "═══════════════════════════════════════════════════════"

cd "$(dirname "$0")/.."
PYTHON=$(command -v python3 || command -v python)

echo ""
echo "── Step 1/10 · Text search + nearby radial → Place IDs ─"
$PYTHON scripts/09_gm_search.py --island "$ISLAND" $DRY_RUN $SKIP_NEARBY

echo ""
echo "── Step 2/10 · Fetch Place Details ─────────────────────"
$PYTHON scripts/10_gm_details.py $DRY_RUN

echo ""
echo "── Step 3/10 · Classify & confidence scoring ────────────"
$PYTHON scripts/11_gm_classify.py --min-ratings "$MIN_RATINGS"

echo ""
if [ -z "$SKIP_CLAUDE" ]; then
  echo "── Step 3b/10 · Claude Haiku re-classify low-confidence ──"
  $PYTHON scripts/14_claude_classify.py
  echo ""
else
  echo "── Step 3b/10 · [Skipped — --skip-claude flag set] ───────"
  echo ""
fi

echo "── Step 4/10 · Dedup against Supabase DB ────────────────"
$PYTHON scripts/12_gm_dedup.py --island "$ISLAND"

echo ""
echo "── Step 5/10 · Upsert to Supabase ───────────────────────"
$PYTHON scripts/13_gm_upsert.py $DRY_RUN

echo ""
if [ -z "$DRY_RUN" ]; then
  echo "── Step 5b/10 · Post-ingest cleanup (learned from audits) ─"
  echo "    Fixing empty strings, normalizing modalities/cities, checking coordinates…"
  $PYTHON scripts/27_post_ingest_cleanup.py --island "$ISLAND"
else
  echo "── Step 5b/10 · [Skipped — dry-run mode] ──────────────────"
fi

echo ""
if [ -z "$SKIP_ENRICH" ] && [ -z "$DRY_RUN" ]; then
  echo "── Step 6/10 · Enrich draft listings (fill missing fields) ──"
  echo "    Crawling newly inserted draft listings for email, phone, bio, photo…"
  $PYTHON scripts/22_website_enrich.py \
    --island "$ISLAND" \
    --status draft \
    --apply

  echo ""
  echo "── Step 7/10 · Website enrichment + lead scoring ─────────"
  echo "    Crawling draft listings inserted in this run…"
  $PYTHON scripts/22_website_enrich.py \
    --island "$ISLAND" \
    --status draft \
    --score-leads \
    --apply

  echo ""
  echo "── Step 8/10 · Name extraction from existing name field ─"
  echo "    Parsing first_name / last_name from practitioner names…"
  $PYTHON scripts/26_extract_names.py \
    --island "$ISLAND" \
    --apply

  echo ""
  echo "── Step 9/10 · Lead scoring (no-website listings) ────────"
  echo "    Flagging listings with no website as leads…"
  $PYTHON scripts/22_website_enrich.py \
    --island "$ISLAND" \
    --status all \
    --score-leads \
    --limit 0 \
    --apply
else
  if [ -n "$DRY_RUN" ]; then
    echo "── Steps 6–10 · [Skipped in dry-run mode] ───────────────"
  else
    echo "── Steps 6–10 · [Skipped — --skip-enrich flag set] ──────"
    echo "    Run manually:"
    echo "      python scripts/22_website_enrich.py --island $ISLAND --status draft --apply"
    echo "      python scripts/22_website_enrich.py --island $ISLAND --status draft --score-leads --apply"
    echo "      python scripts/26_extract_names.py --island $ISLAND --apply"
  fi
fi

echo ""
echo "═══════════════════════════════════════════════════════"
echo " Done!  Review new drafts in Admin → /admin"
echo " Near-miss review candidates → pipeline/output/gm_review.jsonl"
echo " Lead scores → Admin → Leads tab"
echo "═══════════════════════════════════════════════════════"
