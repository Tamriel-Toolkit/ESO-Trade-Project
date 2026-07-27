import zipfile
import os
import re

zip_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "exports", "cache", "PriceTableNA_real.zip"))

print(f"Opening zip archive: {zip_path}...")
with zipfile.ZipFile(zip_path) as z:
    print("Files in archive:", z.namelist())
    lookup_content = z.read("ItemLookUpTable_EN.lua").decode("utf-8", errors="ignore")
    print(f"ItemLookUpTable_EN.lua loaded ({len(lookup_content)} bytes).")
    print("\nFirst 1,000 characters of ItemLookUpTable_EN.lua:")
    print(lookup_content[:1000])
