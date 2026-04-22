Ran command: `Get-ChildItem -Path d:\hcmut\internship\doanhoi-portal\backend\src\ctxh-chat -Recurse -File | Select-Object FullName`
Ran command: `Get-ChildItem -Path d:\hcmut\internship\doanhoi-portal\backend\src\ctxh-chat -Recurse -File | Select-Object -ExpandProperty FullName`
Listed directory ctxh-chat
Listed directory controllers
Listed directory services
Viewed ctxh-chat.controller.ts:1-434
Viewed langchain-rag-chain.service.ts:1-440
Viewed langchain-vector-store.service.ts:1-696

Chào bạn, dựa trên việc phân tích mã nguồn trong thư mục `d:\hcmut\internship\doanhoi-portal\backend\src\ctxh-chat\`, tôi xin tóm tắt luồng hoạt động hiện tại của RAG Pipeline (không chỉnh sửa source code) như sau:

Đây là luồng xử lý chi tiết qua từng bước khi người dùng gửi một tin nhắn vào chatbot:

### 1. Tiếp nhận Request & Khởi tạo (Controller)
- **Endpoint**: Nhận tin nhắn qua `POST /api/ctxh-chat/message` (hoặc luồng SSE `GET/POST .../stream`).
- **Chuẩn bị biến môi trường**: Controller sẽ tính toán thời gian thực (`currentDate`, `currentDayOfWeek`, `currentDatetime`) gò theo time zone `Asia/Ho_Chi_Minh` để giữ tính đồng nhất về thời gian.
- **Tiến trình**: Request được chuyển tiếp vào `LangChainRagChainService.invoke()` hoặc `.stream()`.

### 2. Định hình lại câu hỏi (Question Rewrite)
- **Xử lý ngữ cảnh**: Tham chiếu đến `langchain-memory.service.ts` để bóc tách 10 lượt hội thoại gần nhất dựa trên `sessionId`.
- **Viết lại câu hỏi**: Nếu có lịch sử chat, module sẽ chạy một Prompt là `STANDALONE_QUESTION_PROMPT` với công cụ LLM để định dạng/viết lại câu hỏi truy vấn hiện tại (ví dụ từ: "khi nào diễn ra" -> "Hoạt động hiến máu khi nào diễn ra?") nhằm giúp thuật toán tìm kiếm vector chính xác nhất.

### 3. Trích xuất Bộ lọc Metadata (Filter Extraction)
- Câu hỏi đã được làm rõ sẽ được đẩy qua service `CtxhFilterExtractionService`.
- LLM sẽ đọc câu hỏi và "ép kiểu" trích xuất ra các metadata filters (ví dụ: danh mục nào `category`, từ khóa tổ chức `organizationKeywords`, địa điểm `locationRaw`, hoặc các thông số thời gian `status`).
- Đặc biệt, hệ thống xử lý (resolve) cả các khoảng thời gian mang tính tương đối dựa theo `currentDate` (ví dụ: "tuần này", "tháng 3") để sinh ra `startDate` và `endDate` tuyệt đối.

### 4. Tìm kiếm Ngữ cảnh (Retrieval)
Tiến trình diễn ra tại `langchain-vector-store.service.ts`:
- **Trường hợp có filters kết xuất được**:
  Hệ thống sử dụng kỹ thuật "Pre-retrieval Metadata Filters". Các bộ lọc trích xuất được đẩy trực tiếp vào câu lệnh truy vấn SQL bằng thư viện PGVector (trong file SQL gốc `metadata->>'status'`).
  > **Lưu ý nhỏ về Ranking**: Có chèn sẵn logic Priority Boost trong SQL. Những hoạt động có ngày bắt đầu (`startDate`) đúng với hôm nay được cộng (+0.15 score), và kết thúc hôm nay (+0.10 score) để ưu tiên nổi lên trên top.
- **Trường hợp KHÔNG có filters**:
  Giải pháp sẽ dựa vào tham số đầu vào để gọi Tìm kiếm thuần `similaritySearchWithDateFilter` (tìm ra rồi mới loại các event dựa trên status và today) hoặc `maxMarginalRelevanceSearch` (MMR - đa dạng hoá kết quả).
- Tất cả hoạt động có `metadata->>'status' = 'DRAFT'` đều mặc định bị loại đi (không truy xuất được).

### 5. Định dạng lại Context (Context Formatting)
- Kết quả Documents thu được (ví dụ `Limit k=5`) sẽ được đưa vào hàm `formatDocumentsAsContext()`.
- Tại đây, hệ thống đánh giá ngày thực tế (`currentDate` so với `startDate`/`endDate`) để quy đổi ra chuỗi trạng thái **"Đang diễn ra"**, **"Đã kết thúc"**, **"Còn tuyển thành viên"** tương đối rõ ràng. 
- Sau đó gom chung nội dung `pageContent`, `Link đăng ký`, thông tin địa điểm... thành 1 chuỗi ngọc khổng lồ chứa ngữ cảnh để đưa LLM phân tích nhai lại.
- Dò tìm thông tin cá nhân (Nếu user có thuộc một Tổ chức / Khoa, mã sẽ chèn thêm một câu Instruction ưu tiên tài liệu của Khoa mình lên trước qua tùy chọn `user_org_instruction`).

### 6. Sinh Câu Trả Lời (Generation)
- Chuỗi Pipeline chính `ragChain.invoke()` sẽ nạp tất cả biến số: `question` (câu hỏi đã viết lại), `chat_history`, `context`, `current_date`, v.v. vào trong prompt `CTXH_RAG_PROMPT`.
- Mô hình UniversalLLM (Gemini hoặc Ollama do bạn chỉ định) sẽ trả về câu văn.
- Sau khi được dịch ra, tin nhắn được ghim vào Session Memory lại.

### 7. Hậu Xử Lý & Trả về Phản hồi (Post-processing)
- Quay lại `ctxh-chat.controller.ts`, sau khi có chuỗi tin nhắn phản hồi, sẽ đưa qua một hàm tĩnh `generateFollowUpSuggestions` quét (keyword match thủ công dựa trên chữ như "ngày", "địa điểm", "CTXH") để tạo ra 3 câu gợi ý đi kèm.
- Controller cũng tính toán độ tin cậy (`confidence`: 0.3 - 0.9 tuỳ số lượng Source Documents).
- Gói gọn tất cả thông tin lại bao gồm Response text, Sources link, Metrics, Follow-ups và trả lại cho người dùng thông qua JSON Data API.

Bạn có cần chú ý chi tiết sâu hơn vào cấu trúc Prompt cụ thể hoặc hàm nào trong luồng xử lý này không?