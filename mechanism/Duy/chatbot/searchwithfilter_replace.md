# Plan: Replace `search_with_filters` Vector JSONB Filtering với MCP SQL

## Context

Hiện tại khi LLM chọn tool `search_with_filters`, pipeline chạy:
1. **LLM call**: `CtxhFilterExtractionService.extractFilters()` trích xuất `MetadataFilters` (org, date, status, location)  
2. **Vector store SQL**: `similaritySearchWithMetadataFilters()` build WHERE clauses trên JSONB column `metadata` của bảng `ctxh_embeddings`

Vấn đề của cách hiện tại:
- Filter so sánh trên JSONB metadata (`metadata->>'organizationName' ILIKE ...`) — không reliable, phụ thuộc vào metadata trong embeddings phải đồng bộ với data thực
- Dữ liệu lọc theo JOINs thực tế (organizations, ctxh_category) không được dùng — chỉ dùng snapshot trong JSONB
- `filter-extraction.prompt.ts` là 1 LLM call thêm cho mỗi query

**Mục tiêu**: Khi `search_with_filters` được chọn và filters không rỗng → query trực tiếp `ctxh_activity` qua MCP SQL (giống pattern của `McpSqlFallbackService`) thay vì qua vector store JSONB metadata filtering.

---

## Approach

### Bước 1 — Thêm `filteredSearch()` vào `McpSqlFallbackService`

**File**: `backend/src/ctxh-chat/services/mcp-sql-fallback.service.ts`

Thêm method mới:

```typescript
async filteredSearch(
  filters: MetadataFilters,
  limit: number = 10,
  currentDate: string = new Date().toISOString().split('T')[0],
): Promise<Document[]>
```

Import cần thêm:
- `MetadataFilters` từ `../dto/filter-extraction.dto`
- `getSearchTermsForLocation` từ `../constants/location.constants` (expand location aliases)

**SQL structure**:
```sql
SELECT
  ca.id AS activity_id, ca.name AS activity_name, ca.status,
  ca.start_date, ca.end_date, ca.location, ca.total_days,
  ca.requires_approval, ca.max_participants,
  org.name AS organization_name, cat.name AS category_name,
  ca.description
FROM ctxh_activity ca
LEFT JOIN organizations org ON org.id = ca.organization_id
LEFT JOIN ctxh_category cat ON cat.id = ca.category_id
WHERE ca.deleted_at IS NULL
  AND ca.status IN ('ACTIVE', 'DRAFT')
  [status clauses]
  [date range clauses]
  [organization clauses]
  [location clauses]
ORDER BY ca.start_date ASC
LIMIT ${limit}
```

**WHERE clause builder** (private helper `buildFilteredWhereClause(filters, currentDate)`):

| Filter field | SQL condition |
|---|---|
| `status=['ongoing']` | `AND ca.start_date <= '${d}' AND ca.end_date >= '${d}'` |
| `status=['upcoming']` | `AND ca.start_date > '${d}'` |
| `status=['ended']` | `AND (ca.status IN ('COMPLETED','CANCELLED') OR ca.end_date < '${d}')` |
| Multiple statuses | OR-gộp trong ngoặc |
| `dateRange.startDate` + `endDate` | `AND ca.end_date >= '${s}' AND ca.start_date <= '${e}'` (overlap logic) |
| `organizationKeywords` | `AND (org.name ILIKE '%kw1%' OR ...)` — escape `'` → `''` |
| `locationRaw` | Expand mỗi raw location qua `getSearchTermsForLocation()`, build `AND (ca.location ILIKE '%term1%' OR ...)` |

Nếu tất cả filter rỗng → trả `[]` ngay (caller sẽ fallback về vector store).

**Return format**: `Document[]` giống hệt `fallbackSearch()` — cùng metadata fields, dùng được với `McpMetadataEnricherService`, `extractActivitiesFromDocs`, `formatDocumentsAsContext`.

---

### Bước 2 — Sửa `retrieveDocuments()` trong `LangChainRagChainService`

**File**: `backend/src/ctxh-chat/services/langchain-rag-chain.service.ts`

Chỉ thay đổi block `else` (khi filters không rỗng), khoảng line 250–257:

```typescript
// Trước:
docs = await this.vectorStoreService.similaritySearchWithMetadataFilters(
  question, filters, topK, currentDate,
);

// Sau:
const mcpDocs = await this.mcpFallbackService.filteredSearch(filters, topK, currentDate);
if (mcpDocs.length > 0) {
  docs = mcpDocs;
} else {
  // Graceful fallback: MCP không connect hoặc trả 0 → dùng vector store
  docs = await this.vectorStoreService.similaritySearchWithMetadataFilters(
    question, filters, topK, currentDate,
  );
}
```

`mcpFallbackService.filteredSearch()` đã handle `!isConnected()` bên trong (trả `[]`), nên không cần check riêng.

---

## Files thay đổi

| File | Thay đổi |
|---|---|
| `backend/src/ctxh-chat/services/mcp-sql-fallback.service.ts` | Thêm `filteredSearch()` + helper `buildFilteredWhereClause()` |
| `backend/src/ctxh-chat/services/langchain-rag-chain.service.ts` | Sửa block else trong `retrieveDocuments()` (~3 dòng) |

**Không thay đổi**:
- `filter-extraction.prompt.ts` — vẫn chạy để extract filters
- `ctxh-filter-extraction.service.ts` — vẫn dùng `extractFilters()` + `resolveDateRange()`
- `langchain-vector-store.service.ts` — vẫn giữ `similaritySearchWithMetadataFilters()` làm fallback
- `rag-tools.ts`, module registration — không đổi

---

## Verification

1. Restart NestJS, đảm bảo MCP connected (`LOG: Discovered N MCP tools`)
2. Test `search_with_filters`:
   - "Hoạt động của khoa Máy tính" → SQL WHERE `org.name ILIKE '%Máy tính%'`
   - "Hoạt động ở cơ sở 1 tuần này" → SQL WHERE `ca.location ILIKE '%cs1%' OR '%cơ sở 1%' ...` + date range
   - "Hoạt động đang diễn ra của Đoàn trường" → status=ongoing + org=Đoàn trường
3. Kiểm tra log `[MCP FilteredSearch]` có rows trả về
4. Test fallback: dừng postgres-mcp → confirm vector store vẫn chạy được (0 kết quả MCP → fallback)