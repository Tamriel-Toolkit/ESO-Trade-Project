from curl_cffi import requests
import re

session = requests.Session(impersonate="chrome120")
url = "https://us.tamrieltradecentre.com/bundles/JsonModels?v=PpuyopvPrZWjz4dsHNK-g6QRa7zmodBACfP_wrN1kd81"
r = session.get(url)

idx = r.text.find("TradeListPageModel")
if idx != -1:
    print(r.text[idx:idx+1500])
