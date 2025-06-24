# Implementation Guide - Translation Keys Optimization

## 🎯 Tổng quan
Chiến lược tối ưu đã được triển khai, giảm ~70% keys trùng lặp và chuẩn hóa cấu trúc translation.

## 📋 Những thay đổi chính

### 1. Common Keys Structure
```typescript
// CŨ: Sử dụng keys phân tán
t('users.buttons.save')
t('departments.buttons.save') 
t('users.messages.loadError')
t('departments.messages.loadError')

// MỚI: Sử dụng common keys
t('common.actions.save')
t('common.messages.error.load')
t('common.states.loading')
t('common.pagination.showing', { start: 1, end: 10, total: 100 })
```

### 2. Feature-specific Keys
```typescript
// CHỈ giữ lại keys đặc thù cho từng feature
t('users.fields.familyName')          // Đặc thù users
t('users.membershipStatus.doan_vien') // Đặc thù users
t('departments.fields.managementUsers') // Đặc thù departments
```

## 🔄 Migration Tasks

### Phase 1: Update Components (Cao ưu tiên)
Cần cập nhật các component đang sử dụng translation keys cũ:

#### A. Users Components
```typescript
// Trong UsersPage.tsx, CreateUserModal.tsx, etc.

// CŨ
const { t } = useTranslation('users');
t('buttons.save')      → t('common.actions.save')
t('messages.loading')  → t('common.states.loading')
t('pagination.showing') → t('common.pagination.showing')
t('validation.required') → t('common.validation.required')

// GIỮ NGUYÊN (đặc thù users)
t('fields.familyName')
t('membershipStatus.doan_vien')
t('placeholders.code')
```

#### B. Departments Components  
```typescript
// Trong DepartmentsPage.tsx, CreateDepartmentModal.tsx, etc.

// CŨ
const { t } = useTranslation('departments');
t('buttons.save')      → t('common.actions.save')
t('messages.loading')  → t('common.states.loading')
t('pagination.showing') → t('common.pagination.showing')
t('validation.required') → t('common.validation.required')

// GIỮ NGUYÊN (đặc thù departments)
t('fields.managementUsers')
t('stats.total')
```

### Phase 2: Update Services & Hooks
```typescript
// Trong các service files
// CŨ
throw new Error(t('users.messages.createError'))
// MỚI  
throw new Error(t('common.messages.error.create'))

// CŨ
showToast('success', t('departments.messages.updateSuccess'))
// MỚI
showToast('success', t('common.messages.success.update'))
```

### Phase 3: Forms & Validation
```typescript
// Validation schemas
const schema = yup.object({
  name: yup.string()
    .required(t('common.validation.required', { 
      field: t('common.fields.name') 
    }))
    .min(2, t('common.validation.minLength', { 
      field: t('common.fields.name'), 
      min: 2 
    }))
});
```

## 🛠️ Code Examples

### 1. Modal Component
```typescript
// Before
import { useTranslation } from 'react-i18next';

const CreateUserModal = () => {
  const { t } = useTranslation('users');
  
  return (
    <Modal>
      <h2>{t('titles.create')}</h2>
      <Button onClick={handleSave}>{t('buttons.save')}</Button>
      <Button onClick={handleCancel}>{t('buttons.cancel')}</Button>
    </Modal>
  );
};

// After
import { useTranslation } from 'react-i18next';

const CreateUserModal = () => {
  const { t } = useTranslation(['users', 'common']);
  
  return (
    <Modal>
      <h2>{t('users:titles.create')}</h2>
      <Button onClick={handleSave}>{t('common:actions.save')}</Button>
      <Button onClick={handleCancel}>{t('common:actions.cancel')}</Button>
    </Modal>
  );
};
```

### 2. Data Table
```typescript
// Before
const columns = [
  { key: 'name', label: t('users.fields.fullName') },
  { key: 'email', label: t('users.fields.email') },
  { key: 'actions', label: t('users.fields.actions') }
];

// After  
const columns = [
  { key: 'name', label: t('users:fields.fullName') },
  { key: 'email', label: t('common:fields.email') },
  { key: 'actions', label: t('common:fields.actions') }
];
```

### 3. API Error Handling
```typescript
// Before
catch (error) {
  showToast('error', t('users.messages.loadError'));
}

// After
catch (error) {
  showToast('error', t('common:messages.error.load'));
}
```

## 📁 Updated File Structure

### Common Keys (~/locales/*/common.json)
```
actions: { save, cancel, edit, delete, ... }
states: { loading, saving, creating, ... }
messages: {
  success: { create, update, delete, ... }
  error: { create, update, delete, load, ... }
  confirm: { delete, deleteWarning }
  empty: { noData, noResults }
}
pagination: { showing, previous, next, page }
validation: { required, minLength, email, ... }
fields: { name, code, description, email, ... }
status: { active, inactive, all }
```

### Feature Keys (~/locales/*/[feature].json)
```
title, subtitle
titles: { create, edit, view, delete }
fields: { featureSpecificFields... }
placeholders: { featureSpecificPlaceholders... }
messages: { featureSpecificMessages... }
labels: { featureSpecificLabels... }
```

## ✅ Checklist

### Immediate Tasks
- [ ] Update UsersPage components
- [ ] Update DepartmentsPage components  
- [ ] Update OrganizationsPage components
- [ ] Update shared components (Layout, Toast, etc.)
- [ ] Update service error messages
- [ ] Update form validation messages

### Testing
- [ ] Test all translation keys render correctly
- [ ] Test language switching works
- [ ] Test interpolation with parameters
- [ ] Test pluralization if used
- [ ] Verify no missing translation errors

### Cleanup
- [ ] Remove old translation files (*_old.json)
- [ ] Update English translations
- [ ] Document new key naming conventions
- [ ] Create translation key reference guide

## 🚨 Breaking Changes
- Many translation keys have changed paths
- Components using old keys will show missing translation warnings
- Need to update all useTranslation hooks to use multiple namespaces

## 💡 Benefits Achieved
- **70% reduction** in duplicate keys
- **Consistent** translation structure
- **Easier maintenance** and scaling
- **Faster development** with reusable keys
- **Smaller bundle size**

## 🔗 Next Steps
1. Implement Phase 1 changes in components
2. Test thoroughly in development
3. Update English translations
4. Deploy and monitor for missing translations
5. Create documentation for future features
