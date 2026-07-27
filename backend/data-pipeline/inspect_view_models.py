from curl_cffi import requests
import re

session = requests.Session(impersonate="chrome120")
url = "https://us.tamrieltradecentre.com/pc/Trade/SearchResult?ItemNamePattern=Dreugh+Wax"

resp = session.get(
    url,
    headers={
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "Referer": "https://us.tamrieltradecentre.com/pc/Trade"
    },
    timeout=20
)

print(f"Searching {len(resp.text)} bytes of HTML for TradeListPageModel or JSON data...")

matches = re.findall(r'TradeListPageModel\s*=\s*(\{.*?\});', resp.text, re.DOTALL) or re.findall(r'TradeListPageModel\s*=\s*(\{.*)', resp.text)
if matches:
    print(f"Found TradeListPageModel match! ({len(matches[0])} chars)")
    print(matches[0][:500])
else:
    print("No direct regex match for TradeListPageModel = {")

# Find all script blocks or variables initialized with json objects
json_var_matches = re.findall(r'var\s+(\w+)\s*=\s*(\{.*?\});', resp.text, re.DOTALL)
print(f"Found {len(json_var_matches)} JS 'var = {{...}}' declarations:")
for var_name, json_str in json_var_matches:
    print(f"  Var '{var_name}' ({len(json_str)} chars) -> {json_str[:150]}")
