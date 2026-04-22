# Frontend Coding Standards - Đoàn Hội Portal

## Mục lục

1. [Tổng quan](#1-tổng-quan)
2. [Cấu trúc Feature](#2-cấu-trúc-feature)
3. [Types - Type Safety](#3-types---type-safety)
4. [Custom Hooks](#4-custom-hooks)
5. [Components](#5-components)
6. [Pages](#6-pages)
7. [Services](#7-services)
8. [Naming Conventions](#8-naming-conventions)
9. [Export Patterns](#9-export-patterns)
10. [Best Practices](#10-best-practices)

---

## 1. Tổng quan

### 1.1 Nguyên tắc cốt lõi

Project tuân theo 4 nguyên tắc chính:

1. **Separation of Concerns**: Tách riêng logic, UI và types
2. **Reusable Components**: Tạo các component có thể tái sử dụng
3. **Custom Hooks**: Sử dụng hooks để quản lý state và business logic
4. **Type Safety**: Định nghĩa types rõ ràng cho tất cả props và return values

### 1.2 Tech Stack

- **Framework**: React 18+ với TypeScript
- **State Management**: TanStack Query (React Query) cho server state
- **Styling**: Tailwind CSS
- **i18n**: react-i18next
- **Icons**: lucide-react
- **Routing**: React Router v6

---

## 2. Cấu trúc Feature

### 2.1 Cấu trúc thư mục chuẩn

```
feature-name/
├── components/           # UI Components
│   ├── shared/          # Shared components trong feature
│   │   ├── PageHeader.tsx
│   │   ├── PageStates.tsx
│   │   └── index.ts
│   ├── FeatureSpecificComponent.tsx
│   └── index.ts
├── hooks/               # Custom hooks
│   ├── useFeatureNamePage.ts
│   ├── useFeatureNameDetail.ts
│   └── index.ts
├── pages/               # Page components
│   ├── FeatureNamePage.tsx
│   ├── FeatureNameDetailPage.tsx
│   └── index.ts
├── services/            # API services
│   ├── featureNameService.ts
│   └── index.ts
├── types/               # Type definitions
│   ├── types.ts         # Domain types
│   ├── hooks.types.ts   # Hook return types
│   ├── components.types.ts  # Component props types
│   └── index.ts
├── utils/               # Utility functions
│   └── index.ts
└── index.ts             # Feature barrel export
```

### 2.2 Ví dụ thực tế

```
student-reports/
├── components/
│   ├── StudentInfoCard.tsx
│   ├── SummaryStatsGrid.tsx
│   ├── ActivitiesTable.tsx
│   ├── StatusBadge.tsx
│   ├── LoadingState.tsx
│   ├── EmptyState.tsx
│   ├── PageHeader.tsx
│   └── index.ts
├── hooks/
│   ├── useStudentReportsPage.tsx
│   └── index.ts
├── pages/
│   ├── StudentReportsPage.tsx
│   └── index.ts
├── services/
│   ├── studentReportsService.ts
│   └── index.ts
├── types/
│   ├── types.ts
│   ├── hooks.types.ts
│   ├── components.types.ts
│   └── index.ts
├── utils/
│   └── index.ts
└── index.ts
```

---

## 3. Types - Type Safety

### 3.1 Domain Types (`types/types.ts`)

Định nghĩa các types liên quan đến domain/business logic:

```typescript
// types/types.ts

// Enums
export enum ParticipationStatus {
  REGISTERED = 'REGISTERED',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

// Interfaces
export interface ActivityParticipation {
  id: number;
  activity_name: string;
  category_name?: string;
  days_completed: number;
  status: ParticipationStatus;
  completed_date?: string;
  note?: string;
}

export interface StudentReport {
  student_code: string;
  student_name?: string;
  student_email?: string;
  activities: ActivityParticipation[];
  total_days_completed: number;
  // ...
}

// Query params
export interface StudentReportQueryParams {
  period?: string;
  start_date?: string;
  end_date?: string;
  status?: string;
}
```

### 3.2 Hook Types (`types/hooks.types.ts`)

Định nghĩa return types cho custom hooks:

```typescript
// types/hooks.types.ts

import type { StudentReport } from './types';

/**
 * State interface cho hook
 */
export interface StudentInfoState {
  name?: string;
  email?: string;
}

/**
 * Return type cho useStudentReportsPage hook
 */
export interface UseStudentReportsPageReturn {
  // Data
  report: StudentReport | undefined;
  studentInfo: StudentInfoState;
  studentCode: string;

  // Loading states
  isLoading: boolean;

  // Helpers/Actions
  formatDays: (days: number | null | undefined) => string;
  getStatusDisplay: (status: string) => React.ReactElement;

  // Computed values
  isCtxhAchieved: boolean;
  displayName: string;
  displayEmail: string;
}
```

### 3.3 Component Props Types (`types/components.types.ts`)

Định nghĩa props types cho tất cả components:

```typescript
// types/components.types.ts

import type { StudentReport, ActivityParticipation } from './types';

/**
 * Props cho StudentInfoCard component
 */
export interface StudentInfoCardProps {
  report: StudentReport;
  displayName: string;
  displayEmail: string;
  formatDays: (days: number | null | undefined) => string;
  className?: string;
}

/**
 * Props cho ActivitiesTable component
 */
export interface ActivitiesTableProps {
  activities: ActivityParticipation[];
  formatDays: (days: number | null | undefined) => string;
  getStatusDisplay: (status: string) => React.ReactElement;
  className?: string;
}

/**
 * Props cho LoadingState component
 */
export interface LoadingStateProps {
  className?: string;
}

/**
 * Props cho EmptyState component
 */
export interface EmptyStateProps {
  title: string;
  description: string;
  icon?: React.ReactNode;
  className?: string;
}

/**
 * Props cho PageHeader component
 */
export interface PageHeaderProps {
  title: string;
  subtitle: string;
  actions?: React.ReactNode;
  className?: string;
}
```

### 3.4 Types Index (`types/index.ts`)

Barrel export tất cả types:

```typescript
// types/index.ts

// Domain types
export * from './types';

// Hook types
export * from './hooks.types';

// Component props types
export * from './components.types';
```

---

## 4. Custom Hooks

### 4.1 Nguyên tắc

- **Một hook cho mỗi page**: `useFeatureNamePage.ts`
- **Tách logic phức tạp**: Nếu page có nhiều phần, tách thành nhiều hooks
- **Return type rõ ràng**: Luôn định nghĩa interface cho return type
- **useCallback/useMemo**: Sử dụng cho functions và computed values

### 4.2 Cấu trúc Hook chuẩn

```typescript
// hooks/useFeatureNamePage.ts

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../auth/context/AuthContext';
import { useQuery, useMutation } from '@tanstack/react-query';
import type { UseFeatureNamePageReturn } from '../types/hooks.types';

/**
 * Custom hook for FeatureNamePage
 * Handles all state management and business logic
 */
export const useFeatureNamePage = (): UseFeatureNamePageReturn => {
  const { t } = useTranslation('feature-name');
  const { auth } = useAuth();

  // ========== STATE ==========
  const [localState, setLocalState] = useState<StateType>({});

  // ========== QUERIES ==========
  const {
    data,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['feature-name', params],
    queryFn: () => featureService.getData(params),
    enabled: !!auth.user,
  });

  // ========== MUTATIONS ==========
  const createMutation = useMutation({
    mutationFn: featureService.create,
    onSuccess: () => {
      refetch();
      // Show success toast
    },
    onError: (error) => {
      // Show error toast
    },
  });

  // ========== EFFECTS ==========
  useEffect(() => {
    // Side effects
  }, [dependencies]);

  // ========== HELPERS ==========
  const formatData = useCallback((value: number): string => {
    return value.toString();
  }, []);

  // ========== COMPUTED VALUES ==========
  const computedValue = useMemo(() => {
    return data?.items?.length || 0;
  }, [data]);

  // ========== ACTIONS ==========
  const handleCreate = useCallback(async (input: CreateInput) => {
    await createMutation.mutateAsync(input);
  }, [createMutation]);

  // ========== RETURN ==========
  return {
    // Data
    data,
    localState,

    // Loading states
    isLoading,
    isCreating: createMutation.isPending,

    // Error states
    error,

    // Helpers
    formatData,

    // Computed values
    computedValue,

    // Actions
    handleCreate,
    refetch,
  };
};

export default useFeatureNamePage;
```

### 4.3 Naming Convention cho Hooks

| Hook Purpose | Naming Pattern | Example |
|--------------|----------------|---------|
| Page state | `use{Feature}Page` | `useStudentReportsPage` |
| Detail page | `use{Feature}Detail` | `useActivityDetail` |
| List management | `use{Feature}Management` | `useActivityManagement` |
| Form handling | `use{Feature}Form` | `useUserForm` |
| Permissions | `use{Feature}Permissions` | `useSystemConfigPermissions` |

---

## 5. Components

### 5.1 Component Categories

#### 5.1.1 Shared/Common Components

Components dùng chung trong feature:

```typescript
// components/shared/PageHeader.tsx

import React from 'react';
import type { PageHeaderProps } from '../../types/components.types';

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  subtitle,
  actions,
  className = '',
}) => {
  return (
    <div className={`flex flex-col sm:flex-row sm:items-center sm:justify-between ${className}`}>
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          {title}
        </h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          {subtitle}
        </p>
      </div>
      {actions && <div className="mt-4 sm:mt-0">{actions}</div>}
    </div>
  );
};

export default PageHeader;
```

#### 5.1.2 Page State Components

Components hiển thị trạng thái page:

```typescript
// components/shared/PageStates.tsx

import React from 'react';
import type { LoadingStateProps, EmptyStateProps } from '../../types/components.types';

/**
 * Loading State Component
 */
export const LoadingState: React.FC<LoadingStateProps> = ({ className = '' }) => {
  return (
    <div className={`bg-white dark:bg-gray-800 shadow-sm rounded-lg ${className}`}>
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-2 border-blue-500 rounded-full border-t-transparent animate-spin" />
      </div>
    </div>
  );
};

/**
 * Empty State Component
 */
export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  icon,
  className = '',
}) => {
  return (
    <div className={`bg-white dark:bg-gray-800 shadow-sm rounded-lg ${className}`}>
      <div className="px-4 py-5 sm:p-6">
        <div className="text-center py-12">
          {icon}
          <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
            {title}
          </h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {description}
          </p>
        </div>
      </div>
    </div>
  );
};
```

#### 5.1.3 Feature-Specific Components

Components chỉ dùng trong feature cụ thể:

```typescript
// components/StudentInfoCard.tsx

import React from 'react';
import { useTranslation } from 'react-i18next';
import { User } from 'lucide-react';
import type { StudentInfoCardProps } from '../types/components.types';

export const StudentInfoCard: React.FC<StudentInfoCardProps> = ({
  report,
  displayName,
  displayEmail,
  formatDays,
  className = '',
}) => {
  const { t } = useTranslation('student-reports');

  return (
    <div className={`bg-white dark:bg-gray-800 shadow-sm rounded-lg p-6 ${className}`}>
      {/* Component content */}
    </div>
  );
};

export default StudentInfoCard;
```

### 5.2 Component Rules

1. **Props typing**: Luôn sử dụng interface từ `components.types.ts`
2. **Default props**: Sử dụng destructuring với default values
3. **className prop**: Luôn hỗ trợ `className?: string` để customization
4. **Named export**: Sử dụng cả named export và default export
5. **Translation**: Sử dụng `useTranslation` với namespace của feature

---

## 6. Pages

### 6.1 Page Structure

Pages chỉ nên chứa UI composition, không chứa logic:

```typescript
// pages/FeatureNamePage.tsx

import React from 'react';
import { useTranslation } from 'react-i18next';
import { SomeIcon } from 'lucide-react';

// Hooks
import { useFeatureNamePage } from '../hooks';

// Components
import {
  PageHeader,
  LoadingState,
  EmptyState,
  DataTable,
  FilterSection,
} from '../components';

/**
 * FeatureNamePage Component
 * Main page for feature
 * 
 * Following principles:
 * 1. Separation of Concerns: Logic in custom hook, UI in components
 * 2. Reusable Components: Shared components for different sections
 * 3. Custom Hooks: useFeatureNamePage for state and business logic
 * 4. Type Safety: All props and return values are typed
 */
const FeatureNamePage: React.FC = () => {
  const { t } = useTranslation('feature-name');

  // Use custom hook for all state and business logic
  const {
    data,
    isLoading,
    filters,
    handleFilterChange,
    handleCreate,
  } = useFeatureNamePage();

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title={t('title')}
        subtitle={t('subtitle')}
        actions={<CreateButton onClick={handleCreate} />}
      />

      {/* Filters */}
      <FilterSection
        filters={filters}
        onChange={handleFilterChange}
      />

      {/* Loading State */}
      {isLoading && <LoadingState />}

      {/* Content */}
      {!isLoading && (
        <>
          {!data || data.length === 0 ? (
            <EmptyState
              title={t('empty.title')}
              description={t('empty.description')}
              icon={<SomeIcon className="mx-auto h-12 w-12 text-gray-400" />}
            />
          ) : (
            <DataTable data={data} />
          )}
        </>
      )}
    </div>
  );
};

export default FeatureNamePage;
```

### 6.2 Page Rules

1. **Không chứa logic**: Tất cả logic trong custom hooks
2. **UI composition only**: Chỉ render và compose components
3. **Single responsibility**: Mỗi page một mục đích
4. **Consistent structure**: Header → Filters → Loading → Content

---

## 7. Services

### 7.1 Service Structure

```typescript
// services/featureNameService.ts

import { apiClient } from '../../../shared/services/apiClient';
import type {
  FeatureItem,
  FeatureQueryParams,
  CreateFeatureDto,
  UpdateFeatureDto,
} from '../types';

export class FeatureNameService {
  private readonly baseUrl = '/api/feature-name';

  /**
   * Get all items with optional filters
   */
  async getAll(params: FeatureQueryParams = {}): Promise<FeatureItem[]> {
    const queryParams = new URLSearchParams();
    
    if (params.search) queryParams.append('search', params.search);
    if (params.status) queryParams.append('status', params.status);
    if (params.page) queryParams.append('page', params.page.toString());
    if (params.limit) queryParams.append('limit', params.limit.toString());

    const url = `${this.baseUrl}${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
    return apiClient.get<FeatureItem[]>(url);
  }

  /**
   * Get single item by ID
   */
  async getById(id: number): Promise<FeatureItem> {
    return apiClient.get<FeatureItem>(`${this.baseUrl}/${id}`);
  }

  /**
   * Create new item
   */
  async create(data: CreateFeatureDto): Promise<FeatureItem> {
    return apiClient.post<FeatureItem>(this.baseUrl, data);
  }

  /**
   * Update existing item
   */
  async update(id: number, data: UpdateFeatureDto): Promise<FeatureItem> {
    return apiClient.patch<FeatureItem>(`${this.baseUrl}/${id}`, data);
  }

  /**
   * Delete item
   */
  async delete(id: number): Promise<void> {
    return apiClient.delete(`${this.baseUrl}/${id}`);
  }
}

// Export singleton instance
export const featureNameService = new FeatureNameService();
```

---

## 8. Naming Conventions

### 8.1 Files

| Type | Convention | Example |
|------|------------|---------|
| Component | PascalCase | `StudentInfoCard.tsx` |
| Hook | camelCase with `use` prefix | `useStudentReportsPage.ts` |
| Service | camelCase with `Service` suffix | `studentReportsService.ts` |
| Types | camelCase with `.types` suffix | `hooks.types.ts` |
| Utils | camelCase | `formatters.ts` |
| Index | lowercase | `index.ts` |

### 8.2 Variables & Functions

| Type | Convention | Example |
|------|------------|---------|
| Component | PascalCase | `StudentInfoCard` |
| Hook | camelCase with `use` prefix | `useStudentReportsPage` |
| Function | camelCase | `formatDays` |
| Constant | UPPER_SNAKE_CASE | `MAX_ITEMS_PER_PAGE` |
| Interface | PascalCase | `StudentReportProps` |
| Enum | PascalCase | `ParticipationStatus` |
| Enum values | UPPER_SNAKE_CASE | `COMPLETED` |

### 8.3 CSS Classes

- Sử dụng Tailwind CSS utility classes
- Sử dụng template literals cho conditional classes:

```typescript
className={`base-class ${condition ? 'active-class' : 'inactive-class'}`}
```

---

## 9. Export Patterns

### 9.1 Component Export

```typescript
// Luôn có cả named export và default export
export const ComponentName: React.FC<Props> = ({ ... }) => { ... };
export default ComponentName;
```

### 9.2 Index Barrel Export

```typescript
// components/index.ts

// Shared components
export * from './shared';

// Feature-specific components
export * from './StudentInfoCard';
export * from './SummaryStatsGrid';
export * from './ActivitiesTable';
```

### 9.3 Feature Index Export

```typescript
// feature/index.ts

// Types
export * from './types';

// Hooks
export * from './hooks';

// Components
export * from './components';

// Services
export * from './services';

// Pages
export * from './pages';

// Utils
export * from './utils';
```

---

## 10. Best Practices

### 10.1 Component Size

- **Guideline**: Component < 200 lines
- **Page**: < 100 lines (chỉ UI composition)
- **Hook**: < 300 lines (tách nếu lớn hơn)

### 10.2 Translation

```typescript
// Sử dụng namespace cho mỗi feature
const { t } = useTranslation('feature-name');

// Keys có cấu trúc
t('section.key')
t('messages.success')
t('buttons.submit')
```

### 10.3 Error Handling

```typescript
// Trong hooks
const { error } = useQuery({ ... });

// Trong components
{error && <ErrorState message={error.message} />}
```

### 10.4 Loading States

```typescript
// Sử dụng component LoadingState
{isLoading && <LoadingState />}

// Hoặc skeleton loading cho UX tốt hơn
{isLoading && <SkeletonLoader />}
```

### 10.5 Conditional Rendering

```typescript
// Thứ tự render
{isLoading && <LoadingState />}

{!isLoading && (
  <>
    {error && <ErrorState error={error} />}
    {!error && !data && <EmptyState />}
    {!error && data && <DataDisplay data={data} />}
  </>
)}
```

### 10.6 Props Destructuring

```typescript
// Luôn destructure với default values
const Component: React.FC<Props> = ({
  title,
  items = [],
  className = '',
  onAction,
}) => { ... };
```

### 10.7 Memoization

```typescript
// useCallback cho functions passed to children
const handleClick = useCallback(() => {
  // logic
}, [dependencies]);

// useMemo cho expensive computations
const sortedItems = useMemo(() => {
  return items.sort((a, b) => a.name.localeCompare(b.name));
}, [items]);
```

---

## 11. Shared Loading Components

### 11.1 Tổng quan

**QUAN TRỌNG**: Sử dụng shared Loading components từ `@/shared/components/Loading` thay vì tạo loading component riêng cho mỗi feature.

### 11.2 Các Loading Components có sẵn

| Component | Mục đích | Import |
|-----------|----------|--------|
| `LoadingSpinner` | Spinner cơ bản | `import { LoadingSpinner } from '@/shared/components/Loading'` |
| `LoadingState` | Loading inline với message | `import { LoadingState } from '@/shared/components/Loading'` |
| `FullPageLoading` | Loading toàn trang | `import { FullPageLoading } from '@/shared/components/Loading'` |
| `CardLoading` | Loading trong card | `import { CardLoading } from '@/shared/components/Loading'` |
| `ContainerLoading` | Loading cho container | `import { ContainerLoading } from '@/shared/components/Loading'` |
| `ButtonLoading` | Loading trong button | `import { ButtonLoading } from '@/shared/components/Loading'` |
| `TableLoading` | Skeleton cho table | `import { TableLoading } from '@/shared/components/Loading'` |

### 11.3 Khi nào dùng component nào?

```typescript
// 1. FullPageLoading - Khi check permission hoặc initial load
if (isCheckingPermission) {
  return <FullPageLoading message="Đang kiểm tra quyền..." />;
}

// 2. CardLoading - Loading trong một section/card
{isLoading && <CardLoading height="lg" />}

// 3. LoadingState - Loading inline nhỏ
{isLoadingMore && <LoadingState size="sm" />}

// 4. ButtonLoading - Trong button submit
<button disabled={isSubmitting}>
  {isSubmitting ? <ButtonLoading text="Đang lưu..." /> : 'Lưu'}
</button>

// 5. TableLoading - Skeleton cho bảng
{isLoading ? <TableLoading rows={5} columns={4} /> : <DataTable />}
```

### 11.4 Props Reference

```typescript
// LoadingSpinner
interface LoadingSpinnerProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';  // default: 'md'
  variant?: 'primary' | 'white' | 'gray';    // default: 'primary'
  className?: string;
}

// FullPageLoading
interface FullPageLoadingProps {
  message?: string;
  showLogo?: boolean;  // default: false
}

// CardLoading
interface CardLoadingProps {
  message?: string;
  height?: 'sm' | 'md' | 'lg';  // default: 'md'
  className?: string;
}

// LoadingState
interface LoadingStateProps {
  message?: string;
  size?: 'sm' | 'md' | 'lg';  // default: 'md'
  className?: string;
}
```

### 11.5 ❌ KHÔNG nên làm

```typescript
// ❌ Tạo loading component riêng trong feature
// features/my-feature/components/LoadingState.tsx
export const LoadingState = () => (
  <div className="animate-spin...">Loading</div>
);

// ❌ Inline loading spinner
<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
```

### 11.6 ✅ NÊN làm

```typescript
// ✅ Import từ shared
import { FullPageLoading, CardLoading } from '@/shared/components/Loading';

// ✅ Sử dụng với đúng context
if (isCheckingPermission) {
  return <FullPageLoading message={t('common:states.checkingPermission')} />;
}

{isLoading && <CardLoading />}
```

---

## Checklist khi tạo Feature mới

- [ ] Tạo cấu trúc thư mục chuẩn
- [ ] Định nghĩa domain types trong `types/types.ts`
- [ ] Định nghĩa hook return types trong `types/hooks.types.ts`
- [ ] Định nghĩa component props trong `types/components.types.ts`
- [ ] Tạo custom hook cho page logic
- [ ] **Sử dụng shared Loading components** (không tạo mới)
- [ ] Tạo feature-specific components
- [ ] Tạo page component (chỉ UI composition)
- [ ] Tạo service class
- [ ] Export tất cả qua index files
- [ ] Thêm translations vào locales

---

## References

- [React Documentation](https://react.dev/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [TanStack Query](https://tanstack.com/query/latest)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [react-i18next](https://react.i18next.com/)

