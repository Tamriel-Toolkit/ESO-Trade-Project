from curl_cffi import requests

session = requests.Session(impersonate="chrome120")
url = "https://us.tamrieltradecentre.com/pc/Trade/SearchResult?ItemNamePattern=Dreugh+Wax"

resp = session.get(url, headers={"Referer": "https://us.tamrieltradecentre.com/pc/Trade"})

idx = resp.text.find("TradeListPageModel")
print(f"Index of TradeListPageModel in HTML: {idx}")

if idx != -1:
    print("Snippet around TradeListPageModel:")
    print(resp.text[max(0, idx-100):idx+500])
