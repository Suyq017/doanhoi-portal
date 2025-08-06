# Fix: Smart Organization Membership Removal

## Vấn đề

Khi xóa user khỏi tổ chức con trong EditUserModal, hệ thống cũng xóa user khỏi tổ chức cha, ngay cả khi user vẫn cần ở tổ chức cha vì lý do khác.

## Nguyên nhân

- Backend API `removeUserFromOrganizationSafely` có thể đang xóa user khỏi cả parent organizations
- Frontend không kiểm tra xem user có còn cần ở parent organization không

## Giải pháp

### 1. Thay đổi API call
- Thay từ `removeUserFromOrganizationSafely` sang `removeUserFromOrganization` 
- API thường chỉ xóa user khỏi organization cụ thể, không ảnh hưởng đến parent

### 2. Thêm logic kiểm tra Parent-Child relationship

**Helper functions mới:**
- `filterSafeToRemoveOrganizations()`: Lọc ra các organizations an toàn để xóa
- `isParentOfAnyOrganization()`: Kiểm tra org A có phải parent của bất kỳ org nào trong list không
- `isParentOfOrganization()`: Kiểm tra org A có phải parent của org B không

**Logic mới:**
1. Khi user bị xóa khỏi organization, kiểm tra xem organization đó có phải parent của organization nào còn lại không
2. Nếu có → Giữ lại user ở parent organization
3. Nếu không → An toàn để xóa user khỏi organization đó

## Ví dụ

### Trước đây:
```
User ban đầu: [ROOT, Khoa A, Lớp A1]
User xóa: [Lớp A1] 
Kết quả: [ROOT] (mất luôn Khoa A)
```

### Bây giờ:
```
User ban đầu: [ROOT, Khoa A, Lớp A1] 
User xóa: [Lớp A1]
Logic kiểm tra: Khoa A có phải parent của Lớp A1? → Có → Giữ lại
Kết quả: [ROOT, Khoa A] (giữ nguyên Khoa A)
```

### Trường hợp khác:
```
User ban đầu: [ROOT, Khoa A, Khoa B, Lớp B1]
User xóa: [Khoa A]
Logic kiểm tra: Khoa A có phải parent của [Khoa B, Lớp B1]? → Không → An toàn xóa
Kết quả: [ROOT, Khoa B, Lớp B1]
```

## Code Changes

### handleOrganizationMembershipUpdate()
- Thêm `filterSafeToRemoveOrganizations()` để lọc organizations an toàn
- Thay `removeUserFromOrganizationSafely` → `removeUserFromOrganization`
- Cải thiện success message để hiển thị số organizations được giữ lại

### New Helper Functions
```typescript
filterSafeToRemoveOrganizations(orgsToRemove, selectedOrgIds): Promise<string[]>
isParentOfAnyOrganization(parentOrgId, childOrgIds): Promise<boolean>  
isParentOfOrganization(parentOrgId, childOrgId): Promise<boolean>
```

## Benefits

1. **Bảo toàn dữ liệu**: User không bị xóa khỏi parent organizations cần thiết
2. **Logic rõ ràng**: Chỉ xóa khi thực sự an toàn
3. **User experience tốt**: Feedback rõ ràng về những gì được giữ lại
4. **Tương thích ngược**: Không ảnh hưởng đến logic add organizations

## Testing

### Test cases cần kiểm tra:

1. **Xóa tổ chức con:**
   - User: [ROOT, Khoa A, Lớp A1]
   - Xóa: Lớp A1
   - Expected: [ROOT, Khoa A]

2. **Xóa tổ chức không có con:**
   - User: [ROOT, Khoa A, Khoa B] 
   - Xóa: Khoa A
   - Expected: [ROOT, Khoa B]

3. **Xóa nhiều tổ chức:**
   - User: [ROOT, Khoa A, Lớp A1, Lớp A2]
   - Xóa: Lớp A1, Lớp A2
   - Expected: [ROOT, Khoa A] (Khoa A được giữ vì là parent)

4. **Xóa tất cả con của parent:**
   - User: [ROOT, Khoa A, Lớp A1]
   - Xóa: Khoa A, Lớp A1
   - Expected: [ROOT] (cả 2 đều bị xóa vì không còn child relationship)

## Notes

- Logic kiểm tra parent-child dựa trên `parentId` field trong organization data
- Sử dụng traversal algorithm để check ancestor relationship
- Performance: O(n*m*d) với n=orgs to remove, m=selected orgs, d=depth của org tree
- Có thể optimize bằng cách cache organization tree nếu cần thiết
