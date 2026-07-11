import requests
import os
import sys
import subprocess
import time

UESP_DUMP_URL = "https://esoitem.uesp.net/dump/minedItemSummary.csv"
OUTPUT_FILE = "data-pipeline/minedItemSummary.csv"

def fetch_data():
    print(f"Attempting to download data from {UESP_DUMP_URL}...")
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36"
    }

    try:
        response = requests.get(UESP_DUMP_URL, headers=headers, stream=True)
        if response.status_code == 403:
            print("Error 403: Access denied by Cloudflare. Manual download required.")
            print("Please download 'minedItemSummary.csv' directly through a web browser")
            print("from https://esoitem.uesp.net/dump/minedItemSummary.csv and place it")
            print("in the data-pipeline/ directory.")
            return False

        response.raise_for_status()

        # Verify it's not a Cloudflare HTML challenge response
        content_type = response.headers.get("Content-Type", "")
        if "text/html" in content_type:
            print("Error: Received HTML instead of CSV (likely Cloudflare challenge). Manual download required.")
            return False

        print(f"Saving to {OUTPUT_FILE}...")
        with open(OUTPUT_FILE, 'wb') as f:
            for chunk in response.iter_content(chunk_size=8192):
                f.write(chunk)

        print("Download successful.")
        return True

    except requests.exceptions.RequestException as e:
        print(f"Download failed: {e}")
        return False

def main():
    # If the file already exists, we can proceed
    if os.path.exists(OUTPUT_FILE) and os.path.getsize(OUTPUT_FILE) > 1000:
        print(f"Found existing {OUTPUT_FILE}, proceeding to ingest.")
        success = True
    else:
        success = fetch_data()

    if success:
        print("Running ingestion script...")
        result = subprocess.run([sys.executable, "data-pipeline/ingest_mined_summary.py", OUTPUT_FILE])
        if result.returncode != 0:
            print("Ingestion script failed.")
            sys.exit(result.returncode)
        else:
            print("Ingestion completed successfully.")
    else:
        print("Cannot proceed with automatic ingestion without the data file.")
        sys.exit(1)

if __name__ == "__main__":
    main()
