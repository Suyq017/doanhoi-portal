"""
CTXH Chatbot RAG Evaluation với RAGAS
======================================
Đánh giá chất lượng pipeline RAG của chatbot CTXH dựa trên golden_dataset.json.

Metrics được đánh giá (theo bài viết Viblo):
  - Faithfulness         : Answer có dựa trên context không (tránh hallucination)
  - Answer Relevancy     : Answer có trả lời đúng câu hỏi không
  - Context Precision    : Context liên quan có được xếp hạng cao không
  - Context Recall       : Context có đủ thông tin để trả lời không

Cách sử dụng:
  # Đánh giá toàn bộ golden dataset
  python evaluate.py

  # Test nhanh với 10 câu đầu
  python evaluate.py --sample 10

  # Bỏ qua bước gọi API, dùng file collected có sẵn
  python evaluate.py --skip-api --collected-file results/collected_20260305_143000.json
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
# Ưu tiên: test/evaluation/.env > backend/.env
_eval_env = Path(__file__).parent / '.env'
_backend_env = Path(__file__).parent.parent.parent / '.env'

if _eval_env.exists():
    load_dotenv(_eval_env)
else:
    load_dotenv(_backend_env)
    print(f"💡 Gợi ý: copy .env.example thành .env trong thư mục evaluation/\n")

# ─── Config ───────────────────────────────────────────────────────────────────
BASE_URL        = os.getenv('EVAL_BASE_URL')
GEMINI_API_KEY  = os.getenv('GEMINI_API_KEY')
EVAL_EMAIL      = os.getenv('EVAL_EMAIL')
EVAL_PASSWORD   = os.getenv('EVAL_PASSWORD')
EVAL_JWT_TOKEN  = os.getenv('EVAL_JWT_TOKEN')
EVAL_STUDENT_TOKEN = os.getenv('EVAL_STUDENT_TOKEN') or os.getenv('EVAL_JWT_TOKEN')
EVAL_DELAY_MS   = int(os.getenv('EVAL_DELAY_MS', '700'))

DATA_DIR               = Path(__file__).parent.parent / 'data'
GOLDEN_DATASET         = DATA_DIR / 'golden_dataset.json'
GOLDEN_INTENT_DATASET  = DATA_DIR / 'golden_dataset_intent.json'
RESULTS_DIR            = Path(__file__).parent / 'results'
RESULTS_DIR.mkdir(parents=True, exist_ok=True)

# Intent mapping: API intent → dataset intent group
_INTENT_MAP = {
    'RAG_QUERY':           {'search_filtered', 'search_semantic', 'search_list_all'},
    'GREETING':            {'greeting'},
    'CHITCHAT':            {'out_of_scope'},
    'REGISTER_ACTIVITY':   {'register'},
}


# ─── Xác thực ─────────────────────────────────────────────────────────────────
def get_jwt_token() -> str:
    """Lấy JWT token từ env hoặc tự động đăng nhập."""
    if EVAL_JWT_TOKEN:
        return EVAL_JWT_TOKEN

    if not EVAL_EMAIL or not EVAL_PASSWORD:
        print("❌ Thiếu thông tin xác thực!")
        print("   Hãy set một trong hai cách trong .env:")
        print("     EVAL_JWT_TOKEN=<token>")
        print("     EVAL_EMAIL=... + EVAL_PASSWORD=...")
        sys.exit(1)

    print(f"🔐 Đăng nhập với tài khoản {EVAL_EMAIL}...")
    try:
        resp = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": EVAL_EMAIL, "password": EVAL_PASSWORD},
            timeout=15,
        )
        resp.raise_for_status()
        data = resp.json()
        token = data.get('access_token') or data.get('token')
        if not token:
            raise ValueError(f"Không tìm thấy token trong response: {list(data.keys())}")
        print("✅ Đăng nhập thành công\n")
        return token
    except requests.HTTPError as e:
        print(f"❌ Đăng nhập thất bại ({e.response.status_code}): {e.response.text}")
        sys.exit(1)


# ─── Gọi Chatbot API ──────────────────────────────────────────────────────────
def call_chatbot(question: str, token: str, session_id: str | None = None) -> dict:
    """
    Gọi POST /api/ctxh-chat/message với evaluation_mode=True.
    Response sẽ có thêm trường `contexts` chứa full text của retrieved documents.
    """
    payload = {
        "message": question,
        "evaluation_mode": True,
    }
    if session_id:
        payload["sessionId"] = session_id

    resp = requests.post(
        f"{BASE_URL}/ctxh-chat/message",
        headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
        json=payload,
        timeout=90,
    )
    resp.raise_for_status()
    return resp.json()


# ─── Thu thập dữ liệu từ API ──────────────────────────────────────────────────
def collect_api_responses(golden_dataset: list, token: str) -> tuple[list, list]:
    """
    Gọi chatbot API cho từng câu hỏi trong golden_dataset.
    Trả về (collected_data, errors).
    """
    print(f"{'─'*65}")
    print(f"🤖 Thu thập phản hồi từ chatbot API — {len(golden_dataset)} câu hỏi")
    print(f"⏱️  Delay: {EVAL_DELAY_MS}ms/request | Timeout: 90s")
    print(f"{'─'*65}\n")

    collected = []
    errors = []

    for i, item in enumerate(golden_dataset, 1):
        question    = item['question']
        ground_truth = item['ground_truth']
        metadata     = item.get('metadata', {})
        source_ma    = metadata.get('ma_ctxh', 'N/A')

        print(f"[{i:3d}/{len(golden_dataset)}] {source_ma:15s} | {question[:55]}...")

        try:
            api_resp = call_chatbot(question, token)

            answer   = api_resp.get('response', '').strip()
            contexts = api_resp.get('contexts') or []

            # Fallback: contexts chưa được expose → dùng content từ sources (đã truncate)
            if not contexts and api_resp.get('sources'):
                contexts = [
                    s.get('content', '').replace('...', '').strip()
                    for s in api_resp['sources']
                    if s.get('content')
                ]

            # RAGAS yêu cầu ít nhất 1 non-empty context
            if not any(c.strip() for c in contexts):
                contexts = ['[Không tìm được tài liệu liên quan]']
                print(f"          ⚠️  Không có contexts")

            rt = api_resp.get('responseTime', 0)
            ns = len(api_resp.get('sources', []))
            print(f"          ✅ {len(contexts)} contexts | {rt}ms | {ns} sources")

            collected.append({
                'question':     question,
                'answer':       answer,
                'contexts':     contexts,
                'ground_truth': ground_truth,
                '_meta': {
                    'source_ma':      source_ma,
                    'loai_hd':        metadata.get('loai_hoat_dong', ''),
                    'dia_diem':       metadata.get('dia_diem', ''),
                    'thoi_gian':      metadata.get('thoi_gian_thuc_hien', ''),
                    'response_time':  rt,
                    'num_sources':    ns,
                    'has_contexts':   bool(api_resp.get('contexts')),
                },
            })

        except requests.HTTPError as e:
            msg = f"HTTP {e.response.status_code}: {e.response.text[:100]}"
            print(f"          ❌ {msg}")
            errors.append({'index': i, 'question': question[:60], 'error': msg})
            # Placeholder để giữ alignment
            collected.append({
                'question': question, 'answer': '', 'contexts': [''],
                'ground_truth': ground_truth,
                '_meta': {'source_ma': source_ma, 'error': msg},
            })

        except Exception as e:
            msg = str(e)
            print(f"          ❌ {msg}")
            errors.append({'index': i, 'question': question[:60], 'error': msg})
            collected.append({
                'question': question, 'answer': '', 'contexts': [''],
                'ground_truth': ground_truth,
                '_meta': {'source_ma': source_ma, 'error': msg},
            })

        if i < len(golden_dataset):
            time.sleep(EVAL_DELAY_MS / 1000)

    print(f"\n{'─'*65}")
    success = sum(1 for c in collected if c['answer'])
    print(f"✅ Thành công: {success}/{len(golden_dataset)} | ❌ Lỗi: {len(errors)}")

    return collected, errors


# ─── RAGAS Evaluation ─────────────────────────────────────────────────────────
def run_ragas(valid_data: list):
    """
    Chạy RAGAS evaluation với Gemini làm LLM judge.
    Input: list[dict] với keys: question, answer, contexts, ground_truth
    """
    try:
        from datasets import Dataset
        from ragas import evaluate
        from ragas.metrics import (
            faithfulness,
            answer_relevancy,
            context_precision,
            context_recall,
        )
        from ragas.llms import LangchainLLMWrapper
        from ragas.embeddings import LangchainEmbeddingsWrapper
        from langchain_google_genai import (
            ChatGoogleGenerativeAI,
            GoogleGenerativeAIEmbeddings,
        )
    except ImportError as e:
        print(f"\n❌ Thiếu thư viện: {e}")
        print("   Chạy: pip install -r requirements.txt")
        sys.exit(1)

    if not GEMINI_API_KEY:
        print("❌ GEMINI_API_KEY chưa được set!")
        sys.exit(1)

    print("\n🔧 Khởi tạo Gemini LLM judge cho RAGAS...")

    # Gemini làm LLM judge (temperature=0 để kết quả ổn định)
    gemini_llm = LangchainLLMWrapper(
        ChatGoogleGenerativeAI(
            model="gemini-2.5-flash",
            google_api_key=GEMINI_API_KEY,
            temperature=0,
        )
    )

    # Gemini 
    gemini_embeddings = LangchainEmbeddingsWrapper(
        GoogleGenerativeAIEmbeddings(
            model="gemini-embedding-001",
            google_api_key=GEMINI_API_KEY,
        )
    )

    # Gán LLM và embeddings cho từng metric
    metrics = [faithfulness, answer_relevancy, context_precision, context_recall]
    for metric in metrics:
        metric.llm = gemini_llm
        if hasattr(metric, 'embeddings'):
            metric.embeddings = gemini_embeddings

    # Chuyển đổi sang HuggingFace Dataset (format mà RAGAS yêu cầu)
    # contexts phải là list[str] cho mỗi sample
    hf_data = {
        'question':     [d['question']     for d in valid_data],
        'answer':       [d['answer']       for d in valid_data],
        'contexts':     [d['contexts']     for d in valid_data],
        'ground_truth': [d['ground_truth'] for d in valid_data],
    }
    dataset = Dataset.from_dict(hf_data)

    print(f"🚀 Bắt đầu RAGAS evaluation — {len(valid_data)} samples...\n")
    print("   Metrics: faithfulness | answer_relevancy | context_precision | context_recall")
    print("   (Quá trình này sẽ mất vài phút do gọi Gemini API)\n")

    result = evaluate(dataset, metrics=metrics)
    return result


# ─── Report ───────────────────────────────────────────────────────────────────
def generate_report(result, collected: list, timestamp: str) -> dict:
    """Tạo report JSON + CSV từ kết quả RAGAS."""
    import pandas as pd

    df = result.to_pandas()

    # Ghép metadata vào dataframe
    valid_meta = [d['_meta'] for d in collected if d.get('answer')]
    df['source_ma']    = [m.get('source_ma', '')   for m in valid_meta]
    df['loai_hd']      = [m.get('loai_hd', '')     for m in valid_meta]
    df['dia_diem']     = [m.get('dia_diem', '')     for m in valid_meta]
    df['response_ms']  = [m.get('response_time', 0) for m in valid_meta]
    df['num_sources']  = [m.get('num_sources', 0)   for m in valid_meta]
    df['has_contexts'] = [m.get('has_contexts', False) for m in valid_meta]

    # ── Lưu CSV ──
    # Tạo bản copy để format lại trước khi xuất — không ảnh hưởng đến tính toán bên dưới
    csv_df = df.copy()

    # contexts là list[str] → join thành 1 chuỗi, ngăn cách bằng " || "
    # (nếu để nguyên list, dấu phẩy bên trong làm Excel tưởng nhiều cột)
    if 'contexts' in csv_df.columns:
        csv_df['contexts'] = csv_df['contexts'].apply(
            lambda x: ' || '.join(str(c) for c in x) if isinstance(x, list) else str(x or '')
        )

    # Xóa newline trong các cột text dài để tránh vỡ hàng trong Excel
    for col in ('question', 'answer', 'ground_truth', 'contexts'):
        if col in csv_df.columns:
            csv_df[col] = csv_df[col].astype(str).str.replace('\n', ' ', regex=False).str.replace('\r', '', regex=False)

    csv_path = RESULTS_DIR / f'evaluation_{timestamp}.csv'
    csv_df.to_csv(csv_path, index=False, encoding='utf-8-sig', quoting=1)  # quoting=csv.QUOTE_ALL

    # ── Tính scores tổng hợp ──
    score_keys = ['faithfulness', 'answer_relevancy', 'context_precision', 'context_recall']
    scores = {
        k: round(float(df[k].mean()), 4)
        for k in score_keys
        if k in df.columns
    }

    # ── Phân tích theo loại hoạt động ──
    by_category = {}
    for cat in df['loai_hd'].unique():
        if not cat:
            continue
        cat_df = df[df['loai_hd'] == cat]
        by_category[cat] = {
            'count': len(cat_df),
            **{k: round(float(cat_df[k].mean()), 4) for k in score_keys if k in cat_df.columns},
        }

    # ── Xác định failures (dưới ngưỡng min) ──
    thresholds = {
        'faithfulness':      0.80,
        'answer_relevancy':  0.60,
        'context_precision': 0.70,
        'context_recall':    0.65,
    }
    failures = []
    for _, row in df.iterrows():
        for metric, threshold in thresholds.items():
            if metric in row and row[metric] < threshold:
                # 'question' in RAGAS 0.1.x, 'user_input' in RAGAS 0.2.x
                q = row.get('question') or row.get('user_input') or ''
                failures.append({
                    'source_ma':   row.get('source_ma', ''),
                    'question':    str(q)[:80],
                    'metric':      metric,
                    'score':       round(float(row[metric]), 4),
                    'threshold':   threshold,
                })

    # ── SLA metrics từ response_time ──
    sla = compute_sla_metrics(collected)

    # ── Phân tích theo intent (nếu có trường intent trong collected) ──
    by_intent = {}
    if all('intent' in d.get('_meta', {}) for d in collected if d.get('answer')):
        for intent_label in df.get('intent', pd.Series(dtype=str)).unique() if 'intent' in df.columns else []:
            i_df = df[df['intent'] == intent_label]
            by_intent[intent_label] = {
                'count': len(i_df),
                **{k: round(float(i_df[k].mean()), 4) for k in score_keys if k in i_df.columns},
            }

    # ── Tổng hợp summary ──
    summary = {
        'timestamp':         timestamp,
        'total_in_dataset':  len(collected),
        'evaluated_samples': len(df),
        'skipped_errors':    len(collected) - len(df),
        'scores':            scores,
        'thresholds':        thresholds,
        'pass_fail': {
            k: '✅ PASS' if scores.get(k, 0) >= thresholds[k] else '⚠️  BELOW THRESHOLD'
            for k in thresholds
        },
        'by_category':       by_category,
        'by_intent':         by_intent,
        'top_failures':      failures[:20],  # Giới hạn 20 failures
        'stats': {
            'avg_response_ms':   round(float(df['response_ms'].mean()), 1),
            'avg_num_sources':   round(float(df['num_sources'].mean()), 2),
            'pct_with_contexts': round(float(df['has_contexts'].mean()) * 100, 1),
        },
        'sla_metrics': sla,
    }

    # ── Lưu JSON ──
    json_path = RESULTS_DIR / f'evaluation_{timestamp}.json'
    with open(json_path, 'w', encoding='utf-8') as f:
        json.dump(summary, f, ensure_ascii=False, indent=2)

    return summary, csv_path, json_path


def print_summary(summary: dict):
    """In kết quả ra console theo dạng dễ đọc."""
    scores     = summary['scores']
    thresholds = summary['thresholds']
    pass_fail  = summary['pass_fail']

    print(f"\n{'='*65}")
    print(f"  📊 KẾT QUẢ ĐÁNH GIÁ RAG — RAGAS + Gemini")
    print(f"{'='*65}")
    print(f"  Mẫu đánh giá: {summary['evaluated_samples']}/{summary['total_in_dataset']}")
    print(f"  Avg response: {summary['stats']['avg_response_ms']:.0f}ms")
    print(f"  Contexts OK : {summary['stats']['pct_with_contexts']:.0f}% samples có full contexts")
    print(f"{'─'*65}\n")

    labels = [
        ('Faithfulness       ', 'faithfulness'),
        ('Answer Relevancy   ', 'answer_relevancy'),
        ('Context Precision  ', 'context_precision'),
        ('Context Recall     ', 'context_recall'),
    ]

    for label, key in labels:
        score     = scores.get(key, 0)
        threshold = thresholds.get(key, 0)
        pf        = pass_fail.get(key, '')
        filled    = int(score * 25)
        bar       = '█' * filled + '░' * (25 - filled)
        print(f"  {label} [{bar}] {score:.3f}  {pf}  (ngưỡng {threshold})")

    print(f"\n{'─'*65}")
    print(f"  📂 Phân tích theo loại hoạt động:")
    for cat, stats in summary['by_category'].items():
        short = cat[:38]
        f_score  = stats.get('faithfulness', 0)
        ar_score = stats.get('answer_relevancy', 0)
        cp_score = stats.get('context_precision', 0)
        cr_score = stats.get('context_recall', 0)
        print(f"    {short:38s} (n={stats['count']:3d}) | "
              f"F={f_score:.2f} AR={ar_score:.2f} CP={cp_score:.2f} CR={cr_score:.2f}")

    if summary['top_failures']:
        print(f"\n{'─'*65}")
        print(f"  ⚠️  Top failure cases (dưới ngưỡng):")
        for f in summary['top_failures'][:8]:
            print(f"    [{f['metric']:20s}] {f['score']:.2f} < {f['threshold']} | {f['question'][:50]}...")


# ─── SLA Metrics ─────────────────────────────────────────────────────────────
def compute_sla_metrics(collected: list) -> dict:
    """Tính SLA metrics (p50/p95/p99) từ response_time trong _meta."""
    times = [
        d['_meta'].get('response_time', 0)
        for d in collected
        if d.get('answer') and d.get('_meta', {}).get('response_time', 0) > 0
    ]
    if not times:
        return {'p50': 0, 'p95': 0, 'p99': 0, 'avg': 0, 'count': 0}

    times_sorted = sorted(times)
    n = len(times_sorted)

    def percentile(p):
        idx = int(round(p / 100 * n)) - 1
        return times_sorted[max(0, min(idx, n - 1))]

    return {
        'p50': percentile(50),
        'p95': percentile(95),
        'p99': percentile(99),
        'avg': round(sum(times) / n, 1),
        'count': n,
    }


# ─── Intent Accuracy Evaluation ───────────────────────────────────────────────
def evaluate_intent_accuracy(token: str, timestamp: str) -> dict:
    """
    Đánh giá độ chính xác phân loại intent của chatbot.
    Load golden_dataset_intent.json, gọi API, so sánh eval_intent vs expected intent.
    Bỏ qua items có intent='multi_turn' (cần session context đặc biệt).
    Mục tiêu: intent_accuracy >= 0.90
    """
    if not GOLDEN_INTENT_DATASET.exists():
        print(f"⚠️  Không tìm thấy {GOLDEN_INTENT_DATASET.name}, bỏ qua intent evaluation")
        return {}

    with open(GOLDEN_INTENT_DATASET, encoding='utf-8') as f:
        intent_dataset = json.load(f)

    # Chỉ đánh giá non-multi_turn
    evaluable = [item for item in intent_dataset if item.get('intent') != 'multi_turn']
    print(f"\n{'─'*65}")
    print(f"🎯 Intent Accuracy Evaluation — {len(evaluable)} samples")
    print(f"   (bỏ qua {len(intent_dataset) - len(evaluable)} multi_turn items)")
    print(f"{'─'*65}\n")

    results = []
    errors = []

    for i, item in enumerate(evaluable, 1):
        question       = item['question']
        expected_intent = item['intent']
        item_id        = item.get('id', f'#{i}')

        print(f"[{i:3d}/{len(evaluable)}] {item_id:12s} | expected={expected_intent:20s} | {question[:45]}...")

        try:
            api_resp = call_chatbot(question, token)
            api_intent = api_resp.get('eval_intent', '')

            # Kiểm tra intent có match không
            expected_group = {expected_intent}
            # Với search intents, RAG_QUERY bao gồm tất cả sub-intents
            is_correct = api_intent in _INTENT_MAP and expected_intent in _INTENT_MAP[api_intent]

            status = '✅' if is_correct else '❌'
            print(f"          {status} api_intent={api_intent}")

            results.append({
                'id':              item_id,
                'question':        question[:80],
                'expected_intent': expected_intent,
                'api_intent':      api_intent,
                'is_correct':      is_correct,
                'response_time':   api_resp.get('responseTime', 0),
            })

        except Exception as e:
            msg = str(e)
            print(f"          ❌ Error: {msg}")
            errors.append({'id': item_id, 'error': msg})
            results.append({
                'id': item_id, 'question': question[:80],
                'expected_intent': expected_intent, 'api_intent': 'ERROR',
                'is_correct': False, 'response_time': 0,
            })

        if i < len(evaluable):
            time.sleep(EVAL_DELAY_MS / 1000)

    # Tính accuracy tổng và theo từng intent
    total = len(results)
    correct = sum(1 for r in results if r['is_correct'])
    accuracy = round(correct / total, 4) if total > 0 else 0.0

    by_intent = {}
    for intent_label in {r['expected_intent'] for r in results}:
        group = [r for r in results if r['expected_intent'] == intent_label]
        grp_correct = sum(1 for r in group if r['is_correct'])
        by_intent[intent_label] = {
            'count':    len(group),
            'correct':  grp_correct,
            'accuracy': round(grp_correct / len(group), 4) if group else 0.0,
        }

    threshold = 0.90
    pass_fail = '✅ PASS' if accuracy >= threshold else '⚠️  BELOW THRESHOLD'

    print(f"\n{'─'*65}")
    print(f"  🎯 Intent Accuracy: {accuracy:.3f}  {pass_fail}  (ngưỡng {threshold})")
    for lbl, stats in by_intent.items():
        print(f"     {lbl:25s}: {stats['correct']}/{stats['count']} ({stats['accuracy']:.2f})")

    intent_summary = {
        'timestamp':     timestamp,
        'total_samples': total,
        'correct':       correct,
        'accuracy':      accuracy,
        'threshold':     threshold,
        'pass_fail':     pass_fail,
        'by_intent':     by_intent,
        'errors':        errors,
        'details':       results,
    }

    json_path = RESULTS_DIR / f'intent_accuracy_{timestamp}.json'
    with open(json_path, 'w', encoding='utf-8') as f:
        json.dump(intent_summary, f, ensure_ascii=False, indent=2)
    print(f"  💾 Saved: {json_path}")

    return intent_summary


# ─── HTML Report ──────────────────────────────────────────────────────────────
def generate_html_report(summary: dict, intent_summary: dict, timestamp: str) -> Path:
    """Tạo HTML report từ summary của RAGAS và intent evaluation."""
    scores     = summary.get('scores', {})
    thresholds = summary.get('thresholds', {})
    pass_fail  = summary.get('pass_fail', {})
    stats      = summary.get('stats', {})
    sla        = summary.get('sla_metrics', {})
    by_cat     = summary.get('by_category', {})

    metric_labels = [
        ('Faithfulness',       'faithfulness'),
        ('Answer Relevancy',   'answer_relevancy'),
        ('Context Precision',  'context_precision'),
        ('Context Recall',     'context_recall'),
    ]

    def score_color(score, threshold):
        if score >= threshold:
            return '#22c55e'  # green
        if score >= threshold * 0.9:
            return '#f59e0b'  # amber
        return '#ef4444'      # red

    metric_rows = ''
    for label, key in metric_labels:
        s = scores.get(key, 0)
        t = thresholds.get(key, 0)
        color = score_color(s, t)
        pct = int(s * 100)
        pf = pass_fail.get(key, '')
        metric_rows += f"""
        <tr>
          <td>{label}</td>
          <td><div style="background:#e5e7eb;border-radius:4px;height:18px;width:200px">
            <div style="background:{color};height:18px;width:{pct * 2}px;border-radius:4px"></div>
          </div></td>
          <td style="color:{color};font-weight:bold">{s:.3f}</td>
          <td>{t}</td>
          <td>{pf}</td>
        </tr>"""

    cat_rows = ''
    for cat, cs in by_cat.items():
        cat_rows += f"""<tr>
          <td>{cat}</td><td>{cs.get('count','')}</td>
          <td>{cs.get('faithfulness',0):.2f}</td><td>{cs.get('answer_relevancy',0):.2f}</td>
          <td>{cs.get('context_precision',0):.2f}</td><td>{cs.get('context_recall',0):.2f}</td>
        </tr>"""

    intent_section = ''
    if intent_summary:
        acc = intent_summary.get('accuracy', 0)
        acc_color = score_color(acc, 0.90)
        intent_by = intent_summary.get('by_intent', {})
        intent_rows = ''.join(
            f"<tr><td>{lbl}</td><td>{v.get('correct',0)}/{v.get('count',0)}</td>"
            f"<td style='color:{score_color(v.get('accuracy',0),0.90)}'>{v.get('accuracy',0):.2f}</td></tr>"
            for lbl, v in intent_by.items()
        )
        intent_section = f"""
        <h2>🎯 Intent Accuracy</h2>
        <p>Overall: <strong style="color:{acc_color}">{acc:.3f}</strong>
           {intent_summary.get('pass_fail','')} (ngưỡng 0.90) |
           {intent_summary.get('correct',0)}/{intent_summary.get('total_samples',0)} correct</p>
        <table><thead><tr><th>Intent</th><th>Correct/Total</th><th>Accuracy</th></tr></thead>
        <tbody>{intent_rows}</tbody></table>"""

    sla_section = ''
    if sla and sla.get('count'):
        sla_section = f"""
        <h2>⏱️ SLA Metrics</h2>
        <p>p50={sla['p50']}ms | p95={sla['p95']}ms | p99={sla['p99']}ms | avg={sla['avg']}ms
           ({sla['count']} samples)</p>"""

    html = f"""<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <title>CTXH Chatbot Evaluation — {timestamp}</title>
  <style>
    body {{ font-family: 'Segoe UI', sans-serif; margin: 32px; color: #1f2937; }}
    h1 {{ color: #1d4ed8; }} h2 {{ color: #374151; margin-top: 32px; }}
    table {{ border-collapse: collapse; width: 100%; margin-top: 12px; }}
    th, td {{ border: 1px solid #e5e7eb; padding: 8px 12px; text-align: left; }}
    th {{ background: #f3f4f6; font-weight: 600; }}
    tr:hover {{ background: #f9fafb; }}
    .badge {{ padding: 2px 8px; border-radius: 9999px; font-size: 12px; }}
  </style>
</head>
<body>
  <h1>📊 CTXH Chatbot Evaluation Report</h1>
  <p><strong>Timestamp:</strong> {timestamp} |
     <strong>Samples:</strong> {summary.get('evaluated_samples','?')}/{summary.get('total_in_dataset','?')} |
     <strong>Avg response:</strong> {stats.get('avg_response_ms',0):.0f}ms |
     <strong>Contexts OK:</strong> {stats.get('pct_with_contexts',0):.0f}%
  </p>

  <h2>📈 RAGAS Metrics</h2>
  <table>
    <thead><tr><th>Metric</th><th>Score</th><th>Value</th><th>Threshold</th><th>Status</th></tr></thead>
    <tbody>{metric_rows}</tbody>
  </table>

  {sla_section}
  {intent_section}

  <h2>📂 By Category</h2>
  <table>
    <thead><tr><th>Category</th><th>Count</th><th>Faithfulness</th><th>Answer Rel.</th><th>Context Prec.</th><th>Context Rec.</th></tr></thead>
    <tbody>{cat_rows}</tbody>
  </table>
</body>
</html>"""

    html_path = RESULTS_DIR / f'evaluation_{timestamp}.html'
    with open(html_path, 'w', encoding='utf-8') as f:
        f.write(html)
    return html_path


# ─── Compare Baseline ──────────────────────────────────────────────────────────
def compare_with_baseline(current_summary: dict, baseline_path: str):
    """So sánh kết quả hiện tại với baseline, cảnh báo khi có regression."""
    try:
        with open(baseline_path, encoding='utf-8') as f:
            baseline = json.load(f)
    except Exception as e:
        print(f"\n⚠️  Không load được baseline: {e}")
        return

    baseline_scores = baseline.get('scores', {})
    current_scores  = current_summary.get('scores', {})

    print(f"\n{'─'*65}")
    print(f"  📈 So sánh với baseline: {baseline_path}")
    print(f"  Baseline timestamp: {baseline.get('timestamp', 'N/A')}")
    print(f"{'─'*65}")

    regressions = []
    for metric, base_val in baseline_scores.items():
        curr_val = current_scores.get(metric)
        if curr_val is None:
            continue
        delta = curr_val - base_val
        arrow = '🔺' if delta > 0.01 else ('🔻' if delta < -0.01 else '➡️')
        print(f"  {metric:22s}: {base_val:.3f} → {curr_val:.3f}  {arrow} ({delta:+.3f})")
        if delta < -0.02:
            regressions.append((metric, base_val, curr_val, delta))

    if regressions:
        print(f"\n  ⛔ REGRESSION DETECTED on {len(regressions)} metric(s):")
        for metric, base_val, curr_val, delta in regressions:
            print(f"     {metric}: {base_val:.3f} → {curr_val:.3f} ({delta:+.3f})")
    else:
        print(f"\n  ✅ Không có regression so với baseline.")


# ─── Main ─────────────────────────────────────────────────────────────────────
def main():
    parser = argparse.ArgumentParser(
        description='CTXH RAG Evaluation với RAGAS + Gemini',
        formatter_class=argparse.ArgumentDefaultsHelpFormatter,
    )
    parser.add_argument(
        '--sample', type=int, default=None,
        help='Chỉ đánh giá N câu đầu trong golden_dataset (để test nhanh)',
    )
    parser.add_argument(
        '--skip-api', action='store_true',
        help='Bỏ qua bước gọi chatbot API, load từ file collected có sẵn',
    )
    parser.add_argument(
        '--collected-file', type=str, default=None,
        help='Đường dẫn file JSON collected (dùng với --skip-api)',
    )
    parser.add_argument(
        '--mode', choices=['search', 'intent', 'all'], default='search',
        help='Chế độ đánh giá: search=RAGAS RAG, intent=Intent accuracy, all=cả hai',
    )
    parser.add_argument(
        '--compare-baseline', type=str, default=None, metavar='BASELINE_JSON',
        help='So sánh kết quả với baseline JSON để phát hiện regression',
    )
    args = parser.parse_args()

    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')

    collected = []
    valid_data = []
    collected_path = RESULTS_DIR / f'collected_{timestamp}.json'

    # ── Bước 1-3: Chỉ cần cho mode=search hoặc all ───────────────────────────
    if args.mode in ('search', 'all'):
        if not GOLDEN_DATASET.exists():
            print(f"❌ Không tìm thấy golden_dataset.json tại: {GOLDEN_DATASET}")
            sys.exit(1)

        with open(GOLDEN_DATASET, encoding='utf-8') as f:
            golden_dataset = json.load(f)

        if args.sample:
            golden_dataset = golden_dataset[:args.sample]
            print(f"🔬 Chế độ test: chỉ đánh giá {args.sample} câu đầu\n")

        print(f"📂 Golden dataset: {len(golden_dataset)} câu hỏi | {GOLDEN_DATASET.name}\n")

        # ── Bước 2: Thu thập phản hồi từ API ─────────────────────────────────
        if args.skip_api:
            src = args.collected_file or str(sorted(RESULTS_DIR.glob('collected_*.json'))[-1])
            print(f"⏭️  Load collected data từ: {src}")
            with open(src, encoding='utf-8') as f:
                raw = json.load(f)
            collected = raw.get('data', raw) if isinstance(raw, dict) else raw
            errors = raw.get('errors', []) if isinstance(raw, dict) else []
            print(f"✅ Đã load {len(collected)} records\n")
        else:
            token = get_jwt_token()
            collected, errors = collect_api_responses(golden_dataset, token)

            with open(collected_path, 'w', encoding='utf-8') as f:
                json.dump({'data': collected, 'errors': errors}, f, ensure_ascii=False, indent=2)
            print(f"\n💾 Đã lưu collected data: {collected_path}")

        # ── Bước 3: Lọc samples hợp lệ cho RAGAS ─────────────────────────────
        valid_data = [d for d in collected if d.get('answer')]
        skipped = len(collected) - len(valid_data)
        print(f"\n📋 Samples đưa vào RAGAS: {len(valid_data)}/{len(collected)}", end='')
        if skipped:
            print(f" ({skipped} bị bỏ qua do lỗi API)", end='')
        print()

        if len(valid_data) == 0:
            print("❌ Không có sample hợp lệ để đánh giá!")
            sys.exit(1)

    intent_summary = {}

    # ── Bước 4a: Intent accuracy evaluation (mode=intent or all) ──────────────
    if args.mode in ('intent', 'all'):
        intent_token = EVAL_STUDENT_TOKEN or get_jwt_token()
        intent_summary = evaluate_intent_accuracy(intent_token, timestamp)

    # ── Bước 4b: RAGAS evaluation (mode=search or all) ────────────────────────
    summary = {}
    csv_path = json_path = None

    if args.mode in ('search', 'all'):
        ragas_result = run_ragas(valid_data)

        # ── Bước 5: Tạo report ────────────────────────────────────────────────
        summary, csv_path, json_path = generate_report(ragas_result, collected, timestamp)

        print_summary(summary)

        # ── Compare with baseline ────────────────────────────────────────────
        if args.compare_baseline:
            compare_with_baseline(summary, args.compare_baseline)

        # ── HTML report ──────────────────────────────────────────────────────
        html_path = generate_html_report(summary, intent_summary, timestamp)

    print(f"\n{'='*65}")
    print(f"  💾 Files đã lưu:")
    if csv_path:
        print(f"     CSV  : {csv_path}")
    if json_path:
        print(f"     JSON : {json_path}")
    if args.mode in ('search', 'all') and 'html_path' in dir():
        print(f"     HTML : {html_path}")
    if not args.skip_api and args.mode in ('search', 'all'):
        print(f"     Data : {collected_path}")
    print(f"{'='*65}\n")


if __name__ == '__main__':
    main()
