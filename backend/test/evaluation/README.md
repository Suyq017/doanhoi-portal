# CTXH Chatbot — RAG Evaluation với RAGAS

Đánh giá chất lượng pipeline RAG của chatbot CTXH bằng framework **RAGAS** với Gemini làm LLM judge.

## Metrics được đánh giá

| Metric | Ý nghĩa | Ngưỡng tối thiểu |
|--------|---------|-----------------|
| **Faithfulness** | Answer có bám sát context không (không hallucinate) | 0.80 |
| **Answer Relevancy** | Answer có trả lời đúng câu hỏi không | 0.60 |
| **Context Precision** | Context liên quan có được retrieve trước không | 0.70 |
| **Context Recall** | Context có đủ thông tin để trả lời không | 0.65 |

## Cấu trúc thư mục

```
test/evaluation/
├── evaluate.py          # Script đánh giá chính
├── requirements.txt     # Python dependencies
├── .env.example         # Template cấu hình
├── .env                 # Cấu hình thực tế (không commit)
└── results/             # Kết quả đánh giá (không commit)
    ├── collected_*.json # Phản hồi thu thập từ chatbot API
    ├── evaluation_*.csv # Kết quả RAGAS từng câu (mở bằng Excel)
    └── evaluation_*.json# Summary tổng hợp
```

## Cài đặt

### 1. Tạo Python virtual environment

```bash
cd backend/test/evaluation
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
EVAL_BASE_URL=http://localhost:3000   # URL backend đang chạy

# Lấy JWT: đăng nhập app → F12 → Application → LocalStorage → token
EVAL_JWT_TOKEN=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Dùng cùng key với backend/.env
GEMINI_API_KEY=AIza...
```

### 4. Đảm bảo backend và vector DB đang chạy

```bash
# Từ thư mục gốc của project
docker-compose up -d

# Kiểm tra vector store đã có dữ liệu
curl -H "Authorization: Bearer <token>" http://localhost:3000/api/ctxh-chat/vector-store/stats
```

## Chạy đánh giá

### Test nhanh (10 câu đầu — ~2 phút)

```bash
python evaluate.py --sample 10
```

### Đánh giá toàn bộ golden dataset (89 câu — ~25–40 phút)

```bash
python evaluate.py
```

### Tái đánh giá không cần gọi lại API

Dùng khi muốn thử lại RAGAS với cấu hình khác mà không tốn thêm quota API chatbot:

```bash
python evaluate.py --skip-api --collected-file results/collected_20260305_143000.json
```

## Kết quả

Sau khi chạy xong, script sẽ in summary ra console:

```
═══════════════════════════════════════════════════════════════════
  📊 KẾT QUẢ ĐÁNH GIÁ RAG — RAGAS + Gemini
═══════════════════════════════════════════════════════════════════
  Faithfulness        [█████████████████░░░░░░░] 0.852  ✅ PASS  (ngưỡng 0.8)
  Answer Relevancy    [████████████░░░░░░░░░░░░] 0.710  ✅ PASS  (ngưỡng 0.6)
  Context Precision   [████████████████░░░░░░░░] 0.789  ✅ PASS  (ngưỡng 0.7)
  Context Recall      [███████████████░░░░░░░░░] 0.741  ✅ PASS  (ngưỡng 0.65)
```

Hai file kết quả được lưu trong `results/`:
- `evaluation_<timestamp>.csv` — điểm từng câu hỏi, mở bằng Excel
- `evaluation_<timestamp>.json` — summary tổng hợp + phân tích theo loại hoạt động

## Lưu ý

- File `collected_*.json` được lưu tự động sau bước gọi API. Nếu script bị ngắt giữa chừng, dùng `--skip-api --collected-file` để tiếp tục phần RAGAS mà không cần gọi lại toàn bộ API.
- Tăng `EVAL_DELAY_MS` (mặc định 700ms) nếu gặp rate limit từ Gemini API.
- RAGAS cần Gemini API để chấm điểm — đảm bảo `GEMINI_API_KEY` hợp lệ và còn quota.
