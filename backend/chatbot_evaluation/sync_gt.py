import json

with open("data/golden_dataset.json", "r", encoding="utf-8") as f:
    golden = json.load(f)

with open("evaluation/results/collected_20260505_110821.json", "r", encoding="utf-8") as f:
    collected = json.load(f)

gt_map = {item["question"]: item["ground_truth"] for item in golden}

updated = 0
not_found = []
for item in collected["data"]:
    if item["question"] in gt_map:
        new_gt = gt_map[item["question"]]
        if item["ground_truth"] != new_gt:
            item["ground_truth"] = new_gt
            updated += 1
    else:
        not_found.append(item["question"])

with open("evaluation/results/collected_20260505_110821.json", "w", encoding="utf-8") as f:
    json.dump(collected, f, ensure_ascii=False, indent=2)

total = len(collected["data"])
print(f"Synced: {updated} ground_truth values updated, {total} total entries")
if not_found:
    print(f"Questions not found in golden_dataset ({len(not_found)}):")
    for q in not_found:
        print(f"  - {q}")
