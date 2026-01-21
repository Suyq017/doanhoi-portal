# Hướng Dẫn Thiết Lập Postman cho CTXH RAG API

## Bước 1: Import Collection vào Postman

1. Mở Postman Desktop hoặc Postman Web
2. Click vào nút **Import** ở góc trên bên trái
3. Chọn tab **File**
4. Kéo thả file `CTXH-RAG-API.postman_collection.json` hoặc click **Choose Files**
5. Click **Import**

## Bước 2: Cấu Hình Environment Variables

Collection đã có sẵn 2 biến:
- `baseUrl`: `http://localhost:9200` (URL backend server)
- `accessToken`: Tự động lưu sau khi login

**Nếu cần thay đổi port:**
1. Click vào collection "CTXH RAG API"
2. Chọn tab **Variables**
3. Sửa giá trị `baseUrl` (ví dụ: `http://localhost:3000`)
4. Click **Save**

## Bước 3: Kiểm Tra Backend Server

Đảm bảo backend đang chạy:
```bash
cd backend
npm run start:dev
```

Chờ đến khi thấy:
```
[Nest] Application is running on: http://localhost:9200
```

## Bước 4: Test Workflow - Theo Thứ Tự

### 4.1. Health Checks (Không cần authentication)

**Mục đích:** Kiểm tra các component của pipeline có hoạt động không

1. **Overall Health Check**
   - Endpoint: `GET /api/ctxh-chat/health`
   - Click **Send**
   - Kết quả mong đợi:
   ```json
   {
     "status": "healthy",
     "components": {
       "embedding": "healthy",
       "vectorStore": "healthy",
       "gemini": "healthy"
     }
   }
   ```

2. **Embedding Service Health**
   - Endpoint: `GET /api/ctxh-chat/health/embeddings`
   - Kiểm tra Google Gemini API connection
   - Kết quả mong đợi:
   ```json
   {
     "status": "healthy",
     "apiKey": "configured",
     "model": "text-embedding-004"
   }
   ```

3. **Vector Store Health**
   - Endpoint: `GET /api/ctxh-chat/health/vector-store`
   - Kiểm tra PostgreSQL + pgVector connection
   - Kết quả mong đợi:
   ```json
   {
     "status": "healthy",
     "database": "connected",
     "pgvector": "enabled"
   }
   ```

**⚠️ Nếu có lỗi:**
- Kiểm tra file `.env` có `GEMINI_API_KEY`
- Kiểm tra PostgreSQL container đang chạy
- Kiểm tra pgVector extension đã được cài đặt

### 4.2. Data Ingestion (Không cần authentication)

**Mục đích:** Chuyển đổi dữ liệu CTXH thành vector embeddings

1. **Run Full Ingestion**
   - Endpoint: `POST /api/ctxh-chat/ingestion/full`
   - Body: (empty)
   - Click **Send**
   - ⏱️ Thời gian: 30-60 giây (tùy số lượng hoạt động)
   - Kết quả mong đợi:
   ```json
   {
     "success": true,
     "totalActivities": 12,
     "processedCount": 12,
     "failedCount": 0,
     "duration": 45000,
     "errors": []
   }
   ```

2. **Get Ingestion Stats**
   - Endpoint: `GET /api/ctxh-chat/ingestion/stats`
   - Xem thống kê sau khi ingestion
   - Kết quả mong đợi:
   ```json
   {
     "totalActivities": 12,
     "totalEmbeddings": 36,
     "avgEmbeddingsPerActivity": 3,
     "lastIngestionTime": "2025-12-27T10:30:00.000Z"
   }
   ```

3. **Get Storage Stats**
   - Endpoint: `GET /api/ctxh-chat/stats/storage`
   - Xem chi tiết vector storage
   - Kết quả mong đợi:
   ```json
   {
     "totalVectors": 36,
     "dimensions": 768,
     "totalActivities": 12,
     "storageSize": "256KB"
   }
   ```

### 4.3. Authentication (Cần cho Chat Operations)

**Mục đích:** Lấy JWT token để test chat endpoints

1. **Login**
   - Endpoint: `POST /api/auth/login`
   - Body:
   ```json
   {
     "username": "admin",
     "password": "admin123"
   }
   ```
   - Click **Send**
   - Token sẽ tự động được lưu vào biến `accessToken`
   - Kết quả mong đợi:
   ```json
   {
     "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
     "user": {
       "id": "...",
       "username": "admin"
     }
   }
   ```

**💡 Lưu ý:** Nếu không có user admin, tạo bằng lệnh:
```bash
npm run seed:users
```

### 4.4. Chat Operations (Cần authentication)

**Mục đích:** Test RAG chatbot

1. **Send Message**
   - Endpoint: `POST /api/ctxh-chat/message`
   - Authorization: Bearer Token (tự động)
   - Body:
   ```json
   {
     "message": "Có những hoạt động tình nguyện nào liên quan đến môi trường?",
     "sessionId": "test-session-1"
   }
   ```
   - Click **Send**
   - ⏱️ Thời gian: 3-5 giây
   - Kết quả mong đợi:
   ```json
   {
     "sessionId": "test-session-1",
     "response": "Có các hoạt động như: Vệ sinh cảnh quan KTX...",
     "sources": [
       {
         "activityId": "...",
         "activityName": "TNV HỖ TRỢ VỆ SINH, CHĂM SÓC CẢNH QUAN...",
         "similarity": 0.85
       }
     ],
     "followUpSuggestions": [
       "Làm thế nào để đăng ký tham gia?",
       "Số ngày CTXH được tính là bao nhiêu?"
     ],
     "confidence": 0.85,
     "responseTime": 3200,
     "timestamp": "2025-12-27T10:35:00.000Z"
   }
   ```

2. **Get Chat History**
   - Endpoint: `GET /api/ctxh-chat/history/:sessionId`
   - Sửa `:sessionId` thành `test-session-1`
   - Xem toàn bộ lịch sử chat
   - Kết quả mong đợi:
   ```json
   {
     "sessionId": "test-session-1",
     "userId": "...",
     "messages": [
       {
         "role": "user",
         "content": "Có những hoạt động...",
         "timestamp": "2025-12-27T10:35:00.000Z"
       },
       {
         "role": "assistant",
         "content": "Có các hoạt động như...",
         "timestamp": "2025-12-27T10:35:03.000Z"
       }
     ]
   }
   ```

3. **Submit Feedback**
   - Endpoint: `POST /api/ctxh-chat/feedback`
   - Body:
   ```json
   {
     "sessionId": "test-session-1",
     "rating": "positive",
     "comment": "Câu trả lời rất hữu ích!"
   }
   ```

4. **Clear Session**
   - Endpoint: `DELETE /api/ctxh-chat/session/:sessionId`
   - Xóa lịch sử chat (để test lại từ đầu)

## Bước 5: Test Scenarios

### Scenario 1: Fresh Setup
```
1. Health Checks → Kiểm tra components
2. Run Full Ingestion → Load dữ liệu
3. Get Ingestion Stats → Verify 12 activities
4. Login → Lấy token
5. Send Message → Test chatbot
```

### Scenario 2: Incremental Update
```
1. Login to backend → Thêm hoạt động mới vào database
2. Run Incremental Update → Chỉ load hoạt động mới
3. Send Message → Test với dữ liệu mới
```

### Scenario 3: Single Activity Update
```
1. Get activity ID from database
2. Process Single Activity → Re-index 1 hoạt động
3. Send Message → Verify updated data
```

## Bước 6: Debugging

### Kiểm tra dữ liệu trong database

```sql
-- Kiểm tra số lượng activities
SELECT COUNT(*) FROM ctxh_activity WHERE status = 'ACTIVE';

-- Kiểm tra embeddings
SELECT 
  activity_id,
  chunk_index,
  embedding <-> '[0,0,0,...]'::vector AS distance
FROM ctxh_activity_embeddings
LIMIT 5;

-- Kiểm tra dimension của vector
SELECT 
  activity_id,
  vector_dims(embedding) as dimensions
FROM ctxh_activity_embeddings
LIMIT 1;
```

### Kiểm tra cache

```bash
# Get cache stats
curl http://localhost:9200/api/ctxh-chat/stats/cache

# Clear cache nếu cần
curl -X DELETE http://localhost:9200/api/ctxh-chat/cache/clear
```

## Bước 7: Sample Test Messages

```json
// Câu hỏi về môi trường
{
  "message": "Có những hoạt động nào liên quan đến môi trường và vệ sinh?",
  "sessionId": "env-test"
}

// Câu hỏi về hiến máu
{
  "message": "Tôi muốn tham gia hiến máu tình nguyện",
  "sessionId": "blood-test"
}

// Câu hỏi về PCCC
{
  "message": "Các hoạt động phòng cháy chữa cháy có ở đâu?",
  "sessionId": "fire-test"
}

// Câu hỏi về thời gian
{
  "message": "Hoạt động nào diễn ra vào tháng 10/2024?",
  "sessionId": "time-test"
}

// Câu hỏi về địa điểm
{
  "message": "Hoạt động nào tổ chức ở KTX?",
  "sessionId": "location-test"
}
```

## Troubleshooting

### Lỗi: "Cannot GET /api/ctxh-chat/..."
- ✅ Kiểm tra backend đã import `CtxhChatModule` trong `app.module.ts`
- ✅ Restart backend server

### Lỗi: "Unauthorized"
- ✅ Chạy Login request trước
- ✅ Kiểm tra token đã được lưu vào biến `accessToken`

### Lỗi: "Gemini API Error"
- ✅ Kiểm tra `GEMINI_API_KEY` trong file `.env`
- ✅ Verify API key tại https://aistudio.google.com/apikey

### Lỗi: "Database connection failed"
- ✅ Kiểm tra PostgreSQL container: `docker ps`
- ✅ Kiểm tra connection trong `.env`:
  ```
  DB_HOST=localhost
  DB_PORT=9000
  DB_USERNAME=postgres
  DB_PASSWORD=password
  DB_NAME=doanhoi
  ```

### Ingestion trả về 0 activities
- ✅ Chạy: `npm run seed:ctxh-activities`
- ✅ Kiểm tra database có dữ liệu: `SELECT * FROM ctxh_activity;`

### Response rất chậm (>10s)
- ✅ Kiểm tra Gemini API quota
- ✅ Xem cache stats - cache hit rate thấp
- ✅ Restart Redis container nếu có

## Tips

1. **Sử dụng Environment**: Tạo environment riêng cho dev/staging/prod
2. **Save Responses**: Click vào response → Save as Example để tham khảo sau
3. **Pre-request Scripts**: Tự động refresh token nếu hết hạn
4. **Tests Tab**: Viết test automation cho CI/CD

## Next Steps

Sau khi test thành công, có thể:
1. Tích hợp frontend với API
2. Thêm monitoring và logging
3. Setup CI/CD pipeline
4. Deploy lên production
