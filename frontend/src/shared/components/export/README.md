# Export Component Usage Guide

## Tổng quan

Các component export được thiết kế để có thể tái sử dụng cho việc xuất dữ liệu ra file Excel. Hệ thống bao gồm:

- `ExportModal`: Modal chính để chọn trường dữ liệu
- `ExportFieldSelector`: Component để chọn các trường
- `ExportButton`: Button component có thể tích hợp vào dropdown
- `useExport`: Hook để xử lý logic export
- `exportService`: Service để gọi API

## Cách sử dụng

### 1. Sử dụng ExportButton (Khuyến nghị)

```tsx
import { ExportButton } from '../../../shared/components/export';

// Trong organization page
<ExportButton
  organizationId="org-id"
  organizationName="Tên tổ chức"
  type="organization"
  buttonText="Xuất danh sách thành viên"
  onSuccess={(fileName) => console.log('Success:', fileName)}
  onError={(error) => console.error('Error:', error)}
/>

// Trong users page
<ExportButton
  type="users"
  buttonText="Xuất danh sách người dùng"
  onSuccess={(fileName) => console.log('Success:', fileName)}
  onError={(error) => console.error('Error:', error)}
/>
```

### 2. Sử dụng ExportModal trực tiếp

```tsx
import { ExportModal, useExport, USER_EXPORT_FIELDS } from '../../../shared/components/export';

const MyComponent = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { exportData } = useExport({
    organizationId: 'org-id',
    organizationName: 'Tên tổ chức',
  });

  const handleExport = async (fields: string[]) => {
    await exportData(fields, 'organization');
  };

  return (
    <>
      <button onClick={() => setIsModalOpen(true)}>
        Xuất dữ liệu
      </button>
      
      <ExportModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onExport={handleExport}
        title="Xuất danh sách thành viên"
        availableFields={USER_EXPORT_FIELDS}
      />
    </>
  );
};
```

### 3. Tích hợp vào dropdown

```tsx
// Trong dropdown menu
<div className="dropdown-menu">
  <ExportButton
    organizationId={organizationId}
    organizationName={organizationName}
    type="organization"
    buttonClassName="dropdown-item"
  />
</div>
```

## Cấu hình Export Fields

Để thêm hoặc sửa các trường có thể xuất, chỉnh sửa `USER_EXPORT_FIELDS` trong `export.types.ts`:

```tsx
export const USER_EXPORT_FIELDS: ExportField[] = [
  {
    key: 'newField',
    label: 'Trường mới',
    category: 'basic',
    description: 'Mô tả trường mới'
  },
  // ... các trường khác
];
```

## Props Reference

### ExportButton Props
- `organizationId?`: ID của tổ chức (dùng cho type="organization")
- `organizationName?`: Tên tổ chức (dùng trong tên file)
- `type?`: 'organization' | 'users' (mặc định: 'organization')
- `buttonText?`: Text hiển thị trên button
- `buttonClassName?`: CSS class cho button
- `onSuccess?`: Callback khi xuất thành công
- `onError?`: Callback khi có lỗi

### ExportModal Props
- `isOpen`: Trạng thái mở/đóng modal
- `onClose`: Callback khi đóng modal
- `onExport`: Callback khi xuất dữ liệu
- `title?`: Tiêu đề modal
- `description?`: Mô tả modal
- `availableFields`: Danh sách các trường có thể xuất

## API Requirements

Backend cần implement các endpoints sau:

- `POST /api/organizations/{id}/export/members` - Xuất thành viên tổ chức
- `POST /api/users/export` - Xuất danh sách người dùng

Request body:
```json
{
  "fields": ["code", "fullName", "email", "phone"],
  "format": "xlsx"
}
```

Response: File stream với headers phù hợp để download.
