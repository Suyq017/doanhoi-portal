# Chiến Lược Nâng Cấp DevOps cho Đoàn Hội Portal

## 📋 Phân Tích Hiện Trạng

### ✅ Đã Có (Current Stack)
- **Container Orchestration:** Docker + Docker Compose
- **Monitoring:** Prometheus + Grafana
- **CI/CD:** GitLab CI/CD Pipeline
- **Database:** PostgreSQL 15
- **Reverse Proxy:** Nginx
- **Version Control:** Git
- **Production Deploy:** Automated deployment via SSH

### ⚠️ Thiếu & Cần Cải Thiện
- ❌ **Logging Centralized:** Chưa có log aggregation
- ❌ **Container Orchestration:** Chưa có Kubernetes cho high availability
- ❌ **Service Mesh:** Chưa có traffic management nâng cao
- ❌ **Secret Management:** Secrets lưu trong .env files
- ❌ **Database Backup:** Chưa có automated backup strategy
- ❌ **Alerting:** Chưa có Alertmanager configured
- ❌ **Tracing:** Chưa có distributed tracing
- ❌ **Security Scanning:** Chưa có vulnerability scanning trong CI/CD

---

## 🚀 Công Cụ DevOps Đề Xuất

### 1. **Logging & Log Aggregation** 🔴 Priority: HIGH

#### 1.1. Loki + Promtail + Grafana (Khuyến nghị)
**Tại sao Loki?**
- ✅ Tích hợp hoàn hảo với Grafana (đã có)
- ✅ Lightweight hơn ELK Stack
- ✅ Cost-effective (không cần Elasticsearch)
- ✅ Label-based indexing giống Prometheus
- ✅ Dễ scale và maintain

**Architecture:**
```
Containers (Docker) 
    → Promtail (log shipper) 
    → Loki (log aggregation) 
    → Grafana (visualization)
```

**Thêm vào `docker-compose.prod.yml`:**
```yaml
  loki:
    image: grafana/loki:latest
    container_name: doanhoi-loki
    ports:
      - "3100:3100"
    command: -config.file=/etc/loki/local-config.yaml
    volumes:
      - ./loki/config.yaml:/etc/loki/local-config.yaml
      - loki_data:/loki
    networks:
      - doanhoi-network
    restart: unless-stopped

  promtail:
    image: grafana/promtail:latest
    container_name: doanhoi-promtail
    volumes:
      - /var/log:/var/log:ro
      - /var/lib/docker/containers:/var/lib/docker/containers:ro
      - ./promtail/config.yaml:/etc/promtail/config.yaml
    command: -config.file=/etc/promtail/config.yaml
    networks:
      - doanhoi-network
    restart: unless-stopped
    depends_on:
      - loki

volumes:
  loki_data:
```

**Cấu hình Loki (`loki/config.yaml`):**
```yaml
auth_enabled: false

server:
  http_listen_port: 3100
  grpc_listen_port: 9096

common:
  path_prefix: /loki
  storage:
    filesystem:
      chunks_directory: /loki/chunks
      rules_directory: /loki/rules
  replication_factor: 1
  ring:
    kvstore:
      store: inmemory

schema_config:
  configs:
    - from: 2020-10-24
      store: boltdb-shipper
      object_store: filesystem
      schema: v11
      index:
        prefix: index_
        period: 24h

limits_config:
  retention_period: 168h  # 7 days
  reject_old_samples: true
  reject_old_samples_max_age: 168h

chunk_store_config:
  max_look_back_period: 168h

table_manager:
  retention_deletes_enabled: true
  retention_period: 168h
```

**Promtail Config (`promtail/config.yaml`):**
```yaml
server:
  http_listen_port: 9080
  grpc_listen_port: 0

positions:
  filename: /tmp/positions.yaml

clients:
  - url: http://loki:3100/loki/api/v1/push

scrape_configs:
  # Docker containers logs
  - job_name: docker
    docker_sd_configs:
      - host: unix:///var/run/docker.sock
        refresh_interval: 5s
    relabel_configs:
      - source_labels: ['__meta_docker_container_name']
        regex: '/(.*)'
        target_label: 'container'
      - source_labels: ['__meta_docker_container_log_stream']
        target_label: 'stream'
      - source_labels: ['__meta_docker_container_label_com_docker_compose_service']
        target_label: 'service'

  # System logs
  - job_name: system
    static_configs:
      - targets:
          - localhost
        labels:
          job: varlogs
          __path__: /var/log/*log
```

**Benefits:**
- ✅ Query logs từ tất cả containers ở 1 nơi
- ✅ Correlate logs với metrics trong Grafana
- ✅ Search logs theo container, service, time range
- ✅ Alert based on log patterns

---

### 2. **Kubernetes (K8s)** 🟡 Priority: MEDIUM

#### 2.1. Khi Nào Nên Migrate Lên K8s?
**Hiện tại:** Docker Compose đủ cho single-server deployment  
**Cân nhắc K8s khi:**
- 🔹 Traffic tăng cao, cần auto-scaling
- 🔹 Cần high availability (multi-node cluster)
- 🔹 Muốn zero-downtime deployment
- 🔹 Có nhiều microservices
- 🔹 Cần advanced networking & service mesh

#### 2.2. Migration Path: Docker Compose → Kubernetes

**Option 1: K3s (Lightweight Kubernetes)**
- Dành cho: Single-server hoặc small cluster
- RAM: 512MB minimum
- Perfect cho: Development/Staging/Small production

**Cài đặt K3s:**
```bash
# Install K3s on Ubuntu/Debian
curl -sfL https://get.k3s.io | sh -

# Check status
sudo k3s kubectl get nodes
```

**Option 2: Full Kubernetes (kubeadm)**
- Dành cho: Production với multiple nodes
- RAM: 2GB+ per node
- Perfect cho: Large-scale production

**Convert Docker Compose → K8s Manifests:**
```bash
# Sử dụng Kompose để convert
kompose convert -f docker-compose.prod.yml

# Hoặc viết manual Kubernetes manifests
```

**Kubernetes Manifests Example:**

**1. Namespace:**
```yaml
# k8s/namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: doanhoi-portal
```

**2. PostgreSQL StatefulSet:**
```yaml
# k8s/postgres-statefulset.yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: postgres
  namespace: doanhoi-portal
spec:
  serviceName: postgres
  replicas: 1
  selector:
    matchLabels:
      app: postgres
  template:
    metadata:
      labels:
        app: postgres
    spec:
      containers:
      - name: postgres
        image: postgres:15
        ports:
        - containerPort: 5432
        env:
        - name: POSTGRES_DB
          value: doanhoi
        - name: POSTGRES_USER
          valueFrom:
            secretKeyRef:
              name: postgres-secret
              key: username
        - name: POSTGRES_PASSWORD
          valueFrom:
            secretKeyRef:
              name: postgres-secret
              key: password
        volumeMounts:
        - name: postgres-storage
          mountPath: /var/lib/postgresql/data
  volumeClaimTemplates:
  - metadata:
      name: postgres-storage
    spec:
      accessModes: [ "ReadWriteOnce" ]
      resources:
        requests:
          storage: 10Gi
```

**3. Backend Deployment:**
```yaml
# k8s/backend-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: backend
  namespace: doanhoi-portal
spec:
  replicas: 3  # Scale to 3 instances
  selector:
    matchLabels:
      app: backend
  template:
    metadata:
      labels:
        app: backend
    spec:
      containers:
      - name: backend
        image: your-registry/doanhoi-backend:latest
        ports:
        - containerPort: 9200
        env:
        - name: DB_HOST
          value: postgres
        - name: DB_PASSWORD
          valueFrom:
            secretKeyRef:
              name: postgres-secret
              key: password
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /api
            port: 9200
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /api
            port: 9200
          initialDelaySeconds: 5
          periodSeconds: 5
---
apiVersion: v1
kind: Service
metadata:
  name: backend
  namespace: doanhoi-portal
spec:
  selector:
    app: backend
  ports:
  - port: 9200
    targetPort: 9200
  type: ClusterIP
```

**4. Ingress Controller:**
```yaml
# k8s/ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: doanhoi-ingress
  namespace: doanhoi-portal
  annotations:
    cert-manager.io/cluster-issuer: "letsencrypt-prod"
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
spec:
  ingressClassName: nginx
  tls:
  - hosts:
    - doanhoi.hcmut.edu.vn
    secretName: doanhoi-tls
  rules:
  - host: doanhoi.hcmut.edu.vn
    http:
      paths:
      - path: /api
        pathType: Prefix
        backend:
          service:
            name: backend
            port:
              number: 9200
      - path: /
        pathType: Prefix
        backend:
          service:
            name: frontend
            port:
              number: 80
```

**K8s Benefits:**
- ✅ Auto-scaling (HPA - Horizontal Pod Autoscaler)
- ✅ Self-healing (restart failed pods)
- ✅ Rolling updates & rollbacks
- ✅ Load balancing built-in
- ✅ Secret management with K8s Secrets
- ✅ Resource limits & quotas

**Trade-offs:**
- ❌ Complexity cao hơn Docker Compose
- ❌ Learning curve steep
- ❌ Resource overhead (etcd, controller, scheduler)

---

### 3. **Secret Management** 🔴 Priority: HIGH

#### 3.1. Vault by HashiCorp (Khuyến nghị)

**Problem hiện tại:**
```bash
# .env.production (plaintext, risky)
DB_PASSWORD=supersecret123
JWT_SECRET=my-jwt-secret
PAYOS_API_KEY=sensitive-key
```

**Solution với Vault:**

**Docker Compose với Vault:**
```yaml
  vault:
    image: hashicorp/vault:latest
    container_name: doanhoi-vault
    ports:
      - "8200:8200"
    environment:
      VAULT_ADDR: 'http://0.0.0.0:8200'
      VAULT_DEV_ROOT_TOKEN_ID: 'root'  # CHANGE IN PRODUCTION
      VAULT_DEV_LISTEN_ADDRESS: '0.0.0.0:8200'
    cap_add:
      - IPC_LOCK
    volumes:
      - vault_data:/vault/file
    networks:
      - doanhoi-network
    restart: unless-stopped

volumes:
  vault_data:
```

**Sử dụng Vault:**
```bash
# Initialize Vault
docker exec -it doanhoi-vault vault operator init

# Store secrets
vault kv put secret/doanhoi/db password=supersecret123
vault kv put secret/doanhoi/jwt secret=my-jwt-secret

# Backend lấy secrets từ Vault thay vì .env
```

**Backend Integration (NestJS):**
```typescript
// src/config/vault.config.ts
import * as vault from 'node-vault';

export const getVaultSecrets = async () => {
  const client = vault({
    apiVersion: 'v1',
    endpoint: process.env.VAULT_ADDR,
    token: process.env.VAULT_TOKEN,
  });

  const dbSecret = await client.read('secret/data/doanhoi/db');
  const jwtSecret = await client.read('secret/data/doanhoi/jwt');

  return {
    DB_PASSWORD: dbSecret.data.data.password,
    JWT_SECRET: jwtSecret.data.data.secret,
  };
};
```

#### 3.2. Alternative: Sealed Secrets (cho K8s)
```bash
# Install Sealed Secrets controller
kubectl apply -f https://github.com/bitnami-labs/sealed-secrets/releases/download/v0.24.0/controller.yaml

# Encrypt secrets
kubeseal --format yaml < secret.yaml > sealed-secret.yaml

# Commit sealed-secret.yaml to Git (safe!)
```

---

### 4. **Distributed Tracing** 🟡 Priority: MEDIUM

#### 4.1. Jaeger (OpenTelemetry)

**Use case:**
- Track request flow: Frontend → Backend → Database
- Identify performance bottlenecks
- Debug slow API calls

**Docker Compose:**
```yaml
  jaeger:
    image: jaegertracing/all-in-one:latest
    container_name: doanhoi-jaeger
    ports:
      - "16686:16686"  # Jaeger UI
      - "14268:14268"  # Jaeger collector
      - "6831:6831/udp"  # Jaeger agent
    environment:
      COLLECTOR_ZIPKIN_HOST_PORT: ":9411"
    networks:
      - doanhoi-network
    restart: unless-stopped
```

**NestJS Integration:**
```typescript
// Install dependencies
npm install @opentelemetry/sdk-node @opentelemetry/auto-instrumentations-node

// src/tracing.ts
import { NodeSDK } from '@opentelemetry/sdk-node';
import { JaegerExporter } from '@opentelemetry/exporter-jaeger';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';

const jaegerExporter = new JaegerExporter({
  endpoint: 'http://jaeger:14268/api/traces',
});

const sdk = new NodeSDK({
  traceExporter: jaegerExporter,
  instrumentations: [getNodeAutoInstrumentations()],
});

sdk.start();
```

**React Frontend:**
```typescript
// Install OpenTelemetry for browser
npm install @opentelemetry/sdk-trace-web @opentelemetry/instrumentation-fetch

// Track API calls
import { WebTracerProvider } from '@opentelemetry/sdk-trace-web';
import { FetchInstrumentation } from '@opentelemetry/instrumentation-fetch';

const provider = new WebTracerProvider();
provider.addSpanProcessor(new BatchSpanProcessor(jaegerExporter));
provider.register();
```

---

### 5. **Alerting & Incident Management** 🔴 Priority: HIGH

#### 5.1. Alertmanager + Prometheus

**Thêm vào docker-compose.prod.yml:**
```yaml
  alertmanager:
    image: prom/alertmanager:latest
    container_name: doanhoi-alertmanager
    ports:
      - "9093:9093"
    volumes:
      - ./alertmanager/config.yml:/etc/alertmanager/config.yml
      - alertmanager_data:/alertmanager
    command:
      - '--config.file=/etc/alertmanager/config.yml'
      - '--storage.path=/alertmanager'
    networks:
      - doanhoi-network
    restart: unless-stopped

volumes:
  alertmanager_data:
```

**Alertmanager Config (`alertmanager/config.yml`):**
```yaml
global:
  resolve_timeout: 5m

route:
  group_by: ['alertname', 'cluster']
  group_wait: 10s
  group_interval: 10s
  repeat_interval: 12h
  receiver: 'telegram'

receivers:
  - name: 'telegram'
    telegram_configs:
      - bot_token: 'YOUR_TELEGRAM_BOT_TOKEN'
        chat_id: YOUR_CHAT_ID
        parse_mode: 'HTML'
        message: |
          <b>🚨 Alert: {{ .GroupLabels.alertname }}</b>
          
          {{ range .Alerts }}
          <b>Status:</b> {{ .Status }}
          <b>Severity:</b> {{ .Labels.severity }}
          <b>Summary:</b> {{ .Annotations.summary }}
          <b>Description:</b> {{ .Annotations.description }}
          {{ end }}

  - name: 'email'
    email_configs:
      - to: 'admin@doanhoi.hcmut.edu.vn'
        from: 'alerts@doanhoi.hcmut.edu.vn'
        smarthost: 'smtp.gmail.com:587'
        auth_username: 'your-email@gmail.com'
        auth_password: 'your-app-password'
        headers:
          Subject: '🚨 Doanhoi Portal Alert'
```

**Prometheus Alert Rules (`prometheus/alerts.yml`):**
```yaml
groups:
  - name: doanhoi_alerts
    interval: 30s
    rules:
      # Backend down
      - alert: BackendDown
        expr: up{job="doanhoi-backend-api"} == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Backend API is down"
          description: "Backend has been down for more than 1 minute"

      # High response time
      - alert: HighResponseTime
        expr: histogram_quantile(0.95, rate(http_request_duration_ms_bucket[5m])) > 1000
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High response time detected"
          description: "95th percentile response time is above 1000ms"

      # Database connection issues
      - alert: DatabaseConnectionFailed
        expr: increase(database_connection_errors_total[5m]) > 5
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "Database connection errors"
          description: "More than 5 database connection errors in 5 minutes"

      # High CPU usage
      - alert: HighCPUUsage
        expr: rate(process_cpu_seconds_total[5m]) * 100 > 80
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High CPU usage"
          description: "CPU usage is above 80% for 5 minutes"

      # High memory usage
      - alert: HighMemoryUsage
        expr: (process_resident_memory_bytes / 1024 / 1024) > 512
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High memory usage"
          description: "Memory usage is above 512MB"

      # Disk space low
      - alert: DiskSpaceLow
        expr: (node_filesystem_avail_bytes{mountpoint="/"} / node_filesystem_size_bytes{mountpoint="/"}) * 100 < 10
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "Low disk space"
          description: "Less than 10% disk space available"
```

**Update Prometheus config:**
```yaml
# prometheus.prod.yml
alerting:
  alertmanagers:
    - static_configs:
        - targets: ['alertmanager:9093']

rule_files:
  - "/etc/prometheus/alerts.yml"
```

#### 5.2. PagerDuty/Opsgenie Integration (Optional)
```yaml
receivers:
  - name: 'pagerduty'
    pagerduty_configs:
      - service_key: 'YOUR_PAGERDUTY_KEY'
        description: '{{ .GroupLabels.alertname }}'
```

---

### 6. **Database Backup & Disaster Recovery** 🔴 Priority: HIGH

#### 6.1. Automated PostgreSQL Backup

**Backup Script (`scripts/backup-postgres.sh`):**
```bash
#!/bin/bash

# Configuration
BACKUP_DIR="/opt/backups/postgres"
RETENTION_DAYS=7
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/doanhoi_backup_$DATE.sql.gz"

# Create backup directory if not exists
mkdir -p $BACKUP_DIR

# Perform backup
docker exec doanhoi-postgres-prod pg_dump -U postgres doanhoi | gzip > $BACKUP_FILE

# Remove old backups
find $BACKUP_DIR -name "doanhoi_backup_*.sql.gz" -mtime +$RETENTION_DAYS -delete

# Log
echo "[$(date)] Backup completed: $BACKUP_FILE"

# Optional: Upload to S3
# aws s3 cp $BACKUP_FILE s3://your-bucket/backups/
```

**Cron Job:**
```bash
# Daily backup at 2 AM
0 2 * * * /opt/doanhoi-portal/scripts/backup-postgres.sh >> /var/log/postgres-backup.log 2>&1
```

#### 6.2. Backup Service (Docker)

**Thêm vào docker-compose.prod.yml:**
```yaml
  postgres-backup:
    image: prodrigestivill/postgres-backup-local
    container_name: doanhoi-postgres-backup
    environment:
      POSTGRES_HOST: postgres
      POSTGRES_DB: doanhoi
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: ${DB_PASSWORD}
      SCHEDULE: "@daily"  # or "0 2 * * *" for 2 AM
      BACKUP_KEEP_DAYS: 7
      BACKUP_KEEP_WEEKS: 4
      BACKUP_KEEP_MONTHS: 6
    volumes:
      - /opt/backups/postgres:/backups
    networks:
      - doanhoi-network
    depends_on:
      - postgres
    restart: unless-stopped
```

#### 6.3. Restore Procedure

**Restore từ backup:**
```bash
# Stop backend
docker-compose -f docker-compose.prod.yml stop backend

# Drop database
docker exec doanhoi-postgres-prod psql -U postgres -c "DROP DATABASE doanhoi;"

# Create database
docker exec doanhoi-postgres-prod psql -U postgres -c "CREATE DATABASE doanhoi;"

# Restore
gunzip < /opt/backups/postgres/doanhoi_backup_20250101_020000.sql.gz | \
  docker exec -i doanhoi-postgres-prod psql -U postgres doanhoi

# Start backend
docker-compose -f docker-compose.prod.yml start backend
```

---

### 7. **Security Scanning** 🔴 Priority: HIGH

#### 7.1. Trivy (Container Vulnerability Scanner)

**Thêm vào GitLab CI:**
```yaml
security_scan:
  stage: test
  image: aquasec/trivy:latest
  script:
    - trivy image --exit-code 0 --severity HIGH,CRITICAL node:20-alpine
    - trivy fs --exit-code 0 --severity HIGH,CRITICAL backend/
    - trivy fs --exit-code 0 --severity HIGH,CRITICAL frontend/
  allow_failure: true
  only:
    - dev
    - main
```

#### 7.2. SonarQube (Code Quality)

**Docker Compose:**
```yaml
  sonarqube:
    image: sonarqube:community
    container_name: doanhoi-sonarqube
    ports:
      - "9000:9000"
    environment:
      SONAR_JDBC_URL: jdbc:postgresql://postgres:5432/sonarqube
      SONAR_JDBC_USERNAME: postgres
      SONAR_JDBC_PASSWORD: ${DB_PASSWORD}
    volumes:
      - sonarqube_data:/opt/sonarqube/data
      - sonarqube_extensions:/opt/sonarqube/extensions
      - sonarqube_logs:/opt/sonarqube/logs
    networks:
      - doanhoi-network
    restart: unless-stopped

volumes:
  sonarqube_data:
  sonarqube_extensions:
  sonarqube_logs:
```

**GitLab CI Integration:**
```yaml
sonar_scan:
  stage: test
  image: sonarsource/sonar-scanner-cli:latest
  script:
    - sonar-scanner -Dsonar.projectKey=doanhoi-portal -Dsonar.sources=. -Dsonar.host.url=http://sonarqube:9000 -Dsonar.login=$SONAR_TOKEN
  only:
    - dev
    - main
```

#### 7.3. OWASP Dependency Check

```yaml
dependency_check:
  stage: test
  image: node:20-alpine
  script:
    - cd backend && npm audit --audit-level=moderate
    - cd ../frontend && npm audit --audit-level=moderate
  allow_failure: true
```

---

### 8. **Service Mesh** 🟢 Priority: LOW

#### 8.1. Istio (Advanced - Only for K8s)

**Use case:**
- Microservices communication
- Traffic management (canary, blue-green)
- mTLS encryption between services
- Circuit breaking

**Chỉ cần khi:**
- Có 5+ microservices
- Cần advanced routing
- Cần service-to-service authentication

---

### 9. **Infrastructure as Code (IaC)** 🟡 Priority: MEDIUM

#### 9.1. Ansible (Khuyến nghị cho VM deployment)

**Setup Server với Ansible:**

**`ansible/playbook.yml`:**
```yaml
---
- name: Setup Doanhoi Portal Production Server
  hosts: production
  become: yes
  vars:
    project_path: /opt/doanhoi-portal
    domain: doanhoi.hcmut.edu.vn

  tasks:
    # Install Docker
    - name: Install Docker
      apt:
        name:
          - docker.io
          - docker-compose
        state: present
        update_cache: yes

    # Install Nginx
    - name: Install Nginx
      apt:
        name: nginx
        state: present

    # Configure firewall
    - name: Configure UFW
      ufw:
        rule: allow
        port: "{{ item }}"
      loop:
        - 22
        - 80
        - 443
        - 2680
        - 2681

    # Clone repository
    - name: Clone repository
      git:
        repo: https://gitlab.com/your/doanhoi-portal.git
        dest: "{{ project_path }}"
        version: dev

    # Copy environment file
    - name: Copy .env.production
      template:
        src: templates/env.production.j2
        dest: "{{ project_path }}/.env.production"

    # Deploy containers
    - name: Deploy with Docker Compose
      docker_compose:
        project_src: "{{ project_path }}"
        files:
          - docker-compose.prod.yml
        state: present
        restarted: yes

    # Configure Nginx
    - name: Copy Nginx config
      template:
        src: templates/nginx.conf.j2
        dest: /etc/nginx/sites-available/{{ domain }}
      notify: Reload Nginx

    # SSL Certificate
    - name: Install Certbot
      apt:
        name: certbot
        state: present

    - name: Obtain SSL certificate
      command: certbot --nginx -d {{ domain }} --non-interactive --agree-tos -m admin@{{ domain }}

  handlers:
    - name: Reload Nginx
      service:
        name: nginx
        state: reloaded
```

**Inventory (`ansible/inventory.ini`):**
```ini
[production]
doanhoi-server ansible_host=103.88.121.146 ansible_user=root ansible_ssh_private_key_file=~/.ssh/id_rsa
```

**Run Ansible:**
```bash
ansible-playbook -i ansible/inventory.ini ansible/playbook.yml
```

#### 9.2. Terraform (For cloud resources)

**Nếu deploy lên AWS/Azure/GCP:**
```hcl
# terraform/main.tf
provider "aws" {
  region = "ap-southeast-1"
}

resource "aws_instance" "doanhoi_server" {
  ami           = "ami-0c55b159cbfafe1f0"
  instance_type = "t3.medium"
  
  tags = {
    Name = "doanhoi-portal"
  }
}

resource "aws_rds_instance" "postgres" {
  identifier           = "doanhoi-postgres"
  engine               = "postgres"
  engine_version       = "15"
  instance_class       = "db.t3.micro"
  allocated_storage    = 20
  username             = "postgres"
  password             = var.db_password
}
```

---

### 10. **CI/CD Enhancements** 🟡 Priority: MEDIUM

#### 10.1. Multi-Environment Deployments

**GitLab CI với multiple environments:**
```yaml
stages:
  - test
  - build
  - deploy:dev
  - deploy:staging
  - deploy:production

deploy_dev:
  stage: deploy:dev
  script:
    - ssh dev-server "cd /opt/doanhoi && docker-compose up -d"
  environment:
    name: development
    url: https://dev.doanhoi.hcmut.edu.vn
  only:
    - dev

deploy_staging:
  stage: deploy:staging
  script:
    - ssh staging-server "cd /opt/doanhoi && docker-compose up -d"
  environment:
    name: staging
    url: https://staging.doanhoi.hcmut.edu.vn
  only:
    - main
  when: manual

deploy_production:
  stage: deploy:production
  script:
    - ssh production-server "cd /opt/doanhoi && ./deploy.sh"
  environment:
    name: production
    url: https://doanhoi.hcmut.edu.vn
  only:
    - main
  when: manual
```

#### 10.2. Docker Registry

**Private Registry:**
```yaml
  registry:
    image: registry:2
    container_name: doanhoi-registry
    ports:
      - "5000:5000"
    volumes:
      - registry_data:/var/lib/registry
    networks:
      - doanhoi-network
    restart: unless-stopped

volumes:
  registry_data:
```

**GitLab CI push to registry:**
```yaml
build_and_push:
  stage: build
  script:
    - docker build -t registry.doanhoi.hcmut.edu.vn/backend:$CI_COMMIT_SHORT_SHA ./backend
    - docker push registry.doanhoi.hcmut.edu.vn/backend:$CI_COMMIT_SHORT_SHA
```

---

## 📊 Implementation Roadmap

### Phase 1: Critical (1-2 weeks) 🔴
**Goal:** Improve observability & security

- [ ] ✅ Setup Loki + Promtail for centralized logging
- [ ] ✅ Configure Alertmanager with Telegram/Email alerts
- [ ] ✅ Implement automated PostgreSQL backups
- [ ] ✅ Add Vault for secret management
- [ ] ✅ Add security scanning (Trivy) to CI/CD

**Impact:** 
- Better debugging with centralized logs
- Proactive alerting for issues
- Data protection with backups
- Secure secrets management

---

### Phase 2: High Priority (2-4 weeks) 🟡
**Goal:** Enhance reliability & automation

- [ ] ✅ Setup Ansible for infrastructure automation
- [ ] ✅ Add SonarQube for code quality
- [ ] ✅ Implement blue-green deployment strategy
- [ ] ✅ Add Jaeger for distributed tracing
- [ ] ✅ Multi-environment setup (dev/staging/prod)

**Impact:**
- Reproducible infrastructure setup
- Improved code quality
- Zero-downtime deployments
- Better performance debugging

---

### Phase 3: Scale Preparation (1-2 months) 🟢
**Goal:** Prepare for growth

- [ ] ✅ Evaluate Kubernetes migration (K3s first)
- [ ] ✅ Setup K8s manifests và Helm charts
- [ ] ✅ Implement auto-scaling policies
- [ ] ✅ Setup CDN for static assets
- [ ] ✅ Database read replicas

**Impact:**
- Handle increased traffic
- Automatic scaling
- Improved global performance
- Database load distribution

---

## 💰 Cost Estimation

### Current Infrastructure
- **VM:** $50-100/month (single server)
- **Total:** ~$100/month

### With All Enhancements
| Tool | Monthly Cost | Notes |
|------|--------------|-------|
| Loki | $0 | Self-hosted |
| Vault | $0 | Open-source |
| Alertmanager | $0 | Self-hosted |
| Jaeger | $0 | Self-hosted |
| SonarQube | $0 | Community edition |
| K3s | $0 | Open-source |
| Backup Storage (S3) | $5-10 | 100GB backups |
| Monitoring VM | $30-50 | Separate server |
| **Total** | **$135-160/month** | +$35-60 |

### Cloud-Managed Alternatives (Expensive)
- AWS EKS: $72/month + node costs
- Datadog: $15/host/month
- PagerDuty: $21/user/month

**Recommendation:** Stick với self-hosted tools để tiết kiệm chi phí.

---

## 🎯 Quick Wins (Implement First)

### 1. Loki + Promtail (1 day)
```bash
# Add to docker-compose.prod.yml
# Configure promtail.yml
# Access logs at http://grafana:3000
```
**Impact:** ⭐⭐⭐⭐⭐ (Massive debugging improvement)

### 2. Alertmanager + Telegram (2 hours)
```bash
# Create Telegram bot with BotFather
# Configure alertmanager.yml
# Add alert rules to prometheus
```
**Impact:** ⭐⭐⭐⭐⭐ (Know when things break)

### 3. Automated Backups (2 hours)
```bash
# Add postgres-backup service
# Setup cron job
# Test restore procedure
```
**Impact:** ⭐⭐⭐⭐⭐ (Critical data protection)

### 4. Security Scanning in CI (1 hour)
```yaml
# Add trivy to .gitlab-ci.yml
# Run npm audit in pipeline
```
**Impact:** ⭐⭐⭐⭐ (Prevent vulnerabilities)

---

## 📚 Learning Resources

**Loki:**
- https://grafana.com/docs/loki/latest/

**Kubernetes:**
- https://kubernetes.io/docs/tutorials/
- K3s: https://k3s.io/

**Vault:**
- https://learn.hashicorp.com/vault

**Jaeger:**
- https://www.jaegertracing.io/docs/

**Ansible:**
- https://docs.ansible.com/ansible/latest/user_guide/

---

## 🔄 Migration Strategy: Docker Compose → Kubernetes

### When to Migrate?
**Stay với Docker Compose nếu:**
- Single server deployment
- Traffic < 10k requests/day
- Team size < 5 people
- Simple architecture

**Migrate lên K8s khi:**
- Need multi-node cluster
- Traffic > 50k requests/day
- Need auto-scaling
- Complex microservices

### Step-by-Step Migration
1. **Setup K3s** trên current server (coexist với Docker)
2. **Convert** docker-compose → K8s manifests (kompose)
3. **Test** K8s deployment ở staging environment
4. **Blue-green deploy** production: Docker Compose (blue) + K8s (green)
5. **Switch traffic** from Compose to K8s
6. **Monitor** và rollback nếu cần
7. **Decommission** Docker Compose stack

---

## ✅ Recommended Priority Order

### Immediate (This Week)
1. 🔴 **Loki + Promtail** - Centralized logging
2. 🔴 **Alertmanager** - Telegram alerts
3. 🔴 **Automated Backups** - Database protection

### Short-term (This Month)
4. 🔴 **Vault** - Secret management
5. 🟡 **Security Scanning** - Trivy in CI/CD
6. 🟡 **Ansible** - Infrastructure automation

### Medium-term (Next 2-3 Months)
7. 🟡 **Jaeger** - Distributed tracing
8. 🟡 **SonarQube** - Code quality
9. 🟢 **K3s Evaluation** - Start learning K8s

### Long-term (6+ Months)
10. 🟢 **Full K8s Migration** - If traffic demands
11. 🟢 **Service Mesh** - Only if microservices grow

---

## 📝 Conclusion

**Current State:** Good foundation với Docker, Prometheus, Grafana  
**Next Level:** Add logging (Loki), alerting (Alertmanager), backups  
**Future:** Kubernetes migration khi scale demands

**Don't Over-Engineer:** Start small với quick wins, scale when needed.

**Total Setup Time:**
- Phase 1 (Critical): 1-2 weeks
- Phase 2 (High): 2-4 weeks  
- Phase 3 (Scale): 1-2 months

Good luck với DevOps journey! 🚀
