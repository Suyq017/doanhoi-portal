"""
Annotate golden_dataset.json với intent và use_case fields.
=============================================================
Script này chạy 1 lần để thêm metadata đánh giá vào golden_dataset.json hiện có.

Cách dùng:
  python annotate_dataset.py                        # annotate in-place
  python annotate_dataset.py --dry-run              # xem kết quả, không ghi file
  python annotate_dataset.py --out annotated.json   # ghi ra file mới
"""

import argparse
import json
import re
from pathlib import Path

# ─── Intent classification heuristics ────────────────────────────────────────

# Patterns suggesting a SPECIFIC named activity is being asked about
# (quoted name, bracket code, or question with no "nào" asking about a specific known activity)
_NAMED_ACTIVITY_PATTERNS = [
    r"hoạt động ['\"](.+?)['\"]",          # 'quoted name'
    r"hoạt động \[(.+?)\]",               # [bracketed name]
    r"\[.{3,}\] .+ (diễn ra|thuộc|ở đâu|khi nào|bao lâu|mấy ngày)",  # [CODE] specific
    # Asking "diễn ra khi nào / ở đâu" about a named activity (no filter keyword like "nào")
    r"^hoạt động [^\n]+ (diễn ra ở đâu|diễn ra khi nào|thuộc về|thuộc (khoa|tổ chức|liên chi đoàn))",
]

# Patterns suggesting user wants to filter/search
_FILTER_PATTERNS = [
    r"tháng \d+",           # "tháng 2"
    r"năm \d{4}",           # "năm 2025"
    r"có hoạt động .+ nào", # "có hoạt động X nào"
    r"hoạt động .+ nào .+ không",
    r"sắp diễn ra",
    r"đang diễn ra",
    r"sắp tổ chức",
]

# Patterns suggesting list-all request
_LIST_ALL_PATTERNS = [
    r"tất cả (các )?hoạt động",
    r"liệt kê",
    r"danh sách (tất cả|các|tổng hợp)",
    r"có bao nhiêu hoạt động",
    r"những hoạt động nào",
]

# ─── Use-case mapping ─────────────────────────────────────────────────────────
# UC-S01: Filter by org/category/time
# UC-S02: Named activity detail lookup
# UC-S03: Filter by location/time
# UC-S04: List all activities
_UC_LOCATION_KEYWORDS = ["ở đâu", "địa điểm", "nơi", "cơ sở", "campus", "tại đâu"]


def classify_intent(question: str) -> tuple[str, str]:
    """
    Returns (intent, use_case) for a search-type question.
    All existing golden_dataset items are search queries.
    """
    q_lower = question.lower()

    # 1. List-all (highest precedence if asking for "all")
    for pat in _LIST_ALL_PATTERNS:
        if re.search(pat, q_lower):
            return "search_list_all", "UC-S04"

    # 2. Named activity lookup — only if NOT asking "which/any" (contains "nào")
    #    "nào" indicates filter query, not named-activity lookup
    if "nào" not in q_lower:
        for pat in _NAMED_ACTIVITY_PATTERNS:
            if re.search(pat, q_lower):
                return "search_semantic", "UC-S02"

    # 3. Also match quoted/bracketed names even with "nào" present
    if re.search(r"hoạt động ['\"](.+?)['\"]", q_lower) or re.search(r"hoạt động \[(.+?)\]", q_lower):
        return "search_semantic", "UC-S02"

    # 4. Location-focused filter
    if any(kw in q_lower for kw in _UC_LOCATION_KEYWORDS):
        return "search_filtered", "UC-S03"

    # 5. Filter-based search
    for pat in _FILTER_PATTERNS:
        if re.search(pat, q_lower):
            return "search_filtered", "UC-S01"

    # 6. Default: semantic search
    return "search_semantic", "UC-S02"


def annotate(dataset: list[dict]) -> list[dict]:
    """Add intent, use_case, and expected_action fields to each item."""
    annotated = []
    stats: dict[str, int] = {}

    for item in dataset:
        question = item.get("question", "")
        intent, use_case = classify_intent(question)

        new_item = dict(item)
        new_item["intent"] = intent
        new_item["use_case"] = use_case
        new_item["expected_action"] = "search_ctxh_activities"  # all existing items are search

        annotated.append(new_item)
        stats[intent] = stats.get(intent, 0) + 1

    print("📊 Intent distribution:")
    for intent_key, count in sorted(stats.items()):
        pct = count / len(dataset) * 100
        print(f"   {intent_key:20s}: {count:4d} ({pct:.1f}%)")

    return annotated


def main():
    parser = argparse.ArgumentParser(description="Annotate golden_dataset.json with intent metadata")
    parser.add_argument("--dry-run", action="store_true", help="Print result, don't write file")
    parser.add_argument("--out", type=str, default=None, help="Output file path (default: overwrite input)")
    parser.add_argument("--input", type=str, default=None, help="Input file path")
    args = parser.parse_args()

    base_dir = Path(__file__).parent.parent / "data"
    input_path = Path(args.input) if args.input else base_dir / "golden_dataset.json"

    print(f"📂 Input : {input_path}")

    with open(input_path, encoding="utf-8") as f:
        dataset = json.load(f)

    print(f"📋 Items : {len(dataset)}\n")

    annotated = annotate(dataset)

    if args.dry_run:
        print("\n📝 First 3 annotated items:")
        for item in annotated[:3]:
            print(json.dumps(item, ensure_ascii=False, indent=2))
        print("\n✅ Dry run — no file written")
        return

    out_path = Path(args.out) if args.out else input_path
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(annotated, f, ensure_ascii=False, indent=2)

    action = "Updated" if out_path == input_path else "Written to"
    print(f"\n✅ {action}: {out_path}")


if __name__ == "__main__":
    main()
