# CI/CD Pipeline — Giải thích chi tiết bằng Diagram

> Tài liệu minh họa cách GitLab Runner tạo container và thực thi từng stage trong pipeline nâng cấp 9 giai đoạn.

---

## 1. Tổng quan: GitLab Runner hoạt động như thế nào?

```
┌─────────────────────────────────────────────────────────────────────┐
│                        GITLAB SERVER (Cloud)                        │
│  ┌───────────────┐  ┌──────────────┐  ┌──────────────────────────┐ │
│  │  Git Repo     │  │  CI/CD Vars  │  │  Container Registry      │ │
│  │  (source code)│  │  (secrets)   │  │  (Docker images output)  │ │
│  └───────┬───────┘  └──────┬───────┘  └──────────────────────────┘ │
│          │                 │                                        │
│          └────────┬────────┘                                        │
│                   │  Gửi job + biến môi trường                      │
│                   ▼                                                  │
│  ┌────────────────────────────────────────────┐                     │
│  │         GitLab Runner (trên EC2/VM)        │ ◄── HOST MACHINE    │
│  │                                            │                     │
│  │  Nhận job → Pull image → Tạo container     │                     │
│  │  → Mount source → Chạy script → Upload     │                     │
│  │    artifacts → Hủy container               │                     │
│  └────────────────────────────────────────────┘                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Quy trình xử lý 1 job:

```mermaid
sequenceDiagram
    participant GS as GitLab Server
    participant GR as GitLab Runner (Host)
    participant DC as Docker Engine
    participant CT as Container (Job)

    GS->>GR: 1. Gửi job definition + CI variables
    GR->>DC: 2. docker pull <image>
    DC-->>GR: Image sẵn sàng
    GR->>DC: 3. docker run <image> (tạo container)
    DC->>CT: Container khởi động
    GR->>CT: 4. Clone/checkout source code vào /builds/
    GR->>CT: 5. Restore cache (node_modules từ lần trước)
    GR->>CT: 6. Download artifacts từ job trước (nếu có)
    CT->>CT: 7. Chạy before_script
    CT->>CT: 8. Chạy script (lệnh chính)
    CT->>CT: 9. Chạy after_script
    CT-->>GR: 10. Upload artifacts (files output)
    CT-->>GR: 11. Save cache
    GR->>DC: 12. docker rm (hủy container)
    GR-->>GS: 13. Báo cáo kết quả (pass/fail + artifacts)
```

---

## 2. Pipeline tổng thể — 9 Stages

```mermaid
graph LR
    subgraph "Pipeline Flow"
        S1["① prepare"]
        S2["② lint"]
        S3["③ test"]
        S4["④ build"]
        S5["⑤ security"]
        S6["⑥ deploy-staging"]
        S7["⑦ verify"]
        S8["⑧ evaluate"]
        S9["⑨ deploy-prod"]

        S1 --> S2 --> S3 --> S4 --> S5 --> S6 --> S7 --> S8 --> S9
    end

    style S1 fill:#4CAF50,color:#fff
    style S2 fill:#2196F3,color:#fff
    style S3 fill:#FF9800,color:#fff
    style S4 fill:#9C27B0,color:#fff
    style S5 fill:#F44336,color:#fff
    style S6 fill:#00BCD4,color:#fff
    style S7 fill:#8BC34A,color:#fff
    style S8 fill:#FF5722,color:#fff
    style S9 fill:#E91E63,color:#fff
```

### Song song hóa jobs trong mỗi stage:

```mermaid
graph TD
    subgraph "Stage 1: prepare"
        P1[prepare:dependencies]
    end

    subgraph "Stage 2: lint — chạy song song"
        L1[lint:backend]
        L2[lint:frontend]
    end

    subgraph "Stage 3: test — chạy song song"
        T1[test:backend]
        T2[test:frontend]
    end

    subgraph "Stage 4: build — chạy song song"
        B1[build:backend]
        B2[build:frontend]
    end

    subgraph "Stage 5: security — chạy song song"
        SEC1[sast]
        SEC2[security:audit]
        SEC3[container_scanning]
    end

    subgraph "Stage 6: deploy-staging"
        D1["deploy:staging (auto on staging branch)"]
    end

    subgraph "Stage 7: verify"
        V1[verify:staging]
    end

    subgraph "Stage 8: evaluate — chạy song song"
        EV1[evaluate:chatbot-student]
        EV2[evaluate:chatbot-staff]
    end

    subgraph "Stage 9: deploy-prod"
        DP1["deploy:production (manual)"]
    end

    P1 --> L1 & L2
    L1 & L2 --> T1 & T2
    T1 & T2 --> B1 & B2
    B1 & B2 --> SEC1 & SEC2 & SEC3
    SEC1 & SEC2 & SEC3 --> D1
    D1 --> V1
    V1 --> EV1 & EV2
    EV1 & EV2 --> DP1
```

---

## 3. Chi tiết từng Stage — Container bên trong làm gì?

---

### Stage 1: `prepare` — Cài đặt dependencies

```
┌─────────────────────────── GitLab Runner (Host) ───────────────────────────┐
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │  Container: node:20-alpine                                          │    │
│  │  Job: prepare:dependencies                                          │    │
│  │                                                                     │    │
│  │  /builds/doanhoi-portal/          ← Source code được clone vào đây  │    │
│  │  ├── backend/                                                       │    │
│  │  │   └── package.json                                               │    │
│  │  └── frontend/                                                      │    │
│  │      └── package.json                                               │    │
│  │                                                                     │    │
│  │  SCRIPT:                                                            │    │
│  │  1. cd backend && npm ci --cache ../.npm                            │    │
│  │  2. cd ../frontend && npm ci --cache ../.npm                        │    │
│  │                                                                     │    │
│  │  OUTPUT (Artifacts):                                                │    │
│  │  ├── backend/node_modules/    ─── (1h TTL) ──►  Jobs sau dùng lại  │    │
│  │  └── frontend/node_modules/   ─── (1h TTL) ──►  Jobs sau dùng lại  │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                             │
│  Container bị hủy sau khi job hoàn thành ✕                                  │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

### Stage 2: `lint` — Kiểm tra code style (2 container song song)

```mermaid
flowchart TD
    subgraph HOST["🖥️ GitLab Runner Host"]
        direction LR
        subgraph CT_BE["📦 Container 1: lint:backend"]
            LB1["Download artifacts\n(node_modules)"]
            LB2["npx eslint BE code\n--format gitlab"]
            LB3["Output:\ngl-codequality.json"]
            LB1 --> LB2 --> LB3
        end
        subgraph CT_FE["📦 Container 2: lint:frontend"]
            LF1["Download artifacts\n(node_modules)"]
            LF2["npx eslint FE code\n--format gitlab"]
            LF3["Output:\ngl-codequality.json"]
            LF1 --> LF2 --> LF3
        end
    end
    LB3 & LF3 -->|"Code Quality Report"| MR["📋 Hiển thị trên GitLab MR"]
```

---

### Stage 3: `test` — Chạy kiểm thử (2 container song song)

```mermaid
flowchart TD
    subgraph HOST["🖥️ GitLab Runner Host"]
        subgraph CT_TB["📦 Container 1 + Service: test:backend"]
            direction LR
            subgraph MAIN1["Main Container: node:20-alpine"]
                TB1["npm run test:cov"]
                TB2["1107 unit/integration tests"]
                TB1 --> TB2
            end
            subgraph SVC1["Service Container: pgvector:pg15"]
                DB1["PostgreSQL 15\n+ pgvector extension\nDB: doanhoi_test"]
            end
            MAIN1 -->|"DB_HOST=postgres:5432"| SVC1
        end

        subgraph CT_TF["📦 Container 2: test:frontend"]
            TF1["npx vitest run\n106 tests + coverage"]
        end
    end

    CT_TB -->|"junit.xml + coverage/"| AR1["📊 Artifacts"]
    CT_TF -->|"junit.xml + coverage/"| AR1
    AR1 -->|"JUnit + Cobertura report"| MR["📋 Hiển thị trên GitLab MR"]
```

> **Lưu ý:** Job `test:backend` dùng keyword `services` — GitLab Runner tạo **2 container liên kết** (test runner + PostgreSQL) trong cùng 1 network. Container PostgreSQL có hostname `postgres`.

---

### Stage 4: `build` — Đóng gói Docker image (2 container song song)

```mermaid
flowchart LR
    subgraph HOST["🖥️ GitLab Runner Host"]
        subgraph CT_BB["📦 build:backend"]
            BB1["docker build\n-f Dockerfile.prod"]
            BB2["Multi-stage build:\n1. node:20 → npm ci + build\n2. node:20-alpine → copy dist"]
            BB3["docker push\nregistry/.../backend:abc1234"]
            BB1 --> BB2 --> BB3
        end
        subgraph CT_BF["📦 build:frontend"]
            BF1["docker build\n-f Dockerfile.prod"]
            BF2["Multi-stage build:\n1. node:20 → npm ci + vite build\n2. nginx:alpine → copy dist"]
            BF3["docker push\nregistry/.../frontend:abc1234"]
            BF1 --> BF2 --> BF3
        end
    end
    BB3 & BF3 --> REG["🗄️ GitLab Container Registry\n\nbackend:abc1234\nfrontend:abc1234"]
```

---

### Stage 5: `security` — Quét bảo mật (3 jobs)

```mermaid
flowchart TD
    subgraph HOST["🖥️ GitLab Runner Host"]
        subgraph CT_SAST["📦 Container 1: GitLab SAST Analyzer"]
            SAST1["Quét source code tự động"]
            SAST2["Phát hiện:\n• SQL Injection\n• XSS\n• Hardcoded secrets"]
            SAST1 --> SAST2
        end

        subgraph CT_AUDIT["📦 Container 2: node:20-alpine"]
            direction TB
            AU1["npm audit BE --audit-level=high"]
            AU2["npm audit FE --audit-level=high"]
            AU3["Đếm HIGH + CRITICAL CVEs"]
            AU4{"CRITICAL > 0?"}
            AU5["❌ exit 1 — FAIL pipeline"]
            AU6["✅ PASS"]
            AU1 --> AU2 --> AU3 --> AU4
            AU4 -->|Có| AU5
            AU4 -->|Không| AU6
        end

        subgraph CT_TRIVY["📦 Container 3: docker:24.0.5 + DinD"]
            direction TB
            TR1["docker pull backend-image"]
            TR2["trivy image scan backend"]
            TR3["docker pull frontend-image"]
            TR4["trivy image scan frontend"]
            TR1 --> TR2 --> TR3 --> TR4
        end
    end

    CT_SAST -->|"SAST report"| RPT["📋 Security tab trên MR"]
    CT_AUDIT -->|"audit.json"| RPT
    CT_TRIVY -->|"Trivy scan results"| RPT
```

> **`container_scanning` chạy sau build** vì cần pull Docker images đã push lên Registry ở stage 4. Dùng Docker-in-Docker (DinD) để chạy Trivy bên trong container.

---

### Stage 6: `deploy-staging` — Triển khai lên staging

```mermaid
flowchart TD
    subgraph HOST["🖥️ GitLab Runner Host"]
        subgraph CT_DS["📦 Container: alpine + SSH"]
            DS1["🔑 Setup SSH key\n(từ CI/CD variables)"]
            DS2["SSH vào EC2 Staging"]
        end
    end

    CT_DS -->|"SSH tunnel"| EC2

    subgraph EC2["🖥️ EC2 Staging Server"]
        E1["Backup images hiện tại\n→ .previous-images.txt"]
        E2["docker compose pull\n(pull images mới từ Registry)"]
        E3["docker compose up -d\n(restart services)"]
        E4["Health check loop (10 retries)\ncurl localhost:2681/api"]
        E5{"HTTP 200/301?"}
        E6["✅ Deploy thành công"]
        E7["🔄 Auto-rollback\nPull previous images\ndocker compose up -d"]

        E1 --> E2 --> E3 --> E4 --> E5
        E5 -->|Có| E6
        E5 -->|Không sau 10 retries| E7
    end

    E6 --> SLACK["📢 Slack: ✅ Deploy staging thành công"]
    E7 --> SLACK2["📢 Slack: ❌ Deploy staging THẤT BẠI + đã rollback"]
```

> **Branch `staging`**: tự động deploy (không cần bấm).
> **Branch `dev`**: manual trigger (bấm ▶️ trên GitLab UI).

---

### Stage 7: `verify` — Kiểm tra sau triển khai

```mermaid
flowchart TD
    subgraph HOST["🖥️ GitLab Runner Host"]
        subgraph CT_V["📦 Container: alpine:3.19"]
            V0["apk add curl jq"]
            V1["Health Check Backend\ncurl STAGING_URL/api"]
            V2{"HTTP 200/301?"}
            V3["Health Check Frontend\ncurl STAGING_URL/"]
            V4{"HTTP 200?"}
            V5["Smoke Test Auth\ncurl STAGING_URL/api/auth/me\nwith invalid token"]
            V6{"HTTP 401?"}
            V7["✅ All checks passed"]
            V_FAIL["❌ Verification failed\nexit 1"]
            V_RETRY["⏳ Retry (max 10 lần)\nsleep 15s giữa mỗi lần"]

            V0 --> V1 --> V2
            V2 -->|Không| V_RETRY --> V1
            V2 -->|Có| V3 --> V4
            V4 -->|Không| V_FAIL
            V4 -->|Có| V5 --> V6
            V6 -->|Có — Auth guard hoạt động| V7
            V6 -->|Không — Warning only| V7
        end
    end

    V7 -->|"Unlock evaluate stage"| NEXT["→ Stage 8: evaluate"]
```

---

### Stage 8: `evaluate` — Đánh giá chất lượng chatbot AI (2 container song song)

```mermaid
flowchart TD
    subgraph HOST["🖥️ GitLab Runner Host"]
        subgraph CT_CS["📦 Container 1: python:3.11-slim"]
            CS0["evaluate:chatbot-student"]
            CS1["pip install ragas, langchain-google-genai..."]
            CS2["python evaluate.py\n→ Gửi 40 câu hỏi đến staging API"]
            CS3["Gemini judge đánh giá Answer Relevancy"]
            CS4{"Relevancy ≥ 0.55?"}
            CS5["✅ PASS"]
            CS6["⚠️ WARNING (allow_failure)"]
            CS0 --> CS1 --> CS2 --> CS3 --> CS4
            CS4 -->|Có| CS5
            CS4 -->|Không| CS6
        end

        subgraph CT_CST["📦 Container 2: python:3.11-slim"]
            CST0["evaluate:chatbot-staff"]
            CST1["pip install requests, pandas"]
            CST2["python evaluate_staff.py\n→ Gửi 20 câu hỏi đến staging API"]
            CST3["Đo Tool Trigger Rate + Latency"]
            CST4{"Trigger Rate ≥ 80%?"}
            CST5["✅ PASS"]
            CST6["⚠️ WARNING (allow_failure)"]
            CST0 --> CST1 --> CST2 --> CST3 --> CST4
            CST4 -->|Có| CST5
            CST4 -->|Không| CST6
        end
    end

    CT_CS -->|"student_eval_*.json"| AR["📊 AI Eval Results (30 days)"]
    CT_CST -->|"staff_eval_*.json"| AR
```

> **Chạy sau verify** vì cần staging server đã deploy version mới + đã xác nhận hoạt động.
> **`allow_failure: true`** — nếu chatbot kém hơn threshold thì hiện warning, không block deploy prod.
> **Chỉ chạy trên branch `dev`/`staging`** — branch `main` deploy prod trực tiếp.

---

### Stage 9: `deploy-prod` — Triển khai Production (Manual trigger)

```mermaid
flowchart TD
    subgraph HOST["🖥️ GitLab Runner Host"]
        subgraph CT_DP["📦 Container: alpine + SSH"]
            DP1["🔑 Setup SSH key"]
            DP2["SSH vào Production Server"]
        end
    end

    CT_DP -->|"SSH tunnel"| PROD

    subgraph PROD["🖥️ Production Server"]
        P1["Lưu images hiện tại\nvào .previous-images.txt"]
        P2["docker compose pull\n(pull images tag mới)"]
        P3["docker compose up -d\n(restart với image mới)"]
        P4["Health check loop (10 retries)\ncurl localhost:2681/api"]
        P5{"Healthy?"}
        P6["✅ Production LIVE"]
        P7["❌ ROLLBACK\nPull previous images\ndocker compose up -d"]

        P1 --> P2 --> P3 --> P4 --> P5
        P5 -->|Có| P6
        P5 -->|Không| P7
    end

    P6 --> SL1["📢 Slack: ✅ Deploy production thành công"]
    P7 --> SL2["📢 Slack: ❌ Deploy production THẤT BẠI + đã rollback"]
```

> **Luôn manual trigger** — phải bấm ▶️ trên GitLab UI. Không bao giờ auto deploy prod.

---

## 4. Tổng hợp: Lifecycle của tất cả containers trong 1 pipeline run

```
Thời gian →
═══════════════════════════════════════════════════════════════════════════════

Stage 1 (prepare) ~2 phút
├── [Container] node:20-alpine ▓▓▓▓▓░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
│   └── npm ci BE + FE → upload node_modules artifacts

Stage 2 (lint) ~1 phút
├── [Container] node:20-alpine ░░░░░▓▓░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  lint:backend
├── [Container] node:20-alpine ░░░░░▓▓░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  lint:frontend

Stage 3 (test) ~3 phút
├── [Container] node:20-alpine ░░░░░░░▓▓▓▓▓░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  test:backend
│   └── [Service]  pgvector:pg15 ░░░░░░░▓▓▓▓▓░░░░░░░░░░░░░░░░░░░░░░░░░░░  (PostgreSQL)
├── [Container] node:20-alpine ░░░░░░░▓▓▓░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  test:frontend

Stage 4 (build) ~4 phút
├── [Container] docker:24.0.5  ░░░░░░░░░░░░▓▓▓▓▓░░░░░░░░░░░░░░░░░░░░░░░  build:backend
├── [Container] docker:24.0.5  ░░░░░░░░░░░░▓▓▓▓▓░░░░░░░░░░░░░░░░░░░░░░░  build:frontend

Stage 5 (security) ~2 phút
├── [Container] GitLab SAST    ░░░░░░░░░░░░░░░░░▓▓░░░░░░░░░░░░░░░░░░░░░░  sast
├── [Container] node:20-alpine ░░░░░░░░░░░░░░░░░▓▓░░░░░░░░░░░░░░░░░░░░░░  security:audit
├── [Container] docker:24.0.5  ░░░░░░░░░░░░░░░░░▓▓░░░░░░░░░░░░░░░░░░░░░░  container_scanning
│   └── [Service]  docker:dind ░░░░░░░░░░░░░░░░░▓▓░░░░░░░░░░░░░░░░░░░░░░  (Docker daemon)

Stage 6 (deploy-staging) ~2 phút — auto on staging, manual on dev
├── [Container] alpine + ssh   ░░░░░░░░░░░░░░░░░░░▓▓░░░░░░░░░░░░░░░░░░░░  deploy:staging

Stage 7 (verify) ~2 phút
├── [Container] alpine:3.19    ░░░░░░░░░░░░░░░░░░░░░▓▓░░░░░░░░░░░░░░░░░░  verify:staging

Stage 8 (evaluate) ~3 phút — chỉ trên dev/staging
├── [Container] python:3.11    ░░░░░░░░░░░░░░░░░░░░░░░▓▓▓░░░░░░░░░░░░░░░  evaluate:chatbot-student
├── [Container] python:3.11    ░░░░░░░░░░░░░░░░░░░░░░░▓▓▓░░░░░░░░░░░░░░░  evaluate:chatbot-staff

Stage 9 (deploy-prod) — Manual trigger
├── [Container] alpine + ssh   ░░░░░░░░░░░░░░░░░░░░░░░░░░▓▓░░░░░░░░░░░░░  deploy:production

═══════════════════════════════════════════════════════════════════════════════
Tổng: ~15-19 phút  |  ~14 containers được tạo và hủy trong 1 pipeline run
```

---

## 5. Sơ đồ tổng hợp: Artifact Flow giữa các stages

```mermaid
flowchart TD
    subgraph S1["Stage 1: prepare"]
        P["prepare:dependencies"]
    end

    subgraph S2["Stage 2: lint"]
        LB["lint:backend"]
        LF["lint:frontend"]
    end

    subgraph S3["Stage 3: test"]
        TB["test:backend"]
        TF["test:frontend"]
    end

    subgraph S4["Stage 4: build"]
        BB["build:backend"]
        BF["build:frontend"]
    end

    subgraph S5["Stage 5: security"]
        SAST["sast"]
        AUDIT["security:audit"]
        CSCAN["container_scanning"]
    end

    subgraph S8["Stage 8: evaluate"]
        ECS["evaluate:chatbot-student"]
        ECST["evaluate:chatbot-staff"]
    end

    P -->|"node_modules/ BE+FE"| LB & LF & TB & TF & AUDIT

    LB -->|"gl-codequality.json"| MR["📋 GitLab MR"]
    LF -->|"gl-codequality.json"| MR

    TB -->|"junit.xml + coverage/"| MR
    TF -->|"junit.xml + coverage/"| MR

    SAST -->|"SAST report"| MR
    AUDIT -->|"audit.json"| MR

    BB -->|"Docker image"| REG["🗄️ Registry"]
    BF -->|"Docker image"| REG

    REG --> CSCAN
    CSCAN -->|"Trivy report"| MR

    REG -->|"Pull images"| DEPLOY["🚀 Deploy Staging/Prod"]
    DEPLOY -->|"Staging live"| ECS & ECST
    ECS -->|"student_eval.json"| MR
    ECST -->|"staff_eval.json"| MR
```

---

## 6. Bảng tóm tắt: Container nào dùng Image gì?

| Stage | Job | Docker Image | Service Container | Chạy gì bên trong | Output |
|-------|-----|-------------|-------------------|-------------------|--------|
| prepare | `prepare:dependencies` | `node:20-alpine` | — | `npm ci` BE + FE | `node_modules/` (artifact) |
| lint | `lint:backend` | `node:20-alpine` | — | `npx eslint` BE code | `gl-codequality.json` |
| lint | `lint:frontend` | `node:20-alpine` | — | `npx eslint` FE code | `gl-codequality.json` |
| test | `test:backend` | `node:20-alpine` | `pgvector/pgvector:pg15` | `npm run test:cov` (1107 tests) | `junit.xml` + `coverage/` |
| test | `test:frontend` | `node:20-alpine` | — | `npx vitest run` (106 tests) | `junit.xml` + `coverage/` |
| build | `build:backend` | `docker:24.0.5` | `docker:24.0.5-dind` | `docker build + push` | Image trên Registry |
| build | `build:frontend` | `docker:24.0.5` | `docker:24.0.5-dind` | `docker build + push` | Image trên Registry |
| security | `sast` | GitLab SAST analyzer | — | SAST scan tự động | Security report |
| security | `security:audit` | `node:20-alpine` | — | `npm audit` BE + FE | `audit.json` |
| security | `container_scanning` | `docker:24.0.5` | `docker:24.0.5-dind` | `trivy image` scan | Scan report |
| deploy-staging | `deploy:staging` | `alpine:3.19` | — | SSH + docker compose | Services trên EC2 |
| verify | `verify:staging` | `alpine:3.19` | — | `curl` health check + smoke | Pass/Fail |
| evaluate | `evaluate:chatbot-student` | `python:3.11-slim` | — | RAGAS evaluation (40 câu) | `student_eval_*.json` |
| evaluate | `evaluate:chatbot-staff` | `python:3.11-slim` | — | Tool trigger eval (20 câu) | `staff_eval_*.json` |
| deploy-prod | `deploy:production` | `alpine:3.19` | — | SSH + docker compose + rollback | Services trên Production |

---

## 7. Flow theo branch

| Branch | Stages chạy | Ghi chú |
|--------|-------------|---------|
| `dev` | prepare → lint → test → build → security → deploy-staging (manual) → verify → evaluate → deploy-prod (manual) | Full pipeline, deploy manual |
| `staging` | prepare → lint → test → build → security → deploy-staging (**auto**) → verify → evaluate → deploy-prod (manual) | Deploy staging tự động |
| `main` | prepare → lint → test → build → security → deploy-prod (manual) | Không qua staging, deploy prod trực tiếp |
| MR (merge request) | prepare → lint → test → build → security | Chỉ kiểm tra, không deploy |
