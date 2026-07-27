from curl_cffi import requests
import re
import sys

sys.stdout.reconfigure(encoding='utf-8')

session = requests.Session(impersonate="chrome120")
headers = {
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
    "Referer": "https://us.tamrieltradecentre.com/pc/Trade"
}

r = session.get("https://us.tamrieltradecentre.com/pc/Trade/SearchResult?ItemNamePattern=Wax", headers=headers)
print(f"Loaded HTML ({len(r.text)} bytes)")

# Scan HTML for API endpoints or fetches
api_matches = re.findall(r'["\'](/pc/Trade/[^"\']+)["\']', r.text)
print(f"Found {len(set(api_matches))} endpoints in HTML:")
for endpoint in sorted(set(api_matches)):
    print(" ", endpoint)

# Also check JS bundles referenced in HTML
bundle_matches = re.findall(r'src=["\'](/bundles/[^"\']+)["\']', r.text)
print(f"\nFound JS bundle files: {bundle_matches}")

for b in bundle_matches:
    b_url = "https://us.tamrieltradecentre.com" + b
    print(f"\nFetching JS bundle: {b_url}...")
    br = session.get(b_url, headers=headers)
    endpoints_in_js = re.findall(r'["\'](/pc/Trade/[^"\']+)["\']', br.text)
    print(f"Endpoints found inside {b}: {sorted(set(endpoints_in_js))}")
