# Kế hoạch Refactor Trang Classes Frontend

## 📋 Tổng quan

### Mục tiêu
Refactor trang classes để có cấu trúc tương tự với trang user, đặc biệt tập trung vào:
- Thêm chức năng bulk delete giống trang user
- Cải tiến ImportModal để hiển thị toàn bộ dữ liệu trong bảng preview
- Tối ưu hóa cấu trúc code và tái sử dụng components

### Phạm vi thay đổi
- `frontend/src/features/classes/ClassesPage.tsx`
- `frontend/src/features/classes/components/BulkDeleteConfirmModal.tsx` (mới)
- `frontend/src/shared/services/classService.ts`
- `backend/src/classes/classes.controller.ts`
- `backend/src/classes/classes.service.ts`
- `backend/src/classes/dto/bulk-delete-classes.dto.ts` (mới)

## 🔧 Chi tiết thực hiện

### 1. Backend - Thêm chức năng Bulk Delete

#### 1.1 Tạo DTO cho bulk delete
**File**: `backend/src/classes/dto/bulk-delete-classes.dto.ts`

```typescript
import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsNotEmpty, IsString } from 'class-validator';

export class BulkDeleteClassesDto {
    @ApiProperty({
        description: 'Danh sách ID lớp học cần xóa',
        example: ['uuid1', 'uuid2', 'uuid3'],
        type: [String]
    })
    @IsArray()
    @IsNotEmpty()
    @IsString({ each: true })
    ids: string[];
}
```

#### 1.2 Cập nhật Classes Service
**File**: `backend/src/classes/classes.service.ts`

Thêm method:
```typescript
async bulkDelete(ids: string[]): Promise<void> {
    // Validate tất cả classes có tồn tại
    const classes = await this.classesRepository.findByIds(ids, {
        relations: ['students']
    });

    if (classes.length !== ids.length) {
        throw new BadRequestException('Some classes not found');
    }

    // Kiểm tra có class nào có students không
    const classesWithStudents = classes.filter(c => c.students && c.students.length > 0);
    if (classesWithStudents.length > 0) {
        throw new BadRequestException(
            `Cannot delete classes with students: ${classesWithStudents.map(c => c.name).join(', ')}`
        );
    }

    // Xóa bulk
    await this.classesRepository.remove(classes);
}
```

#### 1.3 Cập nhật Classes Controller
**File**: `backend/src/classes/classes.controller.ts`

Thêm endpoint:
```typescript
@Delete('bulk')
@ApiOperation({ summary: 'Xóa nhiều lớp học' })
@ApiResponse({ status: 200, description: 'Lớp học đã được xóa thành công' })
@ApiResponse({ status: 400, description: 'Không thể xóa lớp học có sinh viên' })
async bulkDelete(@Body() bulkDeleteDto: BulkDeleteClassesDto) {
    await this.classesService.bulkDelete(bulkDeleteDto.ids);
    return {
        message: `Đã xóa thành công ${bulkDeleteDto.ids.length} lớp học`,
        deletedCount: bulkDeleteDto.ids.length
    };
}
```

### 2. Frontend - Service Layer

#### 2.1 Cập nhật Class Service
**File**: `frontend/src/shared/services/classService.ts`

Thêm method:
```typescript
async bulkDeleteClasses(ids: string[]): Promise<void> {
    await this.request('/classes/bulk', {
        method: 'DELETE',
        body: JSON.stringify({ ids }),
    });
}
```

### 3. Frontend - Components

#### 3.1 Tạo BulkDeleteConfirmModal
**File**: `frontend/src/features/classes/components/BulkDeleteConfirmModal.tsx`

```typescript
import React from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { X, AlertTriangle } from 'lucide-react';

interface BulkDeleteConfirmModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    classCount: number;
    loading?: boolean;
    classesWithStudents?: string[]; // Danh sách tên classes có students
}

const BulkDeleteConfirmModal: React.FC<BulkDeleteConfirmModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    classCount,
    loading = false,
    classesWithStudents = []
}) => {
    const { t } = useTranslation(['classes', 'common']);

    if (!isOpen) return null;

    const hasClassesWithStudents = classesWithStudents.length > 0;

    return createPortal(
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex items-center">
                        <AlertTriangle className="w-6 h-6 mr-3 text-red-500" />
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                            {t('classes:bulkDelete.title', { defaultValue: 'Xóa nhiều lớp học' })}
                        </h3>
                    </div>
                    <button onClick={onClose} disabled={loading}>
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6">
                    <p className="text-gray-600 dark:text-gray-400 mb-4">
                        {t('classes:bulkDelete.message', {
                            count: classCount,
                            defaultValue: `Bạn có chắc chắn muốn xóa ${classCount} lớp học đã chọn?`
                        })}
                    </p>

                    {hasClassesWithStudents && (
                        <div className="mb-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                            <div className="flex items-start">
                                <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mt-0.5 mr-2" />
                                <div>
                                    <div className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                                        {t('classes:bulkDelete.hasStudentsWarning')}
                                    </div>
                                    <div className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                                        {classesWithStudents.join(', ')}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    <p className="text-sm text-red-600 dark:text-red-400">
                        {t('common:messages.confirm.deleteWarning')}
                    </p>
                </div>

                {/* Actions */}
                <div className="flex justify-end px-6 py-4 space-x-3 border-t border-gray-200 dark:border-gray-700">
                    <button
                        onClick={onClose}
                        disabled={loading}
                        className="px-4 py-2 text-gray-700 bg-gray-100 border border-gray-300 rounded-lg hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-600 disabled:opacity-50"
                    >
                        {t('common:actions.cancel')}
                    </button>
                    <button
                        onClick={onConfirm}
                        disabled={loading || hasClassesWithStudents}
                        className="flex items-center px-4 py-2 text-white bg-red-600 border border-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50"
                    >
                        {loading && (
                            <div className="w-4 h-4 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        )}
                        {t('common:actions.delete')} ({classCount})
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default BulkDeleteConfirmModal;
```

#### 3.2 Cập nhật ClassesPage
**File**: `frontend/src/features/classes/ClassesPage.tsx`

Thêm state và logic:
```typescript
// Thêm state cho bulk delete
const [selectedClassIds, setSelectedClassIds] = useState<string[]>([]);
const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);
const [isBulkDeleting, setIsBulkDeleting] = useState(false);

// Bulk selection handlers
const handleSelectAll = (checked: boolean) => {
    if (checked) {
        setSelectedClassIds(classes.map(c => c.id));
    } else {
        setSelectedClassIds([]);
    }
};

const handleSelectClass = (classId: string, checked: boolean) => {
    if (checked) {
        setSelectedClassIds(prev => [...prev, classId]);
    } else {
        setSelectedClassIds(prev => prev.filter(id => id !== classId));
    }
};

const handleBulkDelete = () => {
    setShowBulkDeleteModal(true);
};

const handleBulkDeleteConfirm = async () => {
    try {
        setIsBulkDeleting(true);
        await classService.bulkDeleteClasses(selectedClassIds);
        setShowBulkDeleteModal(false);
        setSelectedClassIds([]);
        await loadClasses();
        showSuccess(t('common:messages.success.bulkDelete', { 
            count: selectedClassIds.length 
        }));
    } catch (error: any) {
        if (error.message?.includes('students')) {
            showError(t('classes:messages.cannotDeleteClassesWithStudents'));
        } else {
            showError(t('common:messages.error.bulkDelete'));
        }
    } finally {
        setIsBulkDeleting(false);
    }
};

// Clear selection khi load data mới
useEffect(() => {
    setSelectedClassIds([]);
}, [classes]);
```

Cập nhật table để hỗ trợ selection:
```typescript
// Thêm vào header table
<th className="px-6 py-3 text-left">
    <input
        type="checkbox"
        checked={selectedClassIds.length === classes.length && classes.length > 0}
        onChange={(e) => handleSelectAll(e.target.checked)}
        className="rounded border-gray-300 text-doan-600 focus:ring-doan-500"
    />
</th>

// Thêm vào mỗi row
<td className="px-6 py-4 whitespace-nowrap">
    <input
        type="checkbox"
        checked={selectedClassIds.includes(classItem.id)}
        onChange={(e) => handleSelectClass(classItem.id, e.target.checked)}
        className="rounded border-gray-300 text-doan-600 focus:ring-doan-500"
    />
</td>
```

Thêm bulk action bar:
```typescript
{selectedClassIds.length > 0 && (
    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
        <div className="flex items-center justify-between">
            <div className="flex items-center">
                <span className="text-sm font-medium text-blue-800 dark:text-blue-200">
                    {t('common:messages.selected', { count: selectedClassIds.length })}
                </span>
                <button
                    onClick={() => setSelectedClassIds([])}
                    className="ml-3 text-blue-600 hover:text-blue-800 dark:text-blue-400"
                >
                    <X className="w-4 h-4" />
                </button>
            </div>
            <div className="flex items-center space-x-2">
                <button
                    onClick={handleBulkDelete}
                    className="flex items-center px-3 py-1.5 text-sm font-medium text-red-700 bg-red-100 border border-red-300 rounded-md hover:bg-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800"
                >
                    <Trash2 className="w-4 h-4 mr-1" />
                    {t('common:actions.delete')} ({selectedClassIds.length})
                </button>
            </div>
        </div>
    </div>
)}
```

### 4. Cải tiến ImportModal Preview

#### 4.1 Cập nhật ImportModal
**File**: `frontend/src/shared/components/ImportModal.tsx`

Trong phần hiển thị preview data, thay đổi từ hiển thị giới hạn sang hiển thị toàn bộ:

```typescript
// Thay vì giới hạn 10 rows như hiện tại
const displayRows = getDisplayRows(); // Hiển thị tất cả

// Thêm pagination cho preview nếu data quá lớn
const [previewPage, setPreviewPage] = useState(1);
const [previewLimit] = useState(50); // Hiển thị 50 rows mỗi page

const paginatedPreviewRows = displayRows.slice(
    (previewPage - 1) * previewLimit,
    previewPage * previewLimit
);

// Thêm pagination controls cho preview
{displayRows.length > previewLimit && (
    <div className="flex items-center justify-between mt-4">
        <span className="text-sm text-gray-600">
            Hiển thị {(previewPage - 1) * previewLimit + 1} - {Math.min(previewPage * previewLimit, displayRows.length)} của {displayRows.length} dòng
        </span>
        <div className="flex space-x-2">
            <button
                onClick={() => setPreviewPage(prev => Math.max(1, prev - 1))}
                disabled={previewPage === 1}
                className="px-3 py-1 text-sm border rounded disabled:opacity-50"
            >
                Trước
            </button>
            <button
                onClick={() => setPreviewPage(prev => Math.min(Math.ceil(displayRows.length / previewLimit), prev + 1))}
                disabled={previewPage >= Math.ceil(displayRows.length / previewLimit)}
                className="px-3 py-1 text-sm border rounded disabled:opacity-50"
            >
                Sau
            </button>
        </div>
    </div>
)}
```

### 5. Translation Updates

#### 5.1 Cập nhật classes.json
Thêm keys cho bulk delete:

```json
{
  "bulkDelete": {
    "title": "Xóa nhiều lớp học",
    "message": "Bạn có chắc chắn muốn xóa {{count}} lớp học đã chọn?",
    "hasStudentsWarning": "Các lớp học sau có sinh viên và không thể xóa:"
  },
  "messages": {
    "cannotDeleteClassesWithStudents": "Không thể xóa các lớp học có sinh viên"
  }
}
```

#### 5.2 Cập nhật common.json
```json
{
  "messages": {
    "selected": "Đã chọn {{count}} mục",
    "success": {
      "bulkDelete": "Đã xóa thành công {{count}} mục"
    },
    "error": {
      "bulkDelete": "Có lỗi xảy ra khi xóa nhiều mục"
    }
  }
}
```

## 📊 Lợi ích đạt được

### 1. Tính năng mới
- ✅ Bulk delete cho classes với validation business logic
- ✅ Preview toàn bộ dữ liệu trong ImportModal với pagination
- ✅ UI/UX nhất quán với trang user

### 2. Tối ưu hóa
- ✅ Tái sử dụng pattern từ UserPage
- ✅ Code structure cải thiện
- ✅ Error handling tốt hơn
- ✅ Translation keys chuẩn hóa

### 3. Trải nghiệm người dùng
- ✅ Bulk operations hiệu quả
- ✅ Preview data đầy đủ khi import
- ✅ Feedback rõ ràng khi có lỗi
- ✅ Loading states và confirmation

## 🧪 Testing Checklist

### Backend Testing
- [ ] Test bulk delete API với valid data
- [ ] Test bulk delete với classes có students
- [ ] Test bulk delete với invalid IDs
- [ ] Test performance với số lượng lớn

### Frontend Testing
- [ ] Test bulk selection/deselection
- [ ] Test bulk delete flow hoàn chình
- [ ] Test ImportModal preview pagination
- [ ] Test error handling và messages
- [ ] Test responsive design
- [ ] Test loading states

### Integration Testing
- [ ] Test full workflow từ selection đến deletion
- [ ] Test import workflow với preview đầy đủ
- [ ] Test error scenarios
- [ ] Test translation keys

## 🚀 Thứ tự triển khai

### Phase 1: Backend (1-2 ngày)
1. Tạo BulkDeleteClassesDto
2. Implement bulk delete service method
3. Thêm bulk delete endpoint
4. Test API endpoints

### Phase 2: Frontend Core (2-3 ngày)
1. Cập nhật classService
2. Tạo BulkDeleteConfirmModal
3. Cập nhật ClassesPage với bulk functionality
4. Test bulk delete flow

### Phase 3: ImportModal Enhancement (1-2 ngày)
1. Cập nhật ImportModal preview
2. Thêm pagination cho preview
3. Test import workflow

### Phase 4: Polish & Testing (1 ngày)
1. Cập nhật translations
2. Test toàn bộ functionality
3. Fix bugs và UI issues
4. Documentation

## 📝 Lưu ý quan trọng

### Validation Business Logic
- Classes có students không thể xóa
- Bulk delete phải validate từng class riêng lẻ
- Error messages phải rõ ràng về lý do không thể xóa

### Performance Considerations
- Bulk operations cần optimize cho dataset lớn
- Preview pagination để tránh render quá nhiều rows
- Loading states cho UX tốt hơn

### Consistency với User Page
- UI/UX pattern giống nhau
- Error handling tương tự
- Translation key structure nhất quán
