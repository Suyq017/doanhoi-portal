# Kế Hoạch End-to-End Test — Auto Vector Ingestion Pipeline

## 0. Chuẩn Bị Môi Trường

### 0.1 Yêu Cầu Dịch Vụ

Trước khi test, đảm bảo **3 dịch vụ** đang chạy:

| Dịch vụ | Lệnh kiểm tra | Kết quả mong đợi |
|---------|--------------|-----------------|
| **PostgreSQL + pgvector** | `psql -U postgres -c "SELECT 1"` | `1 row` |
| **Redis** | `redis-cli ping` | `PONG` |
| **Ollama** | `curl http://localhost:11434/api/tags` | JSON có models list |

```powershell
# Kiểm tra nhanh cả 3 cùng lúc
redis-cli ping
curl -s http://localhost:11434/api/tags | Select-String "models"
```

### 0.2 Khởi Động Backend

```powershell
cd d:\hcmut\internship\doanhoi-portal\backend
npm run start:dev
```

**Log cần thấy khi server khởi động thành công:**
```
[BullModule] Connecting to Redis...
[CtxhVectorSyncService] initialized
[VectorIngestionProcessor] registered on queue "vectorize_queue"
🚀 Backend server is running on http://localhost:9200
```

### 0.3 Tools Cần Dùng

| Tool | Mục đích |
|------|----------|
| **curl / Postman / Thunder Client** | Gọi API endpoints |
| **redis-cli** | Kiểm tra job state trong queue |
| **psql / DBeaver** | Kiểm tra bảng `ctxh_embeddings` |
| **Server logs** | Xem event pipeline firing |
| **Swagger UI** | `http://localhost:9200/api` — có thể dùng thay Postman |

### 0.4 Cấu Hình Biến Môi Trường Cần Xác Nhận

```powershell
# Đọc .env và kiểm tra
cd d:\hcmut\internship\doanhoi-portal\backend
Get-Content .env | Select-String "REDIS|OLLAMA|DATABASE"
```

Cần có: `REDIS_HOST`, `REDIS_PORT`, `DATABASE_URL` (hoặc `DB_*` vars), `OLLAMA_BASE_URL`.

---

## 1. Test Pre-flight — Kiểm Tra Baseline

### TC-00: Xác nhận queue rỗng trước khi test

```powershell
# Redis: queue trạng thái
redis-cli llen "bull:vectorize_queue:wait"
redis-cli llen "bull:vectorize_queue:active"
# Kết quả mong đợi: 0

# API endpoint
curl http://localhost:9200/api/ctxh-chat/ingestion/queue-status
# Mong đợi: {"waiting":0,"active":0,"completed":0,"failed":0,"delayed":0}
```

### TC-01: Xác nhận ingestion stats baseline

```powershell
curl http://localhost:9200/api/ctxh-chat/ingestion/stats
# Ghi lại số totalDocuments hiện tại để so sánh sau
```

---

## 2. Test Cases Chính

---

### TC-1: Tạo Activity Mới → Vector Được Tạo

**Mục tiêu**: Khi tạo activity mới, event `activity.created` → job `upsert_{id}` xuất hiện trong queue → Ollama embed → vector lưu vào pgvector.

#### Bước 1: Tạo activity qua API

```powershell
$body = @{
  name = "TC1 - Hiến máu nhân đạo HK2 2025"
  description = "Chương trình hiến máu tình nguyện tổ chức tại BK cơ sở 1, ưu tiên sinh viên năm 1-2"
  location = "Hội trường A4, cơ sở 1"
  start_date = "2026-04-01"
  end_date = "2026-04-01"
  total_days = 1
  status = "pending"
  category_id = "<id_của_category_ctxh_hợp_lệ>"
  organization_id = "<id_của_organization_hợp_lệ>"
} | ConvertTo-Json

curl -X POST http://localhost:9200/api/ctxh/activities `
  -H "Content-Type: application/json" `
  -H "Authorization: Bearer <token>" `
  -d $body
```

> **Lưu lại `id` của activity vừa tạo** — dùng cho các bước tiếp theo (gọi là `$ACTIVITY_ID`).

#### Bước 2: Kiểm tra log server (ngay lập tức)

Trong console backend, phải thấy **trong vòng 1 giây**:
```
[CtxhVectorSyncService] 📥 Queuing upsert for new activity: "TC1 - Hiến máu..." ($ACTIVITY_ID)
```

#### Bước 3: Kiểm tra job trong queue

```powershell
# Job phải xuất hiện trong waiting hoặc active
curl http://localhost:9200/api/ctxh-chat/ingestion/queue-status
# waiting hoặc active >= 1

# Kiểm tra trực tiếp trên Redis
redis-cli hgetall "bull:vectorize_queue:<job_number>"
```

#### Bước 4: Chờ job xử lý xong (Ollama có thể mất 5-30 giây)

Khi xong, log phải hiển thị:
```
[VectorIngestionProcessor] ✅ Job done: [<job_id>] upsert_activity (attempt 1)
```

#### Bước 5: Xác nhận vector đã lưu vào DB

```sql
-- Trong psql hoặc DBeaver
SELECT COUNT(*) FROM ctxh_embeddings WHERE activity_id = '$ACTIVITY_ID';
-- Mong đợi: COUNT > 0 (thường 1-5 chunks tùy độ dài description)

SELECT activity_id, substring(content, 1, 100) as preview, created_at
FROM ctxh_embeddings
WHERE activity_id = '$ACTIVITY_ID'
ORDER BY created_at;
```

**✅ PASS** khi: log có event, queue nhận job, vector tồn tại trong DB.

---

### TC-2: Cập Nhật Field Nội Dung → Vector Được Re-embed

**Mục tiêu**: Update `name` hoặc `description` → job `upsert` mới → vector cũ bị xóa, vector mới được tạo.

#### Bước 1: Ghi lại thời điểm và vector cũ

```sql
SELECT COUNT(*), MAX(created_at) as last_created
FROM ctxh_embeddings WHERE activity_id = '$ACTIVITY_ID';
-- Ghi lại last_created
```

#### Bước 2: Cập nhật description

```powershell
$updateBody = @{
  description = "[CẬP NHẬT TC2] Chương trình hiến máu tình nguyện MỞ RỘNG cho cả cựu sinh viên và giảng viên, địa điểm mới tại BK cơ sở 2"
} | ConvertTo-Json

curl -X PATCH http://localhost:9200/api/ctxh/activities/$ACTIVITY_ID `
  -H "Content-Type: application/json" `
  -H "Authorization: Bearer <token>" `
  -d $updateBody
```

#### Bước 3: Kiểm tra log

```
[ActivitiesService] emitting activity.updated for $ACTIVITY_ID, changedFields: ["description"]
[CtxhVectorSyncService] 📝 Queuing re-embed for updated activity: ... ($ACTIVITY_ID)
[VectorIngestionProcessor] ⚙️ [<id>] upsert — ...
[VectorIngestionProcessor] ✅ Job done: ...
```

#### Bước 4: Xác nhận vector mới trong DB

```sql
SELECT COUNT(*), MAX(created_at) as last_created
FROM ctxh_embeddings WHERE activity_id = '$ACTIVITY_ID';
-- last_created phải mới hơn giá trị ghi ở Bước 1

SELECT substring(content, 1, 150) as preview
FROM ctxh_embeddings WHERE activity_id = '$ACTIVITY_ID'
ORDER BY created_at DESC LIMIT 3;
-- Nội dung phải chứa "[CẬP NHẬT TC2]" và "BK cơ sở 2"
```

**✅ PASS** khi: vector mới có `created_at` sau thời điểm update và chứa nội dung mới.

---

### TC-3: Cập Nhật Field Không Ảnh Hưởng Nội Dung → Không Re-embed

**Mục tiêu**: Update một field không thuộc `CONTENT_FIELDS` (ví dụ: trường metadata/admin) → **không có job mới** nào được thêm vào queue.

> **`CONTENT_FIELDS` hiện tại**: `name`, `description`, `location`, `start_date`, `end_date`, `total_days`, `category_id`, `organization_id`, `status`

**Field để test** (chọn field tồn tại trong DTO nhưng không trong CONTENT_FIELDS):

```powershell
# Kiểm tra DTO có những field gì ngoài CONTENT_FIELDS
# Ví dụ: max_participants, registration_deadline, requirements, ...
$body = @{ max_participants = 200 } | ConvertTo-Json

# Ghi lại queue status trước
curl http://localhost:9200/api/ctxh-chat/ingestion/queue-status
# -> {"waiting": 0, ...} (sau khi TC-2 đã xong)

curl -X PATCH http://localhost:9200/api/ctxh/activities/$ACTIVITY_ID `
  -H "Content-Type: application/json" `
  -H "Authorization: Bearer <token>" `
  -d $body
```

#### Kiểm tra log — phải thấy debug message:

```
[CtxhVectorSyncService] ⏭️ Activity updated (non-content fields only): skipping re-embedding
```

#### Kiểm tra queue — không thay đổi:

```powershell
curl http://localhost:9200/api/ctxh-chat/ingestion/queue-status
# Mong đợi: waiting vẫn = 0, completed không tăng thêm
```

> **⚠️ Nếu field muốn test không có trong DTO**, hãy tạm thời *thêm* một field non-content vào DTO để test, hoặc chọn field khác.

**✅ PASS** khi: không có log "Queuing re-embed", queue không thay đổi.

---

### TC-4: Xóa Activity → Vector Bị Xóa

**Mục tiêu**: Soft-delete activity → event `activity.deleted` → job `delete_{id}` → `deleteActivity(id)` xóa toàn bộ vectors.

#### Bước 1: Xác nhận vectors tồn tại trước khi xóa

```sql
SELECT COUNT(*) FROM ctxh_embeddings WHERE activity_id = '$ACTIVITY_ID';
-- Phải > 0
```

#### Bước 2: Soft-delete activity

```powershell
curl -X DELETE http://localhost:9200/api/ctxh/activities/$ACTIVITY_ID `
  -H "Authorization: Bearer <token>"
```

#### Bước 3: Kiểm tra log

```
[CtxhVectorSyncService] 🗑️ Queuing delete for activity: "TC1 - Hiến máu..." ($ACTIVITY_ID)
[VectorIngestionProcessor] ⚙️ [<id>] delete — ...
[VectorIngestionProcessor] ✅ Job done: [<id>] delete_activity
```

#### Bước 4: Xác nhận vectors đã bị xóa

```sql
SELECT COUNT(*) FROM ctxh_embeddings WHERE activity_id = '$ACTIVITY_ID';
-- Mong đợi: 0
```

**✅ PASS** khi: vectors = 0 sau khi xóa activity.

---

### TC-5: Restore Activity → Vector Được Tạo Lại

**Mục tiêu**: Sau khi soft-delete (TC-4), restore lại → event `activity.restored` → job `upsert` mới → vectors được tạo lại.

```powershell
curl -X POST http://localhost:9200/api/ctxh/activities/$ACTIVITY_ID/restore `
  -H "Authorization: Bearer <token>"
```

#### Kiểm tra log:

```
[CtxhVectorSyncService] 🔃 Queuing re-embed for restored activity: ... ($ACTIVITY_ID)
[VectorIngestionProcessor] ✅ Job done: [<id>] upsert_activity
```

#### Xác nhận vector:

```sql
SELECT COUNT(*) FROM ctxh_embeddings WHERE activity_id = '$ACTIVITY_ID';
-- Mong đợi: > 0
```

**✅ PASS** khi: vectors được tạo lại sau restore.

---

### TC-6: Deduplication — Cập Nhật Liên Tiếp → Chỉ 1 Job

**Mục tiêu**: Gửi 3 PATCH liên tiếp trong 1-2 giây → BullMQ deduplication bằng `jobId: upsert_{id}` → chỉ xử lý **1 lần** embedding (job sau overwrite job trước nếu chưa chạy).

#### Thực hiện 3 update liên tiếp

```powershell
# Gửi 3 request nhanh nhất có thể
$u1 = @{ name = "TC6 - Update 1" } | ConvertTo-Json
$u2 = @{ name = "TC6 - Update 2" } | ConvertTo-Json
$u3 = @{ name = "TC6 - Update cuối cùng" } | ConvertTo-Json

curl -X PATCH http://localhost:9200/api/ctxh/activities/$ACTIVITY_ID `
  -H "Content-Type: application/json" -H "Authorization: Bearer <token>" -d $u1
curl -X PATCH http://localhost:9200/api/ctxh/activities/$ACTIVITY_ID `
  -H "Content-Type: application/json" -H "Authorization: Bearer <token>" -d $u2
curl -X PATCH http://localhost:9200/api/ctxh/activities/$ACTIVITY_ID `
  -H "Content-Type: application/json" -H "Authorization: Bearer <token>" -d $u3
```

#### Theo dõi log:

- Phải thấy 3 event `📝 Queuing re-embed` (mỗi update 1 log)
- Nhưng chỉ **1 lần** `✅ Job done` (job 2 và 3 bị reject do `jobId` đã tồn tại)
- **Hoặc**: nếu job 1 đã hoàn thành trước khi job 2 đến, sẽ thấy 2 lần `Job done` — đây vẫn là hành vi đúng (không xử lý 3 lần trong mọi trường hợp)

#### Kiểm tra vector cuối cùng:

```sql
SELECT substring(content, 1, 50) FROM ctxh_embeddings
WHERE activity_id = '$ACTIVITY_ID'
ORDER BY created_at DESC LIMIT 1;
-- Phải chứa "TC6 - Update cuối cùng"
```

**✅ PASS** khi: vector cuối cùng phản ánh đúng nội dung update cuối, không xử lý thừa 3 lần.

---

### TC-7: Retry Khi Ollama Không Sẵn Sàng

**Mục tiêu**: Tắt Ollama → job fail → BullMQ retry 3 lần với exponential backoff → job chuyển sang `failed` (không crash app).

#### Bước 1: Tắt Ollama

```powershell
# Dừng Ollama service
Stop-Service ollama -ErrorAction SilentlyContinue
# Hoặc kill process
Get-Process ollama | Stop-Process
```

#### Bước 2: Trigger một upsert job

```powershell
$body = @{ description = "TC7 - Test retry khi Ollama tắt" } | ConvertTo-Json
curl -X PATCH http://localhost:9200/api/ctxh/activities/$ACTIVITY_ID `
  -H "Content-Type: application/json" -H "Authorization: Bearer <token>" -d $body
```

#### Bước 3: Quan sát retry

Trong log, phải thấy 3 lần fail với delay tăng dần:
```
[VectorIngestionProcessor] ❌ Job failed: [<id>] upsert_activity — ... (attempt 1/3)
# ~2 giây sau:
[VectorIngestionProcessor] ❌ Job failed: [<id>] upsert_activity — ... (attempt 2/3)
# ~4 giây sau:
[VectorIngestionProcessor] ❌ Job failed: [<id>] upsert_activity — ... (attempt 3/3)
```

**Server không crash** — vẫn nhận request bình thường.

#### Bước 4: Kiểm tra failed jobs trong Redis

```powershell
redis-cli llen "bull:vectorize_queue:failed"
# Kết quả: >= 1
```

#### Bước 5: Khởi động lại Ollama và xử lý lại job failed

```powershell
Start-Service ollama
# Hoặc: ollama serve

# Trigger lại thủ công (vì Bull không tự retry failed jobs)
# Option A: force-sync-all
curl -X POST http://localhost:9200/api/ctxh-chat/ingestion/force-sync-all

# Option B: process activity trực tiếp
curl -X POST http://localhost:9200/api/ctxh-chat/ingestion/activity/$ACTIVITY_ID
```

**✅ PASS** khi: app không crash khi Ollama tắt, retry đúng 3 lần, job vào `failed` state.

---

### TC-8: Force Sync All

**Mục tiêu**: Endpoint `POST /ingestion/force-sync-all` thêm job `full_sync` vào queue và toàn bộ activities được re-embed.

```powershell
# Gới lại stats trước
curl http://localhost:9200/api/ctxh-chat/ingestion/stats

# Trigger full sync
curl -X POST http://localhost:9200/api/ctxh-chat/ingestion/force-sync-all
# Mong đợi: {"message":"Full sync job added to queue"}

# Theo dõi queue status
curl http://localhost:9200/api/ctxh-chat/ingestion/queue-status
# Phải thấy waiting hoặc active = 1

# Đợi xong (có thể rất lâu nếu nhiều activity)
# Log: [VectorIngestionProcessor] ⚙️ [<id>] full_sync — triggered by: manual
```

#### Kiểm tra deduplication của full-sync:

```powershell
# Gửi 2 lần liên tiếp
curl -X POST http://localhost:9200/api/ctxh-chat/ingestion/force-sync-all
curl -X POST http://localhost:9200/api/ctxh-chat/ingestion/force-sync-all
# Chỉ 1 job vì jobId: 'full_sync_latest'
curl http://localhost:9200/api/ctxh-chat/ingestion/queue-status
# waiting = 1, không phải 2
```

**✅ PASS** khi: full sync job được thêm, chạy thành công, deduplication hoạt động.

---

### TC-9: Redis Resilience — App Không Crash Khi Redis Tắt

**Mục tiêu**: Tắt Redis trong lúc app đang chạy → app log warning nhưng **không crash** → khởi động lại Redis → jobs tiếp tục.

#### Bước 1: Tắt Redis

```powershell
Stop-Service Redis -ErrorAction SilentlyContinue
# Hoặc
redis-cli shutdown nosave
```

#### Bước 2: Gọi API bình thường (không liên quan đến queue)

```powershell
# App phải vẫn trả lời bình thường
curl http://localhost:9200/api/ctxh/activities?page=1&limit=5
```

#### Bước 3: Thử tạo/update activity

```powershell
$body = @{ description = "TC9 - Redis down test" } | ConvertTo-Json
curl -X PATCH http://localhost:9200/api/ctxh/activities/$ACTIVITY_ID `
  -H "Content-Type: application/json" -H "Authorization: Bearer <token>" -d $body
# Request phải thành công (activity được cập nhật trong DB)
# Log có thể có error khi add job vào queue — nhưng không crash
```

#### Bước 4: Khởi động lại Redis

```powershell
Start-Service Redis
# Hoặc: redis-server --daemonize yes
```

**✅ PASS** khi: app không crash, CRUD activity vẫn hoạt động bình thường khi Redis down.

> **Lưu ý**: Các activity được CRUD trong thời gian Redis down sẽ **không có vector** — đây là expected behavior. Sau khi Redis phục hồi, cần chạy `force-sync-all` để sync lại.

---

## 3. Kiểm Tra Cron Jobs

### TC-10: Xác Nhận Cron Hourly (Incremental) Chạy Đúng

Vì không muốn đợi 1 giờ, ta giả lập bằng cách gọi trực tiếp endpoint incremental:

```powershell
# Giả lập incremental sync của 65 phút trước
$since = (Get-Date).AddMinutes(-65).ToString("yyyy-MM-ddTHH:mm:ss")
$body = @{ sinceDate = $since } | ConvertTo-Json

curl -X POST http://localhost:9200/api/ctxh-chat/ingestion/incremental `
  -H "Content-Type: application/json" `
  -d $body
```

Để test **thật sự cron chạy**, có thể tạm sửa `@Cron(CronExpression.EVERY_HOUR)` thành `@Cron('* * * * *')` (mỗi phút) trong `ctxh-vector-sync.service.ts`, restart server và quan sát:

```
[CtxhVectorSyncService] ⏰ Incremental sync job queued (cron hourly safety-net)
```

> **Nhớ revert** sau khi test xong.

---

## 4. Checklist Tổng Kết

| Test Case | Mô tả | Status |
|-----------|-------|--------|
| TC-00 | Queue rỗng, baseline sạch | [ ] |
| TC-01 | Baseline stats | [ ] |
| TC-1 | Create → vector tạo | [ ] |
| TC-2 | Update content field → re-embed | [ ] |
| TC-3 | Update non-content field → skip | [ ] |
| TC-4 | Delete → vector xóa | [ ] |
| TC-5 | Restore → vector tạo lại | [ ] |
| TC-6 | Deduplication rapid updates | [ ] |
| TC-7 | Ollama down → retry 3 lần, no crash | [ ] |
| TC-8 | Force sync all + deduplication | [ ] |
| TC-9 | Redis down → app stable | [ ] |
| TC-10 | Cron incremental trigger | [ ] |

---

## 5. Xử Lý Khi Test Thất Bại

### Job không xuất hiện trong queue sau CRUD

1. Kiểm tra `CtxhVectorSyncService` có trong `providers` của `CtxhChatModule`
2. Kiểm tra `EventEmitterModule.forRoot()` đã đăng ký trong `AppModule`
3. Kiểm tra `ActivitiesService` đã inject `EventEmitter2` và gọi `emit()`
4. Bật debug log: `LOG_LEVEL=debug` trong `.env`

```powershell
# Bật verbose log tạm thời
$env:LOG_LEVEL = "debug"; npm run start:dev
```

### Job xuất hiện nhưng không được xử lý (stuck in waiting)

```powershell
# Kiểm tra VectorIngestionProcessor đã đăng ký
redis-cli pubsub channels "bull:vectorize_queue:*"

# Kiểm tra Redis connection
redis-cli info clients
```

### Vector không xuất hiện trong DB sau job completed

1. Kiểm tra `LangChainIngestionService.processActivity()` không bị lỗi silently
2. Kiểm tra kết nối pgvector: `psql -c "SELECT * FROM ctxh_embeddings LIMIT 1"`
3. Kiểm tra Ollama trả về đúng dimension vector

### `@OnEvent` không trigger

```typescript
// Kiểm tra ACTIVITY_EVENTS constant match với string emit
// Trong activities.service.ts:
this.eventEmitter.emit(ACTIVITY_EVENTS.CREATED, ...)
// Phải dùng constant, không dùng string literal khác nhau
```

---

## 6. Script Dọn Dẹp Sau Test

```sql
-- Xóa vectors của các activities test
DELETE FROM ctxh_embeddings
WHERE activity_id IN (
  SELECT id FROM ctxh_activities
  WHERE name LIKE 'TC%'
    AND created_at > NOW() - INTERVAL '1 day'
);

-- Xóa activities test (hoặc dùng API DELETE)
DELETE FROM ctxh_activities WHERE name LIKE 'TC%';
```

```powershell
# Xóa toàn bộ jobs trong Bull queues
redis-cli del "bull:vectorize_queue:wait"
redis-cli del "bull:vectorize_queue:active"  
redis-cli del "bull:vectorize_queue:completed"
redis-cli del "bull:vectorize_queue:failed"
redis-cli del "bull:vectorize_queue:delayed"
```
