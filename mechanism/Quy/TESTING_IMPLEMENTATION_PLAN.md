# KẾ HOẠCH TRIỂN KHAI KIỂM THỬ

## 1. Mục tiêu

Mục tiêu của kế hoạch này là triển khai kiểm thử một cách có hệ thống để tăng độ tin cậy cho hệ thống Đoàn -- Hội Portal, đồng thời tạo cơ sở rõ ràng cho phần báo cáo kiểm thử trong luận văn.

Kế hoạch tập trung vào ba mục tiêu chính:

1. Xác nhận các luồng nghiệp vụ lõi hoạt động đúng sau mỗi lần cập nhật mã nguồn.
2. Giảm rủi ro lỗi hồi quy ở các module quan trọng như xác thực, người dùng, tổ chức, CTXH, biểu mẫu và chatbot.
3. Có thể báo cáo được kết quả kiểm thử theo hướng định lượng, gồm số lượng test case, tỷ lệ pass và mức độ bao phủ.

## 2. Phạm vi kiểm thử

### 2.1 Backend

Ưu tiên triển khai kiểm thử tự động cho backend vì đây là nơi chứa phần lớn logic nghiệp vụ.

Phạm vi chính:

- Auth và RBAC.
- Users và Organizations.
- CTXH và các luồng import dữ liệu.
- Payment, Templates và Submissions.
- Chatbot RAG và các service liên quan đến ingest, memory, retriever.

### 2.2 Frontend

Frontend chỉ cần kiểm thử ở mức vừa đủ để bảo đảm các luồng chính không bị gãy.

Phạm vi chính:

- Render giao diện theo quyền.
- Form validation cơ bản.
- Các luồng thao tác chính như đăng nhập, danh sách, tạo mới, submit.

### 2.3 Kiểm thử tích hợp

Các luồng end-to-end cần được kiểm tra giữa frontend, backend và database để bảo đảm dữ liệu đi xuyên suốt đúng.

## 3. Công cụ đề xuất

### 3.1 Backend

- `Jest` cho unit test và integration test.
- `ts-jest` để chạy TypeScript trực tiếp.
- `supertest` để test API endpoint.
- `NestJS TestingModule` để mock dependency và kiểm thử service/controller.

### 3.2 Frontend

- `Vitest` cho test component và logic UI.
- `React Testing Library` để test theo hành vi người dùng.
- `MSW` hoặc mock axios để giả lập API khi cần.

### 3.3 Kiểm thử thủ công hỗ trợ

- Postman collection để test API nhanh.
- Performance Runner hoặc công cụ tương đương để test tải cơ bản.

## 4. Chiến lược triển khai

### Giai đoạn 1: Chuẩn hóa khung test

Mục đích là tạo nền tảng để các test có thể chạy ổn định và lặp lại được.

Đầu việc:

- Rà soát lại cấu hình Jest hiện có ở backend.
- Chuẩn hóa cách đặt tên test file và test folder.
- Tách dữ liệu test khỏi dữ liệu thật.
- Thiết lập mock cho database, Redis, S3, LLM nếu test không cần gọi thật.

Kết quả mong đợi:

- Có thể chạy toàn bộ test bằng một lệnh thống nhất.
- Test không phụ thuộc trạng thái môi trường local của người viết.

### Giai đoạn 2: Viết unit test cho logic quan trọng

Mục đích là bao phủ các hàm xử lý độc lập và giảm rủi ro lỗi logic.

Ưu tiên test:

- Hàm validate dữ liệu nhập.
- Hàm xử lý phân quyền.
- Hàm chuyển đổi dữ liệu import.
- Hàm tạo, cập nhật và ánh xạ trạng thái nghiệp vụ.

Kết quả mong đợi:

- Mỗi module quan trọng có bộ test tối thiểu cho logic cốt lõi.
- Các lỗi ở cấp hàm được phát hiện sớm trước khi lên API.

### Giai đoạn 3: Viết integration test cho API

Mục đích là xác nhận controller/service hoạt động đúng qua HTTP.

Ưu tiên test:

- `/auth/login`, `/auth/me/permissions`.
- `/users/*`, `/organizations/*`.
- `/ctxh/*` và các API import/validate.
- `/templates/*`, `/submissions/*`.
- `/api/ctxh-chat/*`.

Kết quả mong đợi:

- API trả đúng status code.
- Response có đúng schema/hợp đồng.
- Sai quyền, sai dữ liệu, thiếu dữ liệu đều trả lỗi hợp lý.

### Giai đoạn 4: Bổ sung test cho chatbot RAG

Mục đích là kiểm thử phần có tính sinh ngẫu nhiên bằng cách giảm phụ thuộc vào output của mô hình.

Đầu việc:

- Mock LLM để test luồng xử lý.
- Test retriever, memory, ingestion pipeline bằng dữ liệu giả lập.
- Test history/session behavior.

Kết quả mong đợi:

- Có test ổn định cho các service chatbot mà không phụ thuộc hoàn toàn vào đầu ra sinh tự do.

### Giai đoạn 5: Frontend test tối thiểu

Mục đích là tăng độ tin cậy cho giao diện ở các màn hình quan trọng.

Ưu tiên test:

- Component render theo role/permission.
- Form validation.
- Luồng submit và hiển thị trạng thái loading/error.

Kết quả mong đợi:

- Giao diện quan trọng không bị lỗi render hoặc mất tương tác cơ bản sau khi sửa code.

### Giai đoạn 6: Manual test và regression test

Mục đích là xác nhận lại các luồng quan trọng bằng thao tác thực.

Đầu việc:

- Đăng nhập và phân quyền.
- Tạo/cập nhật/xóa dữ liệu.
- Import dữ liệu lớn.
- Submit biểu mẫu.
- Gửi câu hỏi chatbot và kiểm tra history.

Kết quả mong đợi:

- Có danh sách test case thủ công để đưa vào báo cáo luận văn.

## 5. Danh mục test case ưu tiên

### Mức cao

- Đăng nhập thành công và thất bại.
- Phân quyền truy cập menu/chức năng.
- Tạo, cập nhật, xóa mềm người dùng.
- Tạo tổ chức và truy vấn cây tổ chức.
- Import dữ liệu hợp lệ và không hợp lệ.
- Tạo hoạt động CTXH và cập nhật trạng thái.
- Tạo chiến dịch thu phí và đồng bộ trạng thái thanh toán.
- Upload template, tạo submission, sinh file đầu ra.
- Gửi message đến chatbot và lấy history.

### Mức trung bình

- Lọc, tìm kiếm, phân trang.
- Validate form và field động.
- Kiểm tra xử lý lỗi từ API.
- Kiểm tra download file và public URL.

### Mức thấp

- Những màn hình chỉ mang tính hiển thị.
- Các nhánh hiếm hoặc ít ảnh hưởng đến nghiệp vụ lõi.

## 6. Thứ tự thực hiện

1. Chốt phạm vi test cần triển khai trước.
2. Kiểm tra lại cấu hình Jest hiện tại của backend.
3. Viết unit test cho module có logic phức tạp nhất.
4. Viết integration test cho các API lõi.
5. Bổ sung test cho chatbot RAG bằng mock.
6. Thêm test tối thiểu cho frontend nếu cần.
7. Chạy regression test toàn bộ trước khi chốt báo cáo.

## 7. Đầu ra mong đợi

Sau khi triển khai xong, cần có các đầu ra sau:

- Bộ test backend chạy tự động bằng Jest.
- Bộ test API bằng supertest.
- Một số test cho chatbot RAG sử dụng mock để tái lập được.
- Checklist manual testing cho các luồng chính.
- Số liệu đủ để mô tả trong phần kiểm thử của luận văn.

## 8. Tiêu chí hoàn thành

Kế hoạch được xem là hoàn thành khi:

- Các luồng nghiệp vụ lõi có test tự động tương ứng.
- Test chạy ổn định trên môi trường dev local.
- Không còn lỗi hồi quy ở các API quan trọng sau khi chỉnh sửa.
- Có thể trích dẫn kết quả test vào phần kiểm thử của báo cáo.

## 9. Ghi chú triển khai

- Backend hiện đã có sẵn nền tảng Jest nên có thể triển khai ngay, không cần thay đổi kiến trúc lớn.
- Frontend có thể làm sau nếu thời gian hạn chế.
- Phần chatbot nên ưu tiên mock thay vì phụ thuộc vào LLM thật để tránh test không ổn định.
