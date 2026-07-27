from curl_cffi import requests
import re
import sys

sys.stdout.reconfigure(encoding='utf-8')

session = requests.Session(impersonate="chrome120")
headers = {
    "Accept": "*/*",
    "Referer": "https://us.tamrieltradecentre.com/pc/Trade"
}

bundle_url = "https://us.tamrieltradecentre.com/bundles/SearchResult?v=Age6evqmOB36AIdNCOon8O7ZzUwJgNPdO1Ui2P9u_dA1"
r = session.get(bundle_url, headers=headers)
print(f"Loaded SearchResult bundle ({len(r.text)} bytes)")

# Search for URLs, ajax calls, or endpoints in the bundle text
urls = re.findall(r'["\'](/[^"\']+)["\']', r.text)
print(f"Found {len(set(urls))} relative URLs in SearchResult bundle:")
for u in sorted(set(urls)):
    print(" ", u)

print("\nSnippet of SearchResult JS bundle:")
print(r.text[:600])
