"""
CTXH Staff Chatbot Evaluation
==============================
Đánh giá chatbot dành cho staff (BTC/giảng viên) dựa trên golden_dataset_staff.json.

Metrics được đánh giá:
  - Tool Trigger Rate    : % câu hỏi khiến chatbot gọi đúng công cụ (heuristic từ nội dung response)
  - Response Quality     : Gemini đánh giá chất lượng câu trả lời (0–1)
  - SLA Metrics          : p50/p95/p99 latency

Cách sử dụng:
  # Đánh giá toàn bộ staff dataset
  python evaluate_staff.py

  # Test nhanh với 5 câu đầu
  python evaluate_staff.py --sample 5

  # Bỏ qua đánh giá bằng Gemini (chỉ tính heuristic)
  python evaluate_staff.py --skip-llm-judge

  # Bỏ qua các test có thể gây side effects (create_activity, auto_approve)
  python evaluate_staff.py --safe-only
"""

import argparse
import json
import os
import sys
import time
from datetime import datetime
from pathlib import Path

import requests
from dotenv import load_dotenv

# ─── Load .env ────────────────────────────────────────────────────────────────
_eval_env = Path(__file__).parent / '.env'
_backend_env = Path(__file__).parent.parent.parent / '.env'

if _eval_env.exists():
    load_dotenv(_eval_env)
else:
    load_dotenv(_backend_env)
    print(f"💡 Gợi ý: copy .env.example thành .env trong thư mục evaluation/\n")

# ─── Config ───────────────────────────────────────────────────────────────────
BASE_URL         = os.getenv('EVAL_BASE_URL')
GEMINI_API_KEY   = os.getenv('GEMINI_API_KEY')
EVAL_STAFF_TOKEN = os.getenv('EVAL_STAFF_TOKEN')
EVAL_DELAY_MS    = int(os.getenv('EVAL_DELAY_MS', '700'))

DATA_DIR             = Path(__file__).parent.parent / 'data'
GOLDEN_STAFF_DATASET = DATA_DIR / 'golden_dataset_staff.json'
RESULTS_DIR          = Path(__file__).parent / 'results'
RESULTS_DIR.mkdir(parents=True, exist_ok=True)

# Heuristic keywords để đánh giá tool được sử dụng từ response text
# Mỗi tool map sang các từ khoá thường xuất hiện trong response khi tool đó được dùng
_TOOL_RESPONSE_HINTS = {
    'query_managed_activities': [
        'hoạt động', 'danh sách', 'tổng số', 'chưa duyệt', 'đã duyệt',
        'đăng ký', 'tổ chức', 'diễn ra', 'slot', 'thành viên'
    ],
    'create_activity': [
        'tạo', 'đã tạo', 'mã hoạt động', 'thêm', 'hoạt động mới', 'thành công'
    ],
    'auto_approve_and_notify': [
        'duyệt', 'đã duyệt', 'thông báo', 'phê duyệt', 'đăng ký được duyệt'
    ],
    'respond_general': [
        'xin chào', 'chào', 'hỏi gì', 'giúp', 'hỗ trợ', 'không thuộc', 'ngoài phạm vi'
    ],
}

# Tools có thể gây side effects → mặc định bỏ qua trong --safe-only
_DESTRUCTIVE_TOOLS = {'create_activity', 'auto_approve_and_notify'}


# ─── Xác thực ─────────────────────────────────────────────────────────────────
def get_staff_token() -> str:
    """Lấy JWT staff token từ env."""
    if EVAL_STAFF_TOKEN:
        return EVAL_STAFF_TOKEN
    print("❌ Thiếu EVAL_STAFF_TOKEN trong .env!")
    print("   Staff token cần thuộc tài khoản có userType='staff'.")
    sys.exit(1)


# ─── Gọi Chatbot API ──────────────────────────────────────────────────────────
def call_chatbot(question: str, token: str, session_id: str | None = None) -> dict:
    """Gọi POST /api/ctxh-chat/message với staff token."""
    payload = {
        'message': question,
        'evaluation_mode': True,
    }
    if session_id:
        payload['sessionId'] = session_id

    resp = requests.post(
        f"{BASE_URL}/ctxh-chat/message",
        headers={'Authorization': f'Bearer {token}', 'Content-Type': 'application/json'},
        json=payload,
        timeout=90,
    )
    resp.raise_for_status()
    return resp.json()


# ─── Heuristic Tool Detection ─────────────────────────────────────────────────
def heuristic_tool_match(response_text: str, expected_tool: str) -> bool:
    """
    Kiểm tra heuristic xem response có phù hợp với expected_tool không.
    Đây là approximation — không thể chính xác 100% do API không expose tool name.
    """
    hints = _TOOL_RESPONSE_HINTS.get(expected_tool, [])
    if not hints:
        return False
    response_lower = response_text.lower()
    hit_count = sum(1 for h in hints if h.lower() in response_lower)
    return hit_count >= 2  # Cần ít nhất 2 keywords match


# ─── Gemini LLM Judge ─────────────────────────────────────────────────────────
def evaluate_with_gemini(question: str, response_text: str, ground_truth: str) -> float:
    """
    Dùng Gemini để chấm điểm chất lượng response so với ground_truth (0.0–1.0).
    Prompt đơn giản: relevance + completeness.
    """
    try:
        from google import genai as google_genai
    except ImportError:
        return -1.0  # -1 = chưa cài thư viện

    if not GEMINI_API_KEY:
        return -1.0

    client = google_genai.Client(api_key=GEMINI_API_KEY)

    prompt = f"""Bạn là người đánh giá chất lượng chatbot. 
Cho câu hỏi và câu trả lời của chatbot, hãy chấm điểm từ 0.0 đến 1.0.

Tiêu chí:
- 1.0: Trả lời đầy đủ, chính xác, phù hợp với ground truth
- 0.7: Trả lời đúng hướng nhưng thiếu chi tiết
- 0.4: Trả lời mơ hồ hoặc một phần đúng
- 0.0: Trả lời sai hoặc không liên quan

Câu hỏi: {question}
Ground truth: {ground_truth}
Câu trả lời của chatbot: {response_text[:500]}

Chỉ trả lời một số thập phân từ 0.0 đến 1.0, không giải thích."""

    try:
        result = client.models.generate_content(model='gemini-2.5-flash', contents=prompt)
        score_text = result.text.strip().replace(',', '.')
        return min(1.0, max(0.0, float(score_text)))
    except Exception:
        return -1.0


# ─── Thu thập và đánh giá ─────────────────────────────────────────────────────
def run_staff_evaluation(
    dataset: list,
    token: str,
    skip_llm_judge: bool = False,
    safe_only: bool = False,
) -> tuple[list, list]:
    """
    Chạy evaluation cho từng item trong staff dataset.
    Trả về (results, errors).
    """
    print(f"\n{'─'*65}")
    print(f"👔 Staff Chatbot Evaluation — {len(dataset)} items")
    if safe_only:
        print(f"   🛡️  Safe-only mode: bỏ qua destructive tools ({', '.join(_DESTRUCTIVE_TOOLS)})")
    print(f"{'─'*65}\n")

    results = []
    errors = []

    for i, item in enumerate(dataset, 1):
        item_id       = item.get('id', f'#{i}')
        question      = item['question']
        expected_tool = item.get('expected_tool', '')
        ground_truth  = item.get('ground_truth', '')
        intent        = item.get('intent', '')

        # Bỏ qua destructive tools trong safe-only mode
        if safe_only and expected_tool in _DESTRUCTIVE_TOOLS:
            print(f"[{i:3d}/{len(dataset)}] {item_id:12s} | ⏭️  Skipped (destructive)")
            results.append({
                'id': item_id, 'intent': intent,
                'expected_tool': expected_tool,
                'skipped': True, 'reason': 'destructive',
            })
            continue

        print(f"[{i:3d}/{len(dataset)}] {item_id:12s} | expected={expected_tool:30s} | {question[:40]}...")

        try:
            api_resp = call_chatbot(question, token)
            response_text = api_resp.get('response', '').strip()
            response_time = api_resp.get('responseTime', 0)

            # Heuristic tool match
            tool_matched = heuristic_tool_match(response_text, expected_tool)

            # LLM judge
            llm_score = -1.0
            if not skip_llm_judge and ground_truth:
                llm_score = evaluate_with_gemini(question, response_text, ground_truth)

            status = '✅' if tool_matched else '❌'
            llm_str = f' | llm={llm_score:.2f}' if llm_score >= 0 else ''
            print(f"          {status} heuristic={tool_matched} | {response_time}ms{llm_str}")

            results.append({
                'id':             item_id,
                'intent':         intent,
                'question':       question[:80],
                'expected_tool':  expected_tool,
                'response':       response_text[:200],
                'tool_matched':   tool_matched,
                'llm_score':      llm_score,
                'response_time':  response_time,
                'skipped':        False,
            })

        except Exception as e:
            msg = str(e)
            print(f"          ❌ Error: {msg}")
            errors.append({'id': item_id, 'error': msg})
            results.append({
                'id': item_id, 'intent': intent, 'question': question[:80],
                'expected_tool': expected_tool, 'response': '',
                'tool_matched': False, 'llm_score': -1.0,
                'response_time': 0, 'skipped': False, 'error': msg,
            })

        if i < len(dataset):
            time.sleep(EVAL_DELAY_MS / 1000)

    return results, errors


# ─── Compute SLA ──────────────────────────────────────────────────────────────
def compute_sla(results: list) -> dict:
    times = [r['response_time'] for r in results if not r.get('skipped') and r.get('response_time', 0) > 0]
    if not times:
        return {'p50': 0, 'p95': 0, 'p99': 0, 'avg': 0, 'count': 0}
    times_sorted = sorted(times)
    n = len(times_sorted)
    def pct(p):
        idx = int(round(p / 100 * n)) - 1
        return times_sorted[max(0, min(idx, n - 1))]
    return {
        'p50': pct(50), 'p95': pct(95), 'p99': pct(99),
        'avg': round(sum(times) / n, 1), 'count': n,
    }


# ─── Generate Report ──────────────────────────────────────────────────────────
def generate_report(results: list, errors: list, timestamp: str) -> dict:
    """Tính metrics và lưu JSON report."""
    evaluated = [r for r in results if not r.get('skipped') and 'error' not in r]
    skipped   = [r for r in results if r.get('skipped')]
    errored   = [r for r in results if 'error' in r]

    total = len(evaluated)
    tool_matched_count = sum(1 for r in evaluated if r['tool_matched'])
    tool_trigger_rate  = round(tool_matched_count / total, 4) if total > 0 else 0.0

    llm_scores = [r['llm_score'] for r in evaluated if r.get('llm_score', -1) >= 0]
    avg_llm    = round(sum(llm_scores) / len(llm_scores), 4) if llm_scores else None

    # By intent breakdown
    by_intent = {}
    for intent_label in {r['intent'] for r in evaluated}:
        group = [r for r in evaluated if r['intent'] == intent_label]
        grp_matched = sum(1 for r in group if r['tool_matched'])
        grp_llm = [r['llm_score'] for r in group if r.get('llm_score', -1) >= 0]
        by_intent[intent_label] = {
            'count':             len(group),
            'tool_trigger_rate': round(grp_matched / len(group), 4) if group else 0.0,
            'avg_llm_score':     round(sum(grp_llm) / len(grp_llm), 4) if grp_llm else None,
        }

    sla = compute_sla(evaluated)

    thresholds = {
        'tool_trigger_rate': 0.85,
        'avg_llm_score':     0.70,
    }
    pass_fail = {}
    pass_fail['tool_trigger_rate'] = '✅ PASS' if tool_trigger_rate >= thresholds['tool_trigger_rate'] else '⚠️  BELOW THRESHOLD'
    if avg_llm is not None:
        pass_fail['avg_llm_score'] = '✅ PASS' if avg_llm >= thresholds['avg_llm_score'] else '⚠️  BELOW THRESHOLD'
    else:
        pass_fail['avg_llm_score'] = 'N/A (--skip-llm-judge)'

    summary = {
        'timestamp':         timestamp,
        'total_in_dataset':  len(results),
        'evaluated':         total,
        'skipped':           len(skipped),
        'errors':            len(errored),
        'scores': {
            'tool_trigger_rate': tool_trigger_rate,
            'avg_llm_score':     avg_llm,
        },
        'thresholds':  thresholds,
        'pass_fail':   pass_fail,
        'by_intent':   by_intent,
        'sla_metrics': sla,
        'details':     results,
        'error_list':  errors,
    }

    json_path = RESULTS_DIR / f'staff_evaluation_{timestamp}.json'
    with open(json_path, 'w', encoding='utf-8') as f:
        json.dump(summary, f, ensure_ascii=False, indent=2)

    return summary, json_path


# ─── Print Summary ────────────────────────────────────────────────────────────
def print_summary(summary: dict):
    scores    = summary['scores']
    pass_fail = summary['pass_fail']

    print(f"\n{'='*65}")
    print(f"  👔 KẾT QUẢ ĐÁNH GIÁ STAFF CHATBOT")
    print(f"{'='*65}")
    print(f"  Mẫu đánh giá: {summary['evaluated']}/{summary['total_in_dataset']}"
          f"  (bỏ qua: {summary['skipped']}, lỗi: {summary['errors']})")
    sla = summary['sla_metrics']
    if sla['count']:
        print(f"  Latency: p50={sla['p50']}ms | p95={sla['p95']}ms | p99={sla['p99']}ms")
    print(f"{'─'*65}\n")

    ttr = scores.get('tool_trigger_rate', 0)
    filled = int(ttr * 25)
    bar = '█' * filled + '░' * (25 - filled)
    print(f"  Tool Trigger Rate    [{bar}] {ttr:.3f}  {pass_fail.get('tool_trigger_rate', '')}  (ngưỡng 0.85)")

    llm = scores.get('avg_llm_score')
    if llm is not None:
        filled = int(llm * 25)
        bar = '█' * filled + '░' * (25 - filled)
        print(f"  Avg LLM Score        [{bar}] {llm:.3f}  {pass_fail.get('avg_llm_score', '')}  (ngưỡng 0.70)")
    else:
        print(f"  Avg LLM Score       : N/A (dùng --skip-llm-judge để bỏ qua Gemini judge)")

    print(f"\n{'─'*65}")
    print(f"  📂 Phân tích theo intent:")
    for intent_lbl, stats in summary['by_intent'].items():
        llm_str = f" | llm={stats['avg_llm_score']:.2f}" if stats['avg_llm_score'] is not None else ''
        print(f"    {intent_lbl:30s} (n={stats['count']:3d}) | "
              f"tool_rate={stats['tool_trigger_rate']:.2f}{llm_str}")


# ─── Main ─────────────────────────────────────────────────────────────────────
def main():
    parser = argparse.ArgumentParser(
        description='CTXH Staff Chatbot Evaluation',
        formatter_class=argparse.ArgumentDefaultsHelpFormatter,
    )
    parser.add_argument(
        '--sample', type=int, default=None,
        help='Chỉ đánh giá N items đầu (để test nhanh)',
    )
    parser.add_argument(
        '--skip-llm-judge', action='store_true',
        help='Bỏ qua đánh giá bằng Gemini LLM judge (nhanh hơn, tiết kiệm API quota)',
    )
    parser.add_argument(
        '--safe-only', action='store_true',
        help=f'Bỏ qua tools có thể gây side effects: {", ".join(_DESTRUCTIVE_TOOLS)}',
    )
    args = parser.parse_args()

    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')

    # ── Load dataset ──────────────────────────────────────────────────────────
    if not GOLDEN_STAFF_DATASET.exists():
        print(f"❌ Không tìm thấy golden_dataset_staff.json tại: {GOLDEN_STAFF_DATASET}")
        sys.exit(1)

    with open(GOLDEN_STAFF_DATASET, encoding='utf-8') as f:
        dataset = json.load(f)

    if args.sample:
        dataset = dataset[:args.sample]
        print(f"🔬 Chế độ test: chỉ đánh giá {args.sample} items đầu\n")

    print(f"📂 Staff dataset: {len(dataset)} items | {GOLDEN_STAFF_DATASET.name}\n")

    # ── Xác thực ──────────────────────────────────────────────────────────────
    token = get_staff_token()

    # ── Chạy evaluation ───────────────────────────────────────────────────────
    results, errors = run_staff_evaluation(
        dataset, token,
        skip_llm_judge=args.skip_llm_judge,
        safe_only=args.safe_only,
    )

    # ── Tạo report ────────────────────────────────────────────────────────────
    summary, json_path = generate_report(results, errors, timestamp)

    print_summary(summary)

    print(f"\n{'='*65}")
    print(f"  💾 Saved: {json_path}")
    print(f"{'='*65}\n")


if __name__ == '__main__':
    main()
