# Features Documentation Index

Tài liệu mô tả chi tiết các features của Đoàn Hội Portal.

## Danh sách Features

| # | Feature | File | Mô tả |
|---|---------|------|-------|
| 01 | [Authentication](01-AUTH.md) | `01-AUTH.md` | Xác thực Google OAuth, quản lý session |
| 02 | [Dashboard](02-DASHBOARD.md) | `02-DASHBOARD.md` | Trang chủ với thống kê tổng quan |
| 03 | [Users](03-USERS.md) | `03-USERS.md` | Quản lý người dùng, import/export |
| 04 | [Permissions](04-PERMISSIONS.md) | `04-PERMISSIONS.md` | Quản lý roles và phân quyền RBAC |
| 05 | [Organizations](05-ORGANIZATIONS.md) | `05-ORGANIZATIONS.md` | Quản lý tổ chức theo cấu trúc cây |
| 06 | [CTXH](06-CTXH.md) | `06-CTXH.md` | Quản lý hoạt động công tác xã hội |
| 07 | [Templates](07-TEMPLATES.md) | `07-TEMPLATES.md` | Quản lý mẫu văn bản Word |
| 08 | [Fee Collection](08-FEE-COLLECTION.md) | `08-FEE-COLLECTION.md` | Quản lý thu phí với PayOS |
| 09 | [Student Reports](09-STUDENT-REPORTS.md) | `09-STUDENT-REPORTS.md` | Báo cáo CTXH sinh viên |
| 10 | [System Config](10-SYSTEM-CONFIG.md) | `10-SYSTEM-CONFIG.md` | Cấu hình hệ thống |
| 11 | [Classes](11-CLASSES.md) | `11-CLASSES.md` | Quản lý lớp học |
| 12 | [Departments](12-DEPARTMENTS.md) | `12-DEPARTMENTS.md` | Quản lý khoa/phòng ban |

## Cấu trúc tài liệu mỗi feature

Mỗi file documentation bao gồm các phần:

1. **Tổng quan** - Mô tả ngắn về feature
2. **Đường dẫn** - Cấu trúc thư mục trong source code
3. **Chức năng chính** - Danh sách các chức năng
4. **Types** - TypeScript interfaces và types
5. **Components** - Mô tả các React components
6. **API Endpoints** - Danh sách API calls
7. **Permissions** - Quyền hạn cần thiết
8. **Lưu ý kỹ thuật** - Notes về implementation

## Feature Dependencies

```
                    ┌─────────────┐
                    │    Auth     │
                    └──────┬──────┘
                           │
           ┌───────────────┼───────────────┐
           │               │               │
           ▼               ▼               ▼
    ┌────────────┐  ┌────────────┐  ┌────────────┐
    │   Users    │  │   Roles    │  │   Orgs     │
    └─────┬──────┘  └─────┬──────┘  └─────┬──────┘
          │               │               │
          └───────────────┴───────────────┘
                          │
          ┌───────────────┼───────────────┐
          │               │               │
          ▼               ▼               ▼
   ┌────────────┐  ┌────────────┐  ┌────────────┐
   │    CTXH    │  │ Templates  │  │ Fee Collect│
   └─────┬──────┘  └────────────┘  └────────────┘
          │
          ▼
   ┌────────────┐
   │ Std Reports│
   └────────────┘
```

## Tech Stack

- **Frontend**: React 18, TypeScript, TanStack Query, Tailwind CSS
- **Backend**: NestJS, TypeORM, PostgreSQL
- **Auth**: Google OAuth 2.0
- **Payment**: PayOS Integration
- **Storage**: AWS S3
- **Docs**: Word/DOCX processing

## Conventions

### Naming
- Pages: `*Page.tsx`
- Forms: `*Form.tsx`
- Tables: `*Table.tsx`
- Modals: `*Modal.tsx`
- Hooks: `use*.ts`
- Types: `*.types.ts` hoặc `types/index.ts`

### API Response
```typescript
interface ApiResponse<T> {
  data: T;
  message?: string;
}

interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
```

### Permission Naming
```
{module}.{action}

Examples:
- users.create
- users.update
- users.delete
- organizations.manage-members
```

## Quick Links

- [Backend Source](../../backend/src/)
- [Frontend Source](../../frontend/src/features/)
- [API Documentation](../testing/POSTMAN_SETUP.md)
- [Database Schema](../../backend/database.dbml)
