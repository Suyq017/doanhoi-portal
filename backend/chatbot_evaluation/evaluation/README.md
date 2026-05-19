# CTXH Chatbot — Evaluation

Đánh giá chất lượng chatbot CTXH gồm hai script:

| Script | Đối tượng | Framework |
|--------|-----------|-----------|
| `evaluate.py` | Student (RAG search + Intent) | RAGAS + Gemini judge |
| `evaluate_staff.py` | Staff (BTC/giảng viên) | Heuristic + Gemini judge |

---

## Metrics

### Student — `evaluate.py`

| Metric | Ý nghĩa | Ngưỡng |
|--------|---------|--------|
| **Faithfulness** | Answer bám sát context, không hallucinate | 0.80 |
| **Answer Relevancy** | Answer trả lời đúng câu hỏi | 0.60 |
| **Context Precision** | Context liên quan được retrieve trước | 0.70 |
| **Context Recall** | Context đủ thông tin để trả lời | 0.65 |
| **Intent Accuracy** | Phân loại intent đúng (RAG/Greeting/Chitchat/Register) | 0.90 |

### Staff — `evaluate_staff.py`

| Metric | Ý nghĩa | Ngưỡng |
|--------|---------|--------|
| **Tool Trigger Rate** | Response khớp với tool mong đợi (heuristic) | 0.85 |
| **Avg LLM Score** | Gemini chấm chất lượng câu trả lời (0–1) | 0.70 |
| **SLA p50/p95/p99** | Latency percentiles (ms) | — |

---

## Cấu trúc thư mục

```
chatbot_evaluation/
├── data/
│   ├── golden_dataset.json          # 162 câu hỏi RAG (student)
│   ├── golden_dataset_intent.json   # 31 câu hỏi intent (greeting/register/…)
│   └── golden_dataset_staff.json    # 30 câu hỏi staff
└── evaluation/
    ├── evaluate.py          # Đánh giá student (RAG + Intent)
    ├── evaluate_staff.py    # Đánh giá staff
    ├── requirements.txt     # Python dependencies
    ├── .env.example         # Template cấu hình
    ├── .env                 # Cấu hình thực tế (không commit)
    └── results/             # Kết quả (không commit)
        ├── collected_*.json          # Phản hồi thô từ chatbot API
        ├── evaluation_*.csv          # Điểm RAGAS từng câu (mở bằng Excel)
        ├── evaluation_*.json         # Summary tổng hợp
        ├── evaluation_*.html         # HTML report (tự động sinh)
        ├── intent_accuracy_*.json    # Kết quả intent evaluation
        └── staff_evaluation_*.json   # Kết quả staff evaluation
```

---

## Cài đặt

### 1. Tạo Python virtual environment

```bash
cd backend/chatbot_evaluation/evaluation
python -m venv venv

# Windows
venv\Scripts\activate

# macOS / Linux
source venv/bin/activate
```

### 2. Cài đặt dependencies

```bash
pip install -r requirements.txt
```

### 3. Cấu hình `.env`

```bash
cp .env.example .env
```

Điền các giá trị vào `.env`:

```dotenv
# URL backend đang chạy
EVAL_BASE_URL=http://localhost:3000

# JWT student (lấy từ: đăng nhập app → F12 → Application → LocalStorage → token)
EVAL_JWT_TOKEN=eyJhbGci...

# JWT student riêng cho --mode intent/all (fallback sang EVAL_JWT_TOKEN nếu bỏ trống)
EVAL_STUDENT_TOKEN=

# JWT staff — tài khoản có userType='staff' (dùng trong evaluate_staff.py)
EVAL_STAFF_TOKEN=eyJhbGci...

# Gemini API key — dùng cùng key với backend/.env
GEMINI_API_KEY=AIza...

# Delay giữa các request (ms) — tăng lên nếu gặp rate limit
EVAL_DELAY_MS=700
```

### 4. Đảm bảo backend và vector DB đang chạy

```bash
# Từ thư mục gốc của project
docker-compose up -d

# Kiểm tra vector store đã có dữ liệu
curl -H "Authorization: Bearer <token>" http://localhost:3000/api/ctxh-chat/vector-store/stats
```

---

## Chạy đánh giá — Student (`evaluate.py`)

### Chế độ `--mode`

| Mode | Dataset | Mô tả |
|------|---------|-------|
| `search` *(mặc định)* | `golden_dataset.json` | RAGAS 4 metrics trên 162 câu RAG |
| `intent` | `golden_dataset_intent.json` | Intent accuracy trên 31 câu greeting/register/… |
| `all` | Cả hai | Chạy RAGAS + intent trong một lần |

### Các lệnh thường dùng

```bash
# Đánh giá toàn bộ RAG search (162 câu — ~40–60 phút)
python evaluate.py

# Test nhanh với 10 câu đầu (~3 phút)
python evaluate.py --sample 10

# Chỉ đánh giá intent accuracy (31 câu — ~5 phút)
python evaluate.py --mode intent

# Đánh giá toàn bộ: RAG + intent
python evaluate.py --mode all

# Tái đánh giá RAGAS từ file collected đã có (không gọi lại API chatbot)
python evaluate.py --skip-api --collected-file results/collected_20260305_143000.json

# So sánh kết quả với baseline để phát hiện regression
python evaluate.py --compare-baseline results/evaluation_20260401_120000.json
```

### Giải thích output

```
═══════════════════════════════════════════════════════════════════
  📊 KẾT QUẢ ĐÁNH GIÁ RAG — RAGAS + Gemini
═══════════════════════════════════════════════════════════════════
  Faithfulness        [█████████████████░░░░░░░] 0.852  ✅ PASS  (ngưỡng 0.8)
  Answer Relevancy    [████████████░░░░░░░░░░░░] 0.710  ✅ PASS  (ngưỡng 0.6)
  Context Precision   [████████████████░░░░░░░░] 0.789  ✅ PASS  (ngưỡng 0.7)
  Context Recall      [███████████████░░░░░░░░░] 0.741  ✅ PASS  (ngưỡng 0.65)
```

Files kết quả trong `results/`:
- `collected_<timestamp>.json` — phản hồi thô từ API (dùng để `--skip-api` lần sau)
- `evaluation_<timestamp>.csv` — điểm từng câu, mở bằng Excel
- `evaluation_<timestamp>.json` — summary + by_category + SLA + intent
- `evaluation_<timestamp>.html` — HTML report với biểu đồ màu
- `intent_accuracy_<timestamp>.json` — kết quả intent (khi `--mode intent/all`)

---

## Chạy đánh giá — Staff (`evaluate_staff.py`)

```bash
# Đánh giá toàn bộ staff dataset (30 câu — ~5–10 phút)
python evaluate_staff.py

# Test nhanh với 5 câu đầu
python evaluate_staff.py --sample 5

# Bỏ qua Gemini judge (nhanh hơn, không tốn quota)
python evaluate_staff.py --skip-llm-judge

# Bỏ qua các test có thể tạo dữ liệu thật (create_activity, auto_approve)
python evaluate_staff.py --safe-only
```

> **Lưu ý `--safe-only`:** Mặc định, `evaluate_staff.py` **không** bỏ qua test có side effects. Dùng `--safe-only` khi chạy trên môi trường staging/production để tránh tạo hoạt động hoặc duyệt đăng ký thật.

Files kết quả: `results/staff_evaluation_<timestamp>.json`

---

## Tham số đầy đủ

### `evaluate.py`

| Tham số | Mặc định | Mô tả |
|---------|----------|-------|
| `--sample N` | toàn bộ | Chỉ đánh giá N câu đầu |
| `--mode {search,intent,all}` | `search` | Chế độ đánh giá |
| `--skip-api` | false | Bỏ qua gọi API, dùng file collected |
| `--collected-file PATH` | latest | File collected JSON (dùng với `--skip-api`) |
| `--compare-baseline PATH` | — | JSON baseline để so sánh regression |

### `evaluate_staff.py`

| Tham số | Mặc định | Mô tả |
|---------|----------|-------|
| `--sample N` | toàn bộ | Chỉ đánh giá N câu đầu |
| `--skip-llm-judge` | false | Bỏ qua Gemini judge |
| `--safe-only` | false | Bỏ qua `create_activity`, `auto_approve_and_notify` |

---

## Lưu ý

- File `collected_*.json` lưu tự động sau bước gọi API. Nếu script bị ngắt giữa chừng, dùng `--skip-api --collected-file` để chạy lại phần RAGAS mà không gọi lại toàn bộ API.
- Tăng `EVAL_DELAY_MS` (mặc định 700ms) nếu gặp rate limit Gemini.
- `EVAL_STAFF_TOKEN` phải là JWT của tài khoản có `userType='staff'` — không thể dùng token student.
- Tool Trigger Rate trong `evaluate_staff.py` là **heuristic** (keyword matching) — không phải chính xác 100% do API không expose tên tool được gọi.
