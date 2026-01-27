# 🚀 Kế Hoạch Nâng Cấp DevOps & CI/CD cho Đoàn Hội Portal

> **Ngày tạo:** 26/01/2026  
> **Version:** 2.0  
> **Mục tiêu:** Nâng cấp toàn diện hệ thống CI/CD với staging environment, security scanning, optimized Docker builds và best practices

---

## 📊 Phân Tích Hiện Trạng

### ✅ Đang Có
| Component | Hiện tại | Đánh giá |
|-----------|----------|----------|
| CI/CD | GitLab CI với 4 stages | ⚠️ Cơ bản |
| Docker Build | Multi-stage build | ✅ Tốt |
| Environment | Chỉ Production | ❌ Thiếu Staging |
| Security Scan | Không có | ❌ Cần thêm |
| Testing | Chỉ lint | ⚠️ Thiếu unit test |
| Deploy | Manual trigger | ✅ OK |
| Monitoring | Prometheus + Grafana | ✅ Tốt |

### ❌ Cần Cải Thiện
1. **Thiếu Staging Environment** - Không test trước production
2. **Không có Security Scanning** - Vulnerability, SAST, secrets
3. **Docker image chưa tối ưu** - Có thể giảm size thêm 30-50%
4. **Thiếu caching** - Build chậm, tốn resources
5. **Không có automated testing** - Unit test, E2E test
6. **Thiếu notification** - Không biết khi deploy fail
7. **Secrets management** - Lưu trong CI variables, chưa an toàn

---

## 🎯 Kế Hoạch Nâng Cấp Chi Tiết

### Phase 1: Enhanced CI/CD Pipeline (Tuần 1-2)

#### 1.1. GitLab CI/CD Mới với Staging

```yaml
# .gitlab-ci.yml - ENHANCED VERSION
image: docker:24.0.5
services:
  - docker:24.0.5-dind

# ============================================
# STAGES - Thêm staging và security
# ============================================
stages:
  - prepare          # Cache dependencies
  - test             # Lint, unit test, coverage
  - security-code    # SAST, dependency scan, secrets (không cần Docker image)
  - build            # Build Docker images
  - security-image   # Container scanning với Trivy (sau khi build)
  - push             # Push to registry
  - deploy-staging   # Deploy to staging
  - integration-test # E2E tests on staging
  - deploy-prod      # Deploy to production
  - rollback         # Emergency rollback
  - notify           # Notifications

# ============================================
# VARIABLES
# ============================================
variables:
  BACKEND_IMAGE: $CI_REGISTRY_IMAGE/backend
  FRONTEND_IMAGE: $CI_REGISTRY_IMAGE/frontend
  DOCKER_BUILDKIT: "1"
  COMPOSE_DOCKER_CLI_BUILD: "1"
  
  # Security scan thresholds
  SAST_EXCLUDED_PATHS: "node_modules,dist,coverage"
  SECRET_DETECTION_HISTORIC_SCAN: "false"

# ============================================
# CACHE CONFIGURATION - Tăng tốc build
# ============================================
.node_cache: &node_cache
  cache:
    key: ${CI_COMMIT_REF_SLUG}
    paths:
      - backend/node_modules/
      - frontend/node_modules/
      - .npm/
    policy: pull-push

.docker_cache: &docker_cache
  cache:
    key: docker-${CI_COMMIT_REF_SLUG}
    paths:
      - .docker-cache/

# ============================================
# STAGE 1: PREPARE - Cache dependencies
# ============================================
prepare_dependencies:
  stage: prepare
  image: node:20.17-alpine
  <<: *node_cache
  script:
    - cd backend && npm ci --cache .npm --prefer-offline
    - cd ../frontend && npm ci --cache .npm --prefer-offline
  artifacts:
    paths:
      - backend/node_modules/
      - frontend/node_modules/
    expire_in: 1 hour
  rules:
    - if: $CI_PIPELINE_SOURCE == "merge_request_event"
    - if: $CI_COMMIT_BRANCH == "dev"
    - if: $CI_COMMIT_BRANCH == "staging"
    - if: $CI_COMMIT_BRANCH == "main"

# ============================================
# STAGE 2: TEST - Lint + Unit Tests
# ============================================
test_backend:
  stage: test
  image: node:20.17-alpine
  needs: ["prepare_dependencies"]
  script:
    - cd backend
    - npm run lint
    - npm run test -- --coverage --passWithNoTests
  coverage: /All files[^|]*\|[^|]*\s+([\d\.]+)/
  artifacts:
    reports:
      junit: backend/coverage/junit.xml
      coverage_report:
        coverage_format: cobertura
        path: backend/coverage/cobertura-coverage.xml
    paths:
      - backend/coverage/
    expire_in: 1 week
  rules:
    - if: $CI_PIPELINE_SOURCE == "merge_request_event"
    - if: $CI_COMMIT_BRANCH =~ /^(dev|staging|main)$/

test_frontend:
  stage: test
  image: node:20.17-alpine
  needs: ["prepare_dependencies"]
  script:
    - cd frontend
    - npm run lint
    # - npm run test -- --coverage  # Uncomment khi có tests
  artifacts:
    paths:
      - frontend/coverage/
    expire_in: 1 week
  rules:
    - if: $CI_PIPELINE_SOURCE == "merge_request_event"
    - if: $CI_COMMIT_BRANCH =~ /^(dev|staging|main)$/

# ============================================
# STAGE 3: CODE SECURITY SCANNING (không cần Docker image)
# ============================================

# 3.1 SAST - Static Application Security Testing
sast:
  stage: security-code
  image: registry.gitlab.com/gitlab-org/security-products/sast:latest
  allow_failure: false
  artifacts:
    reports:
      sast: gl-sast-report.json
    paths:
      - gl-sast-report.json
    expire_in: 1 week
  rules:
    - if: $CI_COMMIT_BRANCH =~ /^(dev|staging|main)$/

# 3.2 Dependency Scanning - npm audit
dependency_scan:
  stage: security-code
  image: node:20.17-alpine
  needs: ["prepare_dependencies"]
  script:
    - cd backend && npm audit --audit-level=high || echo "Backend vulnerabilities found"
    - cd ../frontend && npm audit --audit-level=high || echo "Frontend vulnerabilities found"
  artifacts:
    paths:
      - backend/npm-audit.json
      - frontend/npm-audit.json
    expire_in: 1 week
  allow_failure: true  # Thay đổi thành false khi fix xong vulnerabilities
  rules:
    - if: $CI_COMMIT_BRANCH =~ /^(dev|staging|main)$/

# 3.3 Secret Detection
secret_detection:
  stage: security-code
  image: registry.gitlab.com/gitlab-org/security-products/secrets:latest
  allow_failure: false
  artifacts:
    reports:
      secret_detection: gl-secret-detection-report.json
  rules:
    - if: $CI_COMMIT_BRANCH =~ /^(dev|staging|main)$/

# ============================================
# STAGE 5: IMAGE SECURITY SCANNING (sau khi build Docker images)
# ============================================

# 5.1 Backend Container Scan với Trivy
container_scan_backend:
  stage: security-image
  image: 
    name: aquasec/trivy:latest
    entrypoint: [""]
  needs: ["build_backend"]
  script:
    - echo "🔍 Scanning backend image for vulnerabilities..."
    - trivy image --exit-code 0 --severity LOW,MEDIUM --no-progress $BACKEND_IMAGE:$CI_COMMIT_SHORT_SHA
    - trivy image --exit-code 1 --severity HIGH,CRITICAL --no-progress $BACKEND_IMAGE:$CI_COMMIT_SHORT_SHA
  artifacts:
    reports:
      container_scanning: gl-container-scanning-backend.json
  allow_failure: true  # Đổi thành false khi muốn block nếu có HIGH/CRITICAL
  rules:
    - if: $CI_COMMIT_BRANCH =~ /^(dev|staging|main)$/

# 5.2 Frontend Container Scan với Trivy
container_scan_frontend:
  stage: security-image
  image: 
    name: aquasec/trivy:latest
    entrypoint: [""]
  needs: ["build_frontend"]
  script:
    - echo "🔍 Scanning frontend image for vulnerabilities..."
    - trivy image --exit-code 0 --severity LOW,MEDIUM --no-progress $FRONTEND_IMAGE:$CI_COMMIT_SHORT_SHA
    - trivy image --exit-code 1 --severity HIGH,CRITICAL --no-progress $FRONTEND_IMAGE:$CI_COMMIT_SHORT_SHA
  artifacts:
    reports:
      container_scanning: gl-container-scanning-frontend.json
  allow_failure: true  # Đổi thành false khi muốn block nếu có HIGH/CRITICAL
  rules:
    - if: $CI_COMMIT_BRANCH =~ /^(dev|staging|main)$/

# ============================================
# STAGE 4: BUILD DOCKER IMAGES
# ============================================
build_backend:
  stage: build
  needs: ["test_backend"]
  before_script:
    - docker login -u $CI_REGISTRY_USER -p $CI_REGISTRY_PASSWORD $CI_REGISTRY
  script:
    - |
      docker build \
        --cache-from $BACKEND_IMAGE:latest \
        --build-arg BUILDKIT_INLINE_CACHE=1 \
        -f ./backend/Dockerfile.prod \
        -t $BACKEND_IMAGE:$CI_COMMIT_SHORT_SHA \
        -t $BACKEND_IMAGE:$CI_COMMIT_REF_SLUG \
        ./backend
  rules:
    - if: $CI_COMMIT_BRANCH =~ /^(dev|staging|main)$/

build_frontend:
  stage: build
  needs: ["test_frontend"]
  before_script:
    - docker login -u $CI_REGISTRY_USER -p $CI_REGISTRY_PASSWORD $CI_REGISTRY
  script:
    - |
      docker build \
        --cache-from $FRONTEND_IMAGE:latest \
        --build-arg BUILDKIT_INLINE_CACHE=1 \
        -f ./frontend/Dockerfile.prod \
        -t $FRONTEND_IMAGE:$CI_COMMIT_SHORT_SHA \
        -t $FRONTEND_IMAGE:$CI_COMMIT_REF_SLUG \
        ./frontend
  rules:
    - if: $CI_COMMIT_BRANCH =~ /^(dev|staging|main)$/

# ============================================
# STAGE 6: PUSH TO REGISTRY (sau khi scan xong)
# ============================================
push_images:
  stage: push
  needs: 
    - build_backend
    - build_frontend
    - container_scan_backend
    - container_scan_frontend
  before_script:
    - docker login -u $CI_REGISTRY_USER -p $CI_REGISTRY_PASSWORD $CI_REGISTRY
  script:
    - docker push $BACKEND_IMAGE:$CI_COMMIT_SHORT_SHA
    - docker push $BACKEND_IMAGE:$CI_COMMIT_REF_SLUG
    - docker push $FRONTEND_IMAGE:$CI_COMMIT_SHORT_SHA
    - docker push $FRONTEND_IMAGE:$CI_COMMIT_REF_SLUG
    # Tag as latest for staging/main branches
    - |
      if [ "$CI_COMMIT_BRANCH" == "staging" ] || [ "$CI_COMMIT_BRANCH" == "main" ]; then
        docker tag $BACKEND_IMAGE:$CI_COMMIT_SHORT_SHA $BACKEND_IMAGE:latest
        docker tag $FRONTEND_IMAGE:$CI_COMMIT_SHORT_SHA $FRONTEND_IMAGE:latest
        docker push $BACKEND_IMAGE:latest
        docker push $FRONTEND_IMAGE:latest
      fi
  rules:
    - if: $CI_COMMIT_BRANCH =~ /^(dev|staging|main)$/

# ============================================
# STAGE 7: DEPLOY TO STAGING
# ============================================
deploy_staging:
  stage: deploy-staging
  image: alpine:latest
  needs: ["push_images"]
  before_script:
    - apk add --no-cache openssh-client curl
    - eval $(ssh-agent -s)
    - echo "$SSH_PRIVATE_KEY_STAGING" | tr -d '\r' | ssh-add -
    - mkdir -p ~/.ssh
    - echo -e "Host *\n\tStrictHostKeyChecking no\n" > ~/.ssh/config
  script:
    - echo "🎭 Deploying to STAGING environment..."
    - scp docker-compose.staging.yml $STAGING_USER@$STAGING_SERVER:$STAGING_DEPLOY_PATH/docker-compose.yml
    - |
      ssh $STAGING_USER@$STAGING_SERVER << ENDSSH
        cd $STAGING_DEPLOY_PATH
        
        echo "🔐 Logging into Registry..."
        docker login -u "$CI_REGISTRY_USER" -p "$CI_REGISTRY_PASSWORD" "$CI_REGISTRY"
        
        echo "⬇️ Pulling version $CI_COMMIT_SHORT_SHA..."
        export TAG=$CI_COMMIT_SHORT_SHA
        export CI_REGISTRY_IMAGE=$CI_REGISTRY_IMAGE
        
        docker-compose pull
        docker-compose up -d --remove-orphans
        
        echo "⏳ Waiting for services to be healthy..."
        sleep 30
        
        echo "✅ Staging deployment completed"
        docker-compose ps
      ENDSSH
  environment:
    name: staging
    url: https://staging.doanhoi.hcmut.edu.vn
  rules:
    - if: $CI_COMMIT_BRANCH == "staging"

# ============================================
# STAGE 8: INTEGRATION TESTS ON STAGING
# ============================================
e2e_test_staging:
  stage: integration-test
  image: cypress/included:latest
  needs: ["deploy_staging"]
  script:
    - cd frontend
    - npm ci
    - npx cypress run --config baseUrl=$STAGING_URL
  artifacts:
    when: always
    paths:
      - frontend/cypress/screenshots/
      - frontend/cypress/videos/
    expire_in: 1 week
  allow_failure: true  # E2E tests có thể flaky
  rules:
    - if: $CI_COMMIT_BRANCH == "staging"

# API Health Check sau staging deploy
health_check_staging:
  stage: integration-test
  image: alpine:latest
  needs: ["deploy_staging"]
  script:
    - apk add --no-cache curl
    - |
      echo "🏥 Checking API health..."
      for i in 1 2 3 4 5; do
        response=$(curl -s -o /dev/null -w "%{http_code}" $STAGING_API_URL/api/health || echo "000")
        if [ "$response" = "200" ]; then
          echo "✅ API is healthy!"
          exit 0
        fi
        echo "⏳ Attempt $i: API returned $response, retrying..."
        sleep 10
      done
      echo "❌ API health check failed"
      exit 1
  rules:
    - if: $CI_COMMIT_BRANCH == "staging"

# ============================================
# STAGE 9: DEPLOY TO PRODUCTION
# ============================================
deploy_production:
  stage: deploy-prod
  image: alpine:latest
  needs: ["push_images"]
  when: manual  # Require manual approval
  before_script:
    - apk add --no-cache openssh-client curl
    - eval $(ssh-agent -s)
    - echo "$SSH_PRIVATE_KEY" | tr -d '\r' | ssh-add -
    - mkdir -p ~/.ssh
    - echo -e "Host *\n\tStrictHostKeyChecking no\n" > ~/.ssh/config
  script:
    - echo "🚀 Deploying to PRODUCTION version $CI_COMMIT_SHORT_SHA..."
    - scp docker-compose.prod.yml $PRODUCTION_USER@$PRODUCTION_SERVER:$DEPLOY_PATH/docker-compose.yml
    - |
      ssh $PRODUCTION_USER@$PRODUCTION_SERVER << ENDSSH
        cd $DEPLOY_PATH
        
        # Backup current version
        echo "📦 Backing up current version..."
        docker-compose config | grep "image:" > .previous-images.txt || true
        
        echo "🔐 Logging into Registry..."
        docker login -u "$CI_REGISTRY_USER" -p "$CI_REGISTRY_PASSWORD" "$CI_REGISTRY"
        
        echo "⬇️ Pulling new version..."
        export TAG=$CI_COMMIT_SHORT_SHA
        export CI_REGISTRY_IMAGE=$CI_REGISTRY_IMAGE
        
        docker-compose pull
        
        echo "🔄 Rolling update with zero downtime..."
        docker-compose up -d --remove-orphans --scale backend=2
        sleep 30
        docker-compose up -d --remove-orphans --scale backend=1
        
        echo "✅ Verifying deployment..."
        docker-compose ps
        
        echo "🧹 Cleanup old images..."
        docker image prune -f --filter "until=24h"
      ENDSSH
  environment:
    name: production
    url: https://doanhoi.hcmut.edu.vn
  rules:
    - if: $CI_COMMIT_BRANCH == "main"

# Auto deploy to prod from staging (optional)
auto_promote_to_prod:
  stage: deploy-prod
  image: alpine:latest
  needs: ["health_check_staging", "e2e_test_staging"]
  when: manual
  script:
    - echo "🔄 Promoting staging to production..."
    # Same as deploy_production
  environment:
    name: production
  rules:
    - if: $CI_COMMIT_BRANCH == "staging"
      when: manual

# ============================================
# STAGE 10: ROLLBACK
# ============================================
rollback_production:
  stage: rollback
  image: alpine:latest
  when: manual
  variables:
    ROLLBACK_TAG: "latest"
  before_script:
    - apk add --no-cache openssh-client
    - eval $(ssh-agent -s)
    - echo "$SSH_PRIVATE_KEY" | tr -d '\r' | ssh-add -
    - mkdir -p ~/.ssh
    - printf "Host *\n\tStrictHostKeyChecking no\n" > ~/.ssh/config
  script:
    - echo "🔄 Rolling back to version $ROLLBACK_TAG..."
    - |
      ssh $PRODUCTION_USER@$PRODUCTION_SERVER << ENDSSH
        cd $DEPLOY_PATH
        
        docker login -u "$CI_REGISTRY_USER" -p "$CI_REGISTRY_PASSWORD" "$CI_REGISTRY"
        
        export TAG=$ROLLBACK_TAG
        export CI_REGISTRY_IMAGE=$CI_REGISTRY_IMAGE
        
        docker-compose pull
        docker-compose up -d --force-recreate --remove-orphans
        
        docker-compose ps
        docker image prune -f
      ENDSSH
  environment:
    name: production
    action: access
  rules:
    - if: $CI_COMMIT_BRANCH =~ /^(dev|staging|main)$/

# ============================================
# STAGE 11: NOTIFICATIONS
# ============================================
notify_success:
  stage: notify
  image: alpine:latest
  needs: ["deploy_production"]
  script:
    - apk add --no-cache curl
    - |
      curl -X POST "$SLACK_WEBHOOK_URL" \
        -H "Content-Type: application/json" \
        -d '{
          "text": "✅ *Deployment Successful*",
          "blocks": [
            {
              "type": "section",
              "text": {
                "type": "mrkdwn",
                "text": "✅ *Production Deployment Successful*\n*Project:* '$CI_PROJECT_NAME'\n*Version:* `'$CI_COMMIT_SHORT_SHA'`\n*Branch:* '$CI_COMMIT_BRANCH'\n*Author:* '$GITLAB_USER_NAME'\n*URL:* https://doanhoi.hcmut.edu.vn"
              }
            }
          ]
        }'
  rules:
    - if: $CI_COMMIT_BRANCH == "main"
      when: on_success

notify_failure:
  stage: notify
  image: alpine:latest
  script:
    - apk add --no-cache curl
    - |
      curl -X POST "$SLACK_WEBHOOK_URL" \
        -H "Content-Type: application/json" \
        -d '{
          "text": "❌ *Pipeline Failed*",
          "blocks": [
            {
              "type": "section",
              "text": {
                "type": "mrkdwn",
                "text": "❌ *Pipeline Failed*\n*Project:* '$CI_PROJECT_NAME'\n*Branch:* '$CI_COMMIT_BRANCH'\n*Author:* '$GITLAB_USER_NAME'\n*Pipeline:* '$CI_PIPELINE_URL'"
              }
            }
          ]
        }'
  rules:
    - if: $CI_COMMIT_BRANCH =~ /^(dev|staging|main)$/
      when: on_failure
```

---

### Phase 2: Optimized Docker Builds (Tuần 2-3)

#### 2.1. Backend Dockerfile - Ultra Optimized

```dockerfile
# backend/Dockerfile.prod.optimized
# ===========================================
# STAGE 1: Dependencies
# ===========================================
FROM node:20.17-alpine3.20 AS deps

WORKDIR /app

# Install only production dependencies first for better caching
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# ===========================================
# STAGE 2: Builder
# ===========================================
FROM node:20.17-alpine3.20 AS builder

WORKDIR /app

# Copy package files
COPY package*.json tsconfig*.json nest-cli.json ./

# Install all dependencies (including dev for build)
RUN npm ci && npm cache clean --force

# Copy source and build
COPY src ./src
RUN npm run build

# Remove dev dependencies after build
RUN npm prune --production

# ===========================================
# STAGE 3: Production (Distroless - Ultra Secure)
# ===========================================
FROM gcr.io/distroless/nodejs20-debian12 AS production

WORKDIR /app

# Copy production dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy built application
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./

# Non-root user (distroless runs as nonroot by default)
USER nonroot

# Expose port
EXPOSE 9200

# Health check không available trong distroless
# Sử dụng Kubernetes/Docker healthcheck external

# Start application
CMD ["dist/main.js"]

# ===========================================
# ALTERNATIVE: Alpine Production (nếu cần shell access)
# ===========================================
FROM node:20.17-alpine3.20 AS production-alpine

WORKDIR /app

# Security updates
RUN apk update && apk upgrade --no-cache && \
    apk add --no-cache dumb-init && \
    rm -rf /var/cache/apk/* /tmp/*

# Copy from builder
COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nestjs -u 1001 -G nodejs && \
    chown -R nestjs:nodejs /app

USER nestjs

EXPOSE 9200

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
    CMD node -e "require('http').get('http://localhost:9200/api/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))" || exit 1

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/main.js"]
```

#### 2.2. Frontend Dockerfile - Ultra Optimized

```dockerfile
# frontend/Dockerfile.prod.optimized
# ===========================================
# STAGE 1: Dependencies
# ===========================================
FROM node:18-alpine AS deps

WORKDIR /app
COPY package*.json ./
RUN npm ci && npm cache clean --force

# ===========================================
# STAGE 2: Builder
# ===========================================
FROM node:18-alpine AS builder

WORKDIR /app

# Copy dependencies
COPY --from=deps /app/node_modules ./node_modules
COPY package*.json ./

# Copy source
COPY . .

# Build with production optimizations
ENV NODE_ENV=production
RUN npm run build

# ===========================================
# STAGE 3: Production with Nginx (Hardened)
# ===========================================
FROM nginx:1.25-alpine-slim AS production

# Remove default nginx config and user
RUN rm -rf /etc/nginx/conf.d/default.conf /usr/share/nginx/html/*

# Security hardening
RUN apk update && apk upgrade --no-cache && \
    apk add --no-cache curl && \
    rm -rf /var/cache/apk/* /tmp/* && \
    # Remove unnecessary nginx modules
    rm -rf /etc/nginx/modules && \
    # Create non-root user for nginx
    addgroup -g 1001 -S nginx-app && \
    adduser -S nginx-app -u 1001 -G nginx-app

# Copy built files
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy hardened nginx config
COPY nginx.prod.conf /etc/nginx/nginx.conf
COPY nginx-security.conf /etc/nginx/conf.d/security.conf

# Set permissions
RUN chown -R nginx-app:nginx-app /usr/share/nginx/html && \
    chown -R nginx-app:nginx-app /var/cache/nginx && \
    chown -R nginx-app:nginx-app /var/log/nginx && \
    touch /var/run/nginx.pid && \
    chown -R nginx-app:nginx-app /var/run/nginx.pid

USER nginx-app

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8080/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
```

#### 2.3. Nginx Security Config

```nginx
# nginx-security.conf
# Security Headers
add_header X-Frame-Options "SAMEORIGIN" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-XSS-Protection "1; mode=block" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https://api.doanhoi.hcmut.edu.vn;" always;
add_header Permissions-Policy "camera=(), microphone=(), geolocation=()" always;

# Hide nginx version
server_tokens off;

# Prevent clickjacking
add_header X-Frame-Options "DENY";

# SSL Configuration (if terminating at nginx)
# ssl_protocols TLSv1.2 TLSv1.3;
# ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256;
# ssl_prefer_server_ciphers off;

# Rate limiting
limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;
limit_conn_zone $binary_remote_addr zone=conn_limit:10m;
```

---

### Phase 3: Docker Image Size Comparison

| Image | Current Size | Optimized Size | Reduction |
|-------|--------------|----------------|-----------|
| Backend (Alpine) | ~250MB | ~150MB | 40% |
| Backend (Distroless) | ~250MB | ~120MB | 52% |
| Frontend (Nginx) | ~50MB | ~25MB | 50% |

---

### Phase 4: Staging Environment Setup (Tuần 3-4)

#### 4.1. docker-compose.staging.yml

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    container_name: doanhoi-postgres-staging
    environment:
      POSTGRES_DB: doanhoi_staging
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: ${DB_PASSWORD_STAGING}
    volumes:
      - staging_postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - staging-network
    # Resource limits for staging
    deploy:
      resources:
        limits:
          cpus: '0.5'
          memory: 512M

  backend:
    image: ${CI_REGISTRY_IMAGE}/backend:${TAG:-staging}
    container_name: doanhoi-backend-staging
    env_file:
      - .env.staging
    environment:
      NODE_ENV: staging
      DB_HOST: postgres
      LOG_LEVEL: debug
    ports:
      - "3001:9200"
    depends_on:
      postgres:
        condition: service_healthy
    networks:
      - staging-network
    deploy:
      resources:
        limits:
          cpus: '1'
          memory: 1G

  frontend:
    image: ${CI_REGISTRY_IMAGE}/frontend:${TAG:-staging}
    container_name: doanhoi-frontend-staging
    environment:
      NODE_ENV: staging
    ports:
      - "3000:80"
    depends_on:
      - backend
    networks:
      - staging-network

networks:
  staging-network:
    driver: bridge

volumes:
  staging_postgres_data:
```

#### 4.2. Environment Configuration

```bash
# .env.staging
NODE_ENV=staging
DB_HOST=postgres
DB_PORT=5432
DB_NAME=doanhoi_staging
LOG_LEVEL=debug

# API URLs
API_URL=https://staging-api.doanhoi.hcmut.edu.vn
FRONTEND_URL=https://staging.doanhoi.hcmut.edu.vn

# Feature flags for staging
ENABLE_DEBUG_MODE=true
ENABLE_MOCK_PAYMENT=true
```

---

### Phase 5: Security Enhancements (Tuần 4-5)

#### 5.1. Security Scanning Tools

| Tool | Purpose | Integration |
|------|---------|-------------|
| **Trivy** | Container vulnerability scanning | CI/CD |
| **GitLab SAST** | Static code analysis | CI/CD |
| **npm audit** | Dependency vulnerabilities | CI/CD |
| **Gitleaks** | Secret detection | CI/CD |
| **OWASP ZAP** | Dynamic security testing | Staging |
| **Snyk** | Real-time vulnerability monitoring | Optional |

#### 5.2. Secret Management với HashiCorp Vault

```yaml
# docker-compose.vault.yml
services:
  vault:
    image: hashicorp/vault:latest
    container_name: doanhoi-vault
    cap_add:
      - IPC_LOCK
    environment:
      VAULT_DEV_ROOT_TOKEN_ID: ${VAULT_TOKEN}
      VAULT_DEV_LISTEN_ADDRESS: 0.0.0.0:8200
    ports:
      - "8200:8200"
    volumes:
      - vault_data:/vault/data
    networks:
      - doanhoi-network

volumes:
  vault_data:
```

#### 5.3. Runtime Security với Falco

```yaml
# falco-rules.yaml
- rule: Detect Shell in Container
  desc: Alert if shell spawned in container
  condition: >
    spawned_process and container and
    shell_procs and proc.pname != "dumb-init"
  output: >
    Shell spawned in container (user=%user.name container=%container.name 
    shell=%proc.name parent=%proc.pname)
  priority: WARNING

- rule: Detect Secrets Access
  desc: Alert on access to secrets
  condition: >
    open_read and container and
    fd.name pmatch (/etc/shadow, /etc/passwd, *.key, *.pem)
  output: >
    Sensitive file read (user=%user.name container=%container.name file=%fd.name)
  priority: ERROR
```

---

### Phase 6: Monitoring & Alerting Enhancement (Tuần 5-6)

#### 6.1. Alertmanager Configuration

```yaml
# alertmanager.yml
global:
  smtp_smarthost: 'smtp.gmail.com:587'
  smtp_from: 'alerts@doanhoi.hcmut.edu.vn'
  smtp_auth_username: '${SMTP_USER}'
  smtp_auth_password: '${SMTP_PASSWORD}'
  slack_api_url: '${SLACK_WEBHOOK_URL}'

route:
  group_by: ['alertname', 'severity']
  group_wait: 10s
  group_interval: 10s
  repeat_interval: 1h
  receiver: 'team-notifications'
  routes:
    - match:
        severity: critical
      receiver: 'critical-alerts'
    - match:
        severity: warning
      receiver: 'warning-alerts'

receivers:
  - name: 'team-notifications'
    slack_configs:
      - channel: '#devops-alerts'
        send_resolved: true
        title: '{{ .Status | toUpper }}: {{ .CommonAnnotations.summary }}'
        text: '{{ .CommonAnnotations.description }}'

  - name: 'critical-alerts'
    slack_configs:
      - channel: '#critical-alerts'
        send_resolved: true
    email_configs:
      - to: 'team@doanhoi.hcmut.edu.vn'
        send_resolved: true

  - name: 'warning-alerts'
    slack_configs:
      - channel: '#devops-alerts'
```

#### 6.2. Prometheus Alert Rules

```yaml
# prometheus-alerts.yml
groups:
  - name: doanhoi-alerts
    rules:
      # High Error Rate
      - alert: HighErrorRate
        expr: |
          sum(rate(http_request_duration_seconds_count{status=~"5.."}[5m])) 
          / sum(rate(http_request_duration_seconds_count[5m])) > 0.05
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "High error rate detected"
          description: "Error rate is {{ $value | humanizePercentage }} over the last 5 minutes"

      # High Response Time
      - alert: HighResponseTime
        expr: |
          histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m])) > 2
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High response time"
          description: "95th percentile response time is {{ $value }}s"

      # Container Down
      - alert: ContainerDown
        expr: absent(container_last_seen{name=~"doanhoi-.*"})
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Container is down"
          description: "Container {{ $labels.name }} is not running"

      # High Memory Usage
      - alert: HighMemoryUsage
        expr: |
          container_memory_usage_bytes{name=~"doanhoi-.*"} 
          / container_spec_memory_limit_bytes{name=~"doanhoi-.*"} > 0.9
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High memory usage"
          description: "Container {{ $labels.name }} memory usage is above 90%"

      # Database Connection Issues
      - alert: DatabaseConnectionFailed
        expr: pg_up == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Database connection failed"
          description: "PostgreSQL is not reachable"
```

---

### Phase 7: Infrastructure as Code (Tuần 6-7)

#### 7.1. Terraform cho Cloud Infrastructure

```hcl
# terraform/main.tf
terraform {
  required_providers {
    docker = {
      source  = "kreuzwerker/docker"
      version = "~> 3.0"
    }
  }
}

# Variables
variable "environment" {
  type    = string
  default = "staging"
}

variable "image_tag" {
  type    = string
  default = "latest"
}

# Network
resource "docker_network" "doanhoi_network" {
  name = "doanhoi-${var.environment}-network"
}

# Backend Service
resource "docker_container" "backend" {
  name  = "doanhoi-backend-${var.environment}"
  image = "registry.gitlab.com/doanhoi/backend:${var.image_tag}"
  
  networks_advanced {
    name = docker_network.doanhoi_network.name
  }
  
  env = [
    "NODE_ENV=${var.environment}",
    "DB_HOST=postgres"
  ]
  
  ports {
    internal = 9200
    external = var.environment == "production" ? 2681 : 3001
  }
  
  healthcheck {
    test     = ["CMD", "curl", "-f", "http://localhost:9200/api/health"]
    interval = "30s"
    timeout  = "10s"
    retries  = 3
  }
}
```

---

### Phase 8: Backup & Disaster Recovery (Tuần 7-8)

#### 8.1. Automated Database Backup

```yaml
# docker-compose.backup.yml
services:
  db-backup:
    image: prodrigestivill/postgres-backup-local
    container_name: doanhoi-db-backup
    environment:
      - POSTGRES_HOST=postgres
      - POSTGRES_DB=doanhoi
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=${DB_PASSWORD}
      - SCHEDULE=@daily
      - BACKUP_KEEP_DAYS=7
      - BACKUP_KEEP_WEEKS=4
      - BACKUP_KEEP_MONTHS=6
      - HEALTHCHECK_PORT=8080
    volumes:
      - ./backups:/backups
    depends_on:
      - postgres
    networks:
      - doanhoi-network
```

#### 8.2. Backup Script

```bash
#!/bin/bash
# scripts/backup-db.sh

set -e

BACKUP_DIR="/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/doanhoi_${TIMESTAMP}.sql.gz"

# Create backup
pg_dump -h postgres -U postgres doanhoi | gzip > $BACKUP_FILE

# Upload to S3 (optional)
aws s3 cp $BACKUP_FILE s3://doanhoi-backups/database/

# Cleanup old backups (keep last 7 days)
find $BACKUP_DIR -name "*.sql.gz" -mtime +7 -delete

echo "✅ Backup completed: $BACKUP_FILE"
```

---

## 📅 Timeline Implementation

```
Week 1-2:   Enhanced CI/CD Pipeline
Week 2-3:   Optimized Docker Builds
Week 3-4:   Staging Environment Setup
Week 4-5:   Security Scanning Integration
Week 5-6:   Monitoring & Alerting
Week 6-7:   Infrastructure as Code
Week 7-8:   Backup & Disaster Recovery
Week 8+:    Continuous Improvement
```

---

## 📋 Checklist Triển Khai

### CI/CD Pipeline
- [ ] Thêm staging environment vào GitLab CI
- [ ] Cấu hình security scanning (SAST, Trivy)
- [ ] Implement dependency caching
- [ ] Setup Slack/Email notifications
- [ ] Configure branch protection rules

### Docker Optimization
- [ ] Update Dockerfile với multi-stage build
- [ ] Implement distroless images
- [ ] Add security headers trong nginx
- [ ] Optimize image layers

### Security
- [ ] Enable GitLab SAST
- [ ] Configure Trivy scanning
- [ ] Setup secret detection
- [ ] Implement Vault for secrets
- [ ] Add runtime security monitoring

### Monitoring
- [ ] Configure Alertmanager
- [ ] Create alert rules
- [ ] Setup Grafana dashboards
- [ ] Configure log aggregation với Loki

### Infrastructure
- [ ] Setup Terraform configurations
- [ ] Implement automated backups
- [ ] Configure disaster recovery
- [ ] Document runbooks

---

## 🔗 GitLab CI Variables Cần Thêm

| Variable | Description | Type |
|----------|-------------|------|
| `SSH_PRIVATE_KEY_STAGING` | SSH key cho staging server | File |
| `STAGING_USER` | Username staging server | Variable |
| `STAGING_SERVER` | IP/hostname staging | Variable |
| `STAGING_DEPLOY_PATH` | Deploy path trên staging | Variable |
| `STAGING_URL` | URL staging environment | Variable |
| `STAGING_API_URL` | API URL staging | Variable |
| `SLACK_WEBHOOK_URL` | Slack notification webhook | Variable |
| `VAULT_TOKEN` | HashiCorp Vault token | Masked |
| `SNYK_TOKEN` | Snyk API token (optional) | Masked |

---

## 📚 Tài Liệu Tham Khảo

1. [GitLab CI/CD Best Practices](https://docs.gitlab.com/ee/ci/yaml/)
2. [Docker Security Best Practices](https://docs.docker.com/develop/security-best-practices/)
3. [OWASP Container Security](https://cheatsheetseries.owasp.org/cheatsheets/Docker_Security_Cheat_Sheet.html)
4. [Trivy Documentation](https://aquasecurity.github.io/trivy/)
5. [Prometheus Alerting](https://prometheus.io/docs/alerting/latest/alertmanager/)

---

> **Lưu ý:** Kế hoạch này có thể điều chỉnh tùy theo resources và timeline thực tế của dự án.
