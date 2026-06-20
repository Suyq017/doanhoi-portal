# Load Test — Đoàn Hội Portal (k6)

Bộ kịch bản đo tải, chạy trực tiếp trên prod (`https://portal.tuoitrebachkhoa.com`).
Chạy: `k6 run <file>.js`. Override target: `-e BASE_URL=https://...`

> ⚠️ Đang test trên PROD thật. Luôn mở Grafana (`/grafana/`) xem CPU/RAM/DB song song.
> Các script tải cao có `abortOnFail` để k6 TỰ DỪNG khi prod bắt đầu đuối.

## Thứ tự chạy đề xuất

| # | File | Đo gì | Cần tài khoản? | Có ghi DB? |
|---|---|---|---|---|
| 1 | `01-baseline.js` | Mốc cơ bản khi tải nhẹ (20 VUs) | Không | Không |
| 2 | `02-ramp-breakpoint.js` | Tăng dần tìm điểm gãy (frontend) | Không | Không |
| 3 | `03-spike.js` | Tải tăng đột ngột (mở đăng ký) | Không | Không |
| 4 | `04-login-stress.js` | **Stress bcrypt/DB qua login** (điểm gãy hay gặp) | Email thật | Không* |
| 5 | `05-auth-read.js` | Đọc dữ liệu có xác thực (hiện đúng trên Grafana) | Có | 1 lần** |
| 6 | `06-mixed-realistic.js` | Mô phỏng người dùng thật (trộn hành vi) | Tùy chọn | 1 lần** |

\* Login dùng **email thật + mật khẩu sai** → chạy bcrypt nhưng KHÔNG phát token, KHÔNG ghi refreshToken.
\*\* `setup()` đăng nhập 1 lần → ghi đè `refreshToken` của đúng tài khoản test (không tạo rác).

## Biến môi trường

```bash
# Tài khoản test thật (cho 05, 06)
k6 run -e TEST_EMAIL=you@hcmut.edu.vn -e TEST_PASSWORD=secret 05-auth-read.js

# Email có thật để stress bcrypt đúng nghĩa (cho 04)
k6 run -e PROBE_EMAIL=real.user@hcmut.edu.vn 04-login-stress.js

# Chỉnh quy mô đỉnh cho test mô phỏng
k6 run -e PEAK=300 06-mixed-realistic.js
```

## Lưu ý quan trọng về Observability

- `GET /` → **frontend nginx**, KHÔNG đi qua backend → không có trong metric backend.
  Tải này nhìn qua **cAdvisor/node-exporter** (CPU container/host).
- Request bị **guard chặn (401 khi thiếu token)** chạy TRƯỚC `MetricsInterceptor`
  → KHÔNG được đếm vào `doanhoi_http_requests_total`.
- Muốn thấy traffic trong panel "HTTP Request Rate": phải gọi endpoint **đi tới
  handler** (có token hợp lệ) — đó là lý do `05-auth-read.js` mới làm panel "sáng".

## Tiêu chí đánh giá (SLO)

| Chỉ số | PASS | WARN | FAIL |
|---|---|---|---|
| p95 latency | < 500ms | 500ms–1s | > 1s |
| p99 latency | < 1s | 1–2s | > 2s |
| Error rate (thật) | < 0.1% | 0.1–1% | > 1% |
| CPU backend | < 70% | 70–90% | > 90% kéo dài |

## ⚠️ KHÔNG nên

- KHÔNG chạy kịch bản gọi **chatbot RAG** với tải cao trên prod — tốn tiền Gemini API + dễ dính rate limit.
- KHÔNG chạy test ghi dữ liệu (tạo/sửa/xóa CTXH) trên prod.
- KHÔNG nhảy thẳng `PEAK` lớn — tăng dần và quan sát Grafana từng bước.
