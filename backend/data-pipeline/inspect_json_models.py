from curl_cffi import requests
import re
import sys

sys.stdout.reconfigure(encoding='utf-8')

session = requests.Session(impersonate="chrome120")
headers = {"Accept": "*/*", "Referer": "https://us.tamrieltradecentre.com/pc/Trade"}

url = "https://us.tamrieltradecentre.com/bundles/JsonModels?v=PpuyopvPrZWjz4dsHNK-g6QRa7zmodBACfP_wrN1kd81"
r = session.get(url, headers=headers)
print(f"Loaded JsonModels bundle ({len(r.text)} bytes)")

print("\nAll class/constructor definitions in JsonModels:")
classes = re.findall(r'class\s+(\w+)[^{]*\{[^}]*\}', r.text)
for c in classes:
    print("  Class:", c)

print("\nComplete JsonModels text:")
print(r.text[:2000])
