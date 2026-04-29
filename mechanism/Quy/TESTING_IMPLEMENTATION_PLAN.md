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

## 10. Tiến độ thực tế (cập nhật đến 29/04/2026)

### 10.1 Trạng thái tổng quan

- Đã tạo và sử dụng nhánh triển khai kiểm thử riêng (`testing`).
- Đã triển khai nhiều vòng test backend non-chat theo hướng unit/service-level với mock repository và mock dependency.
- Đã chạy thành công bộ `test:cov` sau mỗi đợt mở rộng test.
- Đã tập trung mở rộng test cho các service "gap" thấp nhất (payment-campaign-payos-config từ 29.75%).
- Đã ưu tiên xử lý các điểm yếu nhỏ nhưng 0% coverage như `metrics.service.ts` để lấy nhanh ROI kiểm thử.

### 10.2 Kết quả định lượng hiện tại

- Tổng số test suite backend đang pass: `63` (NON-ctxh-chat).
- Tổng số test case backend đang pass: `678`.
- Coverage statements backend hiện tại: `51.09%` (NON-ctxh-chat, target 70%).
- Coverage branches: `48.86%`.
- Coverage functions: `49.72%`.
- Coverage lines: `51.09%`.

### 10.3 Những phần đã hiện thực (cập nhật vòng mới)

**Mới bơm thêm trong vòng này (29/04/2026 - tiếp tục):**

- **organizations/services/__tests__/batch-import.service.spec.ts**: Thêm 1 test case cho nhánh rollback transaction khi sub-batch fail
  - Test `processBatch` khi `processSubBatch` ném lỗi → rollback, release connection, record error vào session
  
- **organizations/__tests__/organization-import.service.spec.ts**: Thêm 2 test cases cho nhánh invalid records và skipErrors flow
  - Test `executeImport` reject khi có invalid records và skipErrors = false
  - Test `executeImport` skip invalid rows và dedupe existing members khi skipErrors = true
  
- **organizations/__tests__/organizations.service.spec.ts**: Thêm 1 test case cho nhánh recursive member removal với child organizations
  - Test `removeMember` recursive: xóa từ parent → xóa từ child → dừng khi không còn children

- **users/__tests__/users.controller.spec.ts**: Thêm 28 controller tests covering CRUD, template download, import session, batch import, and error handling paths.
- **dashboard/__tests__/dashboard.service.spec.ts**: Thêm 2 S3 statistics tests covering success path với và không có custom endpoint.

**Mới bơm thêm trong vòng này (trước):**

- **common/middleware/clean-empty-strings.middleware.spec.ts**: `17` test cases, coverage `100%`
	- Test recursive normalization của body request với string rỗng, whitespace-only, nested object, array, null, number, boolean

- **classes/services/__tests__/import.service.spec.ts**: thêm 2 test cases cho nhánh lỗi simple import và trạng thái batch bị pause
	- Test `executeSimpleImport` khi `performImport` ném lỗi, update session với result thất bại
	- Test `performBatchImport` dừng sớm khi session đang paused

- **export/__tests__/export.controller.spec.ts**: thêm 4 test cases cho nhánh happy path và error path của export controller
	- Test `exportUsers` happy path với setHeader/send
	- Test `exportUsers` wrap lỗi thành `BAD_REQUEST`
	- Test `exportOrganizationMembers` trả `NOT_FOUND` khi thiếu tổ chức
	- Test `exportPaymentAssignments` trả `BAD_REQUEST` khi lỗi không phải thiếu dữ liệu

- **organizations/__tests__/organizations.service.spec.ts**: thêm test cho nhánh `removeMember` khi membership tồn tại và không có child organizations
	- Test `removeMember` xóa membership hiện có và dừng khi không có children

- **departments/services/import.service.spec.ts**: mở rộng thêm branch coverage cho luồng import nghiệp vụ
	- Test `performImport` cho normalize dữ liệu, duplicate conflict, skipConflicts, save failure
	- Test `processBatchData` cho queryRunner path, bulk insert success/failure
	- Test `resumeImport`/`continueBatchImport` và fallback batch recovery

- **organizations/services/batch-import.service.spec.ts**: thêm 7 test cases cho luồng batch import thành viên tổ chức
	- Test guard `level` / `organizationId`, validation branches, skip duplicate active, reactivate inactive, bulk add dedupe, cleanup session

- **users/services/import.service.spec.ts**: thêm 5 test cases cho luồng import người dùng
	- Test upload file rỗng dữ liệu, executeImport với batchSize truyền vào, generateTemplate, getSystemHealth, và các nhánh trạng thái liên quan

- **roles/__tests__/roles.service.spec.ts**: thêm 2 test cases cho nhánh xóa và seed mặc định
	- Test remove không có assignment liên kết và seedDefaultPermissions/seedDefaultRoles khi repository rỗng

- **metrics.service.spec.ts**: Mở rộng từ 2 → **3 test cases**, coverage từ 0% → **100%**
	- Test HTTP request metrics cả đường thành công lẫn nhánh lỗi `try/catch`
	- Test database query timing, import session counters, org validation duration, batch size, và DB connection gauge

- **payment-campaign-payos-config.service.spec.ts**: Mở rộng từ 2 → **31 test cases**, coverage từ 29.75% → **93.38%** (↑ +63.63%)
  - Test suite: createConfig (6 tests), getConfig (3 tests), getEffectiveConfig (5 tests), updateConfig (4 tests), toggleActive, createPayOSInstance, createOrUpdateConfig, deleteConfig
  - Validation paths, multi-level org fallback, cache clearing, error handling

- **payment-history.service.spec.ts**: Mở rộng từ 2 → **18 test cases**
  - Test suite: createPaymentRecord, findByOrderCode, updatePaymentStatus (with PAID/CANCELLED transitions), findByAssignmentId, findById, findAll, getPaymentHistoryByCampaign (với pagination, status filter, search filtering)
  - QueryBuilder mock pattern: select, addSelect, where, andWhere, groupBy, getCount, skip, take, getMany, orderBy

- **payment-fee-level.service.spec.ts**: Mở rộng từ 4 → **9 test cases**
  - Test suite: findByCampaign (pagination), findOne (success/error), remove (with/without assignment guard), create validation
  - Tất cả public methods đều được cover

**Đã thực hiện trước đó:**
- Bộ test cho: auth, users, organizations, departments, classes, roles, dashboard, metrics, templates, submissions, export, aws-config, payos, payment-assignment, payment-campaign, payment-admin, limit-config
- Controller-level tests cho: organizations, roles, payment-assignment, payment-admin, payment-fee-level, payment-campaign-payos-config
- Integration HTTP tests cho: auth login, users lookup, organizations tree, payment export

### 10.4 Trạng thái cảnh báo/lỗi khi chạy test

- ✅ Tất cả 77 test suites đang pass, không có lỗi.
- Cảnh báo `ts-jest` về `hybrid module kind` đã được xử lý.
- Một số `console.log`/`console.error` từ code nghiệp vụ vẫn xuất hiện nhưng không ảnh hưởng test result.
- Ở các test có expected error path, đã mock logger để giảm nhiễu đầu ra.

### 10.5 Cập nhật chi tiết vòng mở rộng gần nhất

**Phân tích gap coverage:**
- payment-campaign-payos-config.service đã là 29.75% (CRITICAL GAP LOWEST) → **mở rộng toàn bộ logic** → 93.38%
- payment-history.service đã là 51.51% → mở rộng tất cả 7 methods + QueryBuilder filtering → improvement đáng kể
- payment-fee-level.service đã là 91.17% → mở rộng 5 methods còn thiếu → cơ bản cover all paths

**Test case patterns sử dụng:**
- Repository mock factory với `.mockReturnThis()` cho QueryBuilder chains
- Mock `.find()`, `.findOne()`, `.save()`, `.create()`, `.remove()`, `.createQueryBuilder()`
- Multi-level where/andWhere/groupBy/skip/take/getCount/getMany mocking
- Validation path testing (NotFoundException, BadRequestException, etc.)
- Transaction/error handling paths

**Lessons learned:**
- Organizations.service quá phức tạp (dùng `repository.manager.getTreeRepository()`) → không thể mock dễ, cần strategy khác
- QueryBuilder mock pattern `mockReturnThis()` rất hiệu quả cho payment modules
- Focusing on lowest-coverage services trước cung cấp ROI tốt (29.75% → 93.38% trong 1 vòng)

### 10.6 Kết quả định lượng mới nhất

- Lệnh xác nhận gần nhất: `npm run test:cov`.
- Test suites: `77/77` pass.
- Test cases: `834/834` pass (↑ từ 729 trong vòng trước).
- Coverage toàn backend hiện tại:
	- Statements: `62.36%` (↑ từ 61.68%, gap còn 7.64% tới target 70%).
	- Branches: `56.3%`.
	- Functions: `60.2%`.
	- Lines: `62.45%`.

## 11. Hướng tiếp tục triển khai (target 70% coverage)

### 11.1 Mục tiêu vòng kế tiếp

- Tăng coverage từ 62.36% → 70%, nhưng không đánh đổi chất lượng test chỉ để lấy số.
- Ưu tiên branch coverage, error paths, boundary values, và state transitions hơn là chỉ thêm test happy path.
- Bỏ qua `organizations.service` tạm thời (42.32%, quá phức tạp, cần manager mocking riêng).
- Không triển khai test cho `ctxh-chat` ở vòng này theo yêu cầu hiện tại.

### 11.2 Danh sách candidates theo coverage current

**High Priority (70-90% coverage, easy +2-5%):**
- `payment-campaign.service` (83.87%) → test `update`, `canDelete`, `activate`, `cancel` paths
- `payment-admin.controller` (98% now) → already mostly covered; minor branches only
- `payment-assignment.controller` (low branches) → error/edge branch coverage

**Medium Priority (50-70% coverage, +3-8%):**

### 11.3 Chiến lược bổ sung cho ctxh-chat

- Ưu tiên các file thuần hoặc ít phụ thuộc để lấy coverage rẻ trước: `google-genai-embeddings.ts`, `rate-limit.interceptor.ts`, `chat.dto.ts`, các file index/export.
- Mock hoàn toàn Google GenAI và Redis; không kéo MCP, RAG chain, hay LLM thật vào unit test.
- Mục tiêu vòng chatbot đầu tiên là chuyển các file 0% quan trọng sang có coverage nền tảng, rồi mới mở rộng dần sang controller/service nếu còn ROI tốt.
- Đã hiện thực bước đầu cho đúng chiến lược này bằng 3 spec mới: `google-genai-embeddings.spec.ts`, `rate-limit.interceptor.spec.ts`, `chat.dto.spec.ts`.
- `payment-history.service` (estimated 60-65% after expansion) → refine QueryBuilder edge cases
- `users.service` (47.36%) → test validation, batch import, permission filtering
- `export.service` (should be high already, refine filter branches)

**Lower Priority (0-40%, high effort):**
- `organizations.service` (42.32%, 1000+ LOC, needs manager mock strategy)
- `ctxh-import.service` (need to check %, likely low)
- Các service với 5-20% coverage nhưng lớn

### 11.3 Suggested test order

1. **payment-campaign.service**: +2-3% (quick expansion)
2. **users.service**: +2-4% (batch logic, validation paths)
3. **payment-assignment / payment-campaign controllers**: +1-2% (edge branches)
4. **export.service refinement**: +1-2% (additional filter branches)
5. **Check coverage after batch**: `npm run test:cov` → measure delta
6. **Iterate on next batch** if still < 70%

### 11.4 Quality checklist before accepting a test batch

- Test must assert a meaningful outcome, not only call the method.
- Every new batch should include at least one failure/edge path.
- For services, verify state change, repository calls, or returned DTO shape.
- For controllers, verify status/message/payload and invalid input handling.
- Avoid adding tests that only increase statements without improving branch coverage.

## 12. Cập nhật nhanh — 29/04/2026 (late session)

**Session hiện tại (ongoing):**
- Mục tiêu: Expand weak services identified (users 47.36%, export, payment-admin/campaign)
- Đã hoàn thành:
  - **organizations.services.batch-import.service.spec.ts**: +1 test for transaction rollback error path (8 tests total)
  - **organizations.__tests__.organization-import.service.spec.ts**: +2 tests for invalid records flow (8 tests total)
  - **organizations.__tests__.organizations.service.spec.ts**: +1 test for recursive member removal (9 tests total)
  - **users.__tests__.users.service.spec.ts**: +10 tests covering:
    - lastLogin timestamp on refresh token update
    - findByEmail with relation loading
    - birthDate conversion during create/update
    - blank role IDs skipping in legacy assignment
    - Basic field updates without role changes
  - Total this session: **+14 new tests** (all pass locally)
- Status after changes:
  - `npm test --testPathIgnorePatterns="ctxh"`: **62 suites, 648 tests, ALL PASS** ✅
  - Coverage (NON-ctxh-chat): 64.55% statements, 58.39% branches, 62.52% functions
  - ctxh-chat has 6 suites failing due to MCP SDK module resolution (known issue, out of scope this session)
- Bước tiếp theo:
  - Focus trên export.service, payment-campaign, payment-admin để reach +0.5-1% coverage
  - OR shift to simpler edge cases ở roles, dashboard nếu lower hanging fruit

---

## 12a. Cập nhật cũ — 29/04/2026 (earlier)

- Tình trạng hiện tại: Hoàn thành vòng mở rộng lớn cho 3 services payment: payment-campaign-payos-config, payment-history, payment-fee-level.
- Kết quả ổn định: `npm run test:cov` chạy pass toàn bộ 839 tests ở 77 suites; coverage statements tăng từ 61.68% → 62.4% (gap còn 7.6% tới 70%).
- Việc đã làm ngày hôm nay:
	- Hoàn thiện test cho `payment-campaign-payos-config.service.ts`: 2 → **31 tests**, 29.75% → **93.38% coverage** (fill critical gap)
	- Mở rộng test cho `payment-history.service.ts`: 2 → **18 tests**, covering tất cả 7 methods + QueryBuilder filter branches
	- Bổ sung test cho `payment-fee-level.service.ts`: 4 → **9 tests**, cover all public methods + cascade delete guard
	- Bổ sung test cho `payment-campaign.service.ts`: +25 tests, branch coverage up, `getStatistics`/`canDelete`/`remove`/`activate`/`cancel` paths
	- Bổ sung test cho `payment-admin.controller.ts`: +18 tests, all endpoint/error branches
	- Bổ sung test cho `payment-assignment.controller.ts`: +13 tests, pagination/error/CRUD branches
	- Bổ sung test cho `users.service.ts`: +28 tests, default password / exact code / role validation / fallback update paths / org-assignment failure / empty roles / relation clearing
	- Total new tests added: **95 tests** ✅
- Bước tiếp theo (ngay): 
	- Tiếp tục expand `users.service` (47.36%) với batch import + validation paths cho +3-4%
	- Mở rộng `payment-campaign.controller` / `roles.controller` / `organizations.controller` nếu còn gap branch dễ lấy
	- Không làm `ctxh-chat` ở vòng này
	- Target tối thiểu: đạt 63-64% sau batch tiếp theo, sau đó iterate tới mốc 70%
