TÀI LIỆU HƯỚNG DẪN HIỆN THỰC HỆ THỐNG RAG QUẢN LÝ CÔNG TÁC XÃ HỘI (CTXH)
1. Tổng quan Dự án (Project Context)
Dự án xây dựng một Chatbot AI (sử dụng kiến trúc RAG) để quản lý và trả lời các câu hỏi của sinh viên về các hoạt động Công tác Xã hội (CTXH). Hệ thống sử dụng Local LLM & Embedding (Ollama). Do giới hạn về phần cứng cục bộ, hệ thống phải được thiết kế bất đồng bộ (asynchronous) với hàng đợi (message queue) để tránh quá tải khi có nhiều Admin thêm dữ liệu cùng lúc.
2. Tech Stack Core
Backend: Node.js, NestJS, TypeScript.
AI Orchestration: LangChain.js.
Database & Vector Store: PostgreSQL + tiện ích mở rộng pgvector.
Message Queue & Caching: Redis (sử dụng thư viện Bull hoặc BullMQ trong NestJS).
Local AI Models: Ollama (LLM Generator & Embedding Model).
Frontend: React, TypeScript, thư viện @assistant-ui/react.

--------------------------------------------------------------------------------
3. Quản lý Dependencies (Package.json)
AI Agent cần đảm bảo cài đặt các package chính sau cho Backend NestJS:
npm install @langchain/core @langchain/community @langchain/openai pg ioredis @nestjs/bull bull uuid
(Ghi chú: @langchain/openai hoặc package tương ứng cho Ollama tùy thuộc vào cấu hình endpoint).
Cho Frontend React:
npx assistant-ui init

--------------------------------------------------------------------------------
4. Thiết kế Luồng Tăng cường Dữ liệu (Data Ingestion Pipeline)
RÀNG BUỘC QUAN TRỌNG: Ollama chạy local, không được gọi API embedding đồng thời cho nhiều dữ liệu cùng lúc để tránh sập server. BẮT BUỘC sử dụng Redis Queue với concurrency: 1.
4.1. Bước 1: API Tiếp nhận dữ liệu (Fast Response)
Khi Admin thêm dữ liệu sự kiện CTXH mới:
Lưu dữ liệu thô (có cấu trúc: Tên sự kiện, ngày, địa điểm...) vào bảng PostgreSQL truyền thống.
Đẩy eventId vào Redis Queue (ví dụ: vectorize_queue).
Trả về Response 200 OK cho Admin ngay lập tức. Không chờ Ollama xử lý.
4.2. Bước 2: Worker Xử lý ngầm (Background Processor)
Tạo một Processor trong NestJS lắng nghe vectorize_queue:
Cấu hình: @Process({ name: 'embed_ctxh_event', concurrency: 1 }). Điều này đảm bảo Ollama chỉ xử lý tuần tự từng sự kiện.
Làm giàu ngữ nghĩa (Semantification): Chuyển đổi dữ liệu bảng thành câu văn tự nhiên. (VD: "Sự kiện {Tên} diễn ra vào ngày {Ngày} tại {Địa điểm} với nội dung {Mô tả}").
Phân đoạn (Chunking): Sử dụng RecursiveCharacterTextSplitter chia nhỏ văn bản (VD: chunkSize: 500, chunkOverlap: 50).
Embedding & Storage: Gọi Ollama tạo Vector Embeddings, sau đó lưu vào PostgreSQL sử dụng PGVectorStore từ LangChain.js.
Index: Đảm bảo bảng pgVector có tạo chỉ mục HNSW để tìm kiếm tốc độ cao.

--------------------------------------------------------------------------------
5. Thiết kế Luồng Truy vấn Chatbot (Inference Flow)
5.1. Cache Layer với Redis (Tối ưu Tốc độ)
Tạo Cache Key: Khi sinh viên đặt câu hỏi, normalize (chuẩn hóa) câu hỏi để tạo cache_key.
Check Cache: Kiểm tra trong Redis. Nếu đã có người hỏi câu tương tự và có kết quả (Cache Hit), trả kết quả ngay lập tức để bỏ qua bước gọi Ollama tốn kém.
Cache Miss: Nếu chưa có, tiếp tục chạy RAG pipeline ở bước 5.2.
Save Cache: Sau khi có kết quả từ RAG, lưu vào Redis với TTL (ví dụ: 24h).
5.2. RAG Pipeline (Retrieval & Generation)
Xây dựng Service xử lý truy vấn bằng LangChain.js:
Quản lý Lịch sử (Chat History): Lấy tối đa 10 tin nhắn gần nhất để làm ngữ cảnh.
Contextualize Query: Chuyển đổi câu hỏi của sinh viên (dựa trên lịch sử) thành câu hỏi độc lập (Standalone Query).
Retrieval: Dùng PGVectorStore.asRetriever() thực hiện tìm kiếm tương đồng (Semantic Search - Cosine Distance) để lấy ra k đoạn thông tin CTXH liên quan nhất.
Generation (Nhồi Prompt): Đưa các document lấy được vào Prompt (Sử dụng createStuffDocumentsChain).
Streaming: Gọi Ollama LLM tạo câu trả lời và trả về dưới dạng ReadableStream để frontend hiển thị hiệu ứng gõ phím theo thời gian thực.

--------------------------------------------------------------------------------
6. Thiết kế Frontend (React + assistant-ui)
UI Library: Bắt buộc sử dụng @assistant-ui/react để tái sử dụng các component chuẩn như Thread, MessageList, ChatInput thay vì code giao diện từ đầu.
State Management: Quản lý state conversation_id để đính kèm vào mỗi request gửi lên Backend.
Streaming Handling: Hiện thực logic nhận Stream Data từ Backend. Sử dụng TextDecoder đọc từng đoạn chunk và append vào state của tin nhắn cuối cùng để hiển thị lên UI mượt mà.
Markdown: Đảm bảo UI hỗ trợ render Markdown để hiển thị tốt các danh sách, in đậm do LLM trả về.

--------------------------------------------------------------------------------
7. Yêu Cầu Cho AI Agent (Khi Viết Code)
Tuân thủ Clean Architecture / SOLID: Tách biệt rõ các module (Ingestion, Retrieval, Generation, Database).
Xử lý lỗi (Error Handling): Trong Worker xử lý Queue, phải có cơ chế retry nếu Ollama bị timeout hoặc crash.
Typing: Sử dụng TypeScript Interfaces cho toàn bộ DTO, Entities và kết quả trả về.
Tự động sinh ra cấu trúc các bảng PostgreSQL (DDL) cho Vector data (sử dụng id, content, metadata kiểu JSONB, và vector type).
