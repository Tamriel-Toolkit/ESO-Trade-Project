import os
import re

path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "exports", "cache", "PriceTableNA.lua"))

print("File size:", os.path.getsize(path))

with open(path, "r", encoding="utf-8", errors="ignore") as f:
    snippet = f.read(2000)

print("\nSnippet of real PriceTableNA.lua downloaded from TTC:")
print(repr(snippet[:500]))
print("\nFirst 10 lines of real PriceTableNA.lua:")
for line in snippet.split('\n')[:15]:
    print(" ", line)
