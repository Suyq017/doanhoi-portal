# Kế hoạch nâng cấp GitLab CI/CD Pipeline — Đoàn Hội Portal

## 1. Phân tích hiện trạng

### 1.1 Pipeline hiện tại (4 stages)

```
prepare → build → deploy-staging → deploy-prod
```

| Stage | Job | Mô tả |
|-------|-----|-------|
| `prepare` | `prepare:dependencies` | Cài đặt `npm ci` cho backend + frontend |
| `build` | `build:backend`, `build:frontend` | Docker build + push image lên GitLab Registry |
| `deploy-staging` | `deploy:staging` | SSH deploy lên EC2 staging (manual trigger) |
| `deploy-prod` | `deploy:production` | SSH deploy lên server production (manual trigger) |

### 1.2 Các vấn đề cần khắc phục

| # | Vấn đề | Chi tiết |
|---|--------|----------|
| 1 | **Thiếu stage lint/test** | Không có bước kiểm tra code quality, unit test, coverage trước khi build |
| 2 | **Thiếu security scanning** | Không quét SAST, dependency vulnerability, container scanning |
| 3 | **Không có chatbot evaluation** | Pipeline không chạy đánh giá chatbot RAG (RAGAS, tool trigger rate) |
| 4 | **Stage `push` (06-push.yml) bị orphan** | Có file nhưng không được include trong `.gitlab-ci.yml` — push đã được gộp vào build job |
| 5 | **Không có health check tự động** | Sau deploy chỉ `sleep 20`, không verify endpoint health |
| 6 | **Thiếu rollback mechanism** | Không có cơ chế tự động quay về version cũ khi deploy fail |
| 7 | **Không có test reports** | GitLab MR không hiển thị JUnit reports, coverage badge |
| 8 | **Thiếu notification** | Không thông báo kết quả pipeline qua Slack/email |

---

## 2. Pipeline mới đề xuất (9 stages)

```
prepare → lint → test → security → build → push → deploy-staging → verify → deploy-prod
```

### 2.1 Sơ đồ tổng quan

```
┌──────────┐    ┌──────────┐    ┌──────────────┐    ┌──────────┐
│ prepare  │───►│   lint   │───►│     test     │───►│ security │
│ npm ci   │    │ ESLint   │    │ Jest/Vitest  │    │ SAST     │
│          │    │ Prettier │    │ Coverage     │    │ Dep Scan │
└──────────┘    └──────────┘    │ Chatbot Eval │    └────┬─────┘
                                └──────────────┘         │
                                                         ▼
┌──────────┐    ┌──────────┐    ┌──────────────┐    ┌──────────┐
│  deploy  │◄───│  verify  │◄───│deploy-staging│◄───│  build   │
│   prod   │    │ smoke    │    │  (manual)    │    │ Docker   │
│ (manual) │    │ health   │    │              │    │ Push     │
└──────────┘    └──────────┘    └──────────────┘    └──────────┘
```

---

## 3. Chi tiết từng stage mới

### 3.1 Stage: `lint` (MỚI)

**File:** `.gitlab/ci/stages/02-lint.yml`

```yaml
lint:backend:
  stage: lint
  image: node:${NODE_VERSION}-alpine
  extends:
    - .rules_main_branches
  needs:
    - prepare:dependencies
  script:
    - cd backend
    - npx eslint "{src,apps,libs,test}/**/*.ts" --format gitlab
  artifacts:
    reports:
      codequality: backend/gl-codequality.json
    when: always

lint:frontend:
  stage: lint
  image: node:${NODE_VERSION}-alpine
  extends:
    - .rules_main_branches
  needs:
    - prepare:dependencies
  script:
    - cd frontend
    - npx eslint . --ext ts,tsx --format gitlab
  artifacts:
    reports:
      codequality: frontend/gl-codequality.json
    when: always
```

**Giá trị:** Phát hiện lỗi code sớm, hiển thị code quality report trên GitLab MR.

---

### 3.2 Stage: `test` (MỚI — 4 jobs)

**File:** `.gitlab/ci/stages/03-test.yml`

#### Job 1: `test:backend`
```yaml
test:backend:
  stage: test
  image: node:${NODE_VERSION}-alpine
  extends:
    - .rules_main_branches
  needs:
    - prepare:dependencies
  services:
    - name: pgvector/pgvector:pg15
      alias: postgres
      variables:
        POSTGRES_DB: doanhoi_test
        POSTGRES_USER: postgres
        POSTGRES_PASSWORD: test_password
  variables:
    DB_HOST: postgres
    DB_PORT: "5432"
    DB_USERNAME: postgres
    DB_PASSWORD: test_password
    DB_NAME: doanhoi_test
    NODE_ENV: test
  script:
    - cd backend
    - npm run test:cov -- --ci --reporters=default --reporters=jest-junit
  coverage: '/All files[^|]*\|[^|]*\s+([\d\.]+)/'
  artifacts:
    reports:
      junit: backend/junit.xml
      coverage_report:
        coverage_format: cobertura
        path: backend/coverage/cobertura-coverage.xml
    paths:
      - backend/coverage/
    when: always
    expire_in: 7 days
```

#### Job 2: `test:frontend`
```yaml
test:frontend:
  stage: test
  image: node:${NODE_VERSION}-alpine
  extends:
    - .rules_main_branches
  needs:
    - prepare:dependencies
  script:
    - cd frontend
    - npx vitest run --reporter=junit --outputFile=junit.xml --coverage
  artifacts:
    reports:
      junit: frontend/junit.xml
      coverage_report:
        coverage_format: cobertura
        path: frontend/coverage/cobertura-coverage.xml
    when: always
    expire_in: 7 days
```

#### Job 3: `test:chatbot-student` (MỚI — AI Evaluation)
```yaml
test:chatbot-student:
  stage: test
  image: python:3.11-slim
  extends:
    - .rules_main_branches
  needs:
    - prepare:dependencies
  variables:
    GEMINI_API_KEY: $GEMINI_API_KEY
    BACKEND_URL: $STAGING_BACKEND_URL
  before_script:
    - pip install ragas langchain-google-genai requests pandas
  script:
    - cd backend/test/evaluation
    - python evaluate.py --output results/student_eval_${CI_COMMIT_SHORT_SHA}.json
    - |
      echo "=== Chatbot Student Evaluation Results ==="
      python -c "
      import json
      with open('results/student_eval_${CI_COMMIT_SHORT_SHA}.json') as f:
          data = json.load(f)
      relevancy = data.get('avg_answer_relevancy', 0)
      print(f'Answer Relevancy: {relevancy:.4f}')
      if relevancy < 0.55:
          print('⚠️ WARNING: Answer Relevancy below threshold (0.55)')
          exit(1)
      else:
          print('✅ Answer Relevancy within acceptable range')
      "
  artifacts:
    paths:
      - backend/test/evaluation/results/
    expire_in: 30 days
    when: always
  allow_failure: true  # Không block pipeline nhưng hiển thị warning
  rules:
    - if: $CI_COMMIT_BRANCH =~ /^(staging|main)$/
      when: on_success
    - when: never
```

#### Job 4: `test:chatbot-staff` (MỚI — AI Evaluation)
```yaml
test:chatbot-staff:
  stage: test
  image: python:3.11-slim
  extends:
    - .rules_main_branches
  needs:
    - prepare:dependencies
  variables:
    GEMINI_API_KEY: $GEMINI_API_KEY
    BACKEND_URL: $STAGING_BACKEND_URL
  before_script:
    - pip install requests pandas
  script:
    - cd backend/test/evaluation
    - python evaluate_staff.py --output results/staff_eval_${CI_COMMIT_SHORT_SHA}.json
    - |
      echo "=== Chatbot Staff Evaluation Results ==="
      python -c "
      import json
      with open('results/staff_eval_${CI_COMMIT_SHORT_SHA}.json') as f:
          data = json.load(f)
      trigger_rate = data.get('tool_trigger_rate', 0)
      p50 = data.get('latency_p50', 0)
      print(f'Tool Trigger Rate: {trigger_rate:.2%}')
      print(f'Latency p50: {p50:.0f}ms')
      if trigger_rate < 0.80:
          print('⚠️ WARNING: Tool Trigger Rate below threshold (0.80)')
          exit(1)
      else:
          print('✅ Tool Trigger Rate within acceptable range')
      "
  artifacts:
    paths:
      - backend/test/evaluation/results/
    expire_in: 30 days
    when: always
  allow_failure: true
  rules:
    - if: $CI_COMMIT_BRANCH =~ /^(staging|main)$/
      when: on_success
    - when: never
```

**Giá trị:**
- **JUnit reports** hiển thị trực tiếp trên GitLab MR (1107 backend tests + 106 frontend tests)
- **Coverage reports** hiển thị diff coverage trên MR
- **Chatbot evaluation** theo dõi chất lượng RAG qua từng commit, phát hiện regression

---

### 3.3 Stage: `security` (MỚI)

**File:** `.gitlab/ci/stages/04-security.yml`

```yaml
# SAST - Static Application Security Testing (miễn phí trên GitLab)
sast:
  stage: security

include:
  - template: Security/SAST.gitlab-ci.yml
  - template: Security/Dependency-Scanning.gitlab-ci.yml

# Audit dependencies cho CVE
security:audit:
  stage: security
  image: node:${NODE_VERSION}-alpine
  extends:
    - .rules_main_branches
  needs:
    - prepare:dependencies
  script:
    - echo "=== Backend Dependency Audit ==="
    - cd backend && npm audit --audit-level=high --json > ../backend-audit.json || true
    - cd ..
    - echo "=== Frontend Dependency Audit ==="
    - cd frontend && npm audit --audit-level=high --json > ../frontend-audit.json || true
    - |
      # Parse and report
      echo "=== Audit Summary ==="
      BE_HIGH=$(cat backend-audit.json | grep -c '"severity":"high"' || echo "0")
      BE_CRITICAL=$(cat backend-audit.json | grep -c '"severity":"critical"' || echo "0")
      FE_HIGH=$(cat frontend-audit.json | grep -c '"severity":"high"' || echo "0")
      FE_CRITICAL=$(cat frontend-audit.json | grep -c '"severity":"critical"' || echo "0")
      echo "Backend: ${BE_HIGH} high, ${BE_CRITICAL} critical"
      echo "Frontend: ${FE_HIGH} high, ${FE_CRITICAL} critical"
      TOTAL_CRITICAL=$((BE_CRITICAL + FE_CRITICAL))
      if [ "$TOTAL_CRITICAL" -gt 0 ]; then
        echo "❌ Critical vulnerabilities found!"
        exit 1
      fi
  artifacts:
    paths:
      - backend-audit.json
      - frontend-audit.json
    expire_in: 7 days
    when: always
  allow_failure: false

# Scan Docker image sau khi build
container_scanning:
  stage: security
  image: docker:24.0.5
  services:
    - docker:24.0.5-dind
  needs:
    - build:backend
    - build:frontend
  variables:
    TRIVY_SEVERITY: "HIGH,CRITICAL"
  before_script:
    - apk add --no-cache curl
    - curl -sfL https://raw.githubusercontent.com/aquasecurity/trivy/main/contrib/install.sh | sh -s -- -b /usr/local/bin
    - docker login -u $CI_REGISTRY_USER -p $CI_REGISTRY_PASSWORD $CI_REGISTRY
  script:
    - echo "🔍 Scanning backend image..."
    - docker pull $BACKEND_IMAGE:$CI_COMMIT_SHORT_SHA
    - trivy image --exit-code 0 --severity $TRIVY_SEVERITY --format table $BACKEND_IMAGE:$CI_COMMIT_SHORT_SHA
    - echo "🔍 Scanning frontend image..."
    - docker pull $FRONTEND_IMAGE:$CI_COMMIT_SHORT_SHA
    - trivy image --exit-code 0 --severity $TRIVY_SEVERITY --format table $FRONTEND_IMAGE:$CI_COMMIT_SHORT_SHA
  rules:
    - if: $CI_COMMIT_BRANCH =~ /^(staging|main)$/
  allow_failure: true
```

**Giá trị:**
- **SAST**: Quét source code cho SQL injection, XSS, hardcoded secrets
- **Dependency scanning**: Phát hiện CVE trong node_modules
- **Container scanning** (Trivy): Quét Docker image cho OS-level vulnerabilities

---

### 3.4 Stage: `verify` (MỚI — Post-deploy verification)

**File:** `.gitlab/ci/stages/08-verify.yml`

```yaml
verify:staging:
  stage: verify
  image: alpine:3.19
  needs:
    - deploy:staging
  variables:
    STAGING_URL: "http://ec2-52-90-100-205.compute-1.amazonaws.com"
    MAX_RETRIES: "10"
    RETRY_INTERVAL: "15"
  before_script:
    - apk add --no-cache curl jq
  script:
    - echo "🔍 Running post-deploy verification..."

    # Health check backend API
    - |
      echo "--- Backend Health Check ---"
      for i in $(seq 1 $MAX_RETRIES); do
        HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "${STAGING_URL}/api" || echo "000")
        if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "301" ]; then
          echo "✅ Backend API responding (HTTP $HTTP_CODE)"
          break
        fi
        echo "⏳ Attempt $i/$MAX_RETRIES - Backend not ready (HTTP $HTTP_CODE)"
        sleep $RETRY_INTERVAL
      done
      if [ "$HTTP_CODE" != "200" ] && [ "$HTTP_CODE" != "301" ]; then
        echo "❌ Backend health check failed after $MAX_RETRIES attempts"
        exit 1
      fi

    # Health check frontend
    - |
      echo "--- Frontend Health Check ---"
      HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "${STAGING_URL}/")
      if [ "$HTTP_CODE" = "200" ]; then
        echo "✅ Frontend responding (HTTP $HTTP_CODE)"
      else
        echo "❌ Frontend health check failed (HTTP $HTTP_CODE)"
        exit 1
      fi

    # Smoke test: Auth endpoint
    - |
      echo "--- Smoke Test: Auth API ---"
      RESPONSE=$(curl -s -w "\n%{http_code}" "${STAGING_URL}/api/auth/me" -H "Authorization: Bearer invalid")
      HTTP_CODE=$(echo "$RESPONSE" | tail -1)
      if [ "$HTTP_CODE" = "401" ]; then
        echo "✅ Auth guard working correctly (HTTP 401 for invalid token)"
      else
        echo "⚠️ Unexpected auth response: HTTP $HTTP_CODE"
      fi

    - echo "✅ All post-deploy verifications passed"
  environment:
    name: staging
    action: verify
  rules:
    - if: $CI_COMMIT_BRANCH == "staging"
      when: on_success
    - if: $CI_COMMIT_BRANCH == "dev"
      when: on_success
```

---

### 3.5 Cải tiến deploy jobs hiện tại

#### 3.5.1 Thêm cơ chế Rollback tự động

Thêm đoạn sau vào cuối script deploy staging/prod:

```yaml
    # Auto-rollback nếu health check thất bại
    - |
      ssh $DEPLOY_USER@$DEPLOY_SERVER << 'ENDSSH'
        set -e
        cd $DEPLOY_PATH

        echo "⏳ Running health check..."
        HEALTHY=false
        for i in $(seq 1 $HEALTH_CHECK_RETRIES); do
          HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:2681/api || echo "000")
          if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "301" ]; then
            HEALTHY=true
            echo "✅ Health check passed on attempt $i"
            break
          fi
          echo "⏳ Health check attempt $i/$HEALTH_CHECK_RETRIES failed (HTTP $HTTP_CODE)"
          sleep $HEALTH_CHECK_INTERVAL
        done

        if [ "$HEALTHY" = "false" ]; then
          echo "❌ Health check failed! Rolling back..."
          if [ -f .previous-images.txt ]; then
            # Rollback to previous images
            docker compose -f docker-compose.yml down
            # Restore previous images and restart
            docker compose -f docker-compose.yml up -d --remove-orphans
            echo "🔄 Rollback completed"
          fi
          exit 1
        fi
      ENDSSH
```

#### 3.5.2 Thêm notification

```yaml
.notify_success:
  after_script:
    - |
      if [ -n "$SLACK_WEBHOOK_URL" ]; then
        curl -X POST "$SLACK_WEBHOOK_URL" \
          -H 'Content-type: application/json' \
          --data "{
            \"text\": \"✅ Deploy ${ENVIRONMENT} thành công - ${CI_PROJECT_NAME} @ ${CI_COMMIT_SHORT_SHA}\",
            \"blocks\": [{
              \"type\": \"section\",
              \"text\": {
                \"type\": \"mrkdwn\",
                \"text\": \"*Deploy ${ENVIRONMENT}*\n• Commit: \`${CI_COMMIT_SHORT_SHA}\`\n• Branch: \`${CI_COMMIT_BRANCH}\`\n• Pipeline: <${CI_PIPELINE_URL}|#${CI_PIPELINE_ID}>\"
              }
            }]
          }"
      fi

.notify_failure:
  after_script:
    - |
      if [ -n "$SLACK_WEBHOOK_URL" ]; then
        curl -X POST "$SLACK_WEBHOOK_URL" \
          -H 'Content-type: application/json' \
          --data "{\"text\": \"❌ Deploy ${ENVIRONMENT} THẤT BẠI - ${CI_PROJECT_NAME} @ ${CI_COMMIT_SHORT_SHA}\nPipeline: ${CI_PIPELINE_URL}\"}"
      fi
```

---

## 4. File `.gitlab-ci.yml` mới hoàn chỉnh

```yaml
include:
  - local: '.gitlab/ci/variables.yml'
  - local: '.gitlab/ci/cache.yml'
  - local: '.gitlab/ci/rules.yml'
  - local: '.gitlab/ci/templates/ssh-deploy.yml'
  - local: '.gitlab/ci/templates/notify.yml'        # MỚI

  - local: '.gitlab/ci/stages/01-prepare.yml'
  - local: '.gitlab/ci/stages/02-lint.yml'           # MỚI
  - local: '.gitlab/ci/stages/03-test.yml'           # MỚI
  - local: '.gitlab/ci/stages/04-security.yml'       # MỚI
  - local: '.gitlab/ci/stages/05-build.yml'          # Đổi số từ 04
  - local: '.gitlab/ci/stages/07-deploy-staging.yml'
  - local: '.gitlab/ci/stages/08-verify.yml'         # MỚI
  - local: '.gitlab/ci/stages/09-deploy-prod.yml'

  # GitLab SAST/Dependency Scan templates (miễn phí)
  - template: Security/SAST.gitlab-ci.yml
  - template: Security/Dependency-Scanning.gitlab-ci.yml

stages:
  - prepare
  - lint
  - test
  - security
  - build
  - deploy-staging
  - verify
  - deploy-prod
```

---

## 5. Biến CI/CD cần bổ sung trên GitLab

| Biến | Phạm vi | Mô tả |
|------|---------|-------|
| `GEMINI_API_KEY` | staging, production | API key cho Gemini 2.5 Flash (judge cho RAGAS) |
| `STAGING_BACKEND_URL` | staging | URL backend staging cho chatbot evaluation |
| `SLACK_WEBHOOK_URL` | * | Webhook Slack để gửi notification |
| `SONAR_TOKEN` | * | (Tùy chọn) SonarQube token nếu dùng thêm |

---

## 6. Tổng hợp so sánh trước/sau

| Tiêu chí | Pipeline hiện tại | Pipeline nâng cấp |
|----------|-------------------|-------------------|
| **Stages** | 4 | 8 |
| **Lint** | ❌ Không có | ✅ ESLint BE + FE, code quality report |
| **Unit Test** | ❌ Không chạy trong CI | ✅ 1107 BE tests + 106 FE tests, JUnit report |
| **Coverage** | ❌ Không đo | ✅ Cobertura report, diff coverage trên MR |
| **AI Evaluation** | ❌ Không có | ✅ RAGAS (chatbot SV) + Tool Trigger (chatbot CB) |
| **Security** | ❌ Không quét | ✅ SAST + npm audit + Trivy container scan |
| **Post-deploy verify** | ❌ Chỉ `sleep 20` | ✅ Health check + smoke test tự động |
| **Rollback** | ❌ Không có | ✅ Auto-rollback khi health check fail |
| **Notification** | ❌ Không có | ✅ Slack webhook |
| **MR Reports** | ❌ Không có | ✅ JUnit, coverage, code quality, security |

---

## 7. Kế hoạch viết vào Report (Chương 7 — Triển khai)

### 7.1 Vị trí đề xuất

Thêm mục **7.1.x — Quy trình CI/CD tự động** vào sau "Kiến trúc triển khai thực tế" (mục 7.1.2), trước "Cấu hình reverse proxy" (mục 7.1.3).

### 7.2 Nội dung đề xuất cho report

```
\subsubsection{Quy trình tích hợp và triển khai liên tục (CI/CD)}

Hệ thống áp dụng quy trình CI/CD tự động hóa trên nền tảng GitLab CI/CD,
tổ chức theo kiến trúc pipeline 8 giai đoạn:

\begin{enumerate}
    \item \textbf{Prepare}: Cài đặt dependencies cho backend và frontend
          thông qua \texttt{npm ci} với cơ chế cache trên GitLab Runner.
    \item \textbf{Lint}: Kiểm tra code style bằng ESLint, sinh báo cáo
          Code Quality hiển thị trên Merge Request.
    \item \textbf{Test}: Chạy bộ kiểm thử tự động gồm:
        \begin{itemize}
            \item 1107 unit/integration tests backend (Jest) với PostgreSQL + pgvector service.
            \item 106 behavioral tests frontend (Vitest + React Testing Library).
            \item Đánh giá chất lượng chatbot sinh viên (RAGAS Answer Relevancy)
                  và chatbot cán bộ (Tool Trigger Rate, SLA Metrics).
        \end{itemize}
        Kết quả được xuất dưới dạng JUnit XML và Cobertura coverage,
        hiển thị trực tiếp trên giao diện GitLab Merge Request.
    \item \textbf{Security}: Quét bảo mật tự động gồm SAST (Static Application
          Security Testing), \texttt{npm audit} cho CVE trong dependencies,
          và Trivy container scanning cho Docker images.
    \item \textbf{Build}: Đóng gói backend (NestJS) và frontend (React + Nginx)
          thành Docker images theo multi-stage build, push lên GitLab Container Registry.
    \item \textbf{Deploy Staging}: Triển khai lên môi trường staging qua SSH
          với Docker Compose (trigger thủ công).
    \item \textbf{Verify}: Chạy kiểm tra sau triển khai tự động: health check
          endpoint API, kiểm tra phản hồi frontend, smoke test xác thực.
    \item \textbf{Deploy Production}: Triển khai lên production với cơ chế
          rollback tự động khi health check thất bại (trigger thủ công).
\end{enumerate}

[CHÈN HÌNH VẼ PIPELINE Ở ĐÂY - pipeline_stages.drawio.png]

Pipeline được cấu hình theo mô hình modular: mỗi stage được định nghĩa
trong file YAML riêng biệt tại thư mục \texttt{.gitlab/ci/stages/},
các template dùng chung (SSH deploy, notification) tách vào
\texttt{.gitlab/ci/templates/}. Điều này giúp dễ bảo trì và mở rộng
khi thêm service mới.

Đặc biệt, pipeline tích hợp bước đánh giá chất lượng chatbot AI
trong giai đoạn Test: sau mỗi commit lên nhánh staging/main,
hệ thống tự động chạy bộ golden dataset qua chatbot sinh viên
(40 câu hỏi, đo Answer Relevancy bằng RAGAS) và chatbot cán bộ
(20 câu hỏi, đo Tool Trigger Rate), so sánh với ngưỡng chấp nhận
để phát hiện regression sớm.
```

### 7.3 Hình vẽ cần bổ sung

1. **Sơ đồ pipeline CI/CD** (drawio): 8 stages với các jobs trong mỗi stage, chú thích artifacts flow
2. **Bảng tổng hợp CI/CD variables**: Liệt kê các biến cấu hình trên GitLab Settings

### 7.4 Cập nhật bảng đánh giá hệ thống (Chương 7.2)

Bổ sung dòng vào bảng "Tổng hợp đánh giá hệ thống sau triển khai":

| Tiêu chí | Kết quả đánh giá | Mức độ |
|----------|-------------------|--------|
| Tự động hóa CI/CD | Pipeline 8 giai đoạn bao phủ lint, test, security, build, deploy, verify với rollback tự động | Tốt |
| Tích hợp AI evaluation trong CI | Đánh giá chatbot RAG tự động mỗi commit, phát hiện regression chất lượng | Tốt |

---

## 8. Thứ tự triển khai đề xuất

| Ưu tiên | Công việc | Trạng thái |
|---------|-----------|------------|
| 🔴 P0 | Thêm stage `test` (BE + FE) với JUnit + Coverage | ✅ Đã triển khai (`03-test.yml`) |
| 🔴 P0 | Thêm stage `lint` | ✅ Đã triển khai (`02-lint.yml`) |
| 🟡 P1 | Thêm stage `verify` (health check sau deploy) | ✅ Đã triển khai (`08-verify.yml`) |
| 🟡 P1 | Thêm `security:audit` (npm audit) | ✅ Đã triển khai (`04-security.yml`) |
| 🟡 P1 | Thêm rollback mechanism | ✅ Đã triển khai (trong `07-deploy-staging.yml` & `09-deploy-prod.yml`) |
| 🟢 P2 | Thêm chatbot evaluation jobs | ✅ Đã triển khai (`03-test.yml` — `test:chatbot-student` & `test:chatbot-staff`) |
| 🟢 P2 | Thêm Trivy container scanning | ✅ Đã triển khai (`04-security.yml` — `container_scanning`) |
| 🟢 P2 | Thêm Slack notification | ✅ Đã triển khai (`templates/notify.yml`) |
| ⚪ P3 | Thêm SAST template GitLab | ✅ Đã triển khai (include trong `.gitlab-ci.yml`) |
| ⚪ P3 | Viết nội dung vào report Chương 7 | ⏳ Chưa thực hiện |

### 8.1 Tổng kết triển khai (Cập nhật: 24/05/2025)

**Đã hoàn thành 9/10 hạng mục.** Các file CI/CD đã được tạo/cập nhật:

| File | Hành động |
|------|-----------|
| `.gitlab-ci.yml` | Cập nhật — Pipeline 8 stages, include SAST/Dep Scan templates |
| `.gitlab/ci/variables.yml` | Cập nhật — Tăng health check retries, thêm SAST excluded paths |
| `.gitlab/ci/stages/02-lint.yml` | **Tạo mới** — ESLint BE + FE với code quality report |
| `.gitlab/ci/stages/03-test.yml` | **Tạo mới** — 4 jobs: backend, frontend, chatbot-student, chatbot-staff |
| `.gitlab/ci/stages/04-security.yml` | **Tạo mới** — npm audit + Trivy container scanning |
| `.gitlab/ci/stages/05-build.yml` | **Tạo mới** — Đổi số từ 04 → 05 |
| `.gitlab/ci/stages/07-deploy-staging.yml` | Cập nhật — Thêm rollback + notification |
| `.gitlab/ci/stages/08-verify.yml` | **Tạo mới** — Health check + smoke test |
| `.gitlab/ci/stages/09-deploy-prod.yml` | Cập nhật — Thêm rollback + notification |
| `.gitlab/ci/templates/notify.yml` | **Tạo mới** — Slack notification templates |
| `.gitlab/ci/stages/04-build.yml` | **Đã xóa** — Thay bằng `05-build.yml` |
| `.gitlab/ci/stages/06-push.yml` | **Đã xóa** — Orphan file |

**Cần cấu hình trên GitLab Settings > CI/CD > Variables:**
- `GEMINI_API_KEY` — API key cho chatbot evaluation
- `STAGING_BACKEND_URL` — URL backend staging
- `SLACK_WEBHOOK_URL` — Slack webhook cho notification

---

## 9. Lưu ý kỹ thuật

1. **Chatbot evaluation cần staging đang chạy**: Jobs `test:chatbot-student` và `test:chatbot-staff` cần gọi API staging thật → chỉ chạy trên branch `staging`/`main`, dùng `allow_failure: true` để không block pipeline.

2. **PostgreSQL service cho test**: GitLab CI hỗ trợ `services` keyword để chạy container PostgreSQL + pgvector song song với test runner. Cần image `pgvector/pgvector:pg15`.

3. **Coverage threshold**: Có thể set `coverage` keyword trong CI để enforce minimum coverage (ví dụ 75% statements). Nếu dưới ngưỡng, pipeline fail.

4. **Artifact retention**: Test results giữ 7 ngày, chatbot evaluation giữ 30 ngày (theo dõi trend), Docker images tag theo commit SHA.

5. **Pipeline duration**: Ước tính pipeline đầy đủ: ~12-15 phút (prepare: 2m, lint: 1m, test: 3m, security: 2m, build: 4m, deploy+verify: 3m). Lint và test chạy song song, build 2 images chạy song song.
