# Chiến Lược Testing cho Đoàn Hội Portal

## 📋 Tổng Quan Dự Án

**Dự án:** Hệ thống quản lý Đoàn Hội Sinh viên  
**Tech Stack:**
- **Backend:** NestJS + TypeScript + TypeORM + PostgreSQL
- **Frontend:** React + TypeScript + Vite + TanStack Query + React Router
- **Deployment:** Docker + Docker Compose + Nginx
- **Monitoring:** Prometheus + Grafana

**Modules chính:**
- Authentication & Authorization (JWT, Google OAuth)
- User Management
- Organizations Management
- CTXH (Công tác xã hội) Activities
- Fee Collection & Payment (PayOS)
- Classes Management
- Dashboard & Reports
- AWS S3 Integration

---

## 🎯 Chiến Lược Testing Đề Xuất

### 1. **Backend Testing (NestJS)**

#### 1.1. Unit Tests (Jest)
**Mục tiêu:** Test từng service, controller, guard riêng lẻ

**Setup hiện tại:** ✅ Jest đã được cấu hình trong `backend/package.json`

**Cần implement:**

```bash
# Cấu trúc test files
backend/
  src/
    auth/
      auth.service.spec.ts
      auth.controller.spec.ts
      guards/
        jwt-auth.guard.spec.ts
        roles.guard.spec.ts
    users/
      users.service.spec.ts
      users.controller.spec.ts
    organizations/
      organizations.service.spec.ts
    payment/
      payment.service.spec.ts
    ctxh/
      activity/
        activity.service.spec.ts
```

**Ví dụ test case:**
- ✅ User login với credentials đúng/sai
- ✅ JWT token generation và validation
- ✅ Role-based access control
- ✅ CRUD operations cho các entities
- ✅ Business logic validation (e.g., payment calculation)
- ✅ Error handling

**Scripts đã có:**
```json
"test": "jest",
"test:watch": "jest --watch",
"test:cov": "jest --coverage"
```

#### 1.2. Integration Tests (E2E)
**Mục tiêu:** Test API endpoints với database thật

**Setup hiện tại:** ✅ Jest E2E đã được cấu hình

**Cần implement:**

```bash
backend/
  test/
    auth.e2e-spec.ts
    users.e2e-spec.ts
    organizations.e2e-spec.ts
    payment.e2e-spec.ts
    ctxh-activities.e2e-spec.ts
```

**Test scenarios:**
- ✅ Complete authentication flow (login, refresh token, logout)
- ✅ User CRUD operations với permissions
- ✅ Organization hierarchy operations
- ✅ Payment workflow (create → pay → verify)
- ✅ File upload to S3
- ✅ CTXH activities CRUD với participants

**Script đã có:**
```json
"test:e2e": "jest --config ./test/jest-e2e.json"
```

**Cần thêm vào `test/jest-e2e.json`:**
```json
{
  "moduleFileExtensions": ["js", "json", "ts"],
  "rootDir": ".",
  "testEnvironment": "node",
  "testRegex": ".e2e-spec.ts$",
  "transform": {
    "^.+\\.(t|j)s$": "ts-jest"
  },
  "setupFilesAfterEnv": ["<rootDir>/setup-e2e.ts"]
}
```

**Setup file mẫu (`test/setup-e2e.ts`):**
```typescript
import { DataSource } from 'typeorm';

// Setup test database trước mỗi test suite
beforeAll(async () => {
  // Connect to test database
  // Seed test data
});

afterAll(async () => {
  // Clean up test database
});
```

---

### 2. **Frontend Testing (React + Vite)**

#### 2.1. Unit Tests (Vitest + React Testing Library)
**Mục tiêu:** Test components, hooks, utilities riêng lẻ

**Cần cài đặt:**
```bash
cd frontend
npm install -D vitest @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom
```

**Cấu hình `vite.config.ts`:**
```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    coverage: {
      reporter: ['text', 'json', 'html'],
    },
  },
});
```

**Setup file (`src/test/setup.ts`):**
```typescript
import '@testing-library/jest-dom';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

afterEach(() => {
  cleanup();
});
```

**Cấu trúc test files:**
```bash
frontend/
  src/
    shared/
      components/
        Button.test.tsx
        SearchableCombobox.test.tsx
        UserTable/
          UserTable.test.tsx
    features/
      auth/
        components/
          LoginForm.test.tsx
      users/
        hooks/
          useUserList.test.ts
        components/
          EditUserModal.test.tsx
      organizations/
        components/
          OrganizationTree.test.tsx
```

**Test cases mẫu:**
- ✅ Component rendering với props khác nhau
- ✅ User interactions (click, type, submit)
- ✅ Conditional rendering (loading, error, success states)
- ✅ Form validation
- ✅ Custom hooks behavior

**Scripts cần thêm vào `frontend/package.json`:**
```json
{
  "scripts": {
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest --coverage"
  }
}
```

#### 2.2. Integration Tests (Component Integration)
**Mục tiêu:** Test tương tác giữa nhiều components

**Test scenarios:**
- ✅ Complete forms (LoginForm → API call → redirect)
- ✅ Data tables với pagination, sorting, filtering
- ✅ Modal workflows (open → edit → save → close)
- ✅ Multi-step wizards

---

### 3. **E2E Testing (Playwright hoặc Cypress)**

#### 3.1. Playwright (Khuyến nghị)
**Ưu điểm:**
- Fast và stable hơn Cypress
- Support nhiều browsers (Chromium, Firefox, WebKit)
- Built-in test generator
- Better TypeScript support

**Cài đặt:**
```bash
# Tại root folder
npm install -D @playwright/test
npx playwright install
```

**Cấu hình `playwright.config.ts`:**
```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
  },
});
```

**Cấu trúc test files:**
```bash
e2e/
  auth/
    login.spec.ts
    google-oauth.spec.ts
  users/
    user-management.spec.ts
    user-permissions.spec.ts
  organizations/
    organization-crud.spec.ts
    organization-hierarchy.spec.ts
  payment/
    payment-flow.spec.ts
  ctxh/
    activity-management.spec.ts
    participant-registration.spec.ts
  fixtures/
    test-users.ts
    test-data.ts
```

**Test scenarios quan trọng:**
1. **Authentication Flow**
   - Login với email/password
   - Google OAuth login
   - Logout và session handling
   - Refresh token rotation

2. **User Management**
   - Create, read, update, delete users
   - Assign roles và permissions
   - Bulk import users từ Excel
   - Filter và search users

3. **Organizations**
   - Create organization hierarchy
   - Assign users to organizations
   - Navigate organization tree

4. **CTXH Activities**
   - Create activity với categories
   - Student registration
   - Check-in participants
   - Generate reports

5. **Payment Flow**
   - Create payment campaign
   - Student payment via PayOS
   - Payment verification
   - Export payment reports

6. **Dashboard & Reports**
   - View dashboard charts
   - Filter data by date range
   - Export Excel reports
   - S3 storage statistics

**Scripts cần thêm vào root `package.json`:**
```json
{
  "scripts": {
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui",
    "test:e2e:debug": "playwright test --debug",
    "test:e2e:report": "playwright show-report"
  }
}
```

#### 3.2. Cypress (Alternative)
**Nếu team quen với Cypress:**
```bash
npm install -D cypress
npx cypress open
```

---

### 4. **API Testing (Optional - Postman/Newman hoặc REST Client)**

#### 4.1. Postman Collection
**Tạo collections cho:**
- Authentication APIs
- User Management APIs
- Organization APIs
- Payment APIs
- CTXH APIs

**Export và version control:**
```bash
postman/
  collections/
    auth.postman_collection.json
    users.postman_collection.json
    organizations.postman_collection.json
  environments/
    local.postman_environment.json
    production.postman_environment.json
```

**Chạy automated tests với Newman:**
```bash
npm install -D newman
```

```json
{
  "scripts": {
    "test:api": "newman run postman/collections/*.json -e postman/environments/local.postman_environment.json"
  }
}
```

#### 4.2. REST Client (VS Code Extension)
**Tạo `.http` files:**
```bash
api-tests/
  auth.http
  users.http
  organizations.http
  payment.http
```

**Ví dụ `auth.http`:**
```http
### Variables
@baseUrl = http://localhost:3000
@token = {{login.response.body.access_token}}

### Login
# @name login
POST {{baseUrl}}/auth/login
Content-Type: application/json

{
  "email": "admin@hcmut.edu.vn",
  "password": "Admin@123"
}

### Get Profile
GET {{baseUrl}}/auth/profile
Authorization: Bearer {{token}}
```

---

### 5. **Performance Testing (k6 hoặc Artillery)**

#### 5.1. k6 (Khuyến nghị)
**Cài đặt:**
```bash
# Windows (Chocolatey)
choco install k6

# hoặc download từ https://k6.io/
```

**Cấu trúc test files:**
```bash
performance/
  load-tests/
    api-endpoints.js
    authentication.js
    user-management.js
  stress-tests/
    concurrent-users.js
```

**Ví dụ test script (`performance/load-tests/api-endpoints.js`):**
```javascript
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '30s', target: 20 }, // Ramp up to 20 users
    { duration: '1m', target: 20 },  // Stay at 20 users
    { duration: '30s', target: 0 },  // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% of requests must complete below 500ms
  },
};

export default function () {
  const res = http.get('http://localhost:3000/api/users');
  check(res, {
    'status is 200': (r) => r.status === 200,
    'response time < 500ms': (r) => r.timings.duration < 500,
  });
  sleep(1);
}
```

**Scripts:**
```json
{
  "scripts": {
    "test:load": "k6 run performance/load-tests/api-endpoints.js",
    "test:stress": "k6 run performance/stress-tests/concurrent-users.js"
  }
}
```

---

### 6. **Security Testing**

#### 6.1. Dependency Scanning
**npm audit:**
```bash
# Backend
cd backend && npm audit

# Frontend
cd frontend && npm audit

# Fix vulnerabilities
npm audit fix
```

**Scripts cần thêm:**
```json
{
  "scripts": {
    "security:audit": "npm audit --audit-level=moderate",
    "security:fix": "npm audit fix"
  }
}
```

#### 6.2. OWASP ZAP (Optional)
**Scan for common vulnerabilities:**
- SQL Injection
- XSS
- CSRF
- Authentication issues

---

### 7. **CI/CD Integration**

#### 7.1. GitHub Actions Workflow
**Tạo `.github/workflows/test.yml`:**
```yaml
name: Test Suite

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  backend-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      - name: Install dependencies
        run: cd backend && npm ci
      - name: Run unit tests
        run: cd backend && npm run test
      - name: Run e2e tests
        run: cd backend && npm run test:e2e
      - name: Upload coverage
        uses: codecov/codecov-action@v3

  frontend-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      - name: Install dependencies
        run: cd frontend && npm ci
      - name: Run tests
        run: cd frontend && npm run test:coverage
      - name: Upload coverage
        uses: codecov/codecov-action@v3

  e2e-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      - name: Install dependencies
        run: npm ci
      - name: Install Playwright
        run: npx playwright install --with-deps
      - name: Start services
        run: docker-compose up -d
      - name: Run E2E tests
        run: npm run test:e2e
      - name: Upload test results
        uses: actions/upload-artifact@v3
        if: always()
        with:
          name: playwright-report
          path: playwright-report/
```

---

## 📊 Coverage Goals

**Target Coverage:**
- **Backend:**
  - Unit tests: **80%+**
  - E2E tests: Cover critical paths
- **Frontend:**
  - Component tests: **70%+**
  - Critical user flows: **90%+**
- **E2E:**
  - Happy paths: **100%**
  - Error scenarios: **80%+**

**Priority Testing:**
1. 🔴 **Critical:** Authentication, Authorization, Payment
2. 🟡 **High:** User Management, Organizations, CTXH Activities
3. 🟢 **Medium:** Dashboard, Reports, File Upload
4. ⚪ **Low:** UI styling, non-critical features

---

## 🚀 Implementation Roadmap

### Phase 1: Foundation (Week 1-2)
- [ ] Setup Vitest cho frontend
- [ ] Write first unit tests cho core components
- [ ] Setup Playwright
- [ ] Write first E2E test (login flow)

### Phase 2: Backend Coverage (Week 3-4)
- [ ] Unit tests cho Auth module
- [ ] Unit tests cho Users module
- [ ] E2E tests cho critical APIs
- [ ] Achieve 50%+ backend coverage

### Phase 3: Frontend Coverage (Week 5-6)
- [ ] Component tests cho shared components
- [ ] Tests cho feature modules
- [ ] Achieve 50%+ frontend coverage

### Phase 4: E2E Expansion (Week 7-8)
- [ ] Complete E2E tests cho all critical flows
- [ ] Setup CI/CD pipeline
- [ ] Performance testing với k6

### Phase 5: Optimization (Week 9+)
- [ ] Increase coverage to targets
- [ ] Security scanning integration
- [ ] Performance benchmarks
- [ ] Documentation

---

## 🛠️ Tools Summary

| Category | Tool | Status | Priority |
|----------|------|--------|----------|
| Backend Unit | Jest | ✅ Configured | 🔴 High |
| Backend E2E | Supertest + Jest | ✅ Configured | 🔴 High |
| Frontend Unit | Vitest + RTL | ⚠️ Need Setup | 🔴 High |
| E2E | Playwright | ⚠️ Need Setup | 🔴 High |
| API Testing | Postman/Newman | ⚪ Optional | 🟡 Medium |
| Performance | k6 | ⚪ Optional | 🟢 Low |
| Security | npm audit | ✅ Available | 🟡 Medium |

---

## 📝 Best Practices

1. **Test Naming Convention:**
   ```
   describe('ComponentName/FunctionName', () => {
     it('should do something when condition', () => {
       // Test
     });
   });
   ```

2. **AAA Pattern:**
   - **Arrange:** Setup test data
   - **Act:** Execute the function
   - **Assert:** Verify the result

3. **Test Isolation:**
   - Mỗi test phải độc lập
   - Sử dụng `beforeEach`/`afterEach` để cleanup
   - Mock external dependencies

4. **CI/CD Integration:**
   - Tests chạy automatically trên mỗi PR
   - Block merge nếu tests fail
   - Coverage reports visible

5. **Test Data Management:**
   - Sử dụng factories/fixtures
   - Seed data cho E2E tests
   - Cleanup sau mỗi test suite

---

## 🎓 Learning Resources

**Jest + NestJS:**
- https://docs.nestjs.com/fundamentals/testing

**Vitest + React Testing Library:**
- https://vitest.dev/
- https://testing-library.com/docs/react-testing-library/intro/

**Playwright:**
- https://playwright.dev/docs/intro

**k6 Performance Testing:**
- https://k6.io/docs/

---

## 💡 Recommendations

1. **Start Small:** Begin với critical paths (auth, payment)
2. **Automate Early:** Setup CI/CD ngay từ đầu
3. **Code Coverage:** Aim for 80%+ trên critical modules
4. **Test Pyramid:** Many unit tests → Some integration tests → Few E2E tests
5. **Mock External Services:** PayOS, S3, Email services
6. **Parallel Testing:** Run tests song song để giảm thời gian
7. **Visual Regression:** Consider Chromatic/Percy cho UI tests (optional)

---

**Next Steps:**
1. Review document này với team
2. Prioritize testing categories
3. Setup tools cho Phase 1
4. Write first tests
5. Iterate and improve coverage

Good luck! 🚀
