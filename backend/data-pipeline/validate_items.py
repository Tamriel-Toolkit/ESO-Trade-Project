"""Validate an acquired UESP release artifact without opening the application database."""
import argparse

from catalog_manifest import load_export
from populate_sqlite import DEFAULT_JSON_PATH


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", default=DEFAULT_JSON_PATH)
    parser.add_argument("--manifest")
    parser.add_argument("--manifest-sha256", required=True)
    args = parser.parse_args()
    items, manifest, _ = load_export(args.input, args.manifest, args.manifest_sha256)
    print(f"Validated {len(items)} items from UESP retrieval {manifest['retrieval_id']}.")
