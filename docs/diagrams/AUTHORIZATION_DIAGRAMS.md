# Cơ Chế Phân Quyền - Diagrams

## 📐 Tổng Quan Hệ Thống

**Module:** Authorization & Permission Management
**System:** Đoàn Hội Portal
**Mô Hình:** Role-Based Access Control (RBAC) với Context Organization

---

## 📊 Mục Lục

1. [Use Case Diagram](#use-case-diagram)
2. [Activity Diagrams](#activity-diagrams)
   - Đăng nhập và Load Quyền
   - Phân Quyền Cho User
   - Tạo Role Mới
   - Kiểm Tra Quyền Truy Cập
3. [Sequence Diagrams](#sequence-diagrams)
   - Luồng Đăng Nhập
   - Luồng Kiểm Tra Quyền
   - Luồng Phân Quyền

---

## 🎯 Use Case Diagram

```mermaid
graph TB
    subgraph "Authorization System - Hệ Thống Phân Quyền"
        subgraph "Actors - Vai Trò"
            SuperAdmin[👤 Super Admin<br/>Quản trị viên hệ thống]
            OrgAdmin[👤 Organization Admin<br/>Quản trị viên tổ chức]
            User[👤 Regular User<br/>Người dùng thường]
            System[🤖 System<br/>Hệ thống]
        end

        subgraph "Permission Management - Quản Lý Quyền"
            UC01[UC-01: Xem Danh Sách Quyền<br/>View Permissions]
            UC02[UC-02: Tạo Quyền Mới<br/>Create Permission]
            UC03[UC-03: Chỉnh Sửa Quyền<br/>Edit Permission]
            UC04[UC-04: Xóa Quyền<br/>Delete Permission]
        end

        subgraph "Role Management - Quản Lý Vai Trò"
            UC05[UC-05: Xem Danh Sách Role<br/>View Roles]
            UC06[UC-06: Tạo Role Mới<br/>Create Role]
            UC07[UC-07: Chỉnh Sửa Role<br/>Edit Role]
            UC08[UC-08: Xóa Role<br/>Delete Role]
            UC09[UC-09: Gán Quyền Cho Role<br/>Assign Permissions to Role]
        end

        subgraph "User Authorization - Phân Quyền User"
            UC10[UC-10: Xem Quyền Của User<br/>View User Permissions]
            UC11[UC-11: Gán Role Cho User<br/>Assign Role to User]
            UC12[UC-12: Thu Hồi Role<br/>Revoke Role from User]
            UC13[UC-13: Gán Role Theo Tổ Chức<br/>Assign Role by Organization]
        end

        subgraph "Access Control - Kiểm Soát Truy Cập"
            UC14[UC-14: Đăng Nhập<br/>User Login]
            UC15[UC-15: Kiểm Tra Quyền Truy Cập<br/>Check Access Permission]
            UC16[UC-16: Tự Động Load Quyền<br/>Auto Load Permissions]
            UC17[UC-17: Từ Chối Truy Cập<br/>Deny Access]
        end
    end

    %% Super Admin connections
    SuperAdmin --> UC01
    SuperAdmin --> UC02
    SuperAdmin --> UC03
    SuperAdmin --> UC04
    SuperAdmin --> UC05
    SuperAdmin --> UC06
    SuperAdmin --> UC07
    SuperAdmin --> UC08
    SuperAdmin --> UC09
    SuperAdmin --> UC10
    SuperAdmin --> UC11
    SuperAdmin --> UC12
    SuperAdmin --> UC13
    SuperAdmin --> UC14

    %% Organization Admin connections
    OrgAdmin --> UC05
    OrgAdmin --> UC10
    OrgAdmin --> UC11
    OrgAdmin --> UC12
    OrgAdmin --> UC13
    OrgAdmin --> UC14

    %% Regular User connections
    User --> UC10
    User --> UC14

    %% System connections
    System --> UC15
    System --> UC16
    System --> UC17

    %% Use case relationships
    UC11 -.includes.-> UC09
    UC13 -.extends.-> UC11
    UC15 -.includes.-> UC16
    UC17 -.extends.-> UC15
    UC14 --> UC16

    %% Styling
    classDef actorClass fill:#e1f5ff,stroke:#01579b,stroke-width:2px
    classDef usecaseClass fill:#fff9c4,stroke:#f57f17,stroke-width:2px
    classDef systemClass fill:#f3e5f5,stroke:#4a148c,stroke-width:2px

    class SuperAdmin,OrgAdmin,User actorClass
    class System systemClass
    class UC01,UC02,UC03,UC04,UC05,UC06,UC07,UC08,UC09,UC10,UC11,UC12,UC13,UC14,UC15,UC16,UC17 usecaseClass
```

---

## 🔄 Activity Diagrams

### Activity Diagram 1: Đăng Nhập và Load Quyền

```mermaid
flowchart TD
    Start([User mở ứng dụng]) --> CheckToken{Có token<br/>trong storage?}

    CheckToken -->|Không| ShowLogin[Hiển thị trang đăng nhập]
    CheckToken -->|Có| ValidateToken[Kiểm tra token còn hạn?]

    ValidateToken -->|Hết hạn| ShowLogin
    ValidateToken -->|Còn hạn| AutoLogin[Tự động đăng nhập]

    ShowLogin --> UserInput[User nhập email & password]
    UserInput --> SubmitLogin[Gửi yêu cầu đăng nhập]

    SubmitLogin --> ServerValidate[Server xác thực thông tin]
    ServerValidate --> CheckCredentials{Thông tin<br/>đúng?}

    CheckCredentials -->|Sai| ShowError[Hiển thị lỗi đăng nhập]
    ShowError --> ShowLogin

    CheckCredentials -->|Đúng| GenerateTokens[Tạo Access Token & Refresh Token]
    GenerateTokens --> ReturnTokens[Trả về tokens + thông tin user]

    ReturnTokens --> SaveTokens[Lưu tokens vào localStorage]
    SaveTokens --> SetUserState[Cập nhật user state]

    AutoLogin --> SetUserState

    SetUserState --> LoadPermissions[Tự động load quyền của user]
    LoadPermissions --> GetCurrentOrg{User có<br/>organization?}

    GetCurrentOrg -->|Có| LoadOrgPermissions[Load quyền theo organization]
    GetCurrentOrg -->|Không| LoadSystemPermissions[Load quyền toàn hệ thống]

    LoadOrgPermissions --> QueryUserRoles[Query user_roles table]
    LoadSystemPermissions --> QueryUserRoles

    QueryUserRoles --> GetRolesData[Lấy roles với permissions]
    GetRolesData --> FormatPermissions[Format danh sách permissions]

    FormatPermissions --> StorePermissions[Lưu permissions vào state]
    StorePermissions --> ApplyUIFilters[Áp dụng filters cho UI]

    ApplyUIFilters --> ShowHideButtons[Hiện/Ẩn buttons theo quyền]
    ShowHideButtons --> EnableDisableFeatures[Enable/Disable features]
    EnableDisableFeatures --> FilterNavigation[Lọc navigation menu]

    FilterNavigation --> RenderDashboard[Hiển thị Dashboard]
    RenderDashboard --> End([User sử dụng hệ thống])
```

---

### Activity Diagram 2: Phân Quyền Cho User

```mermaid
flowchart TD
    Start([Admin chọn user cần phân quyền]) --> OpenDialog[Mở dialog phân quyền]

    OpenDialog --> LoadAvailableRoles[Load danh sách roles khả dụng]
    LoadAvailableRoles --> CheckAdminLevel{Admin level?}

    CheckAdminLevel -->|Super Admin| ShowAllRoles[Hiển thị tất cả roles]
    CheckAdminLevel -->|Org Admin| ShowOrgRoles[Chỉ hiển thị roles của organization]

    ShowAllRoles --> SelectRoles[Admin chọn roles]
    ShowOrgRoles --> SelectRoles

    SelectRoles --> NeedOrgContext{Role yêu cầu<br/>organization context?}

    NeedOrgContext -->|Có| SelectOrganization[Chọn organization]
    NeedOrgContext -->|Không| SystemRole[Role toàn hệ thống]

    SelectOrganization --> ValidateSelection[Validate lựa chọn]
    SystemRole --> ValidateSelection

    ValidateSelection --> CheckDuplicate{Đã có<br/>role này?}

    CheckDuplicate -->|Có| ShowDuplicateError[Hiển thị lỗi trùng lặp]
    ShowDuplicateError --> SelectRoles

    CheckDuplicate -->|Không| ConfirmAssignment[Xác nhận phân quyền]
    ConfirmAssignment --> UserConfirm{Admin xác nhận?}

    UserConfirm -->|Hủy| CloseDialog[Đóng dialog]
    CloseDialog --> End1([End])

    UserConfirm -->|Đồng ý| SendRequest[Gửi request đến backend]
    SendRequest --> CheckPermission[Kiểm tra quyền admin]

    CheckPermission -->|Không có quyền| ReturnForbidden[Trả về 403 Forbidden]
    ReturnForbidden --> ShowPermissionError[Hiển thị lỗi không có quyền]
    ShowPermissionError --> End2([End])

    CheckPermission -->|Có quyền| ValidateData[Validate data phân quyền]
    ValidateData --> CheckUserExists{User<br/>tồn tại?}

    CheckUserExists -->|Không| ReturnNotFound[Trả về 404 Not Found]
    ReturnNotFound --> ShowUserError[Hiển thị lỗi user không tồn tại]
    ShowUserError --> End3([End])

    CheckUserExists -->|Có| CheckRoleExists{Role<br/>tồn tại?}

    CheckRoleExists -->|Không| ReturnRoleError[Trả về lỗi role]
    ReturnRoleError --> ShowRoleError[Hiển thị lỗi role không hợp lệ]
    ShowRoleError --> End4([End])

    CheckRoleExists -->|Có| StartTransaction[Bắt đầu database transaction]
    StartTransaction --> InsertUserRole[INSERT INTO user_roles]
    InsertUserRole --> CommitTransaction[Commit transaction]

    CommitTransaction --> LogActivity[Ghi log hoạt động]
    LogActivity --> ReturnSuccess[Trả về 201 Created]

    ReturnSuccess --> ShowSuccessToast[Hiển thị thông báo thành công]
    ShowSuccessToast --> RefreshUserData[Refresh dữ liệu user]
    RefreshUserData --> UpdateTable[Cập nhật bảng user roles]
    UpdateTable --> NotifyUser[Thông báo đến user qua email?]

    NotifyUser -->|Có| SendEmail[Gửi email thông báo]
    NotifyUser -->|Không| End5([End])
    SendEmail --> End5
```

---

### Activity Diagram 3: Tạo Role Mới

```mermaid
flowchart TD
    Start([Admin click Create Role]) --> CheckCreatePerm{Có quyền<br/>tạo role?}

    CheckCreatePerm -->|Không| HideButton[Ẩn nút Create]
    HideButton --> End1([End])

    CheckCreatePerm -->|Có| OpenForm[Mở form tạo role]
    OpenForm --> LoadPermissions[Load danh sách permissions]

    LoadPermissions --> GroupPermissions[Nhóm permissions theo category]
    GroupPermissions --> DisplayForm[Hiển thị form]

    DisplayForm --> AdminInput[Admin nhập thông tin]
    AdminInput --> FillName[Nhập tên role]
    AdminInput --> FillDisplayName[Nhập tên hiển thị]
    AdminInput --> FillDescription[Nhập mô tả]
    AdminInput --> SelectPermissions[Chọn permissions]

    SelectPermissions --> SelectCategory[Chọn theo category]
    SelectCategory --> CheckAll{Chọn tất cả<br/>permissions?}

    CheckAll -->|Có| SelectAllPerms[Select all trong category]
    CheckAll -->|Không| SelectIndividual[Chọn từng permission]

    SelectAllPerms --> PreviewSelected[Preview permissions đã chọn]
    SelectIndividual --> PreviewSelected

    PreviewSelected --> SubmitForm{Admin submit?}

    SubmitForm -->|Hủy| CloseForm[Đóng form]
    CloseForm --> End2([End])

    SubmitForm -->|Submit| ValidateForm[Validate form data]
    ValidateForm --> CheckRequired{Đủ thông tin<br/>bắt buộc?}

    CheckRequired -->|Không| ShowValidationErrors[Hiển thị lỗi validation]
    ShowValidationErrors --> DisplayForm

    CheckRequired -->|Có| CheckNameUnique{Tên role<br/>duy nhất?}

    CheckNameUnique -->|Trùng| ShowDuplicateError[Hiển thị lỗi trùng tên]
    ShowDuplicateError --> DisplayForm

    CheckNameUnique -->|Duy nhất| SendCreateRequest[Gửi POST request]
    SendCreateRequest --> BackendValidate[Backend validate]

    BackendValidate --> CheckBackendPerm[Kiểm tra quyền backend]
    CheckBackendPerm -->|Không có| Return403[403 Forbidden]
    Return403 --> ShowError403[Hiển thị lỗi không có quyền]
    ShowError403 --> End3([End])

    CheckBackendPerm -->|Có| ValidatePermissions[Validate permissions IDs]
    ValidatePermissions --> AllPermsValid{Tất cả<br/>permissions hợp lệ?}

    AllPermsValid -->|Không| Return400[400 Bad Request]
    Return400 --> ShowError400[Hiển thị lỗi permissions không hợp lệ]
    ShowError400 --> DisplayForm

    AllPermsValid -->|Có| StartTx[BEGIN TRANSACTION]
    StartTx --> InsertRole[INSERT INTO roles]
    InsertRole --> InsertRolePerms[INSERT INTO role_permissions]
    InsertRolePerms --> CommitTx[COMMIT TRANSACTION]

    CommitTx --> Return201[201 Created]
    Return201 --> CloseFormSuccess[Đóng form]
    CloseFormSuccess --> ShowSuccessToast[Hiển thị toast thành công]
    ShowSuccessToast --> InvalidateCache[Invalidate roles cache]
    InvalidateCache --> RefreshTable[Refresh bảng roles]
    RefreshTable --> HighlightNew[Highlight role mới]
    HighlightNew --> End4([End])
```

---

### Activity Diagram 4: Kiểm Tra Quyền Truy Cập

```mermaid
flowchart TD
    Start([User thực hiện action]) --> UICheck[Frontend check quyền]
    UICheck --> HasPermUI{Có quyền<br/>trên UI?}

    HasPermUI -->|Không| DisableButton[Disable button/ẩn feature]
    DisableButton --> End1([User không thấy action])

    HasPermUI -->|Có| UserClick[User click action]
    UserClick --> SendAPIRequest[Gửi API request với JWT token]

    SendAPIRequest --> ExtractToken[Backend extract JWT token]
    ExtractToken --> ValidateToken{Token<br/>hợp lệ?}

    ValidateToken -->|Không| Return401[401 Unauthorized]
    Return401 --> RedirectLogin[Redirect về trang login]
    RedirectLogin --> End2([End])

    ValidateToken -->|Có| ExtractUser[Extract user từ token]
    ExtractUser --> ReadDecorator[Đọc @RequirePermissions decorator]

    ReadDecorator --> GetRequiredPerms[Lấy danh sách permissions yêu cầu]
    GetRequiredPerms --> NoPermsRequired{Có yêu cầu<br/>permissions?}

    NoPermsRequired -->|Không| AllowAccess[Cho phép truy cập]
    AllowAccess --> ExecuteBusinessLogic[Thực thi business logic]
    ExecuteBusinessLogic --> ReturnSuccess[Trả về kết quả]
    ReturnSuccess --> End3([End])

    NoPermsRequired -->|Có| ExtractContext[Extract context từ request]
    ExtractContext --> GetOrgId[Lấy organizationId nếu có]

    GetOrgId --> QueryUserRoles[Query user_roles table]
    QueryUserRoles --> GetSystemRoles[Lấy roles toàn hệ thống<br/>organizationId = null]
    GetSystemRoles --> GetOrgRoles{Có<br/>organizationId?}

    GetOrgRoles -->|Có| GetOrgSpecificRoles[Lấy roles của organization cụ thể]
    GetOrgRoles -->|Không| CombineRoles[Combine tất cả roles]
    GetOrgSpecificRoles --> CombineRoles

    CombineRoles --> GetPermissions[Lấy permissions từ roles]
    GetPermissions --> CheckEachPerm[Kiểm tra từng permission]

    CheckEachPerm --> LoopPerms{Duyệt qua<br/>permissions yêu cầu}
    LoopPerms --> CheckPerm1[Kiểm tra permission 1]
    CheckPerm1 --> HasPerm1{Có permission 1?}

    HasPerm1 -->|Không| Return403[403 Forbidden]
    Return403 --> ShowErrorMsg[Hiển thị Permission Denied]
    ShowErrorMsg --> End4([End])

    HasPerm1 -->|Có| MorePerms{Còn permissions<br/>khác?}
    MorePerms -->|Có| CheckPermNext[Kiểm tra permission tiếp]
    CheckPermNext --> HasPermNext{Có permission?}

    HasPermNext -->|Không| Return403
    HasPermNext -->|Có| MorePerms

    MorePerms -->|Không| AllPermsGranted[Tất cả permissions OK]
    AllPermsGranted --> AllowAccess
```

---

## 🔀 Sequence Diagrams

### Sequence Diagram 1: Luồng Đăng Nhập và Load Quyền

```mermaid
sequenceDiagram
    actor User as 👤 User
    participant UI as 🖥️ Frontend
    participant Auth as 🔐 Auth API
    participant JWT as 🎫 JWT Service
    participant DB as 💾 Database
    participant Cache as ⚡ Redis Cache

    User->>UI: Nhập email & password
    User->>UI: Click "Đăng nhập"

    UI->>Auth: POST /auth/login<br/>{email, password}

    Auth->>DB: Tìm user theo email
    DB-->>Auth: User data

    Auth->>Auth: So sánh password hash

    alt Password đúng
        Auth->>JWT: Tạo Access Token (15 phút)
        JWT-->>Auth: accessToken

        Auth->>JWT: Tạo Refresh Token (7 ngày)
        JWT-->>Auth: refreshToken

        Auth->>DB: Lưu refresh token
        DB-->>Auth: OK

        Auth-->>UI: 200 OK<br/>{accessToken, refreshToken, user}

        UI->>UI: Lưu tokens vào localStorage
        UI->>UI: Set user trong state

        Note over UI,Auth: Tự động load quyền

        UI->>Auth: GET /auth/me/permissions<br/>?organizationId=xxx

        Auth->>Cache: Check cache<br/>key: user:${userId}:perms

        alt Cache hit
            Cache-->>Auth: Cached permissions
            Auth-->>UI: Permissions data
        else Cache miss
            Auth->>DB: Query user_roles<br/>JOIN roles<br/>JOIN permissions
            DB-->>Auth: User roles & permissions

            Auth->>Auth: Format permissions data
            Auth->>Cache: Lưu vào cache (5 phút)
            Auth-->>UI: Permissions data
        end

        UI->>UI: Lưu permissions vào state
        UI->>UI: Filter navigation menu
        UI->>UI: Hiện/ẩn buttons

        UI->>User: Hiển thị Dashboard

    else Password sai
        Auth-->>UI: 401 Unauthorized
        UI->>User: Hiển thị "Sai email hoặc password"
    end
```

---

### Sequence Diagram 2: Luồng Kiểm Tra Quyền Khi Truy Cập API

```mermaid
sequenceDiagram
    actor User as 👤 User
    participant UI as 🖥️ Frontend
    participant API as 🌐 Backend API
    participant JWTGuard as 🛡️ JWT Guard
    participant PermGuard as 🔒 Permission Guard
    participant RolesSvc as 📋 Roles Service
    participant DB as 💾 Database
    participant Service as ⚙️ Business Service

    User->>UI: Click "Tạo User Mới"

    Note over UI: Kiểm tra quyền trên Frontend
    UI->>UI: hasPermission('users.create', orgId)

    alt Có quyền trên UI
        UI->>API: POST /users<br/>Header: Authorization Bearer token

        Note over API,JWTGuard: Bước 1: Xác thực
        API->>JWTGuard: canActivate()
        JWTGuard->>JWTGuard: Extract JWT từ header
        JWTGuard->>JWTGuard: Verify token signature
        JWTGuard->>JWTGuard: Check expiration

        alt Token hợp lệ
            JWTGuard->>JWTGuard: Decode payload
            JWTGuard->>API: Attach user vào request

            Note over API,PermGuard: Bước 2: Phân quyền
            API->>PermGuard: canActivate()
            PermGuard->>PermGuard: Đọc @RequirePermissions('users.create')
            PermGuard->>PermGuard: Extract organizationId từ request

            PermGuard->>RolesSvc: hasPermission(userId, 'users.create', orgId)

            RolesSvc->>DB: SELECT user_roles<br/>WHERE userId AND<br/>(orgId IS NULL OR orgId = :orgId)
            DB-->>RolesSvc: User roles

            RolesSvc->>RolesSvc: Duyệt qua roles
            RolesSvc->>RolesSvc: Kiểm tra permission 'users.create'

            alt Có permission
                RolesSvc-->>PermGuard: true
                PermGuard-->>API: Allow request

                Note over API,Service: Bước 3: Business Logic
                API->>Service: create(userData)
                Service->>DB: INSERT INTO users
                DB-->>Service: User created
                Service-->>API: User entity

                API-->>UI: 201 Created {user}
                UI->>User: Hiển thị "Tạo user thành công"

            else Không có permission
                RolesSvc-->>PermGuard: false
                PermGuard->>PermGuard: throw ForbiddenException
                PermGuard-->>API: 403 Forbidden
                API-->>UI: 403 Forbidden
                UI->>User: "Bạn không có quyền tạo user"
            end

        else Token không hợp lệ
            JWTGuard->>JWTGuard: throw UnauthorizedException
            JWTGuard-->>API: 401 Unauthorized
            API-->>UI: 401 Unauthorized
            UI->>UI: Clear tokens
            UI->>User: Redirect về trang login
        end

    else Không có quyền trên UI
        UI->>UI: Button disabled/ẩn
        Note over User,UI: User không thể thực hiện action
    end
```

---

### Sequence Diagram 3: Luồng Phân Quyền Role Cho User

```mermaid
sequenceDiagram
    actor Admin as 👤 Admin
    participant UI as 🖥️ Users Management Page
    participant RolesAPI as 📋 Roles API
    participant Guard as 🛡️ Guards
    participant Service as ⚙️ Roles Service
    participant DB as 💾 Database
    participant Email as 📧 Email Service

    Admin->>UI: Chọn user cần phân quyền
    Admin->>UI: Click "Gán Role"

    UI->>RolesAPI: GET /roles/available
    RolesAPI->>DB: Query roles WHERE isActive = true
    DB-->>RolesAPI: Available roles
    RolesAPI-->>UI: Roles list

    UI->>Admin: Hiển thị dialog chọn role
    Admin->>UI: Chọn role(s)
    Admin->>UI: Chọn organization (nếu cần)
    Admin->>UI: Click "Xác nhận"

    UI->>RolesAPI: POST /roles/assign<br/>{userId, roleId, organizationId}

    Note over RolesAPI,Guard: Kiểm tra quyền
    RolesAPI->>Guard: JWT + Permission Guard
    Guard->>Guard: Validate JWT
    Guard->>Guard: Check permission 'roles.assign'

    alt Admin có quyền
        Guard-->>RolesAPI: Authorized

        RolesAPI->>Service: assignUserRole(userId, roleId, orgId)

        Service->>DB: Kiểm tra user tồn tại
        DB-->>Service: User found

        Service->>DB: Kiểm tra role tồn tại
        DB-->>Service: Role found

        Service->>DB: Check duplicate<br/>SELECT user_roles<br/>WHERE userId AND roleId AND orgId

        alt Đã có role này
            DB-->>Service: Role exists
            Service-->>RolesAPI: ConflictException
            RolesAPI-->>UI: 409 Conflict
            UI->>Admin: "User đã có role này rồi"

        else Chưa có role
            DB-->>Service: No duplicate

            Service->>DB: BEGIN TRANSACTION
            Service->>DB: INSERT INTO user_roles<br/>(userId, roleId, organizationId, isActive)
            DB-->>Service: Inserted

            Service->>DB: INSERT INTO activity_logs<br/>(action: 'assign_role')
            DB-->>Service: Logged

            Service->>DB: COMMIT TRANSACTION
            DB-->>Service: Success

            Note over Service,Email: Gửi thông báo
            Service->>Email: Gửi email thông báo phân quyền
            Email-->>Service: Email queued

            Service-->>RolesAPI: UserRole created
            RolesAPI-->>UI: 201 Created {userRole}

            UI->>UI: Refresh user roles table
            UI->>Admin: "Gán role thành công"
        end

    else Admin không có quyền
        Guard->>Guard: throw ForbiddenException
        Guard-->>RolesAPI: 403 Forbidden
        RolesAPI-->>UI: 403 Forbidden
        UI->>Admin: "Bạn không có quyền gán role"
    end
```

---

### Sequence Diagram 4: Luồng Tạo Role Mới

```mermaid
sequenceDiagram
    actor Admin as 👤 Admin
    participant UI as 🖥️ Permissions Page
    participant API as 📋 Roles API
    participant Guard as 🛡️ Guards
    participant Service as ⚙️ Roles Service
    participant DB as 💾 Database
    participant Cache as ⚡ Cache

    Admin->>UI: Click "Create Role"

    UI->>API: GET /roles/available-permissions
    API->>DB: Query permissions WHERE isActive = true
    DB-->>API: Permissions list
    API-->>UI: {permissions, categories}

    UI->>Admin: Hiển thị form tạo role
    Admin->>UI: Nhập tên role
    Admin->>UI: Nhập mô tả
    Admin->>UI: Chọn permissions
    Admin->>UI: Click "Tạo Role"

    UI->>UI: Validate form

    alt Form hợp lệ
        UI->>API: POST /roles<br/>{name, displayName, description, permissionIds[]}

        API->>Guard: JWT + Permission Guard
        Guard->>Guard: Check 'permissions.create'

        alt Có quyền
            Guard-->>API: Authorized

            API->>Service: create(roleData)

            Service->>DB: Check tên role unique
            DB-->>Service: Name check result

            alt Tên đã tồn tại
                Service-->>API: ConflictException
                API-->>UI: 409 Conflict
                UI->>Admin: "Tên role đã tồn tại"

            else Tên khả dụng
                Service->>DB: Validate permissionIds
                DB-->>Service: All permissions valid

                Service->>DB: BEGIN TRANSACTION

                Service->>DB: INSERT INTO roles<br/>(name, displayName, description)
                DB-->>Service: Role created with ID

                Service->>DB: INSERT INTO role_permissions<br/>(roleId, permissionId) VALUES ...
                DB-->>Service: Permissions linked

                Service->>DB: COMMIT TRANSACTION
                DB-->>Service: Success

                Service->>Cache: Invalidate roles cache
                Cache-->>Service: Cache cleared

                Service-->>API: Role entity with permissions
                API-->>UI: 201 Created {role}

                UI->>UI: Close dialog
                UI->>UI: Refresh roles table
                UI->>UI: Highlight new role
                UI->>Admin: "Tạo role thành công"
            end

        else Không có quyền
            Guard-->>API: 403 Forbidden
            API-->>UI: 403 Forbidden
            UI->>Admin: "Bạn không có quyền tạo role"
        end

    else Form không hợp lệ
        UI->>Admin: Hiển thị lỗi validation
    end
```

---

## 🎯 Các Khái Niệm Chính

### 1. **Permission (Quyền)**
- Đơn vị nhỏ nhất của phân quyền
- Format: `category.action` (vd: `users.create`, `organizations.delete`)
- Có 2 loại context:
  - **SYSTEM**: Áp dụng toàn hệ thống
  - **ORGANIZATION**: Áp dụng trong tổ chức cụ thể

### 2. **Role (Vai trò)**
- Nhóm nhiều permissions lại
- Có thể gán cho user
- Ví dụ: Super Admin, Organization Admin, Viewer

### 3. **User Role Assignment (Phân quyền User)**
- Gán role cho user
- Có thể gán theo organization hoặc toàn hệ thống
- Một user có thể có nhiều roles khác nhau

### 4. **Context Organization**
- Quyền có thể áp dụng trong context của một tổ chức
- User có thể có role khác nhau ở các tổ chức khác nhau
- Ví dụ: Admin ở tổ chức A, Viewer ở tổ chức B

---

## 🔒 Luồng Kiểm Tra Quyền

### Frontend Check (UI Layer)
1. Kiểm tra permissions trong state
2. Hiện/ẩn buttons, menu items
3. Enable/disable features
4. **Mục đích:** Tối ưu UX, tránh user thấy action không được phép

### Backend Check (API Layer)
1. Validate JWT token
2. Kiểm tra permissions từ database
3. So sánh với permissions yêu cầu
4. **Mục đích:** Bảo mật thực sự, không thể bypass

### Database Query
```sql
-- Lấy tất cả permissions của user
SELECT DISTINCT p.code
FROM user_roles ur
JOIN roles r ON ur.roleId = r.id
JOIN role_permissions rp ON r.id = rp.roleId
JOIN permissions p ON rp.permissionId = p.id
WHERE ur.userId = :userId
  AND ur.isActive = true
  AND (ur.organizationId = :orgId OR ur.organizationId IS NULL)
  AND p.isActive = true
```

---

## 📊 Phân Quyền Theo Levels

### Level 1: Super Admin
- Có **TẤT CẢ** permissions
- Không bị giới hạn bởi organization
- Có thể quản lý toàn bộ hệ thống

### Level 2: Organization Admin
- Có permissions **trong organization cụ thể**
- Có thể quản lý users, roles trong organization
- Không thể access organization khác

### Level 3: Regular User
- Có permissions **cơ bản**
- Chỉ xem được dữ liệu của mình
- Không có quyền quản lý

---

## 🛡️ Security Measures

### 1. **JWT Token**
- Access Token: Hết hạn sau 15 phút
- Refresh Token: Hết hạn sau 7 ngày
- Tự động refresh khi access token hết hạn

### 2. **Guards**
- **JwtAuthGuard**: Xác thực user
- **PermissionGuard**: Kiểm tra quyền
- Chạy trước mỗi API request

### 3. **Cache**
- Cache permissions trong 5 phút
- Giảm query database
- Invalidate khi có thay đổi

### 4. **Audit Log**
- Ghi lại mọi thay đổi về permissions
- Theo dõi ai gán quyền cho ai
- Có thể rollback nếu cần

---

## 📚 Related Documentation

- **Authorization Mechanism (Chi tiết):** [AUTHORIZATION_MECHANISM.md](../archive/internal/mechanism/Toan/AUTHORIZATION_MECHANISM.md)
- **Backend Component Diagram:** [BACKEND_COMPONENT_DIAGRAM.md](BACKEND_COMPONENT_DIAGRAM.md)
- **Package Diagram:** [PACKAGE_DIAGRAM.md](PACKAGE_DIAGRAM.md)
- **API Roles Controller:** `/backend/src/roles/roles.controller.ts`
- **Permission Guard:** `/backend/src/auth/guards/permission.guard.ts`

---

**Document Version:** 1.0
**Last Updated:** December 20, 2025
**Maintained By:** Backend Development Team
**Module:** Authorization & Permission Management
