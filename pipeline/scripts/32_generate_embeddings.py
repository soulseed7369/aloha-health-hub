#!/usr/bin/env python3
"""
Generate search embeddings for all listings.

Composes a search text from structured fields, generates a 384-dim embedding
using sentence-transformers/all-MiniLM-L6-v2, and stores it in search_embedding.

Supports two backends:
  1. Local: sentence-transformers (pip install sentence-transformers)
  2. OpenAI: text-embedding-3-small (set OPENAI_API_KEY env var)
     Note: OpenAI produces 1536 dims by default; we truncate to 384.

Usage:
  # Local inference (recommended for batch)
  python scripts/32_generate_embeddings.py

  # OpenAI backend
  python scripts/32_generate_embeddings.py --backend openai

  # Only process listings missing embeddings
  python scripts/32_generate_embeddings.py --missing-only

  # Dry run
  python scripts/32_generate_embeddings.py --dry-run

  # Process specific island
  python scripts/32_generate_embeddings.py --island big_island
"""

import argparse
import json
import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from src.supabase_client import client

ISLAND_LABELS = {
    "big_island": "Big Island",
    "maui": "Maui",
    "oahu": "Oahu",
    "kauai": "Kauai",
}


def fetch_taxonomy_labels(listing_id: str, listing_type: str, tax_cache: dict) -> dict:
    """Fetch taxonomy labels for a listing from join tables."""
    result = {}
    for axis, table in [
        ("modalities", "listing_modalities"),
        ("concerns", "listing_concerns"),
        ("approaches", "listing_approaches"),
    ]:
        rows = tax_cache.get((listing_id, listing_type, axis), [])
        result[axis] = rows
    return result


def build_taxonomy_cache() -> dict:
    """Pre-fetch all taxonomy join data into a cache dict."""
    terms = {t["id"]: t["label"] for t in client.table("taxonomy_terms").select("id,label").limit(10000).execute().data}
    cache = {}
    for axis, table in [
        ("modalities", "listing_modalities"),
        ("concerns", "listing_concerns"),
        ("approaches", "listing_approaches"),
    ]:
        rows = client.table(table).select("listing_id,listing_type,term_id").limit(50000).execute().data
        for r in rows:
            key = (r["listing_id"], r["listing_type"], axis)
            label = terms.get(r["term_id"], "")
            cache.setdefault(key, []).append(label)
    return cache


def compose_search_text(listing: dict, listing_type: str, tax_cache: dict) -> str:
    """Compose the text to embed from structured fields.

    Format:
      "{name}. {modality labels}. {concern labels}.
       {approach labels}. {bio/description first 200 chars}.
       Located in {city}, {island}."
    """
    parts = []

    name = listing.get("name") or ""
    parts.append(f"{name}.")

    labels = fetch_taxonomy_labels(listing["id"], listing_type, tax_cache)

    if labels["modalities"]:
        parts.append(f"Specializes in {', '.join(labels['modalities'])}.")
    elif listing.get("modalities"):
        # Fallback to old modalities array
        parts.append(f"Specializes in {', '.join(listing['modalities'])}.")

    if labels["concerns"]:
        parts.append(f"Helps with {', '.join(labels['concerns'])}.")

    if labels["approaches"]:
        parts.append(f"{', '.join(labels['approaches'])} approach.")

    # Bio or description
    text_field = "bio" if listing_type == "practitioner" else "description"
    bio = listing.get(text_field) or ""
    if bio:
        # First 200 chars
        snippet = bio[:200].strip()
        if len(bio) > 200:
            snippet = snippet.rsplit(" ", 1)[0] + "..."
        parts.append(snippet)

    # Location
    city = listing.get("city") or ""
    island = listing.get("island") or ""
    island_label = ISLAND_LABELS.get(island, island)
    if city and island_label:
        parts.append(f"Located in {city}, {island_label}, Hawaii.")
    elif island_label:
        parts.append(f"Located on {island_label}, Hawaii.")

    return " ".join(parts)


# ── Embedding backends ─────────────────────────────────────────────────────

def get_local_embedder():
    """Load sentence-transformers model."""
    try:
        from sentence_transformers import SentenceTransformer
    except ImportError:
        print("Error: pip install sentence-transformers --break-system-packages")
        sys.exit(1)
    model = SentenceTransformer("all-MiniLM-L6-v2")
    return model


def embed_batch_local(texts: list[str], model) -> list[list[float]]:
    """Generate embeddings using local sentence-transformers."""
    embeddings = model.encode(texts, show_progress_bar=False, normalize_embeddings=True)
    return [emb.tolist() for emb in embeddings]


def embed_batch_openai(texts: list[str]) -> list[list[float]]:
    """Generate embeddings using OpenAI API."""
    import openai
    api_key = os.environ.get("OPENAI_API_KEY")
    if not api_key:
        print("Error: OPENAI_API_KEY env var required for --backend openai")
        sys.exit(1)
    oa_client = openai.OpenAI(api_key=api_key)
    response = oa_client.embeddings.create(
        input=texts,
        model="text-embedding-3-small",
        dimensions=384,  # Truncate to 384 dims to match our vector(384) column
    )
    return [d.embedding for d in response.data]


# ── Main ───────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="Generate search embeddings for listings")
    parser.add_argument("--backend", choices=["local", "openai"], default="local",
                        help="Embedding backend (default: local)")
    parser.add_argument("--dry-run", action="store_true", help="Preview without writing")
    parser.add_argument("--missing-only", action="store_true",
                        help="Only process listings without embeddings")
    parser.add_argument("--island", type=str, help="Only process this island")
    parser.add_argument("--batch-size", type=int, default=32, help="Batch size for embedding")
    args = parser.parse_args()

    if args.dry_run:
        print("🔍 DRY RUN — no data will be written\n")

    # Load taxonomy cache
    print("Loading taxonomy data...")
    tax_cache = build_taxonomy_cache()

    # Load model if using local backend
    model = None
    if args.backend == "local" and not args.dry_run:
        print("Loading sentence-transformers model...")
        model = get_local_embedder()
        print("  ✓ Model loaded")

    # Fetch listings
    for listing_type, table in [("practitioner", "practitioners"), ("center", "centers")]:
        print(f"\n═══ Processing {table} ═══")
        q = client.table(table).select("*").limit(10000)
        if args.island:
            q = q.eq("island", args.island)
        listings = q.execute().data

        if args.missing_only:
            listings = [l for l in listings if not l.get("search_embedding")]
            print(f"  {len(listings)} listings missing embeddings")
        else:
            print(f"  {len(listings)} total listings")

        if not listings:
            continue

        # Compose search texts
        texts = []
        ids = []
        for lst in listings:
            text = compose_search_text(lst, listing_type, tax_cache)
            texts.append(text)
            ids.append(lst["id"])

        if args.dry_run:
            # Show a few samples
            for i, (text, lid) in enumerate(zip(texts[:3], ids[:3])):
                print(f"  [{lid[:8]}...] {text[:120]}...")
            print(f"  ... ({len(texts)} total)")
            continue

        # Generate embeddings in batches
        total = 0
        for i in range(0, len(texts), args.batch_size):
            batch_texts = texts[i : i + args.batch_size]
            batch_ids = ids[i : i + args.batch_size]

            if args.backend == "local":
                embeddings = embed_batch_local(batch_texts, model)
            else:
                embeddings = embed_batch_openai(batch_texts)

            # Write to DB
            for lid, emb in zip(batch_ids, embeddings):
                # pgvector expects a string representation: '[0.1, 0.2, ...]'
                emb_str = "[" + ",".join(f"{v:.6f}" for v in emb) + "]"
                client.table(table).update({"search_embedding": emb_str}).eq("id", lid).execute()

            total += len(batch_texts)
            if total % 100 == 0 or total == len(texts):
                print(f"  ... {total}/{len(texts)} embeddings generated")

        print(f"  ✓ {total} embeddings stored")

    print("\n✅ Embedding generation complete!")


if __name__ == "__main__":
    main()
