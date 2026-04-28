# GoTymeX Platform Engineering Intern — Interview Preparation

> Tổng hợp các câu hỏi phỏng vấn có thể gặp, phân tích từ JD và CV cá nhân.
> Mục tiêu: ôn đúng trọng tâm, trả lời rõ bản chất, không chỉ biết dùng mà phải hiểu **tại sao**.

---

## MỤC LỤC

1. [Giải thích khái niệm cơ bản (Concept Explanation)](#1-giải-thích-khái-niệm-cơ-bản)
2. [Linux & Scripting](#2-linux--scripting)
3. [Git](#3-git)
4. [Docker & Containers](#4-docker--containers)
5. [CI/CD Pipelines](#5-cicd-pipelines)
6. [AWS & Cloud](#6-aws--cloud)
7. [Terraform / Infrastructure as Code](#7-terraform--infrastructure-as-code)
8. [Networking & Security](#8-networking--security)
9. [Monitoring & Observability](#9-monitoring--observability)
10. [Platform Engineering](#10-platform-engineering)
11. [AI Tools Usage](#11-ai-tools-usage)
12. [Fintech Domain](#12-fintech-domain)
13. [Behavioral & Soft Skills](#13-behavioral--soft-skills)
14. [Deep-Dive vào CV & Projects](#14-deep-dive-vào-cv--projects)

---

## 1. Giải thích khái niệm cơ bản

> JD ghi rõ: *"willing to explain concepts (e.g., 'What is a virtual machine?') even imperfectly"*
> → Họ **sẽ hỏi** bạn giải thích khái niệm cơ bản bằng lời đơn giản. Mục đích: test tư duy, không phải đọc thuộc.

### Q1.1: What is a Virtual Machine (VM)?
**Gợi ý trả lời:**
- VM là một máy tính ảo chạy bên trong một máy tính vật lý, thông qua hypervisor (VD: VMware, KVM, Hyper-V).
- Mỗi VM có OS riêng, CPU/RAM/disk riêng (được chia từ host).
- So sánh: VM giống như một căn hộ trong chung cư — mỗi căn có phòng bếp, toilet riêng (OS riêng), dùng chung tòa nhà (hardware).

**Câu hỏi mở rộng:**
- VM khác Container ở điểm nào?
- Khi nào nên dùng VM thay vì container?

### Q1.2: What is a Container? How is it different from a VM?
**Gợi ý trả lời:**
- Container chia sẻ kernel của host OS, chỉ đóng gói app + dependencies → nhẹ hơn, start nhanh hơn VM.
- VM ảo hóa ở tầng hardware (hypervisor), container ảo hóa ở tầng OS (cgroups, namespaces).
- Analogy: VM = căn hộ riêng (có toilet, bếp riêng). Container = phòng trong co-working space (dùng chung toilet, bếp, nhưng có bàn riêng).

| Tiêu chí | VM | Container |
|---|---|---|
| Boot time | Phút | Giây |
| Size | GB | MB |
| Isolation | Mạnh (OS riêng) | Nhẹ hơn (share kernel) |
| Use case | Cần OS khác nhau, security cao | Microservices, CI/CD |

### Q1.3: What is an API?
**Gợi ý trả lời:**
- API (Application Programming Interface) là giao diện cho phép 2 phần mềm giao tiếp với nhau.
- Ví dụ: app gọi API của ngân hàng để kiểm tra số dư → app gửi HTTP request, nhận JSON response.
- REST API: dùng HTTP methods (GET, POST, PUT, DELETE) trên resources.

### Q1.4: What is DNS? How does it work?
**Gợi ý trả lời:**
- DNS (Domain Name System) chuyển đổi tên miền (google.com) thành IP address (142.250.x.x).
- Flow: Browser → DNS Resolver → Root Server → TLD Server (.com) → Authoritative Server → trả IP.
- Analogy: DNS giống danh bạ điện thoại — bạn tìm tên, nó trả số.

### Q1.5: What is HTTP vs HTTPS?
**Gợi ý trả lời:**
- HTTP truyền dữ liệu dạng plaintext. HTTPS = HTTP + TLS/SSL encryption.
- HTTPS đảm bảo: **confidentiality** (mã hóa), **integrity** (không bị sửa), **authentication** (cert xác minh server).
- Trong fintech → HTTPS là bắt buộc, không bao giờ dùng HTTP cho production.

### Q1.6: What is a Load Balancer?
**Gợi ý trả lời:**
- Phân phối traffic đến nhiều server backend → tránh quá tải 1 server.
- Algorithms: Round Robin, Least Connections, IP Hash.
- AWS: ALB (Application Load Balancer - Layer 7), NLB (Network Load Balancer - Layer 4).

### Q1.7: What is Latency vs Throughput?
**Gợi ý trả lời:**
- **Latency:** Thời gian 1 request đi từ client đến server và nhận response (ms).
- **Throughput:** Số lượng request xử lý được trong 1 đơn vị thời gian (requests/second).
- Analogy: Latency = thời gian 1 xe chạy từ A→B. Throughput = số xe qua trạm thu phí trong 1 giờ.

### Q1.8: What is Stateless vs Stateful?
**Gợi ý trả lời:**
- **Stateless:** Server không lưu trạng thái giữa các requests. Mỗi request phải chứa đủ thông tin. VD: REST API.
- **Stateful:** Server nhớ trạng thái. VD: WebSocket, database connection.
- Tại sao quan trọng: Stateless dễ scale horizontally (thêm server), stateful khó hơn.

---

## 2. Linux & Scripting

> JD: *"Linux command line familiarity, some scripting experience (Python, Bash, or equivalent)"*

### Q2.1: Các lệnh Linux cơ bản — bạn sẽ dùng gì để...?
- Xem file log đang chạy real-time? → `tail -f /var/log/app.log`
- Tìm file chứa text "error" trong thư mục? → `grep -r "error" /path/` hoặc `grep -rn "error" .`
- Xem process nào đang chạy trên port 8080? → `lsof -i :8080` hoặc `netstat -tlnp | grep 8080`
- Kiểm tra disk usage? → `df -h` (tổng quan), `du -sh *` (chi tiết folder)
- Xem RAM usage? → `free -h`
- Chạy command ở background? → `nohup command &` hoặc `command &`
- Thay đổi permission file? → `chmod 755 script.sh` — giải thích rwx (read/write/execute) cho owner/group/others

### Q2.2: What are Linux file permissions? Explain 755.
- 7 = rwx (owner: read + write + execute)
- 5 = r-x (group: read + execute)
- 5 = r-x (others: read + execute)
- Octal: r=4, w=2, x=1

### Q2.3: What is the difference between a process and a thread?
- **Process:** Chương trình đang chạy, có memory space riêng.
- **Thread:** Đơn vị thực thi nhỏ nhất trong process, chia sẻ memory space với các thread cùng process.

### Q2.4: Write a simple Bash script that...
- Kiểm tra nếu file tồn tại, nếu có thì đếm số dòng
- Lặp qua danh sách server và ping từng cái
- Đọc biến môi trường và in ra

```bash
#!/bin/bash
# Ví dụ: kiểm tra file và đếm dòng
FILE="/var/log/app.log"
if [ -f "$FILE" ]; then
    echo "File exists. Line count: $(wc -l < "$FILE")"
else
    echo "File not found."
fi
```

### Q2.5: What is a cron job? How do you set one up?
- Cron = scheduler chạy task định kỳ trên Linux.
- `crontab -e` để edit, format: `minute hour day month weekday command`
- VD: `0 2 * * * /home/user/backup.sh` → chạy backup lúc 2AM mỗi ngày.

### Q2.6: What is stdin, stdout, stderr?
- stdin (0): input, stdout (1): output, stderr (2): error output.
- Redirect: `command > output.txt 2>&1` → ghi cả output và error vào file.

---

## 3. Git

> JD: *"basic Git usage (clone, commit, push, branching)"*

### Q3.1: Explain basic Git workflow.
- `git clone` → `git checkout -b feature/x` → code → `git add .` → `git commit -m "msg"` → `git push origin feature/x` → tạo Pull Request → review → merge.

### Q3.2: What is the difference between `git merge` and `git rebase`?
- **Merge:** Tạo merge commit, giữ lịch sử đầy đủ. An toàn cho shared branches.
- **Rebase:** Viết lại lịch sử, đặt commits lên đầu branch target. Lịch sử sạch hơn nhưng nguy hiểm nếu đã push.
- Rule: Không rebase branch đã shared/public.

### Q3.3: What is a Git conflict? How do you resolve it?
- Xảy ra khi 2 người sửa cùng dòng trong cùng file.
- Resolve: mở file, xem markers `<<<<<<<`, chọn code đúng, `git add`, `git commit`.

### Q3.4: What is `.gitignore`? Why is it important?
- File chỉ định những file/folder Git không track: `node_modules/`, `.env`, `*.tfstate`, build artifacts.
- Quan trọng: tránh commit secrets, dependencies, build output.

### Q3.5: What is the difference between `git pull` and `git fetch`?
- `git fetch`: Tải changes từ remote nhưng KHÔNG merge vào branch hiện tại.
- `git pull` = `git fetch` + `git merge`.

### Q3.6: Branching strategy — bạn dùng gì?
- **GitFlow:** main, develop, feature/*, release/*, hotfix/*
- **Trunk-based:** Commit thẳng vào main/trunk, dùng feature flags.
- Platform teams thường thích trunk-based vì deploy nhanh.

---

## 4. Docker & Containers

> Bạn có giải nhì Docker Security Contest → expect câu hỏi sâu hơn intern thường.

### Q4.1: What is Docker? Why do we use it?
- Docker đóng gói app + dependencies vào container → chạy giống nhau mọi nơi (dev, staging, prod).
- Giải quyết: "It works on my machine" problem.

### Q4.2: Explain Dockerfile instructions: FROM, RUN, COPY, CMD, ENTRYPOINT, EXPOSE, ENV, WORKDIR.
- `FROM`: Base image (VD: `node:18-alpine`)
- `RUN`: Chạy command lúc build (VD: `RUN npm install`)
- `COPY` / `ADD`: Copy file từ host vào image
- `CMD`: Command mặc định khi container start (có thể override)
- `ENTRYPOINT`: Command cố định khi start (không dễ override)
- `EXPOSE`: Khai báo port (documentation, không thực sự mở port)
- `WORKDIR`: Set working directory trong container

### Q4.3: What is a Docker layer? How does layer caching work?
- Mỗi instruction trong Dockerfile tạo 1 layer. Docker cache layer nếu instruction không thay đổi.
- Best practice: Đặt instruction ít thay đổi lên trước (VD: `COPY package.json` trước `COPY . .`) → tận dụng cache.

### Q4.4: What is multi-stage build? Why use it?
```dockerfile
# Stage 1: Build
FROM node:18 AS builder
WORKDIR /app
COPY . .
RUN npm run build

# Stage 2: Production
FROM node:18-alpine
COPY --from=builder /app/dist ./dist
CMD ["node", "dist/main.js"]
```
- Giảm image size: chỉ copy artifact cần thiết, không kéo dev dependencies.
- Security: production image không có build tools.

### Q4.5: Docker Security Best Practices (quan trọng vì bạn có giải Docker Security)
- **Không chạy container bằng root:** `USER node` hoặc `USER 1001`
- **Dùng minimal base image:** `alpine`, `distroless`
- **Không để secrets trong image:** Dùng env vars, secrets manager
- **Scan images:** `docker scout`, `trivy`, `snyk`
- **Read-only filesystem:** `docker run --read-only`
- **Drop capabilities:** `--cap-drop=ALL --cap-add=NET_BIND_SERVICE`
- **Không dùng `latest` tag:** Pin version cụ thể

### Q4.6: What is Docker Compose? When do you use it?
- Định nghĩa multi-container app trong 1 file `docker-compose.yml`.
- VD: app + database + redis + nginx chạy cùng lúc.
- Dùng cho local development, testing. Production thường dùng Kubernetes hoặc ECS.

### Q4.7: What is the difference between Docker volumes and bind mounts?
- **Volume:** Docker quản lý, stored ở `/var/lib/docker/volumes/`. Persist data khi container bị xóa.
- **Bind mount:** Mount trực tiếp folder từ host vào container. Dùng cho development (live reload).

### Q4.8: How do containers communicate with each other?
- Cùng Docker network → gọi nhau bằng container name (DNS nội bộ).
- Docker Compose tự tạo network cho tất cả services.
- Bridge network (default), host network, overlay network (multi-host).

### Q4.9: Explain `docker exec` vs `docker run`.
- `docker run`: Tạo container MỚI từ image và chạy.
- `docker exec`: Chạy command trong container ĐANG CHẠY. VD: `docker exec -it myapp bash`

---

## 5. CI/CD Pipelines

> JD: *"Contribute to CI/CD pipelines, automation scripts, and infrastructure workflows"*
> CV: Bạn đã build CI/CD pipeline ở HCMUT.

### Q5.1: What is CI/CD? Explain each part.
- **CI (Continuous Integration):** Dev merge code thường xuyên → tự động build + test → phát hiện lỗi sớm.
- **CD (Continuous Delivery):** Sau CI, code sẵn sàng deploy bất kỳ lúc nào (cần approval manual).
- **CD (Continuous Deployment):** Tự động deploy luôn lên production sau khi pass tests (không cần approval).

### Q5.2: Describe a CI/CD pipeline you have built.
**Chuẩn bị kể project ở HCMUT:**
- Tool gì? (GitHub Actions / Jenkins / GitLab CI)
- Stages: Lint → Build → Test → Docker Build → Push to Registry → Deploy
- Trigger: On push to main? On PR?
- Environment: Deploy đi đâu? (EC2? Docker Compose trên server?)

### Q5.3: What makes a good CI/CD pipeline?
- **Fast:** Fail fast — chạy lint/unit test trước, integration test sau.
- **Reliable:** Deterministic — chạy lại cho cùng kết quả.
- **Secure:** Không hardcode secrets, dùng CI/CD secrets management.
- **Observable:** Logs rõ ràng, notifications khi fail.

### Q5.4: What is the difference between a build artifact and a Docker image?
- **Build artifact:** Output của build process (JAR, binary, bundle).
- **Docker image:** Đóng gói artifact + runtime + config thành deployable unit.

### Q5.5: How do you handle secrets in CI/CD?
- Dùng CI/CD secrets (GitHub Secrets, GitLab CI Variables).
- Không bao giờ commit secrets vào repo.
- Dùng AWS Secrets Manager, HashiCorp Vault cho production.

### Q5.6: What is a rollback strategy?
- Khi deploy bị lỗi → quay lại version trước.
- Blue-green deployment: 2 environment, switch traffic.
- Canary deployment: Deploy cho 5% users trước, nếu OK → 100%.
- Rollback Docker: chạy lại image tag cũ.

---

## 6. AWS & Cloud

> Bạn có AWS SAA + CCP → expect câu hỏi sâu hơn basic.
> JD: *"Assist in provisioning cloud resources on AWS under guidance"*

### Q6.1: Explain the AWS Shared Responsibility Model.
- **AWS chịu trách nhiệm:** Security OF the cloud (hardware, network, data centers, hypervisor).
- **Customer chịu trách nhiệm:** Security IN the cloud (OS patching, data encryption, IAM, firewall rules).
- Fintech context: customer phải đảm bảo data encryption, access control, compliance.

### Q6.2: What is IAM? Explain users, roles, policies.
- **User:** Identity cho người hoặc app.
- **Role:** Identity tạm thời, assume bởi user/service (không có password, dùng STS).
- **Policy:** JSON document định nghĩa permissions (Allow/Deny + Actions + Resources + Conditions).
- **Least Privilege:** Chỉ cấp quyền tối thiểu cần thiết.

### Q6.3: What is a VPC? Why do we need it?
- VPC (Virtual Private Cloud) = mạng riêng ảo trên AWS.
- Bạn control: CIDR block, subnets (public/private), route tables, internet gateway, NAT gateway.
- Fintech: Database phải ở private subnet, không accessible từ internet.

### Q6.4: Explain the difference between Security Group and NACL.
| Tiêu chí | Security Group | NACL |
|---|---|---|
| Level | Instance (ENI) | Subnet |
| State | Stateful (auto allow return traffic) | Stateless (phải define cả inbound + outbound) |
| Rules | Allow only | Allow + Deny |
| Evaluation | Tất cả rules cùng lúc | Theo thứ tự rule number |

### Q6.5: What is S3? Explain storage classes.
- S3 = Object storage, unlimited capacity, 99.999999999% durability (11 nines).
- Classes: Standard, IA (Infrequent Access), Glacier (archive), Intelligent-Tiering.
- Encryption: SSE-S3, SSE-KMS, SSE-C, client-side encryption.

### Q6.6: What is Lambda? When to use it?
- Serverless compute: upload code → AWS chạy khi triggered → chỉ trả tiền khi chạy.
- Use cases: API backend, file processing, cron jobs, event-driven workflows.
- Limitations: 15 min timeout, 10 GB memory, cold start.
- **Bạn đã dùng:** Lambda + API Gateway + DynamoDB trong IDP project → kể cụ thể.

### Q6.7: What is API Gateway?
- Managed service cho tạo, publish, manage APIs.
- Features: throttling, API keys, request validation, caching, WAF integration.
- **Bạn đã dùng:** API Gateway + API key auth → giải thích tại sao chọn API key thay vì IAM auth.

### Q6.8: What is DynamoDB? How is it different from RDS?
| Tiêu chí | DynamoDB | RDS |
|---|---|---|
| Type | NoSQL (key-value + document) | Relational (SQL) |
| Schema | Flexible | Fixed schema |
| Scaling | Auto, unlimited | Vertical (need to resize) |
| Use case | High throughput, simple queries | Complex joins, transactions |
- **Bạn đã dùng:** DynamoDB với TTL + Streams → giải thích: TTL tự xóa expired items, Streams trigger Lambda khi data thay đổi.

### Q6.9: What is IAM Identity Center (SSO)?
- Central place quản lý access cho nhiều AWS accounts.
- Permission Sets: tập hợp permissions gán cho users/groups trên specific accounts.
- **Bạn đã dùng:** IAM Identity Center + duration-specific permission sets → giải thích time-bound access.

### Q6.10: What is CloudFormation vs Terraform?
- Cả hai đều là IaC.
- CloudFormation: AWS-native, chỉ cho AWS, YAML/JSON.
- Terraform: Multi-cloud (AWS, GCP, Azure), HCL language, community providers.
- Trade-off: CloudFormation tích hợp sâu với AWS. Terraform linh hoạt hơn.

### Q6.11: What is Auto Scaling? How does it work?
- Tự động tăng/giảm số EC2 instances dựa trên metrics (CPU, memory, custom).
- Components: Launch Template, Auto Scaling Group, Scaling Policy.
- Types: Target tracking, step scaling, scheduled scaling.

### Q6.12: Explain Regions, Availability Zones, Edge Locations.
- **Region:** Khu vực địa lý (ap-southeast-1 = Singapore).
- **AZ:** Data center(s) trong 1 region, isolated nhưng connected (low latency).
- **Edge Location:** Cho CloudFront CDN, cache content gần user.

---

## 7. Terraform / Infrastructure as Code

> CV: Bạn đã design 10+ Terraform modules, S3 backend + DynamoDB state locking.

### Q7.1: What is Infrastructure as Code (IaC)? Why is it important?
- Quản lý infrastructure bằng code thay vì click manual trên console.
- Benefits: version control, reproducible, reviewable (PR), consistent across environments.

### Q7.2: Explain Terraform workflow: init, plan, apply, destroy.
- `terraform init`: Download providers, initialize backend.
- `terraform plan`: Preview changes (dry-run), KHÔNG thay đổi gì.
- `terraform apply`: Thực hiện changes. Tạo/sửa/xóa resources.
- `terraform destroy`: Xóa tất cả resources.

### Q7.3: What is Terraform state? Why is remote state important?
- State file (`terraform.tfstate`) tracks mapping giữa code và real resources.
- Remote state (S3): team cùng share state, tránh conflict.
- **State locking (DynamoDB):** Ngăn 2 người chạy `apply` cùng lúc → tránh corrupt state.
- **Bạn đã làm:** S3 encrypted backend + DynamoDB locking → giải thích rõ tại sao.

### Q7.4: What happens if two people run `terraform apply` at the same time?
- Không có state locking → state bị corrupt, resources bị drift.
- Có state locking (DynamoDB) → người thứ 2 bị block, phải đợi.

### Q7.5: What is a Terraform module? Why modularize?
- Module = reusable package of Terraform config.
- VD: `modules/lambda`, `modules/api-gateway`, `modules/dynamodb`.
- Benefits: DRY (Don't Repeat Yourself), consistent across environments, dễ maintain.
- **Bạn đã làm:** 10+ modules, single codebase promoted SIT → UAT → PROD.

### Q7.6: How do you manage multiple environments (dev/staging/prod) in Terraform?
- **Workspaces:** Cùng code, khác state file per workspace.
- **Variable files:** `dev.tfvars`, `staging.tfvars`, `prod.tfvars`.
- **Directory structure:** `environments/dev/`, `environments/prod/` call shared modules.
- Bạn dùng cách nào? Chuẩn bị trả lời cụ thể.

### Q7.7: How do you manage secrets in Terraform?
- **Không bao giờ** commit secrets vào `.tf` files hoặc `.tfvars`.
- Dùng: AWS Secrets Manager, SSM Parameter Store, environment variables.
- `sensitive = true` trong variable declaration → không hiện trong plan output.
- `.gitignore` phải có: `*.tfstate`, `*.tfvars` (nếu chứa secrets).

### Q7.8: What is `terraform import`? When do you use it?
- Import existing resource (tạo bằng console) vào Terraform state.
- Use case: migrating từ manual → IaC.

---

## 8. Networking & Security

> Fintech = security-first. JD context: digital banking.

### Q8.1: What is encryption at rest vs in transit?
- **At rest:** Data được mã hóa khi lưu trữ (S3 SSE, EBS encryption, RDS encryption).
- **In transit:** Data được mã hóa khi truyền qua network (TLS/HTTPS).
- Fintech: BẮT BUỘC cả hai. Regulatory requirement.

### Q8.2: What is TLS/SSL? How does HTTPS handshake work?
- TLS (Transport Layer Security) mã hóa traffic giữa client và server.
- Handshake (simplified): Client Hello → Server Hello + Cert → Key Exchange → Encrypted connection.

### Q8.3: What is the principle of Least Privilege?
- Chỉ cấp quyền TỐI THIỂU cần thiết để hoàn thành công việc.
- VD: Lambda function chỉ cần `dynamodb:PutItem` trên 1 table cụ thể → không cấp `dynamodb:*` trên `*`.
- **Bạn đã áp dụng:** IAM Identity Center + duration-specific permission sets (time-bound access).

### Q8.4: What is a firewall? How do Security Groups act as firewalls?
- Firewall kiểm soát traffic vào/ra.
- Security Group = virtual firewall cho EC2 instances.
- Default: deny all inbound, allow all outbound.

### Q8.5: What is SSH? How do you securely access a remote server?
- SSH (Secure Shell) = encrypted protocol cho remote access.
- Key-based auth (không dùng password): `ssh -i key.pem ec2-user@ip`
- Best practice: disable root login, disable password auth, dùng bastion host.

---

## 9. Monitoring & Observability

> JD: *"Monitor platform health dashboards and investigate anomalies"*
> CV: Grafana + Prometheus ở HCMUT project.

### Q9.1: What is the difference between Monitoring and Observability?
- **Monitoring:** Thu thập metrics, alert khi threshold bị vượt. "Có vấn đề không?"
- **Observability:** Khả năng hiểu HỆ THỐNG từ outputs (logs, metrics, traces). "Tại sao có vấn đề?"
- 3 Pillars: **Metrics** (Prometheus), **Logs** (Loki/CloudWatch), **Traces** (Jaeger/X-Ray).

### Q9.2: What are the 4 Golden Signals?
- **Latency:** Thời gian xử lý request (p50, p95, p99).
- **Traffic:** Số request/second.
- **Errors:** Tỷ lệ request bị lỗi (5xx, 4xx).
- **Saturation:** Mức sử dụng resources (CPU, memory, disk).

### Q9.3: How does Prometheus work?
- Pull-based: Prometheus scrape metrics từ targets (endpoints `/metrics`).
- Time-series database: lưu metrics theo thời gian.
- PromQL: query language. VD: `rate(http_requests_total[5m])` = request rate trong 5 phút.
- **Bạn đã dùng:** Chuẩn bị kể bạn monitor gì, alert gì.

### Q9.4: How does Grafana work?
- Visualization tool: tạo dashboards từ data sources (Prometheus, CloudWatch, Loki,...).
- Panels: graphs, tables, heatmaps, alerts.
- **Bạn đã dùng:** Dashboard cho doanhoi.hcmut.edu.vn → kể metrics gì, giúp phát hiện vấn đề gì.

### Q9.5: You see a spike in error rate on the dashboard. What do you do?
**Quy trình investigate:**
1. Xác nhận alert là real (không phải false positive).
2. Xem scope: service nào? endpoint nào? bắt đầu từ khi nào?
3. Correlate: có deployment gần đây không? Traffic tăng đột ngột?
4. Check logs: tìm error messages, stack traces.
5. Check resources: CPU/memory/disk có bị đầy không?
6. Mitigate: rollback nếu do deployment, scale up nếu do load.
7. Document: viết post-mortem.

### Q9.6: What is an SLA, SLO, SLI?
- **SLI (Service Level Indicator):** Metric đo. VD: "99.5% requests < 200ms".
- **SLO (Service Level Objective):** Target. VD: "Latency p99 < 500ms".
- **SLA (Service Level Agreement):** Contract với customer. VD: "99.9% uptime, nếu vi phạm → refund".

---

## 10. Platform Engineering

> JD: Core role — internal tooling, golden paths, developer experience.

### Q10.1: What is Platform Engineering? How is it different from DevOps?
- **DevOps:** Culture + practices, mọi người làm DevOps (shared responsibility).
- **Platform Engineering:** Team chuyên biệt build **Internal Developer Platform (IDP)** → giúp dev teams self-service.
- Analogy: DevOps = mọi người tự nấu ăn. Platform Engineering = xây canteen với menu chuẩn.

### Q10.2: What is a Golden Path?
- Đường đi chuẩn, được platform team thiết kế sẵn (templates, best practices).
- VD: "Muốn deploy microservice mới? Dùng template này → tự có CI/CD, monitoring, logging."
- Mục đích: giảm cognitive load cho dev, đảm bảo consistency, tăng tốc onboarding.

### Q10.3: What is an Internal Developer Platform (IDP)?
- Platform cung cấp self-service capabilities cho dev teams.
- Components: service catalog, CI/CD templates, infrastructure provisioning, monitoring.
- Tools: Backstage (Spotify), Port, Humanitec.
- **Bạn đã build IDP ở STYL:** Giải thích architecture, use case, impact.

### Q10.4: What is a runbook?
- Document hướng dẫn step-by-step xử lý incident hoặc operational task.
- VD: "Database full → Step 1: check disk usage, Step 2: identify large tables, Step 3: archive old data."
- Mục đích: bất kỳ ai cũng có thể xử lý incident, không phụ thuộc 1 người.

### Q10.5: What is Developer Experience (DX) and why does it matter?
- DX = mức độ dễ dàng và hiệu quả khi dev làm việc với tools, APIs, platforms.
- Good DX: documentation rõ ràng, self-service, fast feedback loops, ít friction.
- Platform Engineer quan tâm DX vì: dev productive → ship features nhanh → business value.

### Q10.6: What is "shifting left"?
- Đưa testing, security, quality checks về SỚM HƠN trong development lifecycle.
- VD: security scanning trong CI pipeline (shift left security), không đợi đến production.

---

## 11. AI Tools Usage

> JD nhấn RẤT MẠNH: *"Actively uses AI tools... can walk through how AI helped solve or build something, and knows how to verify when it's wrong."*

### Q11.1: How do you use AI tools in your daily workflow?
**Chuẩn bị 3 examples cụ thể:**
1. **Coding:** Copilot autocomplete Terraform modules → verify bằng `terraform plan` + `terraform validate`.
2. **Debugging:** Paste error vào ChatGPT → nhận gợi ý → verify trước khi apply.
3. **Documentation:** AI generate initial draft → bạn review + edit.

### Q11.2: Tell me about a time AI helped you solve a problem.
**Story gợi ý (IDP project):**
- Situation: Cần design IAM Identity Center permission sets với time-bound access.
- AI helped: ChatGPT suggest architecture pattern, Copilot generate Terraform code.
- Verification: Review generated IAM policies, test trên SIT trước, check least privilege.
- Result: Tiết kiệm X giờ research.

### Q11.3: When has AI given you wrong information? How did you catch it?
**Chuẩn bị 1-2 stories:**
- AI suggest deprecated API → bạn phát hiện khi đọc official docs.
- AI generate Terraform code với wrong resource attributes → `terraform plan` báo lỗi.
- AI suggest over-permissive IAM policy (`"*"`) → bạn nhận ra vi phạm least privilege.

### Q11.4: How do you verify AI-generated code?
- **Read and understand:** Không copy-paste mù quáng.
- **Test:** Run code, check output.
- **Cross-reference:** So sánh với official documentation.
- **Security review:** Check permissions, secrets exposure, input validation.
- **Peer review:** Vẫn tạo PR để team review.

### Q11.5: What is the Kiro Agentic IDE you used? (Từ CV)
- Chuẩn bị giải thích: Kiro là gì, MCP Server là gì, Hooks/Steering làm gì.
- Cách nó khác Copilot thông thường.
- Use case cụ thể trong project.

---

## 12. Fintech Domain

> JD: *"eager to learn complex domains (payments, accounts, risk)"*
> GoTymeX = multi-country digital bank.

### Q12.1: What is a digital bank (neobank)?
- Ngân hàng hoạt động 100% online, không có chi nhánh vật lý.
- VD: Tyme (South Africa), GoTyme (Philippines), Nubank (Brazil).
- Ưu điểm: lower cost, faster onboarding, better UX.

### Q12.2: What is GoTymeX? What do they do?
- GoTymeX = technology arm của Tyme Group.
- Build và operate digital banking platforms cho nhiều nước.
- HQ: Singapore, operations in South Africa, Philippines, Vietnam.
- **Đọc thêm:** https://www.tymegroup.com/

### Q12.3: What is KYC (Know Your Customer)?
- Quy trình xác minh danh tính khách hàng trước khi cung cấp dịch vụ.
- Steps: thu thập ID, verify, screening (sanctions list, PEP).
- Tại sao quan trọng: chống rửa tiền (AML), comply với luật.

### Q12.4: What is PCI-DSS?
- Payment Card Industry Data Security Standard.
- Bộ tiêu chuẩn bảo mật cho tổ chức xử lý thẻ tín dụng/debit.
- Bạn không cần biết chi tiết, nhưng biết nó tồn tại và tại sao quan trọng.

### Q12.5: Why is security especially important in fintech?
- Xử lý tiền thật → sai sót = mất tiền.
- Regulatory requirements nghiêm ngặt (ngân hàng nhà nước, PCI-DSS, GDPR).
- Target cao cho hackers → cần defense in depth.
- Customer trust: mất trust = mất customer.

### Q12.6: What is the difference between authentication and authorization?
- **Authentication (AuthN):** Xác minh "bạn là ai?" (VD: login bằng password, MFA).
- **Authorization (AuthZ):** Xác minh "bạn được làm gì?" (VD: user A có quyền xem account B không?).

---

## 13. Behavioral & Soft Skills

> JD: *"Curious, open to feedback... Self-directed learner... collaborative and respectful teammate."*
> Dùng **STAR method**: Situation → Task → Action → Result.

### Q13.1: Tell me about yourself.
**Gợi ý structure (1-2 phút):**
- CS student at HCMUT, graduating Sep 2026.
- Passionate about Platform/DevOps Engineering.
- Recent experience: DevOps Intern at STYL Solutions → built IDP, Terraform, AWS.
- Prior: Software Engineer Intern at HCMUT → full-stack, CI/CD, Docker, monitoring.
- Certifications: AWS SAA, CCP.
- Excited about GoTymeX vì: fintech, multi-country scale, platform engineering focus.

### Q13.2: Why Platform Engineering? Why not pure Software Engineering?
- Thấy pain point từ dev side (ở HCMUT): deploy khó, config mệt, environment inconsistent.
- Muốn build tools giúp dev teams ship faster.
- IDP project ở STYL confirm: đúng direction mình muốn theo.

### Q13.3: Why GoTymeX?
- Multi-country digital bank → scale lớn, tech stack modern.
- Platform Engineering focus → đúng career path.
- Growth-first culture → internship có mentor, learning built-in.
- Fintech domain → challenging, impactful.

### Q13.4: Tell me about a time you had to learn something new quickly.
**Story:** Terraform + IDP project tại STYL.
- S: Chưa từng dùng Terraform, được giao build IDP.
- T: Phải learn Terraform + AWS IAM Identity Center + design architecture.
- A: Tự học qua docs, labs, AI tools. Build 10+ modules. Iterative approach.
- R: Được DevOps Manager approve, planned deploy org-wide.

### Q13.5: Tell me about a time you solved a difficult problem.
**Story:** Time-bound AWS access trong IDP.
- S: Organization cần developers access AWS chỉ trong thời gian cụ thể.
- T: Design hệ thống tự động grant/revoke access.
- A: IAM Identity Center permission sets + DynamoDB TTL + Lambda.
- R: Secure, automated, self-service access.

### Q13.6: Tell me about a time you received feedback. How did you handle it?
- Chuẩn bị story thật, thể hiện: lắng nghe, không defensive, hành động cải thiện.

### Q13.7: Tell me about a time you worked in a team.
**Story:** Sprint ceremonies ở STYL hoặc HCMUT.
- Standup, retro, code review, pair programming.
- Collaboration với mentor (MEng. Tran Ngoc Bao Duy).

### Q13.8: What is your biggest weakness?
- Trả lời thật nhưng kèm **cách bạn đang cải thiện**.
- VD: "Đôi khi over-engineer solutions → đang học KISS principle, hỏi mentor early."

### Q13.9: Where do you see yourself in 2-3 years?
- Short-term: Solid Platform Engineer, deep AWS expertise, contribute to production systems.
- Long-term: Senior Platform/DevOps Engineer, design large-scale infrastructure.

### Q13.10: How do you stay updated with new technologies?
- AWS re:Invent / re:Post, tech communities (DevOps Vietnam), blogs, hands-on labs.
- Docker Security Contest → active in community.

---

## 14. Deep-Dive vào CV & Projects

> Interviewer SẼ hỏi sâu vào những gì bạn viết trong CV.

### Q14.1: IDP Project (STYL Solutions)
- "Walk me through the architecture of your IDP."
- "Why Terraform modules and not monolithic config?"
- "How did you test before deploying?"
- "What was the hardest technical challenge?"
- "How did you handle the DynamoDB TTL + Lambda integration?"
- "What would you do differently if you built it again?"

### Q14.2: Doanhoi Portal (HCMUT)
- "Describe the full deployment pipeline."
- "How did Docker Compose help manage services?"
- "What did you monitor with Grafana + Prometheus?"
- "Tell me about the AI chatbot — what is Agentic RAG?"
- "How did you handle multiple environments?"

### Q14.3: AWS Certifications
- "What was the most surprising thing you learned studying for SAA?"
- "Which AWS service do you find most interesting and why?"
- "Explain a scenario from the SAA exam and how you'd solve it in real life."

### Q14.4: Docker Security Contest (2nd Prize)
- "What was the contest about?"
- "What security vulnerability did you find/exploit?"
- "What did you learn about container security from this?"

### Q14.5: Bridging STYL with AWS Vietnam
- "How did you approach this? What was your strategy?"
- "What training programs were unlocked?"
- → Thể hiện: initiative, communication, leadership.

---

## CHECKLIST ÔN TẬP

- [ ] Giải thích được tất cả concepts ở Section 1 bằng ngôn ngữ đơn giản
- [ ] Thực hành Linux commands trên terminal thật
- [ ] Review lại Git workflow, thử resolve conflict
- [ ] Ôn Docker: viết Dockerfile, docker-compose, security best practices
- [ ] Ôn CI/CD: vẽ pipeline diagram, giải thích từng stage
- [ ] Ôn AWS: IAM, VPC, Lambda, API Gateway, DynamoDB, S3, encryption
- [ ] Ôn Terraform: workflow, state, modules, environments
- [ ] Chuẩn bị 3 AI tools stories (helped + caught wrong)
- [ ] Đọc về GoTymeX, Tyme Group, digital banking basics
- [ ] Chuẩn bị STAR stories cho behavioral questions
- [ ] Mock interview: practice trả lời bằng tiếng Anh
- [ ] Chuẩn bị 3-4 câu hỏi hỏi ngược interviewer
