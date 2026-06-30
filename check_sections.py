import json

with open("spst_data_new.json", "r", encoding="utf-8") as f:
    data = json.load(f)

headers = [item for item in data if item["code"].endswith(".")]

with open("headers_debug.txt", "w", encoding="utf-8") as f:
    f.write(f"Total category headers: {len(headers)}\n")
    for h in headers:
        f.write(json.dumps(h, ensure_ascii=False) + "\n")

print("Done writing headers_debug.txt")
