# Backend Component Diagram - Đoàn Hội Portal

## 📐 Architecture Overview

Dự án backend được xây dựng theo kiến trúc **NestJS Modular Architecture** với pattern **Controller-Service-Repository**.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          Đoàn Hội Portal Backend                            │
│                              (NestJS Framework)                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 🏗️ High-Level Component Diagram

```mermaid
graph TB
    subgraph "Client Layer"
        Client[Frontend React App]
        Mobile[Mobile/External Apps]
    end

    subgraph "API Gateway Layer"
        MainApp[main.ts<br/>Bootstrap App]
        AppModule[app.module.ts<br/>Root Module]
    end

    subgraph "Cross-Cutting Concerns"
        Auth[Auth Module<br/>JWT, OAuth]
        Guards[Guards<br/>JWT, Roles]
        Interceptors[Interceptors<br/>Logging, Transform]
        Middleware[Middleware<br/>CORS, Security]
        Metrics[Metrics Module<br/>Prometheus]
    end

    subgraph "Core Business Modules"
        Users[Users Module<br/>User Management]
        Orgs[Organizations Module<br/>Organization Hierarchy]
        Roles[Roles Module<br/>Role & Permissions]
        Depts[Departments Module<br/>Department Management]
        Classes[Classes Module<br/>Class Management]
    end

    subgraph "CTXH Domain Modules"
        CTXHMain[CTXH Module<br/>Main Aggregator]
        Activities[Activities Module<br/>Activity Management]
        Categories[Categories Module<br/>Activity Categories]
        Reports[Reports Module<br/>CTXH Reports]
        LimitConfig[Limit Config Module<br/>Activity Limits]
    end

    subgraph "Payment Domain Modules"
        Payment[Payment Module<br/>Payment Management]
        PayOS[PayOS Module<br/>Payment Gateway]
    end

    subgraph "System Support Modules"
        Dashboard[Dashboard Module<br/>Analytics & Stats]
        Export[Export Module<br/>Excel/Document Export]
        Templates[Templates Module<br/>Document Templates]
        Submissions[Submissions Module<br/>Form Submissions]
        AWSConfig[AWS Config Module<br/>S3 Configuration]
    end

    subgraph "Data Layer"
        Database[(PostgreSQL<br/>Database)]
        TypeORM[TypeORM<br/>ORM Layer]
        Entities[Entities<br/>Data Models]
        Migrations[Migrations<br/>Schema Changes]
        Seeds[Seeds<br/>Initial Data]
    end

    subgraph "External Services"
        GoogleOAuth[Google OAuth 2.0]
        PayOSGateway[PayOS API]
        S3[AWS S3]
    end

    Client --> MainApp
    Mobile --> MainApp
    MainApp --> AppModule
    
    AppModule --> Auth
    AppModule --> Guards
    AppModule --> Interceptors
    AppModule --> Middleware
    AppModule --> Metrics

    Auth --> Users
    Guards --> Auth
    
    AppModule --> Users
    AppModule --> Orgs
    AppModule --> Roles
    AppModule --> Depts
    AppModule --> Classes
    AppModule --> CTXHMain
    AppModule --> Payment
    AppModule --> Dashboard
    AppModule --> Export
    AppModule --> Templates
    AppModule --> Submissions
    AppModule --> AWSConfig

    CTXHMain --> Activities
    CTXHMain --> Categories
    CTXHMain --> Reports
    CTXHMain --> LimitConfig

    Payment --> PayOS

    Users --> TypeORM
    Orgs --> TypeORM
    Roles --> TypeORM
    Depts --> TypeORM
    Classes --> TypeORM
    Activities --> TypeORM
    Categories --> TypeORM
    Reports --> TypeORM
    Payment --> TypeORM
    
    TypeORM --> Entities
    TypeORM --> Database
    
    Database --> Migrations
    Database --> Seeds

    Auth --> GoogleOAuth
    PayOS --> PayOSGateway
    AWSConfig --> S3
    Export --> S3
```

---

## 📦 Detailed Module Breakdown

### 1. **Core Infrastructure Layer**

#### 1.1. Application Bootstrap
```
┌────────────────────────────────────┐
│          main.ts                   │
│  ┌──────────────────────────────┐  │
│  │ - Bootstrap NestJS App       │  │
│  │ - Configure Swagger          │  │
│  │ - Setup CORS                 │  │
│  │ - Configure Global Pipes     │  │
│  │ - Enable Prometheus Metrics  │  │
│  └──────────────────────────────┘  │
└────────────────────────────────────┘
            │
            ▼
┌────────────────────────────────────┐
│        app.module.ts               │
│  ┌──────────────────────────────┐  │
│  │ - Import All Modules         │  │
│  │ - Configure Database         │  │
│  │ - Setup Config Module        │  │
│  └──────────────────────────────┘  │
└────────────────────────────────────┘
```

#### 1.2. Database Layer
```
database/
├── create-schema.ts       # Schema initialization
├── reset-database.ts      # Database reset utility
├── migrations/            # TypeORM migrations
│   └── *.ts              # Schema changes
├── seeds/                # Initial data
│   ├── index.ts          # Seed orchestrator
│   ├── permissions.seed.ts
│   ├── roles.seed.ts
│   └── default-users.seed.ts
└── scripts/              # Database utilities
    ├── update-permissions.ts
    └── verify-super-admin-permissions.ts
```

#### 1.3. Common Utilities
```
common/
├── constants/            # Application constants
├── interceptors/         # Response transformers
├── middleware/           # Express middleware
└── scripts/              # Utility scripts
```

---

### 2. **Authentication & Authorization Layer**

```mermaid
graph LR
    subgraph "Auth Module"
        AuthController[auth.controller.ts<br/>POST /login<br/>POST /google<br/>POST /refresh]
        AuthService[auth.service.ts<br/>- validateUser<br/>- login<br/>- generateTokens]
        
        subgraph "Strategies"
            JWTStrategy[jwt.strategy.ts]
            LocalStrategy[local.strategy.ts]
            GoogleStrategy[google.strategy.ts]
        end
        
        subgraph "Guards"
            JWTGuard[jwt-auth.guard.ts]
            RolesGuard[roles.guard.ts]
            PermissionsGuard[permissions.guard.ts]
        end
        
        subgraph "Decorators"
            CurrentUser[@CurrentUser]
            RequireRoles[@Roles]
            RequirePermissions[@Permissions]
        end
    end
    
    AuthController --> AuthService
    AuthService --> JWTStrategy
    AuthService --> LocalStrategy
    AuthService --> GoogleStrategy
    
    JWTGuard --> JWTStrategy
    RolesGuard --> CurrentUser
    PermissionsGuard --> CurrentUser
```

**Key Features:**
- ✅ JWT Token Authentication
- ✅ Google OAuth 2.0 Integration
- ✅ Refresh Token Rotation
- ✅ Role-Based Access Control (RBAC)
- ✅ Permission-Based Access Control

---

### 3. **User Management Domain**

```mermaid
graph TB
    subgraph "Users Module"
        UsersController[users.controller.ts<br/>CRUD + Search + Import]
        UsersService[users.service.ts<br/>Core Business Logic]
        
        subgraph "Sub-Services"
            ImportService[User Import Service<br/>Excel Batch Import]
            ExportService[User Export Service<br/>Excel Export]
            SearchService[User Search Service<br/>Advanced Filtering]
        end
        
        subgraph "DTOs"
            CreateUserDTO[CreateUserDto]
            UpdateUserDTO[UpdateUserDto]
            ImportUserDTO[ImportUserDto]
            QueryUserDTO[QueryUserDto]
        end
    end
    
    UsersController --> UsersService
    UsersService --> ImportService
    UsersService --> ExportService
    UsersService --> SearchService
    
    UsersController --> CreateUserDTO
    UsersController --> UpdateUserDTO
    UsersController --> ImportUserDTO
    UsersController --> QueryUserDTO
```

**Endpoints:**
- `GET /users` - List users with pagination
- `GET /users/:id` - Get user details
- `POST /users` - Create user
- `PUT /users/:id` - Update user
- `DELETE /users/:id` - Delete user
- `POST /users/import` - Batch import from Excel
- `GET /users/export` - Export to Excel
- `GET /users/search` - Advanced search

---

### 4. **Organization Management Domain**

```mermaid
graph TB
    subgraph "Organizations Module"
        OrgsController[organizations.controller.ts<br/>Hierarchy Management]
        OrgsService[organizations.service.ts<br/>Tree Operations]
        
        subgraph "Sub-Services"
            ImportOrgService[organization-import.service.ts<br/>Excel Import]
            HierarchyService[Hierarchy Service<br/>Tree Traversal]
        end
        
        subgraph "DTOs"
            CreateOrgDTO[CreateOrganizationDto]
            UpdateOrgDTO[UpdateOrganizationDto]
            ImportOrgDTO[ImportOrganizationDto]
        end
    end
    
    OrgsController --> OrgsService
    OrgsService --> ImportOrgService
    OrgsService --> HierarchyService
    
    OrgsController --> CreateOrgDTO
    OrgsController --> UpdateOrgDTO
    OrgsController --> ImportOrgDTO
```

**Key Features:**
- ✅ Hierarchical organization structure (Parent-Child)
- ✅ Tree traversal (get all children)
- ✅ User assignment to organizations
- ✅ Batch import from Excel
- ✅ Organization statistics

---

### 5. **Roles & Permissions Domain**

```mermaid
graph LR
    subgraph "Roles Module"
        RolesController[roles.controller.ts<br/>Role CRUD]
        RolesService[roles.service.ts<br/>Permission Assignment]
    end
    
    subgraph "Permission System"
        Permissions[(Permissions Table<br/>54+ Permissions)]
        RolePermissions[(Role-Permission<br/>Many-to-Many)]
    end
    
    RolesController --> RolesService
    RolesService --> Permissions
    RolesService --> RolePermissions
```

**Built-in Roles:**
- `SUPER_ADMIN` - Full system access
- `ADMIN` - Organization admin
- `MODERATOR` - Content management
- `USER` - Basic user

**Permission Categories:**
- User Management
- Organization Management
- Role Management
- CTXH Management
- Payment Management
- Report Access

---

### 6. **CTXH (Công Tác Xã Hội) Domain**

```mermaid
graph TB
    subgraph "CTXH Module (Aggregator)"
        CTXHModule[ctxh.module.ts<br/>Domain Aggregator]
    end
    
    subgraph "Activities Management"
        ActivitiesController[activities.controller.ts<br/>Activity CRUD]
        ActivitiesService[activities.service.ts<br/>Business Logic]
        
        subgraph "Activity Sub-Services"
            ParticipantService[Participant Service<br/>Registration]
            CheckInService[Check-in Service<br/>Attendance]
        end
    end
    
    subgraph "Categories Management"
        CategoryController[category.controller.ts<br/>Category CRUD]
        CategoryService[category.service.ts<br/>Hierarchy Management]
    end
    
    subgraph "Reports Module"
        ReportsController[reports.controller.ts<br/>Report Generation]
        ReportsService[reports.service.ts<br/>Analytics]
    end
    
    subgraph "Limit Configuration"
        LimitConfigController[limit-config.controller.ts<br/>Config CRUD]
        LimitConfigService[limit-config.service.ts<br/>Limit Validation]
    end
    
    CTXHModule --> ActivitiesController
    CTXHModule --> CategoryController
    CTXHModule --> ReportsController
    CTXHModule --> LimitConfigController
    
    ActivitiesController --> ActivitiesService
    ActivitiesService --> ParticipantService
    ActivitiesService --> CheckInService
    
    CategoryController --> CategoryService
    ReportsController --> ReportsService
    LimitConfigController --> LimitConfigService
```

**Activity Workflow:**
```
Create Activity → Add Categories → Student Registration 
→ Check-in Participants → Generate Reports
```

**Key Features:**
- ✅ Activity categories with hierarchy
- ✅ Student participant management
- ✅ QR code check-in system
- ✅ Activity hour limits per category
- ✅ Student activity reports
- ✅ Statistics and analytics

---

### 7. **Payment Management Domain**

```mermaid
graph TB
    subgraph "Payment Module"
        PaymentAdminController[payment-admin.controller.ts<br/>Admin Operations]
        PaymentAssignmentController[payment-assignment.controller.ts<br/>User Operations]
        
        subgraph "Payment Services"
            PaymentService[Payment Service<br/>Core Logic]
            AssignmentService[Assignment Service<br/>Campaign Assignment]
            VerificationService[Verification Service<br/>Payment Verification]
        end
    end
    
    subgraph "PayOS Integration"
        PayOSController[payos.controller.ts<br/>Webhook Handler]
        PayOSService[payos.service.ts<br/>Gateway Integration]
    end
    
    subgraph "Payment Config"
        PaymentConfig[Payment Config<br/>API Keys, Webhook URLs]
    end
    
    PaymentAdminController --> PaymentService
    PaymentAssignmentController --> AssignmentService
    PaymentService --> VerificationService
    
    PayOSController --> PayOSService
    PayOSService --> PaymentConfig
    PayOSService --> PaymentService
```

**Payment Flow:**
```
Create Campaign → Assign Users → Generate Payment Links 
→ User Payment (PayOS) → Webhook Callback → Verify Payment 
→ Update Status → Generate Receipt
```

**Key Features:**
- ✅ Payment campaign management
- ✅ Bulk user assignment
- ✅ PayOS payment gateway integration
- ✅ Webhook handling for payment status
- ✅ Payment verification
- ✅ Receipt generation

---

### 8. **Support Modules**

#### 8.1. Dashboard Module
```
┌────────────────────────────────────┐
│      Dashboard Module              │
│  ┌──────────────────────────────┐  │
│  │ - System Statistics          │  │
│  │ - User Analytics             │  │
│  │ - Activity Metrics           │  │
│  │ - Payment Statistics         │  │
│  │ - S3 Storage Usage           │  │
│  └──────────────────────────────┘  │
└────────────────────────────────────┘
```

#### 8.2. Export Module
```
┌────────────────────────────────────┐
│       Export Module                │
│  ┌──────────────────────────────┐  │
│  │ - Excel Export (XLSX)        │  │
│  │ - DOCX Template Export       │  │
│  │ - CSV Export                 │  │
│  │ - S3 Upload Integration      │  │
│  └──────────────────────────────┘  │
└────────────────────────────────────┘
```

#### 8.3. Templates Module
```
┌────────────────────────────────────┐
│      Templates Module              │
│  ┌──────────────────────────────┐  │
│  │ - Document Templates         │  │
│  │ - DOCX Generation            │  │
│  │ - Template Variables         │  │
│  │ - Docxtemplater Integration  │  │
│  └──────────────────────────────┘  │
└────────────────────────────────────┘
```

#### 8.4. Classes Module
```
┌────────────────────────────────────┐
│       Classes Module               │
│  ┌──────────────────────────────┐  │
│  │ - Class Management           │  │
│  │ - Student Assignment         │  │
│  │ - Class Statistics           │  │
│  └──────────────────────────────┘  │
└────────────────────────────────────┘
```

#### 8.5. Departments Module
```
┌────────────────────────────────────┐
│     Departments Module             │
│  ┌──────────────────────────────┐  │
│  │ - Department CRUD            │  │
│  │ - Department Hierarchy       │  │
│  │ - User Assignment            │  │
│  └──────────────────────────────┘  │
└────────────────────────────────────┘
```

#### 8.6. Submissions Module
```
┌────────────────────────────────────┐
│     Submissions Module             │
│  ┌──────────────────────────────┐  │
│  │ - Form Submissions           │  │
│  │ - File Uploads               │  │
│  │ - Submission Processing      │  │
│  └──────────────────────────────┘  │
└────────────────────────────────────┘
```

#### 8.7. AWS Config Module
```
┌────────────────────────────────────┐
│     AWS Config Module              │
│  ┌──────────────────────────────┐  │
│  │ - S3 Configuration           │  │
│  │ - Bucket Management          │  │
│  │ - Access Key Management      │  │
│  │ - Storage Statistics         │  │
│  └──────────────────────────────┘  │
└────────────────────────────────────┘
```

#### 8.8. Metrics Module
```
┌────────────────────────────────────┐
│      Metrics Module                │
│  ┌──────────────────────────────┐  │
│  │ - Prometheus Integration     │  │
│  │ - HTTP Metrics               │  │
│  │ - Database Metrics           │  │
│  │ - Custom Business Metrics    │  │
│  └──────────────────────────────┘  │
└────────────────────────────────────┘
```

---

## 🔄 Data Flow Architecture

### Request Flow Example: User Login

```mermaid
sequenceDiagram
    participant Client
    participant AuthController
    participant AuthService
    participant UsersService
    participant Database
    participant JWT

    Client->>AuthController: POST /auth/login
    AuthController->>AuthService: login(credentials)
    AuthService->>UsersService: findByEmail(email)
    UsersService->>Database: SELECT * FROM users
    Database-->>UsersService: User data
    UsersService-->>AuthService: User entity
    AuthService->>AuthService: validatePassword()
    AuthService->>JWT: generateTokens()
    JWT-->>AuthService: {accessToken, refreshToken}
    AuthService-->>AuthController: Tokens
    AuthController-->>Client: 200 OK + Tokens
```

### Request Flow Example: Create CTXH Activity

```mermaid
sequenceDiagram
    participant Client
    participant Guards
    participant ActivitiesController
    participant ActivitiesService
    participant CategoryService
    participant Database

    Client->>ActivitiesController: POST /ctxh/activities
    ActivitiesController->>Guards: JWTGuard + PermissionsGuard
    Guards->>ActivitiesController: Authorized
    ActivitiesController->>ActivitiesService: create(activityDto)
    ActivitiesService->>CategoryService: validateCategories()
    CategoryService->>Database: SELECT categories
    Database-->>CategoryService: Category data
    CategoryService-->>ActivitiesService: Valid
    ActivitiesService->>Database: INSERT activity
    Database-->>ActivitiesService: Created activity
    ActivitiesService-->>ActivitiesController: Activity entity
    ActivitiesController-->>Client: 201 Created
```

---

## 🗄️ Database Entity Relationships

```mermaid
erDiagram
    User ||--o{ UserOrganization : "belongs to"
    User ||--o{ PaymentAssignment : "assigned"
    User ||--o{ ActivityParticipant : "participates"
    User }o--|| Role : "has"
    
    Organization ||--o{ Organization : "parent-child"
    Organization ||--o{ UserOrganization : "contains"
    
    Role ||--o{ RolePermission : "has"
    Permission ||--o{ RolePermission : "assigned to"
    
    Activity ||--o{ ActivityCategory : "has"
    Activity ||--o{ ActivityParticipant : "has"
    Category ||--o{ ActivityCategory : "belongs to"
    Category ||--o{ Category : "parent-child"
    
    PaymentCampaign ||--o{ PaymentAssignment : "contains"
    PaymentAssignment ||--|| PaymentTransaction : "has"
    
    Class ||--o{ User : "contains"
    Department ||--o{ User : "contains"
```

---

## 📊 Module Dependency Graph

```mermaid
graph TB
    AppModule[App Module<br/>Root]
    
    AppModule --> AuthModule[Auth Module]
    AppModule --> UsersModule[Users Module]
    AppModule --> OrgsModule[Organizations Module]
    AppModule --> RolesModule[Roles Module]
    AppModule --> DeptsModule[Departments Module]
    AppModule --> ClassesModule[Classes Module]
    AppModule --> CTXHModule[CTXH Module]
    AppModule --> PaymentModule[Payment Module]
    AppModule --> DashboardModule[Dashboard Module]
    AppModule --> ExportModule[Export Module]
    AppModule --> TemplatesModule[Templates Module]
    AppModule --> SubmissionsModule[Submissions Module]
    AppModule --> AWSModule[AWS Config Module]
    AppModule --> MetricsModule[Metrics Module]
    AppModule --> PayOSModule[PayOS Module]
    
    AuthModule --> UsersModule
    AuthModule --> RolesModule
    
    UsersModule --> OrgsModule
    UsersModule --> RolesModule
    UsersModule --> DeptsModule
    UsersModule --> ClassesModule
    
    CTXHModule --> ActivitiesModule[Activities Module]
    CTXHModule --> CategoriesModule[Categories Module]
    CTXHModule --> ReportsModule[Reports Module]
    CTXHModule --> LimitConfigModule[Limit Config Module]
    
    ActivitiesModule --> UsersModule
    ActivitiesModule --> CategoriesModule
    
    PaymentModule --> UsersModule
    PaymentModule --> PayOSModule
    
    DashboardModule --> UsersModule
    DashboardModule --> OrgsModule
    DashboardModule --> CTXHModule
    DashboardModule --> PaymentModule
    
    ExportModule --> AWSModule
    TemplatesModule --> AWSModule
    SubmissionsModule --> AWSModule
```

---

## 🔐 Security Architecture

```mermaid
graph TB
    subgraph "Security Layers"
        CORS[CORS Policy]
        Helmet[Helmet Security Headers]
        RateLimit[Rate Limiting]
        
        subgraph "Authentication"
            JWT[JWT Validation]
            OAuth[Google OAuth 2.0]
            RefreshToken[Refresh Token Rotation]
        end
        
        subgraph "Authorization"
            RoleGuard[Role-Based Access]
            PermissionGuard[Permission-Based Access]
            ResourceOwner[Resource Ownership]
        end
        
        subgraph "Data Protection"
            PasswordHash[Bcrypt Password Hashing]
            SQLInjection[TypeORM SQL Injection Prevention]
            XSS[Input Sanitization]
        end
    end
    
    CORS --> JWT
    Helmet --> JWT
    RateLimit --> JWT
    
    JWT --> RoleGuard
    OAuth --> RoleGuard
    RefreshToken --> JWT
    
    RoleGuard --> PermissionGuard
    PermissionGuard --> ResourceOwner
    
    ResourceOwner --> PasswordHash
    ResourceOwner --> SQLInjection
    ResourceOwner --> XSS
```

---

## 📈 Monitoring & Observability

```mermaid
graph LR
    subgraph "Application"
        Backend[NestJS Backend]
    end
    
    subgraph "Metrics Collection"
        MetricsModule[Metrics Module]
        PrometheusClient[prom-client]
    end
    
    subgraph "Monitoring Stack"
        Prometheus[Prometheus<br/>Metrics Storage]
        Grafana[Grafana<br/>Visualization]
    end
    
    Backend --> MetricsModule
    MetricsModule --> PrometheusClient
    PrometheusClient --> Prometheus
    Prometheus --> Grafana
```

**Collected Metrics:**
- HTTP request duration
- HTTP request count by endpoint
- Database query performance
- Active connections
- Error rates
- Custom business metrics

---

## 🚀 Deployment Architecture

```mermaid
graph TB
    subgraph "Development"
        DevBackend[Backend Dev Server<br/>npm run start:dev<br/>Port: 9200]
        DevDB[(PostgreSQL Dev<br/>Port: 9000)]
    end
    
    subgraph "Production"
        subgraph "Docker Containers"
            ProdBackend[Backend Container<br/>Node:20-alpine<br/>Port: 9200]
            ProdDB[(PostgreSQL Container<br/>Port: 2682)]
            ProdPrometheus[Prometheus<br/>Port: 9091]
            ProdGrafana[Grafana<br/>Port: 3002]
        end
        
        Nginx[Nginx Reverse Proxy<br/>Port: 80/443]
    end
    
    DevBackend --> DevDB
    
    Nginx --> ProdBackend
    ProdBackend --> ProdDB
    ProdBackend --> ProdPrometheus
    ProdPrometheus --> ProdGrafana
```

---

## 📋 API Endpoint Summary

### Authentication
- `POST /auth/login` - Email/password login
- `POST /auth/google` - Google OAuth login
- `POST /auth/refresh` - Refresh access token
- `GET /auth/profile` - Get current user profile

### Users Management
- `GET /users` - List users (paginated, filtered)
- `GET /users/:id` - Get user by ID
- `POST /users` - Create user
- `PUT /users/:id` - Update user
- `DELETE /users/:id` - Delete user
- `POST /users/import` - Batch import from Excel
- `GET /users/export` - Export to Excel

### Organizations
- `GET /organizations` - List organizations (tree)
- `GET /organizations/:id` - Get organization details
- `POST /organizations` - Create organization
- `PUT /organizations/:id` - Update organization
- `DELETE /organizations/:id` - Delete organization
- `POST /organizations/import` - Batch import

### Roles & Permissions
- `GET /roles` - List all roles
- `GET /roles/:id` - Get role with permissions
- `POST /roles` - Create role
- `PUT /roles/:id` - Update role permissions
- `DELETE /roles/:id` - Delete role

### CTXH Activities
- `GET /ctxh/activities` - List activities
- `GET /ctxh/activities/:id` - Get activity details
- `POST /ctxh/activities` - Create activity
- `PUT /ctxh/activities/:id` - Update activity
- `DELETE /ctxh/activities/:id` - Delete activity
- `POST /ctxh/activities/:id/register` - Student registration
- `POST /ctxh/activities/:id/checkin` - Check-in participant

### CTXH Categories
- `GET /ctxh/categories` - List categories (tree)
- `POST /ctxh/categories` - Create category
- `PUT /ctxh/categories/:id` - Update category
- `DELETE /ctxh/categories/:id` - Delete category

### CTXH Reports
- `GET /ctxh/reports/student/:id` - Student activity report
- `GET /ctxh/reports/activity/:id` - Activity participation report
- `GET /ctxh/reports/statistics` - Overall statistics

### Payment
- `GET /payment/campaigns` - List payment campaigns
- `POST /payment/campaigns` - Create campaign
- `PUT /payment/campaigns/:id` - Update campaign
- `POST /payment/campaigns/:id/assign` - Assign users
- `GET /payment/my-payments` - User's payment assignments
- `POST /payment/:id/create-link` - Generate payment link

### PayOS
- `POST /payos/webhook` - Payment webhook handler
- `GET /payos/verify/:id` - Verify payment status

### Dashboard
- `GET /dashboard/statistics` - System statistics
- `GET /dashboard/analytics` - User analytics
- `GET /dashboard/s3-usage` - S3 storage usage

### Export
- `POST /export/excel` - Export data to Excel
- `POST /export/docx` - Generate DOCX from template

### Templates
- `GET /templates` - List templates
- `POST /templates` - Create template
- `POST /templates/:id/generate` - Generate document

### Classes
- `GET /classes` - List classes
- `POST /classes` - Create class
- `PUT /classes/:id` - Update class

### Departments
- `GET /departments` - List departments
- `POST /departments` - Create department
- `PUT /departments/:id` - Update department

### AWS Config
- `GET /aws-config` - Get S3 configuration
- `POST /aws-config` - Update S3 configuration
- `GET /aws-config/usage` - Get storage usage

### Metrics
- `GET /metrics` - Prometheus metrics endpoint

---

## 🏛️ Design Patterns Used

### 1. **Module Pattern** (NestJS Core)
- Each domain is encapsulated in a module
- Clear boundaries and dependencies

### 2. **Dependency Injection** (IoC)
- Services injected via constructor
- Loose coupling, easy testing

### 3. **Repository Pattern** (TypeORM)
- Data access abstraction
- Database-agnostic queries

### 4. **DTO Pattern** (Data Transfer Objects)
- Input validation
- Type safety
- API documentation

### 5. **Guard Pattern** (Authorization)
- Reusable access control
- Declarative security

### 6. **Strategy Pattern** (Auth)
- Multiple auth strategies (JWT, Google)
- Easy to add new strategies

### 7. **Decorator Pattern** (Metadata)
- @CurrentUser, @Roles, @Permissions
- Clean controller code

### 8. **Service Layer Pattern**
- Business logic separation
- Reusable across controllers

---

## 🔧 Technology Stack

### Core Framework
- **NestJS** v10 - Progressive Node.js framework
- **TypeScript** v5 - Type-safe JavaScript
- **Node.js** v20 - Runtime environment

### Database
- **PostgreSQL** v15 - Relational database
- **TypeORM** v0.3 - ORM for TypeScript

### Authentication
- **Passport.js** - Authentication middleware
- **JWT** - JSON Web Tokens
- **bcryptjs** - Password hashing

### External Services
- **Google OAuth 2.0** - Social login
- **PayOS API** - Payment gateway
- **AWS S3** - File storage

### Documentation
- **Swagger/OpenAPI** - API documentation

### Monitoring
- **Prometheus** - Metrics collection
- **prom-client** - Prometheus client
- **Grafana** - Metrics visualization

### File Processing
- **XLSX** - Excel file handling
- **docxtemplater** - DOCX template engine
- **pizzip** - ZIP file handling

### Utilities
- **class-validator** - DTO validation
- **class-transformer** - Object transformation
- **axios** - HTTP client

---

## 📚 Module Responsibilities Summary

| Module | Primary Responsibility | Key Features |
|--------|----------------------|--------------|
| **Auth** | Authentication & Authorization | JWT, OAuth, Guards |
| **Users** | User management | CRUD, Import, Export, Search |
| **Organizations** | Organization hierarchy | Tree structure, Assignment |
| **Roles** | Role & permission management | RBAC, Permission matrix |
| **Departments** | Department management | Hierarchy, User assignment |
| **Classes** | Class management | Student assignment, Statistics |
| **CTXH Activities** | Activity management | CRUD, Registration, Check-in |
| **CTXH Categories** | Category hierarchy | Tree structure, Limits |
| **CTXH Reports** | Reporting & analytics | Student reports, Statistics |
| **CTXH Limit Config** | Activity limit rules | Category limits, Validation |
| **Payment** | Payment management | Campaigns, Assignments |
| **PayOS** | Payment gateway | Integration, Webhooks |
| **Dashboard** | System overview | Statistics, Analytics |
| **Export** | Data export | Excel, DOCX, S3 upload |
| **Templates** | Document generation | DOCX templates, Variables |
| **Submissions** | Form submissions | File uploads, Processing |
| **AWS Config** | S3 configuration | Bucket management, Usage stats |
| **Metrics** | Monitoring | Prometheus metrics |

---

## 🎯 Best Practices Implemented

✅ **Modular Architecture** - Clear separation of concerns  
✅ **Dependency Injection** - Loose coupling  
✅ **Type Safety** - Full TypeScript coverage  
✅ **Input Validation** - DTO validation with class-validator  
✅ **Error Handling** - Global exception filters  
✅ **Security** - JWT, RBAC, input sanitization  
✅ **Documentation** - Swagger/OpenAPI  
✅ **Testing Ready** - Service/Controller separation  
✅ **Monitoring** - Prometheus metrics  
✅ **Database Migrations** - Version-controlled schema  
✅ **Environment Config** - ConfigModule for secrets  

---

## 🔄 Future Enhancements

### Potential Additions
- 🔮 **Caching Layer** (Redis) for performance
- 🔮 **Queue System** (Bull/BullMQ) for async tasks
- 🔮 **WebSocket Module** for real-time features
- 🔮 **Notification Module** (Email, SMS, Push)
- 🔮 **Audit Log Module** for tracking changes
- 🔮 **API Versioning** for backward compatibility
- 🔮 **GraphQL Gateway** as alternative to REST
- 🔮 **Microservices Split** if scale demands

---

## 📖 References

- **NestJS Documentation:** https://docs.nestjs.com/
- **TypeORM Documentation:** https://typeorm.io/
- **PostgreSQL Documentation:** https://www.postgresql.org/docs/
- **Swagger/OpenAPI:** https://swagger.io/specification/

---

**Document Version:** 1.0  
**Last Updated:** December 4, 2025  
**Maintained By:** Backend Development Team
