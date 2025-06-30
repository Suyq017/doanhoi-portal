### **3. Translation Implementation:**

**Translation Keys cho Organizations:**
```typescript
// organizations.json
{
  // Chỉ định nghĩa keys đặc thù cho Organizations

}
```

**Sử dụng Common Keys:**
```typescript
// Component sử dụng multiple namespaces
const { t } = useTranslation(['organizations', 'common']);

// Dùng common keys cho actions, status, v.v.
<Button>{t('common:actions.view_details')}</Button>
<Button>{t('common:actions.add_member')}</Button>

// Chỉ dùng organizations namespace cho nội dung đặc thù
<h1>{t('organizations:title')}</h1>
<span>{t(`organizations:org_types.${org.type}`)}</span>
```

## 🚩 LƯU Ý QUAN TRỌNG

1. **Performance:**
   - Tìm kiếm bằng type và code nhanh hơn slug
   - Cần đánh index trên cột type và code để tối ưu

2. **UX:**
   - Breadcrumb và navigation phải nhất quán
   - Chuyển đổi giữa các cấp độ phải mượt mà
   - URL có ý nghĩa rõ ràng với type/code


### **Translation Keys - TUYỆT ĐỐI KHÔNG VI PHẠM:**
- ❌ **KHÔNG** tạo duplicate keys (save, cancel, loading, etc.)
- ✅ **CHỈ** tạo keys đặc thù cho organizations
- ✅ **SỬ DỤNG** common keys cho tất cả actions, states, messages chung
- ✅ **TUÂN THỦ** naming convention đã tối ưu

### **Code Pattern cho Translations:**
```typescript
// Component sử dụng multiple namespaces
const { t } = useTranslation(['organizations', 'common']);

// ĐÚNG: Dùng common keys cho actions chung
return (
  <>
    <Button>{t('common:actions.save')}</Button>
    <span>{t('common:statuses.loading')}</span>
    
    {/* ĐÚNG: Chỉ dùng namespace riêng cho nội dung đặc thù */}
    <h1>{t('organizations:title')}</h1>
    <span>{t(`organizations:org_types.${org.type}`)}</span>
  </>
);

// SAI: Tạo duplicate keys
// ❌ organizations:actions.save - KHÔNG TẠO KEY NÀY
// ❌ organizations:loading - KHÔNG TẠO KEY NÀY
```
