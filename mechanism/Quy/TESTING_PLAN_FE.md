# Frontend Testing Plan & Coverage Progress

## Current Status (Session Start)

| Metric | Value |
|--------|-------|
| Test Files | 13 files |
| Total Tests | 28 passing ✅ |
| Test Suites | 100% passing |
| MSW Setup | ✅ Complete |
| Page-level Tests | 5 features |
| Unit Tests | 3 components/hooks |
| Coverage Status | Basic - Need expansion |

### Current Test Distribution
```
CTXH Feature
├── Pages: ActivityRegistration.msw.spec.tsx (✅), CategoryManagement.spec.tsx, LimitConfigManagement.spec.tsx, CtxhOldSystemImportPage.spec.tsx, ActivityManagement.spec.tsx
├── Hooks: useActivityDetail.spec.ts, useOldSystemImport.spec.ts
└── Total: 8 test files

StudentReports Feature  
├── Pages: StudentReportsPage.msw.spec.tsx (✅), StudentReportsPage.error.msw.spec.tsx (✅), StudentReportsPage.spec.tsx
├── Hooks: useStudentReportsPage.spec.tsx
├── Components: ActivitiesTable.unit.spec.tsx
└── Total: 5 test files

Shared
└── ImportModal.spec.tsx
```

---

## Testing Plan - Phase Implementation

### Phase 1: High-Impact Features (PRIORITY)

#### 1️⃣ **Auth Feature Tests** (NOT STARTED)
- **Purpose**: Critical for all downstream flows
- **Files to Test**:
  - `src/features/auth/pages/LoginPage.tsx`
  - `src/features/auth/pages/CallbackPage.tsx`  
  - `src/features/auth/hooks/useAuth.ts`
- **Test Scenarios**:
  - Login with Google OAuth
  - OAuth callback handling
  - Token refresh flow
  - Logout
  - Session persistence
- **Test Count**: 8-12 tests
- **Priority**: 🔴 CRITICAL

#### 2️⃣ **Fee Collection Tests** (NOT STARTED)
- **Purpose**: Complex business logic, critical revenue feature
- **Files to Test**:
  - `src/features/fee-collection/pages/*.tsx`
  - `src/features/fee-collection/hooks/*.ts`
  - `src/features/fee-collection/components/*.tsx`
- **Test Scenarios**:
  - Fee list display with filtering
  - Fee payment submission
  - Payment status tracking
  - Error handling
- **Test Count**: 12-15 tests
- **Priority**: 🔴 CRITICAL

#### 3️⃣ **Dashboard Tests** (NOT STARTED)
- **Purpose**: Main UI, aggregates multiple data sources
- **Files to Test**:
  - `src/features/dashboard/pages/*.tsx`
  - Dashboard metrics queries
  - Data visualization
- **Test Scenarios**:
  - Dashboard data loading
  - Metric calculations
  - Filter changes
  - Empty state
- **Test Count**: 8-10 tests
- **Priority**: 🟠 HIGH

#### 4️⃣ **Users Management Tests** (NOT STARTED)
- **Purpose**: User CRUD operations, permissions management
- **Files to Test**:
  - `src/features/users/pages/UserList.tsx`
  - `src/features/users/pages/UserDetail.tsx`
  - `src/features/users/hooks/useUsers.ts`
- **Test Scenarios**:
  - List users with pagination/filters
  - Create user
  - Edit user
  - Delete user
  - Role assignment
- **Test Count**: 10-12 tests
- **Priority**: 🟠 HIGH

#### 5️⃣ **Organizations Management Tests** (NOT STARTED)
- **Purpose**: Multi-tenant organization setup
- **Files to Test**:
  - `src/features/organizations/pages/*.tsx`
  - `src/features/organizations/hooks/*.ts`
- **Test Scenarios**:
  - Organization CRUD
  - Settings management
  - Member management
- **Test Count**: 8-10 tests
- **Priority**: 🟠 HIGH

---

### Phase 2: Medium-Priority Features

#### 6️⃣ **Permissions Tests** (NOT STARTED)
- Test Count: 6-8 tests
- Priority: 🟡 MEDIUM

#### 7️⃣ **Departments Tests** (NOT STARTED)
- Test Count: 6-8 tests
- Priority: 🟡 MEDIUM

#### 8️⃣ **Templates Tests** (NOT STARTED)
- Test Count: 8-10 tests
- Priority: 🟡 MEDIUM

#### 9️⃣ **Classes Tests** (NOT STARTED)
- Test Count: 6-8 tests
- Priority: 🟡 MEDIUM

#### 🔟 **System Config Tests** (NOT STARTED)
- Test Count: 6-8 tests
- Priority: 🟡 MEDIUM

---

### Phase 3: Additional Coverage

#### Enhanced CTXH Tests
- Expand ActivityRegistration test scenarios
- Add more edge cases
- Component unit tests

#### Enhanced StudentReports Tests
- Add export functionality tests
- Add report filtering tests
- Add data validation tests

#### Shared Component Tests
- Modal dialogs
- Form components
- Data tables
- Common utilities

---

## Implementation Roadmap

### Week 1: Core Features (Phase 1)
```timeline
Day 1-2: Auth Tests (12 tests)
Day 3-4: Fee Collection Tests (15 tests)
Day 5: Dashboard Tests (10 tests)
Total: 37 new tests

Running Total: 28 + 37 = 65 tests
```

### Week 2: Management Features (Phase 1)
```timeline
Day 1-2: Users Tests (12 tests)
Day 3-4: Organizations Tests (10 tests)
Day 5: Refine & Fix
Total: 22 new tests

Running Total: 65 + 22 = 87 tests
```

### Week 3-4: Phase 2 & 3
```timeline
Week 3: Phase 2 features (40+ tests)
Week 4: Phase 3 & Coverage gaps (30+ tests)

Final Target: 150-160 tests
Coverage: 80%+ for critical features
```

---

## Testing Template (MSW-Based)

```typescript
// Template for page-level tests
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { setupServer } from 'msw/node';
import { MyPage } from './MyPage';

// Setup MSW handlers
const server = setupServer(
  // handlers here
);

describe('MyPage', () => {
  beforeEach(() => server.listen());
  afterEach(() => server.resetHandlers());

  it('should render and fetch data', async () => {
    render(<MyPage />);
    
    await waitFor(() => {
      expect(screen.getByText(/expected text/)).toBeInTheDocument();
    });
  });

  it('should handle errors gracefully', async () => {
    server.use(
      // override with error handler
    );
    
    render(<MyPage />);
    
    await waitFor(() => {
      expect(screen.getByText(/error message/)).toBeInTheDocument();
    });
  });
});
```

---

## Coverage Targets

| Feature | Current | Target | Tests |
|---------|---------|--------|-------|
| Auth | 0% | 85% | 12 |
| Fee Collection | 0% | 80% | 15 |
| Dashboard | 0% | 75% | 10 |
| Users | 0% | 80% | 12 |
| Organizations | 0% | 80% | 10 |
| CTXH | 40% | 90% | +10 |
| StudentReports | 50% | 90% | +10 |
| Shared | 30% | 70% | +10 |
| **TOTAL** | **~12%** | **~70%** | **+100 tests** |

---

## Success Criteria

✅ All Phase 1 tests passing  
✅ Zero failing tests in suite  
✅ MSW handlers properly mocked  
✅ Error scenarios covered  
✅ Loading states tested  
✅ User interactions tested  
✅ Integration with API tested  

---

## Notes

- **MSW Setup**: ✅ Ready (handlers, fixtures, server config)
- **Test Runner**: ✅ Vitest configured and working
- **Test Library**: ✅ React Testing Library with user-event
- **Dependencies**: All required packages installed
- **Exclude**: ctxh-chat feature (RAG/LLM module with ongoing changes)

---

*Last Updated: April 30, 2026*
*Status: Ready for Phase 1 Implementation*
