from curl_cffi import requests

session = requests.Session(impersonate="chrome120")
url = "https://us.tamrieltradecentre.com/bundles/View?v=lU0K1t6WYT_sYSOeAbYUzdMBpg3NO8x8QhVWsodMEsE1"

r = session.get(url)
print(f"Loaded View bundle ({len(r.text)} bytes)")
print("Snippet of View bundle:")
print(r.text[:1200])
