#!/bin/bash
# ============================================================================
# Sprint 2: Full taxonomy backfill pipeline
# ============================================================================
# Run from: cd pipeline && bash scripts/run_backfill.sh
#
# Prerequisites:
#   1. Sprint 1 migrations applied to Supabase
#   2. Migration 20260310000006_profile_completeness.sql applied
#   3. Python deps: pip install supabase python-dotenv sentence-transformers
#
# Flags:
#   --dry-run     Preview without writing
#   --clear       Clear existing join table data first
#   --skip-embed  Skip embedding generation (slow, requires model download)
# ============================================================================

set -e
cd "$(dirname "$0")/.."

DRY_RUN=""
CLEAR=""
SKIP_EMBED=""

for arg in "$@"; do
  case $arg in
    --dry-run) DRY_RUN="--dry-run" ;;
    --clear) CLEAR="--clear" ;;
    --skip-embed) SKIP_EMBED="1" ;;
  esac
done

echo "╔══════════════════════════════════════════════════════╗"
echo "║       Sprint 2: Taxonomy Backfill Pipeline          ║"
echo "╚══════════════════════════════════════════════════════╝"
echo ""

# Step 1: Backfill taxonomy join tables
echo "▶ Step 1/3: Backfill taxonomy join tables..."
python3 scripts/30_backfill_taxonomy.py $DRY_RUN $CLEAR
echo ""

# Step 2: Rebuild search documents + profile completeness
echo "▶ Step 2/3: Rebuild search documents + profile completeness..."
python3 scripts/31_rebuild_search_docs.py $DRY_RUN
echo ""

# Step 3: Generate embeddings
if [ -z "$SKIP_EMBED" ]; then
  echo "▶ Step 3/3: Generate embeddings..."
  python3 scripts/32_generate_embeddings.py $DRY_RUN
else
  echo "▶ Step 3/3: Skipped (--skip-embed)"
fi

echo ""
echo "╔══════════════════════════════════════════════════════╗"
echo "║           Backfill pipeline complete!                ║"
echo "╚══════════════════════════════════════════════════════╝"
