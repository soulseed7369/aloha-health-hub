#!/usr/bin/env python3
"""
One-off script: merge duplicate practitioner listings.
Usage: cd pipeline && python3 scripts/merge_duplicate.py "Mei-Jen Stokesbary"

Keeps the claimed listing (owner_id not null).
Copies non-empty fields from unclaimed → claimed where claimed has null/empty.
Deletes the unclaimed duplicate.
"""
import sys
import os
from pathlib import Path
from dotenv import load_dotenv

load_dotenv(dotenv_path=Path(__file__).parent.parent.parent / '.env')

from supabase import create_client

url = os.environ['SUPABASE_URL']
key = os.environ['SUPABASE_SERVICE_ROLE_KEY']
client = create_client(url, key)

def merge_practitioner(name: str):
    res = client.table('practitioners').select('*').ilike('name', f'%{name}%').execute()
    rows = res.data
    if not rows:
        print(f"No practitioners found matching '{name}'")
        return
    if len(rows) == 1:
        print(f"Only one listing found — nothing to merge:\n  id={rows[0]['id']} name={rows[0]['name']}")
        return

    print(f"\nFound {len(rows)} listings:\n")
    for r in rows:
        print(f"  id={r['id']}")
        print(f"  name={r['name']}")
        print(f"  owner_id={r.get('owner_id')}")
        print(f"  island={r.get('island')}")
        print(f"  status={r.get('status')}")
        print(f"  tier={r.get('tier')}")
        print(f"  email={r.get('email')}")
        print(f"  phone={r.get('phone')}")
        print(f"  bio={'(set, ' + str(len(r.get('bio') or '')) + ' chars)' if r.get('bio') else '(empty)'}")
        print(f"  photo_url={'(set)' if r.get('photo_url') else '(empty)'}")
        print()

    claimed = [r for r in rows if r.get('owner_id')]
    unclaimed = [r for r in rows if not r.get('owner_id')]

    if not claimed:
        print("ERROR: None of the listings are claimed (owner_id is null on all). Aborting.")
        return
    if len(claimed) > 1:
        print("Multiple claimed listings found — manual resolution needed.")
        for c in claimed:
            print(f"  claimed: id={c['id']} owner_id={c['owner_id']}")
        return

    keep = claimed[0]
    remove = unclaimed  # could be >1 unclaimed duplicates

    print(f"KEEPING  (claimed): id={keep['id']}  name={keep['name']}")
    for r in remove:
        print(f"REMOVING (unclaimed): id={r['id']}  name={r['name']}")

    # Fields to copy from unclaimed → claimed when claimed has null/empty value
    COPYABLE = [
        'bio', 'photo_url', 'phone', 'email', 'website_url',
        'address', 'city', 'lat', 'lng', 'social_links',
        'modalities', 'credentials', 'session_type',
        'external_booking_url', 'accepts_new_clients',
    ]

    patch = {}
    for source in remove:
        for field in COPYABLE:
            current = keep.get(field)
            incoming = source.get(field)
            # Copy if kept listing is missing the value
            empty_current = (
                current is None or
                current == '' or
                current == [] or
                current == {}
            )
            has_incoming = (
                incoming is not None and
                incoming != '' and
                incoming != [] and
                incoming != {}
            )
            if empty_current and has_incoming and field not in patch:
                patch[field] = incoming
                print(f"  Will copy '{field}' from unclaimed: {repr(incoming)[:80]}")

    print(f"\nPatch to apply to kept listing: {list(patch.keys()) if patch else '(none — no extra data)'}")
    confirm = input("\nProceed? (yes/no): ").strip().lower()
    if confirm != 'yes':
        print("Aborted.")
        return

    if patch:
        client.table('practitioners').update(patch).eq('id', keep['id']).execute()
        print(f"  ✓ Updated kept listing with: {list(patch.keys())}")

    for r in remove:
        client.table('practitioners').delete().eq('id', r['id']).execute()
        print(f"  ✓ Deleted unclaimed duplicate: id={r['id']}")

    print("\nDone.")

if __name__ == '__main__':
    name = sys.argv[1] if len(sys.argv) > 1 else 'Mei-Jen Stokesbary'
    merge_practitioner(name)
