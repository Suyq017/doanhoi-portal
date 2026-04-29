# Testing / Coverage Summary

Cập nhật đến: 29/04/2026 (Late session)

## 1. Trạng thái hiện tại

- Phạm vi hiện tại: toàn backend NON-ctxh-chat (ctxh-chat có module resolution issues với MCP SDK).
- Lệnh xác nhận gần nhất: `npm test -- --testPathIgnorePatterns="ctxh"`
- Kết quả toàn bộ suite (NON-ctxh-chat) trong lần chạy gần nhất:
-  - Test suites: `63/63` pass (stable)
-  - Test cases: `678/678` pass (↑ từ 648 sau vòng users.controller + dashboard)
-  - Statements: `51.09%` (measured from fresh coverage-final.json with ctxh-chat excluded)
-  - Branches: `48.86%`
-  - Functions: `49.72%`
-  - Lines: `51.09%`

### Lưu ý ctxh-chat
- Hiện có 6 test suites ctxh-chat fail do module resolution errors với `@modelcontextprotocol/sdk`
- Lỗi: `Cannot find module '@modelcontextprotocol/sdk/client/index.js'`
- Nguyên nhân: Dependency missing hoặc build issue, không phải lỗi test code
- Impact: Đã exclude khỏi coverage metrics và test runs

## 2. What we tested

| Module | Loại test | Key functions / flow |
| --- | --- | --- |
| `auth.controller.ts` | Unit / controller-level | `login`, `refreshToken`, `logout`, `getProfile`, `getCurrentUserPermissions`, `googleAuthRedirect` |
| `classes.controller.ts` | Unit / controller-level | `create`, `findAll`, `downloadTemplate`, `bulkDelete`, import session endpoints |
| `payment-campaign.controller.ts` | Unit / controller-level | `create`, `findAll`, `getAccessibleOrganizations`, `findOne`, `update`, `remove`, lifecycle/statistics endpoints |
| `organizations.controller.ts` | Unit / controller-level | `findTree`, `getOrganizationByTypeCode`, `getAccessibleOrganizations`, member-management, import/validation endpoints |
| `roles.controller.ts` | Unit / controller-level | `findAll`, `findOne`, `create`, `update`, `remove`, `getUserRoles`, `assignRoles`, `seedDefaultRoles`, `grantRoles` |
| `payment-assignment.controller.ts` | Unit / controller-level | bulk create, list, statistics, `findOne`, `update`, mark paid/overdue, delete, overdue check |
| `payment-admin.controller.ts` | Unit / controller-level | status sync, history, delete check |
| `payment-fee-level.controller.ts` | Unit / controller-level | `create`, `findByCampaign`, `findOne`, `update`, `remove` |
| `payment-campaign-payos-config.controller.ts` | Unit / controller-level | `create`, `getConfig`, `getEffectiveConfig`, `update`, `delete`, `toggleStatus`, `testConnection` |
| `payment-campaign-payos-config.service.ts` | Unit / service-level | `create`, `getConfig`, `getEffectiveConfig`, `updateConfig`, `toggleActive`, `createPayOSInstance`, `createOrUpdateConfig`, `deleteConfig` — Coverage: **93.38%** (31 tests) |
| `payment-history.service.ts` | Unit / service-level | `createPaymentRecord`, `findByOrderCode`, `updatePaymentStatus`, `findByAssignmentId`, `findById`, `findAll`, `getPaymentHistoryByCampaign` — 18 tests with QueryBuilder mocks |
| `payment-fee-level.service.ts` | Unit / service-level | `create`, `findByCampaign`, `findOne`, `update`, `remove` (with assignment guard) — 9 tests covering all paths |
| `departments/services/import.service.ts` | Unit / service-level | upload/validate/execute import workflow, batch fallback, resume/cancel, conflict handling, bulk insert branches — Coverage: **83.19%** / **68.96% branch** |
| `common/middleware/clean-empty-strings.middleware.ts` | Unit / middleware-level | recursive empty-string normalization for request bodies — Coverage: **100%** |
| `metrics.service.ts` | Unit / service-level | HTTP request metrics, DB query timing, import session counters, org validation timing, DB connection gauges — 3 tests, Coverage: **100%** |
| `users/services/import.service.ts` | Unit / service-level | upload/validate/execute import workflow, async queueing, progress/status, template generation, batch fallback, parent/class organization creation — Coverage: **77.27%** / **68.18% branch** |
| `auth.controller.ts` | Integration / HTTP | `POST /auth/login` |
| `users.controller.ts` | Integration / HTTP | `GET /users/:id` |
| `organizations.controller.ts` | Integration / HTTP | `GET /organizations/tree` |
| `export.controller.ts` | Integration / HTTP | `POST /export/payment-assignments/:campaignId` |
| `export.service.ts` | Unit / service-level | `exportUsers`, `exportOrganizationMembers`, `exportPaymentAssignments`, `generateFileName` |
| `payment-campaign.service.ts` | Unit / service-level | `update`, `canDelete`, `activate`, `complete`, `cancel`, `getStatistics` |

### Test case counts

- `export.service.spec.ts`: `10` test cases pass.
- `payment-campaign.service.spec.ts` + `payment-campaign.service.extra.spec.ts`: `18` test cases pass.
- `payment-campaign-payos-config.service.spec.ts`: **31 test cases** pass (↑ from 2, coverage 93.38%).
- `payment-history.service.spec.ts`: **18 test cases** pass (↑ from 2, significant expansion).
- `payment-fee-level.service.spec.ts`: **9 test cases** pass (↑ from 4, all methods covered).
- `metrics.service.spec.ts`: `3` test cases pass (HTTP error branch + database/import metrics).
- `common/middleware/clean-empty-strings.middleware.spec.ts`: `17` test cases pass.
- `classes/services/__tests__/import.service.spec.ts`: `35` test cases pass.
- `export/__tests__/export.controller.spec.ts`: `4` test cases pass.
- `organizations/__tests__/organizations.service.spec.ts`: `8` test cases pass.
- `departments/services/__tests__/import.service.spec.ts`: `34` test cases pass.
- `organizations/services/__tests__/batch-import.service.spec.ts`: `7` test cases pass.
- `users/services/__tests__/import.service.spec.ts`: `43` test cases pass.
- `roles/__tests__/roles.service.spec.ts`: `28` test cases pass.
- `auth.controller.spec.ts`: `5` test cases pass.
- `classes.controller.spec.ts`: `2` test cases pass.
- `payment-campaign.controller.spec.ts`: `6` test cases pass.
- `organizations.controller.spec.ts`: `4` test cases pass.
- `roles.controller.spec.ts`: `3` test cases pass.
- `payment-assignment.controller.spec.ts`: `5` test cases pass.
- `payment-admin.controller.spec.ts`: `18` test cases pass.
- `payment-fee-level.controller.spec.ts`: `1` test case pass.
- `payment-campaign-payos-config.controller.spec.ts`: `4` test cases pass.
- `payment-assignment.controller.spec.ts`: `13` test cases pass.
- `users.service.spec.ts`: `28` test cases pass.
- `core-http.integration.spec.ts`: `1` integration test pass.

## 3. Error cases covered

### `export.service.ts`

- Không có user để export: `Không có dữ liệu để xuất`
- Organization không tồn tại: `Không tìm thấy tổ chức`
- Organization không có thành viên: `Tổ chức không có thành viên nào`
- Payment campaign không tồn tại: `Không tìm thấy đợt thu phí`
- Campaign không có phân công: `Đợt thu phí không có phân công nào`
- Payment history không tồn tại cho assignment: các cột thanh toán trả về rỗng, không crash
- Sheet name edge-cases: tên dài/ký tự xấu vẫn được rút gọn và loại ký tự không hợp lệ
- Filename normalization: tên file xuất ra chuẩn hóa theo ngày và tên tổ chức

### `payment-campaign.service.ts`

- Organization không tồn tại khi create: `NotFoundException`
- User không tồn tại khi create: `NotFoundException`
- Active campaign không cho phép đổi `organizationId` / `startDate`: `BadRequestException`
- Activate campaign không có fee level: `BadRequestException`
- Cancel campaign đã completed: `BadRequestException`
- Remove campaign đang active: `BadRequestException`
- `canDelete` với campaign active: trả về `canDelete: false` kèm reason
- `canDelete` với campaign không có assignment: trả về relatedData số 0
- `getStatistics` với raw query result: kiểm tra parse số và completion rate

### `payment-campaign-payos-config.service.ts` (NEW - 93.38% coverage)

- Campaign không tồn tại: `NotFoundException`
- Organization không tồn tại: `NotFoundException`
- User không tồn tại: `NotFoundException`
- Duplicate config cho campaign: detect existing config
- Validation error: invalid PayOS config data
- Database error handling: catch and re-throw
- `getEffectiveConfig` multi-level fallback: campaign → org level 1/2/3 → default
- `updateConfig`: success with cache clearing via manager
- `toggleActive`: status toggle success/error paths
- `createPayOSInstance`: factory method cho PayOS client
- `createOrUpdateConfig`: upsert logic success/error
- `deleteConfig`: remove success/not-found

### `payment-history.service.ts` (NEW - 18 comprehensive tests)

- `createPaymentRecord`: minimal data, full PayOS credentials
- `findByOrderCode`: found with relations, null return
- `updatePaymentStatus`: PAID/CANCELLED transitions, paid_at date handling
- `findByAssignmentId`: ordering success, empty array
- `findById`: relations success/error
- `findAll`: with full relations  
- `getPaymentHistoryByCampaign`: pagination, status filter, search (name/code/order code)

### `payment-fee-level.service.ts` (NEW - 9 tests)

- Campaign không tồn tại: `NotFoundException` on create
- `findByCampaign`: multiple levels, empty array
- `findOne`: success, `NotFoundException`
- `update`: partial data, undefined handling
- `remove`: blocked when used in assignments

### `departments/services/import.service.ts` (NEW - branch-heavy workflow coverage)

- `uploadFile`: missing file, non-Excel file, empty Excel, parser failure, happy path
- `validateData`: missing session, missing data, validation failure, preview generation
- `executeImport`: unvalidated session guard, missing validated data, batch vs non-batch execution, import failure handling
- `getImportProgress`: missing session, missing batch progress, percent calculation
- `pauseImport` / `resumeImport` / `cancelImport`: status guards and state transitions
- `performImport`: normalized empty fields, conflict skip, duplicate error, save failure
- `processBatchData`: queryRunner repository path, bulk insert success, bulk insert failure
- `performBatchImport`: fallback recovery path after batch failure

### `organizations/services/batch-import.service.ts` (NEW - batch import branch coverage)

- `processBatch`: invalid option guards, session init, empty final batch, session summary lookup
- `validateMemberData`: empty code, short code, missing class/unit code for Level 2
- `processMember`: skip duplicate active membership, reactivate inactive membership
- `bulkAddMembers`: duplicate filtering and bulk insert path
- `clearOldSessions`: cleanup of expired sessions

### Controller layer mới bơm thêm

- `organizations.controller.ts`: tree/lookup/member/import/validation/accessibility branches.
- `roles.controller.ts`: CRUD, lookup, assignment, seed defaults, grant roles.
- `payment-assignment.controller.ts`: create/list/statistics/update/mark paid/mark overdue/delete/overdue check.
- `payment-admin.controller.ts`: history validation, sync-status, delete-check.
- `payment-fee-level.controller.ts`: CRUD branches.
- `payment-campaign-payos-config.controller.ts`: CRUD, effective config, toggle status, test connection success/failure.
- `core-http.integration.spec.ts`: direct HTTP coverage for login, user lookup, organization tree, and payment assignment export.

### Controller layer trước đó đã bơm thêm

- `auth.controller.ts`: login / refresh / logout / profile / permissions / Google OAuth redirect branches.
- `classes.controller.ts`: create / list / detail / update / delete / bulk delete / import endpoints.
- `payment-campaign.controller.ts`: permission gate, accessible-orgs null vs non-null, lifecycle endpoints, stats endpoint.

## 4. Why branch coverage is still low

- Nhiều nhánh nằm trong QueryBuilder phụ thuộc permutations dữ liệu DB, nên cần test riêng cho từng clause optional.
- Một số module lớn vẫn chưa có QB mocks theo từng repo, nên branch ở phần filter/search/pagination chưa được kích hoạt đầy đủ.
- Các luồng tích hợp ngoài như S3, LLM, PayOS, import batch vẫn còn phụ thuộc mock chiến lược không đồng đều.

## 5. Quality gates for test review

Để tránh kiểu test “cho có coverage”, mỗi test mới nên đáp ứng ít nhất một trong các tiêu chí sau:

- Assert rõ hành vi quan trọng, không chỉ gọi function rồi dừng.
- Chứng minh được case success hoặc failure cụ thể, không dùng `expect(true).toBe(true)`.
- Cover edge cases: `null`, `undefined`, dữ liệu sai format, giá trị biên, danh sách rỗng.
- Ưu tiên branch logic và validation path hơn là chỉ test happy path.
- Nếu là controller/API, phải kiểm tra status / message / payload shape; nếu là service, phải kiểm tra state change hoặc call contract quan trọng.

Các vùng dễ bị hội đồng hỏi:

- Service có logic nghiệp vụ nhưng chỉ test controller.
- Test pass nhưng không chứng minh được nhánh lỗi hoặc guard.
- Branch coverage thấp hơn statements quá nhiều, đặc biệt ở các hàm `if/else`, QueryBuilder, validation và transition logic.

## 6. Next mitigation plan

1. Bơm tiếp các test QueryBuilder theo mô hình `mockReturnThis()` cho từng repo/cụm service.
2. Mở rộng test cho `payment`, `organizations`, `roles`, `payos`, và các controller/service còn 0% hoặc rất thấp.
3. Thêm integration test tối thiểu bằng `supertest` cho các endpoint lõi.
4. Tập trung bổ sung edge-case tests cho validation, boundary values, and error paths.
5. Chạy lại `npm run test:cov` sau mỗi batch lớn và lưu delta coverage.

## 7. Committee-facing answer template

Khi trình bày trước hội đồng, ưu tiên theo thứ tự:

1. What we tested: module + loại test + flow nghiệp vụ.
2. Error cases covered: exception/assert cụ thể.
3. Why branch coverage is low: data permutations, QueryBuilder clauses, external integrations.
4. Plan to close gaps: QB mocks, integration tests, edge-case coverage, iterative coverage runs.

## 8. Command snippets

```powershell
cd backend
npm test -- --runInBand --testPathPattern=export.service.spec.ts
npm test -- --runInBand --testPathPattern=payment-campaign.service
npm run test:cov
```
