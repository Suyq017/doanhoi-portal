# CTXH System UML Diagrams

## 1. Use Case Diagram - Tổng quan hệ thống

```plantuml
@startuml CTXH Use Cases
left to right direction
skinparam packageStyle rectangle

actor "Sinh viên" as Student
actor "Quản trị viên" as Admin
actor "Cán bộ ĐHCTSV" as Staff

rectangle "Hệ thống quản lý CTXH" {
  usecase "Xem danh mục CTXH" as UC1
  usecase "Xem danh sách hoạt động" as UC2
  usecase "Đăng ký hoạt động" as UC3
  usecase "Xem chi tiết hoạt động" as UC4
  usecase "Xem báo cáo cá nhân" as UC5
  
  usecase "Quản lý danh mục" as UC6
  usecase "Tạo/Sửa/Xóa danh mục" as UC7
  
  usecase "Quản lý hoạt động" as UC8
  usecase "Tạo hoạt động mới" as UC9
  usecase "Chỉnh sửa hoạt động" as UC10
  usecase "Xóa hoạt động" as UC11
  
  usecase "Quản lý tham gia" as UC12
  usecase "Chấm điểm sinh viên" as UC13
  usecase "Duyệt tham gia" as UC14
  usecase "Hủy tham gia" as UC15
  
  usecase "Import hệ thống cũ" as UC16
  usecase "Tải file mẫu" as UC17
  usecase "Upload file Excel" as UC18
  usecase "Validate dữ liệu" as UC19
  usecase "Import theo batch" as UC20
}

Student --> UC1
Student --> UC2
Student --> UC3
Student --> UC4
Student --> UC5

Admin --> UC6
Admin --> UC8
Admin --> UC12
Admin --> UC16

UC6 ..> UC7 : include
UC8 ..> UC9 : include
UC8 ..> UC10 : include
UC8 ..> UC11 : include

UC12 ..> UC13 : include
UC12 ..> UC14 : include
UC12 ..> UC15 : include

UC16 ..> UC17 : include
UC16 ..> UC18 : include
UC16 ..> UC19 : include
UC16 ..> UC20 : include

Staff --> UC12
Staff --> UC16

@enduml
```

## 2. Class Diagram - Cấu trúc dữ liệu

```plantuml
@startuml CTXH Class Diagram
skinparam classAttributeIconSize 0

class User {
  - id: UUID
  - code: string
  - familyName: string
  - givenName: string
  - email: string
  - ctxhDays: decimal
  - ctxhDaysOldSystem: decimal
  --
  + getFullName(): string
  + getTotalCtxhDays(): number
}

class CtxhCategory {
  - id: UUID
  - name: string
  - description: string
  - displayOrder: number
  - createdAt: Date
  - updatedAt: Date
  - deletedAt: Date
  --
  + getActiveActivities(): CtxhActivity[]
}

class CtxhActivity {
  - id: UUID
  - categoryId: UUID
  - name: string
  - description: string
  - location: string
  - startDate: Date
  - endDate: Date
  - registrationDeadline: Date
  - maxParticipants: number
  - totalDays: decimal
  - isPublished: boolean
  - createdAt: Date
  - updatedAt: Date
  - deletedAt: Date
  --
  + isRegistrationOpen(): boolean
  + hasAvailableSlots(): boolean
  + getCurrentParticipants(): number
}

class CtxhParticipation {
  - id: UUID
  - activityId: UUID
  - studentId: UUID
  - studentCode: string
  - actualDays: decimal
  - status: ParticipationStatus
  - note: string
  - gradedBy: string
  - gradedAt: Date
  - createdAt: Date
  - updatedAt: Date
  - deletedAt: Date
  --
  + complete(days, note): void
  + cancel(): void
}

enum ParticipationStatus {
  REGISTERED
  COMPLETED
  CANCELLED
}

class OldSystemCtxhRecord {
  - studentCode: string
  - days: decimal
  --
  + validate(): boolean
}

class StudentReport {
  - studentId: UUID
  - studentCode: string
  - studentName: string
  - studentEmail: string
  - totalDaysCompleted: number
  - ctxhDaysNewSystem: number
  - ctxhDaysOldSystem: number
  - totalActivitiesParticipated: number
  - requiredDays: number
  - isQualified: boolean
  - activities: ActivityReportItem[]
  --
  + calculateProgress(): number
}

class ActivityReportItem {
  - activityName: string
  - categoryName: string
  - daysCompleted: decimal
  - status: string
  - completedDate: Date
  - note: string
}

' Relationships
CtxhCategory "1" --> "0..*" CtxhActivity : contains
CtxhActivity "1" --> "0..*" CtxhParticipation : has
User "1" --> "0..*" CtxhParticipation : participates
CtxhParticipation --> ParticipationStatus : has status
StudentReport "1" --> "0..*" ActivityReportItem : contains
User "1" --> "0..*" OldSystemCtxhRecord : imports from old system

@enduml
```

## 3. Sequence Diagram - Page: Category Management

```plantuml
@startuml Category Management Flow
actor "Admin" as Admin
participant "CategoriesPage" as Page
participant "CategoryService" as Service
participant "API" as API
database "Database" as DB

== Load Categories ==
Admin -> Page: Truy cập trang danh mục
activate Page
Page -> Service: getCategories()
activate Service
Service -> API: GET /ctxh/categories
activate API
API -> DB: SELECT * FROM ctxh_category\nWHERE deleted_at IS NULL
activate DB
DB --> API: categories[]
deactivate DB
API --> Service: Response
deactivate API
Service --> Page: categories[]
deactivate Service
Page -> Page: Render danh sách
Page --> Admin: Hiển thị danh mục
deactivate Page

== Create New Category ==
Admin -> Page: Click "Tạo danh mục"
activate Page
Page -> Page: Mở CreateCategoryModal
Admin -> Page: Nhập thông tin (name, description)
Admin -> Page: Click "Lưu"
Page -> Service: createCategory(data)
activate Service
Service -> API: POST /ctxh/categories
activate API
API -> DB: INSERT INTO ctxh_category
activate DB
DB --> API: new category
deactivate DB
API --> Service: Response
deactivate API
Service --> Page: Success
deactivate Service
Page -> Page: Đóng modal
Page -> Service: getCategories() (Refresh)
Page --> Admin: Hiển thị thông báo thành công
deactivate Page

== Update Category ==
Admin -> Page: Click "Sửa" trên category
activate Page
Page -> Page: Mở EditCategoryModal với dữ liệu
Admin -> Page: Chỉnh sửa thông tin
Admin -> Page: Click "Cập nhật"
Page -> Service: updateCategory(id, data)
activate Service
Service -> API: PUT /ctxh/categories/:id
activate API
API -> DB: UPDATE ctxh_category\nSET ...\nWHERE id = :id
activate DB
DB --> API: updated category
deactivate DB
API --> Service: Response
deactivate API
Service --> Page: Success
deactivate Service
Page -> Service: getCategories() (Refresh)
Page --> Admin: Hiển thị thông báo thành công
deactivate Page

== Delete Category ==
Admin -> Page: Click "Xóa" trên category
activate Page
Page -> Page: Hiển thị confirm dialog
Admin -> Page: Xác nhận xóa
Page -> Service: deleteCategory(id)
activate Service
Service -> API: DELETE /ctxh/categories/:id
activate API
API -> DB: UPDATE ctxh_category\nSET deleted_at = NOW()\nWHERE id = :id
activate DB
DB --> API: Success
deactivate DB
API --> Service: Response
deactivate API
Service --> Page: Success
deactivate Service
Page -> Service: getCategories() (Refresh)
Page --> Admin: Hiển thị thông báo thành công
deactivate Page

@enduml
```

## 4. Sequence Diagram - Page: Activity Management

```plantuml
@startuml Activity Management Flow
actor "Admin" as Admin
participant "ActivitiesPage" as Page
participant "ActivityService" as Service
participant "CategoryService" as CatService
participant "API" as API
database "Database" as DB

== Load Activities with Filters ==
Admin -> Page: Truy cập trang hoạt động
activate Page
Page -> CatService: getCategories()
activate CatService
CatService --> Page: categories[]
deactivate CatService
Page -> Service: getActivities(filters)
activate Service
Service -> API: GET /ctxh/activities?filters
activate API
API -> DB: SELECT a.*, c.name as category_name\nFROM ctxh_activity a\nJOIN ctxh_category c\nWHERE ...
activate DB
DB --> API: activities[]
deactivate DB
API --> Service: Response {activities, total, page}
deactivate API
Service --> Page: PaginatedResponse
deactivate Service
Page -> Page: Render activities table
Page --> Admin: Hiển thị danh sách hoạt động
deactivate Page

== Create New Activity ==
Admin -> Page: Click "Tạo hoạt động"
activate Page
Page -> Page: Mở CreateActivityModal
Admin -> Page: Nhập thông tin\n(name, category, dates, location, etc.)
Admin -> Page: Click "Tạo"
Page -> Service: createActivity(data)
activate Service
Service -> API: POST /ctxh/activities
activate API
API -> DB: INSERT INTO ctxh_activity
activate DB
DB --> API: new activity
deactivate DB
API --> Service: Response
deactivate API
Service --> Page: Success
deactivate Service
Page -> Page: Đóng modal
Page -> Service: getActivities() (Refresh)
Page --> Admin: Thông báo thành công
deactivate Page

== Update Activity ==
Admin -> Page: Click "Sửa" activity
activate Page
Page -> Service: getActivityById(id)
activate Service
Service -> API: GET /ctxh/activities/:id
API --> Service: activity detail
deactivate Service
Page -> Page: Mở EditActivityModal
Admin -> Page: Chỉnh sửa thông tin
Admin -> Page: Click "Cập nhật"
Page -> Service: updateActivity(id, data)
activate Service
Service -> API: PUT /ctxh/activities/:id
activate API
API -> DB: UPDATE ctxh_activity\nSET ... WHERE id = :id
activate DB
DB --> API: updated activity
deactivate DB
API --> Service: Response
deactivate API
Service --> Page: Success
deactivate Service
Page -> Service: getActivities() (Refresh)
Page --> Admin: Thông báo thành công
deactivate Page

== Publish/Unpublish Activity ==
Admin -> Page: Toggle "Công khai"
activate Page
Page -> Service: updateActivity(id, {isPublished})
activate Service
Service -> API: PUT /ctxh/activities/:id
API --> Service: Success
deactivate Service
Page -> Page: Update UI
Page --> Admin: Thông báo trạng thái mới
deactivate Page

@enduml
```

## 5. Sequence Diagram - Page: Activity Detail (Participation)

```plantuml
@startuml Activity Detail & Participation Flow
actor "Admin/Staff" as Staff
participant "ActivityDetailPage" as Page
participant "ParticipationService" as Service
participant "API" as API
database "Database" as DB

== Load Activity Detail ==
Staff -> Page: Truy cập chi tiết hoạt động
activate Page
Page -> Service: getActivityDetail(activityId)
activate Service
Service -> API: GET /ctxh/activities/:id
activate API
API -> DB: SELECT a.*, c.name\nFROM ctxh_activity a\nJOIN ctxh_category c
activate DB
DB --> API: activity with category
deactivate DB
API --> Service: Response
deactivate API
Service --> Page: activity detail
deactivate Service

Page -> Service: getParticipations(activityId, filters)
activate Service
Service -> API: GET /ctxh/participations?activityId=...
activate API
API -> DB: SELECT p.*, u.code, u.family_name\nFROM ctxh_participation p\nLEFT JOIN users u
activate DB
DB --> API: participations[]
deactivate DB
API --> Service: Response
deactivate API
Service --> Page: participations[]
deactivate Service

Page -> Page: Render activity info + participants table
Page --> Staff: Hiển thị chi tiết
deactivate Page

== Grade Student (Chấm điểm) ==
Staff -> Page: Click "Chấm điểm" trên sinh viên
activate Page
Page -> Page: Mở GradeModal
Staff -> Page: Nhập actualDays, note
Staff -> Page: Click "Lưu"
Page -> Service: gradeParticipation(id, {actualDays, note})
activate Service
Service -> API: PUT /ctxh/participations/:id/grade
activate API
API -> DB: BEGIN TRANSACTION
activate DB

API -> DB: UPDATE ctxh_participation\nSET actual_days = :days,\n    status = 'COMPLETED',\n    note = :note,\n    graded_by = :user,\n    graded_at = NOW()
DB --> API: participation updated

API -> DB: UPDATE users\nSET ctxh_days = ctxh_days + :daysDelta\nWHERE code = :studentCode
DB --> API: user ctxh_days updated

API -> DB: COMMIT
deactivate DB
API --> Service: Response
deactivate API
Service --> Page: Success
deactivate Service

Page -> Service: getParticipations() (Refresh)
Page --> Staff: Thông báo chấm điểm thành công
deactivate Page

== Bulk Grade from Excel ==
Staff -> Page: Click "Import chấm điểm"
activate Page
Page -> Page: Mở ImportGradeModal
Staff -> Page: Tải file mẫu
Page --> Staff: Download template.xlsx
Staff -> Page: Upload file Excel
Page -> Page: Parse Excel file (client-side)
Page -> Page: Validate data
Page -> Service: bulkGrade(activityId, gradingData[])
activate Service
Service -> API: POST /ctxh/participations/bulk-grade
activate API

loop For each student in batch
  API -> DB: UPDATE participation + user ctxh_days
  activate DB
  DB --> API: Success
  deactivate DB
end

API --> Service: Response {successful[], failed[]}
deactivate API
Service --> Page: Result summary
deactivate Service

Page -> Service: getParticipations() (Refresh)
Page --> Staff: Hiển thị kết quả import
deactivate Page

== Cancel Participation ==
Staff -> Page: Click "Hủy" tham gia
activate Page
Page -> Page: Confirm dialog
Staff -> Page: Xác nhận hủy
Page -> Service: cancelParticipation(id)
activate Service
Service -> API: PUT /ctxh/participations/:id/cancel
activate API
API -> DB: UPDATE ctxh_participation\nSET status = 'CANCELLED',\n    deleted_at = NOW()
activate DB

' If was COMPLETED, revert ctxh_days
alt Status was COMPLETED
  API -> DB: UPDATE users\nSET ctxh_days = ctxh_days - :actualDays
end

DB --> API: Success
deactivate DB
API --> Service: Response
deactivate API
Service --> Page: Success
deactivate Service
Page -> Service: getParticipations() (Refresh)
Page --> Staff: Thông báo hủy thành công
deactivate Page

@enduml
```

## 6. Sequence Diagram - Page: Import Old System

```plantuml
@startuml Import Old System Flow
actor "Admin" as Admin
participant "OldSystemImportPage" as Page
participant "ImportModal" as Modal
participant "ImportConfig" as Config
participant "CtxhImportAPI" as API
database "Database" as DB

== Open Import Modal ==
Admin -> Page: Click "Import CTXH"
activate Page
Page -> Page: Generate template blob URL
Page -> Modal: Open modal with config
activate Modal
Modal --> Admin: Hiển thị modal với hướng dẫn
deactivate Modal
deactivate Page

== Download Template ==
Admin -> Modal: Click "tại đây" (download link)
activate Modal
Modal -> Config: downloadTemplate()
activate Config
Config -> Config: Create Excel workbook\n(MSSV, Số ngày)
Config --> Modal: Excel blob
deactivate Config
Modal --> Admin: Download template.xlsx
deactivate Modal

== Upload & Parse File ==
Admin -> Modal: Upload file Excel
activate Modal
Modal -> Config: parseFile(file, onProgress)
activate Config

Config -> Config: Read file with FileReader
Config -> Config: Parse Excel with XLSX

loop For each row
  Config -> Config: Validate format (2 columns)
  Config -> Config: Extract {studentCode, days}
  Config -> Config: Update progress
  Config --> Modal: onProgress({percentage, message})
  Modal --> Admin: Hiển thị progress bar
end

Config --> Modal: Return parsed data[]
deactivate Config

Modal -> Config: validateData(data)
activate Config

loop For each record
  Config -> Config: Validate MSSV (/^\d{7,10}$/)
  Config -> Config: Validate days (positive, 0.5 increments)
  Config -> Config: Check duplicate MSSV
  
  alt Invalid
    Config -> Config: Add to errors[]
  else Valid
    Config -> Config: Add to validData[]
  end
end

Config --> Modal: {validData[], errors[]}
deactivate Config

Modal --> Admin: Hiển thị validation results
deactivate Modal

== Submit Data (Batch Processing) ==
Admin -> Modal: Click "Nhập dữ liệu"
activate Modal
Modal -> Config: submitData(validData, onProgress)
activate Config

Config -> Config: Split data into batches (200 records/batch)

loop For each batch (1 to 140)
  Config -> Config: Prepare batch data
  
  Config -> API: POST /ctxh/import/old-system\n{records: batch[]}
  activate API
  
  API -> DB: BEGIN TRANSACTION
  activate DB
  
  loop For each record in batch
    API -> DB: SELECT id FROM users\nWHERE code = :studentCode
    DB --> API: user found
    
    API -> DB: UPDATE users\nSET ctxh_days_old_system = :days\nWHERE code = :studentCode
    DB --> API: updated
  end
  
  API -> DB: COMMIT
  deactivate DB
  
  API --> Config: {successful: N, failed: [], errors: []}
  deactivate API
  
  Config -> Config: Accumulate results
  Config -> Config: Update progress\n(batch X/140, Y/27931 records)
  Config --> Modal: onProgress({currentBatch, totalBatches, percentage})
  Modal --> Admin: Update progress UI
  
  alt Batch failed
    Config -> Config: Retry with exponential backoff\n(max 3 attempts)
  end
end

Config --> Modal: Final result {totalSuccessful, allErrors[]}
deactivate Config

Modal --> Admin: Hiển thị kết quả import
Modal --> Admin: "Đã nhập thành công X/Y bản ghi"
deactivate Modal

== Close Modal ==
Admin -> Modal: Click "Đóng"
activate Modal
Modal -> Page: Increment modal key (force reset)
activate Page
Page -> Page: Revoke template blob URL
Page --> Admin: Modal closed
deactivate Page
deactivate Modal

@enduml
```

## 7. Sequence Diagram - Page: Student Report

```plantuml
@startuml Student Report Flow
actor "Student" as Student
participant "StudentReportPage" as Page
participant "ReportService" as Service
participant "UserService" as UserService
participant "API" as API
database "Database" as DB

== Load Student Report ==
Student -> Page: Truy cập báo cáo cá nhân
activate Page
Page -> Page: Get studentCode from auth context
Page -> Service: getMyReport(studentCode)
activate Service

Service -> API: GET /ctxh/reports/student/:code
activate API

API -> DB: SELECT id, code, family_name,\n       ctxh_days, ctxh_days_old_system\nFROM users WHERE code = :code
activate DB
DB --> API: user data
deactivate DB

API -> DB: SELECT p.*, a.name, c.name\nFROM ctxh_participation p\nJOIN ctxh_activity a\nJOIN ctxh_category c\nWHERE p.student_code = :code\nAND p.deleted_at IS NULL
activate DB
DB --> API: participations[]
deactivate DB

API -> API: Calculate totals:\nctxhDaysNew = parseFloat(ctxh_days)\nctxhDaysOld = parseFloat(ctxh_days_old_system)\ntotalDays = ctxhDaysNew + ctxhDaysOld\nisQualified = totalDays >= 15

API --> Service: StudentReport DTO
deactivate API

Service --> Page: report data
deactivate Service

alt Student name/email missing
  Page -> UserService: getUsers({search: studentCode})
  activate UserService
  UserService --> Page: user info
  deactivate UserService
  Page -> Page: Set student info
end

Page -> Page: Render report:\n- Student info card\n- Summary stats (4 boxes)\n- Activities table

Page --> Student: Hiển thị báo cáo
deactivate Page

== View Activity Details ==
Student -> Page: Click vào hoạt động trong bảng
activate Page
Page --> Student: Hiển thị chi tiết:\n- Tên hoạt động\n- Danh mục\n- Số ngày thực tế\n- Trạng thái\n- Ngày chấm điểm\n- Ghi chú
deactivate Page

== Summary Statistics ==
note over Page
  Hiển thị 4 ô thống kê:
  
  1. **Ngày hoạt động đã hoàn thành** (xanh lá)
     = ctxh_days_new_system (15 ngày)
  
  2. **Các hoạt động trên hệ thống cũ** (cam)
     = ctxh_days_old_system (4 ngày)
  
  3. **Tổng số ngày hoạt động CTXH** (xanh dương)
     = ctxh_days_new_system + ctxh_days_old_system (19 ngày)
  
  4. **Trạng thái** (tím)
     = "Đạt" nếu tổng >= 15, "Chưa đạt" nếu < 15
end note

@enduml
```

## 8. Activity Diagram - Import Old System Process

```plantuml
@startuml Import Process Activity
start

:Admin click "Import CTXH";
:Mở ImportModal;
:Hiển thị hướng dẫn;

fork
  :Admin đọc hướng dẫn;
fork again
  :Admin click "tại đây";
  :Download template Excel;
  :Mở file trong Excel;
  :Nhập dữ liệu (MSSV, Số ngày);
  :Lưu file;
end fork

:Admin upload file Excel;
:ParseFile() - Đọc file;

if (File format đúng?) then (yes)
  partition "Client-side Validation" {
    repeat
      :Đọc row tiếp theo;
      :Validate MSSV (7-10 số);
      :Validate days (>0, 0.5 increments);
      :Check duplicate;
      
      if (Valid?) then (yes)
        :Add to validData[];
      else (no)
        :Add to errors[];
      endif
    repeat while (Còn rows?) is (yes)
    ->no;
  }
  
  :Hiển thị kết quả validation;
  :Show validData count + errors;
  
  if (Có dữ liệu hợp lệ?) then (yes)
    :Admin click "Nhập dữ liệu";
    
    partition "Batch Processing" {
      :Split data into batches (200/batch);
      
      repeat
        :Get next batch;
        :Send POST /ctxh/import/old-system;
        
        if (API success?) then (yes)
          :Accumulate successful count;
        else (no)
          if (Retries < 3?) then (yes)
            :Wait (exponential backoff);
            :Retry batch;
          else (no)
            :Add to failed[];
          endif
        endif
        
        :Update progress bar;
        :Show "Gói X/Y - Đã xử lý: Z records";
        
      repeat while (More batches?) is (yes)
      ->no;
    }
    
    :Hiển thị tổng kết;
    :Show successful/failed counts;
    
  else (no)
    :Hiển thị "Không có dữ liệu hợp lệ";
  endif
  
else (no)
  :Hiển thị lỗi format;
  stop
endif

:Admin click "Đóng";
:Reset modal state;

stop
@enduml
```

## 9. Component Diagram - Frontend Architecture

```plantuml
@startuml CTXH Frontend Components
package "Frontend - React Application" {
  
  package "Pages" {
    [CategoriesPage]
    [ActivitiesPage]
    [ActivityDetailPage]
    [OldSystemImportPage]
    [StudentReportPage]
  }
  
  package "Components" {
    package "Category" {
      [CategoryCard]
      [CreateCategoryModal]
      [EditCategoryModal]
    }
    
    package "Activity" {
      [ActivityCard]
      [CreateActivityModal]
      [EditActivityModal]
      [ActivityFilters]
    }
    
    package "Participation" {
      [ParticipationTable]
      [GradeModal]
      [BulkGradeModal]
    }
    
    package "Import" {
      [ImportModal]
      [ProgressBar]
      [ValidationResults]
    }
    
    package "Report" {
      [StudentInfoCard]
      [SummaryStats]
      [ActivitiesTable]
    }
  }
  
  package "Services" {
    [CategoryService]
    [ActivityService]
    [ParticipationService]
    [CtxhImportService]
    [ReportService]
  }
  
  package "Config" {
    [oldSystemImportConfig]
  }
  
  package "API Client" {
    [axiosInstance]
    [authInterceptor]
  }
}

' Page -> Component relationships
[CategoriesPage] --> [CategoryCard]
[CategoriesPage] --> [CreateCategoryModal]
[CategoriesPage] --> [EditCategoryModal]

[ActivitiesPage] --> [ActivityCard]
[ActivitiesPage] --> [ActivityFilters]
[ActivitiesPage] --> [CreateActivityModal]

[ActivityDetailPage] --> [ParticipationTable]
[ActivityDetailPage] --> [GradeModal]
[ActivityDetailPage] --> [BulkGradeModal]

[OldSystemImportPage] --> [ImportModal]
[ImportModal] --> [ProgressBar]
[ImportModal] --> [ValidationResults]

[StudentReportPage] --> [StudentInfoCard]
[StudentReportPage] --> [SummaryStats]
[StudentReportPage] --> [ActivitiesTable]

' Service relationships
[CategoriesPage] --> [CategoryService]
[ActivitiesPage] --> [ActivityService]
[ActivityDetailPage] --> [ParticipationService]
[OldSystemImportPage] --> [oldSystemImportConfig]
[oldSystemImportConfig] --> [CtxhImportService]
[StudentReportPage] --> [ReportService]

' All services use API client
[CategoryService] --> [axiosInstance]
[ActivityService] --> [axiosInstance]
[ParticipationService] --> [axiosInstance]
[CtxhImportService] --> [axiosInstance]
[ReportService] --> [axiosInstance]

[axiosInstance] --> [authInterceptor]

@enduml
```

## 10. Deployment Diagram - System Architecture

```plantuml
@startuml CTXH System Deployment
node "Client Browser" {
  [React App\n(Vite)]
  [TailwindCSS]
  [XLSX.js]
}

node "Web Server" {
  [Nginx\nReverse Proxy]
}

node "Application Server" {
  [NestJS Backend\n(Node.js)]
  [TypeORM]
}

node "Database Server" {
  database "PostgreSQL" {
    [users]
    [ctxh_category]
    [ctxh_activity]
    [ctxh_participation]
  }
}

node "Monitoring" {
  [Prometheus]
  [Grafana]
}

[React App\n(Vite)] -down-> [Nginx\nReverse Proxy] : HTTP/HTTPS
[Nginx\nReverse Proxy] -down-> [NestJS Backend\n(Node.js)] : HTTP
[NestJS Backend\n(Node.js)] -down-> [TypeORM] : ORM
[TypeORM] -down-> [PostgreSQL] : TCP 5432

[NestJS Backend\n(Node.js)] -right-> [Prometheus] : Metrics
[Prometheus] -down-> [Grafana] : Data Source

@enduml
```

## Hướng dẫn sử dụng

### 1. Cài đặt PlantUML

**VS Code Extension:**
- Cài đặt extension "PlantUML" by jebbs
- Cài đặt Java Runtime (nếu chưa có)
- Cài đặt Graphviz (để render)

**Online:**
- Truy cập: http://www.plantuml.com/plantuml/uml/
- Copy/paste code vào để xem diagram

### 2. Xem diagram trong VS Code

1. Mở file này
2. Đặt con trỏ vào block code PlantUML
3. Press `Alt+D` để preview
4. Hoặc right-click → "Preview Current Diagram"

### 3. Export diagram

- Right-click trên preview → "Export Current Diagram"
- Chọn format: PNG, SVG, PDF, etc.

## Giải thích các diagram

### Use Case Diagram
Mô tả các tính năng chính và actor tương tác với hệ thống.

### Class Diagram
Cấu trúc dữ liệu và mối quan hệ giữa các entity.

### Sequence Diagrams (5 pages)
Chi tiết luồng tương tác giữa frontend-backend-database cho từng trang:
- Category Management: CRUD danh mục
- Activity Management: Quản lý hoạt động với filters
- Activity Detail: Chấm điểm, bulk grade, cancel
- Import Old System: Parse Excel, validate, batch processing với progress
- Student Report: Load báo cáo với tính toán tổng số ngày

### Activity Diagram
Luồng xử lý import với validation và batch processing.

### Component Diagram
Kiến trúc frontend với pages, components, services.

### Deployment Diagram
Cấu trúc deployment của hệ thống (Frontend, Backend, Database, Monitoring).
