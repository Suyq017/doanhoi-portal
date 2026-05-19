Collecting workspace information# Kế hoạch Đánh giá Chất lượng Phản hồi Chatbot CTXH

## 1. Tổng quan

Mục tiêu: Đánh giá chất lượng RAG pipeline của chatbot CTXH dựa trên golden dataset có sẵn tại golden_dataset.json với **126 câu hỏi** thuộc nhiều loại hoạt động và địa điểm khác nhau.

---

## 2. Metrics Đánh giá

### 2.1 Retrieval Quality
| Metric | Mô tả | Công cụ |
|--------|-------|---------|
| **Hit Rate@k** | Tỷ lệ câu hỏi có ít nhất 1 document đúng trong top-k | Manual/Custom |
| **MRR** | Mean Reciprocal Rank — document đúng xếp thứ mấy | Custom |
| **Context Precision** | Tỷ lệ document retrieved thực sự liên quan | RAGAS |
| **Context Recall** | Tỷ lệ thông tin cần thiết có trong retrieved context | RAGAS |

### 2.2 Generation Quality
| Metric | Mô tả | Công cụ |
|--------|-------|---------|
| **Answer Correctness** | So sánh nội dung answer vs ground_truth | RAGAS + LLM-as-judge |
| **Faithfulness** | Answer có bịa thông tin ngoài context không | RAGAS |
| **Answer Relevancy** | Answer có trả lời đúng câu hỏi không | RAGAS |

### 2.3 Business-specific
- **Date Accuracy**: Thông tin ngày tháng có chính xác không
- **Location Accuracy**: Địa điểm có đúng không
- **Activity Type Match**: Loại hoạt động có khớp không

---

## 3. Kiến trúc Evaluation Pipeline

```
golden_dataset.json
        │
        ▼
┌─────────────────┐
│  Test Runner    │  → gọi chatbot API cho từng question
└────────┬────────┘
         │ {question, answer, retrieved_docs}
         ▼
┌─────────────────┐
│ RAGAS Evaluator │  → context_precision, recall, faithfulness
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ LLM-as-Judge    │  → so sánh answer vs ground_truth
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Report Generator│  → JSON + Markdown report
└─────────────────┘
```

---

## 4. Cấu trúc File

```
backend/
  test/
    data/
      golden_dataset.json          ✅ (đã có)
    evaluation/
      run-evaluation.ts            # Script chính
      metrics/
        retrieval-metrics.ts       # Hit rate, MRR
        generation-metrics.ts      # Faithfulness, relevancy
        business-metrics.ts        # Date/Location accuracy
      reporters/
        console-reporter.ts
        json-reporter.ts
        markdown-reporter.ts
      results/                     # Output (gitignore)
        evaluation-{timestamp}.json
        evaluation-{timestamp}.md
```

---

## 5. Các Bước Thực Hiện

### Phase 1 — Setup (1-2 ngày)
- [ ] Cài đặt dependencies: `ragas`, `langchain`, `openai`
- [ ] Tạo test runner gọi `LangchainRagChainService`
- [ ] Expose retrieved documents từ RAG pipeline để đánh giá retrieval

### Phase 2 — Implement Metrics (2-3 ngày)
- [ ] Implement retrieval metrics (Hit Rate@3, @5, MRR)
- [ ] Tích hợp RAGAS cho generation metrics
- [ ] Implement business metrics (date/location parsing & comparison)

### Phase 3 — Run & Analyze (1-2 ngày)
- [ ] Chạy evaluation trên toàn bộ 126 câu hỏi
- [ ] Phân tích kết quả theo nhóm (theo `Loại hoạt động`, theo địa điểm, theo tháng)
- [ ] Identify failure cases

### Phase 4 — Report (1 ngày)
- [ ] Tổng hợp kết quả
- [ ] Đề xuất cải thiện (prompt tuning, chunking strategy, retrieval params)

---

## 6. Phân nhóm Test Cases

Dựa trên golden dataset, có thể phân nhóm để đánh giá riêng:

| Nhóm | Số câu | Ví dụ |
|------|--------|-------|
| Hoạt động CTXH dọn dẹp | ~50 | CK25CTX* |
| Hội trại / Ngày hội | ~30 | CK25HTR*, BD25HTR* |
| Cuộc thi học thuật | ~10 | CK25HTH* |
| Hoạt động khác | ~20 | CK25KKK* |
| Theo địa điểm cụ thể | cross-group | cơ sở 1, Dĩ An, LTK |

---

## 7. Ngưỡng Chấp nhận (Acceptance Threshold)

| Metric | Min Acceptable | Target |
|--------|---------------|--------|
| Hit Rate@3 | 70% | 85% |
| Context Recall | 0.65 | 0.80 |
| Answer Correctness | 0.60 | 0.75 |
| Faithfulness | 0.80 | 0.90 |
| Date Accuracy | 75% | 90% |

---

## 8. Lưu ý Đặc thù Dữ liệu

Từ phân tích golden dataset, cần chú ý:
- **Thông tin ngày trong `Nội dung` ≠ `Thời gian thực hiện`**: Nhiều record có ngày thực tế trong nội dung khác với trường thời gian (ví dụ CK25CTX0015, CK25CTX0016)
- **Địa điểm có nhiều cách viết**: ĐHBK / DHBK / cơ sở Lý Thường Kiệt / cơ sở 1 — cần normalize khi đánh giá Location Accuracy
- **Một số `Mã ctxh` trùng nội dung** (BD25HTR0003 và BD25HTR0004) — test duplicate retrieval handling