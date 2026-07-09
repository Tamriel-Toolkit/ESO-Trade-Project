import requests
import json
import os
import sys
import time

# UESP Item Link Endpoint for structured JSON data
# Found during investigation of uesp-esolog repository
UESP_EXPORT_URL = "http://esoitem.uesp.net/exportJson.php"

def fetch_items(start_id, end_id, table="minedItemSummary"):
    """
    Fetches a range of items from the UESP export API.
    Note: Large ranges might be blocked or timed out.
    """
    print(f"Fetching items {start_id} to {end_id} from {table}...")

    params = {
        "table": table,
        "startid": start_id,
        "endid": end_id
    }

    # Using a browser-like User-Agent to be slightly more compatible
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36"
    }

    try:
        response = requests.get(UESP_EXPORT_URL, params=params, headers=headers)
        if response.status_code == 403:
            print("Error: Access denied by Cloudflare. This endpoint requires a browser or coordination with UESP.")
            return None

        response.raise_for_status()
        data = response.json()
        return data.get(table, [])
    except Exception as e:
        print(f"Failed to fetch data: {e}")
        return None

def main():
    if len(sys.argv) < 3:
        print("Usage: python data_extract.py <start_id> <end_id>")
        sys.exit(1)

    start_id = int(sys.argv[1])
    end_id = int(sys.argv[2])

    items = fetch_items(start_id, end_id)

    if items:
        os.makedirs("raw_data", exist_ok=True)
        output_file = f"raw_data/items_{start_id}_{end_id}.json"
        with open(output_file, "w") as f:
            json.dump(items, f, indent=2)
        print(f"Successfully saved {len(items)} items to {output_file}")
    else:
        print("No items retrieved.")

if __name__ == "__main__":
    main()
