Tôi sẽ lập kế hoạch để thay thế hệ thống import User hiện tại với các trường dữ liệu mẫu mới và logic tự động tạo organization. Đây là kế hoạch chi tiết:

## Kế hoạch thay thế hệ thống Import User

### 1. Cấu trúc dữ liệu mẫu mới

```
Mã số sinh viên* | Email | CMND | Họ* | Tên* | Ngày sinh | GIOITINH | Mật khẩu | Điện thoại | Năm vào | Năm CTDT | Tên lớp | Mã Khoa | Mã đơn vị quản lý | Hệ đào tạo | Bậc đao tạo | Loại người dùng | Tình trạng thành viên
```

**Ghi chú:**
- `*` = NOT NULL
- Tên lớp → classId (map với name trong table Classes)
- Mã đơn vị quản lý → departmentId (map với code trong table Department)
- Mã khoa → field mới của User

### 2. Enum Values cần định nghĩa

```typescript
// Hệ đào tạo
enum TrainingSystem {
  VLVH = 'VLVH',  // Vừa làm Vừa học
  CQ = 'CQ',      // Chính quy
  QT = 'QT',      // Quốc tế
  DTTX = 'DTTX'   // Đào tạo từ xa
}

// Bậc đào tạo
enum TrainingLevel {
  DH = 'DH'       // Đại học (có thể mở rộng)
}

// Giới tính
enum Gender {
  NAM = 'NAM',
  NU = 'NU'
}

// Loại người dùng
enum UserType {
  SINH_VIEN = 'SINH_VIEN',
  CAN_BO = 'CAN_BO'
}

// Tình trạng thành viên
enum MembershipStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  GRADUATED = 'GRADUATED'
}
```

### 3. Cập nhật User Entity

```typescript
@Entity('users')
export class User {
  // Existing fields...
  
  @Column({ name: 'student_code', nullable: false, unique: true })
  studentCode: string;
  
  @Column({ name: 'identity_card', nullable: true })
  identityCard: string;
  
  @Column({ name: 'birth_date', type: 'date', nullable: true })
  birthDate: Date;
  
  @Column({ name: 'gender', type: 'enum', enum: Gender, nullable: true })
  gender: Gender;
  
  @Column({ name: 'admission_year', nullable: true })
  admissionYear: string;
  
  @Column({ name: 'curriculum_year', nullable: true })
  curriculumYear: string;
  
  @Column({ name: 'faculty_code', nullable: true })
  facultyCode: string;
  
  @Column({ name: 'training_system', type: 'enum', enum: TrainingSystem, nullable: true })
  trainingSystem: TrainingSystem;
  
  @Column({ name: 'training_level', type: 'enum', enum: TrainingLevel, nullable: true })
  trainingLevel: TrainingLevel;
  
  @Column({ name: 'user_type', type: 'enum', enum: UserType, default: UserType.SINH_VIEN })
  userType: UserType;
  
  @Column({ name: 'membership_status', type: 'enum', enum: MembershipStatus, default: MembershipStatus.ACTIVE })
  membershipStatus: MembershipStatus;
  
  // Relations
  @ManyToOne(() => Class, { nullable: true })
  @JoinColumn({ name: 'class_id' })
  class: Class;
  
  @ManyToOne(() => Department, { nullable: true })
  @JoinColumn({ name: 'department_id' })  
  department: Department;
}
```

### 4. Logic tự động tạo Organization

```typescript
class UserImportService {
  
  async processUserWithOrganization(userData: ImportUserData) {
    // 1. Tạo User trước
    const user = await this.createUser(userData);
    
    // 2. Xử lý Organization nếu có className
    if (userData.className) {
      await this.handleClassOrganization(userData.className, userData.facultyCode, user.id);
    }
    
    return user;
  }
  
  async handleClassOrganization(className: string, facultyCode: string, userId: string) {
    // Kiểm tra xem đã có Class Organization chưa
    let classOrg = await this.findClassOrganization(className);
    
    if (!classOrg) {
      // Tạo mới Class Organization
      classOrg = await this.createClassOrganization(className, facultyCode);
    }
    
    // Thêm user vào Class Organization
    await this.addUserToOrganization(classOrg.id, userId);
  }
  
  async createClassOrganization(className: string, facultyCode: string) {
    // Xác định parent organization
    const parentOrg = await this.determineParentOrganization(className, facultyCode);
    
    // Tạo Class Organization
    const classOrg = await this.organizationService.create({
      name: className,
      code: className,
      type: OrganizationType.CHI_DOAN_CHI_HOI, // Assuming this enum exists
      parentId: parentOrg?.id,
      level: 3 // Class level
    });
    
    return classOrg;
  }
  
  async determineParentOrganization(className: string, facultyCode: string) {
    // Kiểm tra prefix của className
    const internationalPrefixes = ['CC', 'CN', 'CT', 'TT'];
    const isInternational = internationalPrefixes.some(prefix => 
      className.toUpperCase().startsWith(prefix)
    );
    
    if (isInternational) {
      // Tìm "Văn phòng Đào tạo quốc tế"
      return await this.findOrganizationByName('Văn phòng Đào tạo quốc tế');
    } else {
      // Tìm theo facultyCode
      return await this.findOrganizationByFacultyCode(facultyCode);
    }
  }
}
```

### 5. Template Excel mới

```typescript
class ImportTemplateService {
  generateUserImportTemplate() {
    const headers = [
      'Mã số sinh viên',     // A - required
      'Email',               // B
      'CMND',               // C  
      'Họ',                 // D - required
      'Tên',                // E - required
      'Ngày sinh',          // F (DD/MM/YYYY)
      'GIOITINH',           // G (NAM/NU)
      'Mật khẩu',           // H
      'Điện thoại',         // I
      'Năm vào',            // J
      'Năm CTDT',           // K
      'Tên lớp',            // L
      'Mã Khoa',            // M
      'Mã đơn vị quản lý',  // N
      'Hệ đào tạo',         // O (VLVH/CQ/QT/DTTX)
      'Bậc đào tạo',        // P (DH)
      'Loại người dùng',    // Q (SINH_VIEN/GIANG_VIEN/CAN_BO)
      'Tình trạng thành viên' // R (ACTIVE/INACTIVE/GRADUATED)
    ];
    
    const sampleData = [
      [
        '2021001234',           // Mã số sinh viên
        'student@hcmut.edu.vn', // Email
        '123456789',            // CMND
        'Nguyễn',               // Họ
        'Văn A',                // Tên
        '01/01/2003',           // Ngày sinh
        'NAM',                  // Giới tính
        'password123',          // Mật khẩu
        '0901234567',           // Điện thoại
        '2021',                 // Năm vào
        '2021',                 // Năm CTDT
        'CC01',                 // Tên lớp
        'KHMT',                 // Mã Khoa
        'BK-KHMT',              // Mã đơn vị quản lý
        'CQ',                   // Hệ đào tạo
        'DH',                   // Bậc đào tạo
        'SINH_VIEN',            // Loại người dùng
        'ACTIVE'                // Tình trạng thành viên
      ]
    ];
    
    return this.excelService.createWorkbook(headers, sampleData);
  }
}
```

### 6. Validation Rules

```typescript
class UserImportValidator {
  validateUserData(rowData: any[]) {
    const errors = [];
    
    // Required fields
    if (!rowData[0]) errors.push('Mã số sinh viên là bắt buộc');
    if (!rowData[3]) errors.push('Họ là bắt buộc');
    if (!rowData[4]) errors.push('Tên là bắt buộc');
    
    // Validate enums
    if (rowData[6] && !Object.values(Gender).includes(rowData[6])) {
      errors.push('Giới tính không hợp lệ (NAM/NU)');
    }
    
    if (rowData[14] && !Object.values(TrainingSystem).includes(rowData[14])) {
      errors.push('Hệ đào tạo không hợp lệ (VLVH/CQ/QT/DTTX)');
    }
    
    if (rowData[15] && !Object.values(TrainingLevel).includes(rowData[15])) {
      errors.push('Bậc đào tạo không hợp lệ (DH)');
    }
    
    // Validate date format
    if (rowData[5] && !this.isValidDate(rowData[5])) {
      errors.push('Ngày sinh không đúng định dạng (DD/MM/YYYY)');
    }
    
    // Validate email
    if (rowData[1] && !this.isValidEmail(rowData[1])) {
      errors.push('Email không hợp lệ');
    }
    
    return errors;
  }
}
```

### 7. Luồng xử lý tổng thể

```typescript
class UserImportProcess {
  async executeImport(sessionId: string) {
    const session = await this.getSession(sessionId);
    const results = {
      importedCount: 0,
      skippedCount: 0,
      failedCount: 0,
      errors: []
    };
    
    for (const userData of session.validatedData) {
      try {
        // 1. Kiểm tra duplicate
        const existingUser = await this.findUserByStudentCode(userData.studentCode);
        if (existingUser) {
          results.skippedCount++;
          continue;
        }
        
        // 2. Resolve foreign keys
        const classEntity = userData.className ? 
          await this.findClassByName(userData.className) : null;
        const department = userData.departmentCode ? 
          await this.findDepartmentByCode(userData.departmentCode) : null;
        
        // 3. Tạo user
        const user = await this.userService.create({
          studentCode: userData.studentCode,
          email: userData.email,
          identityCard: userData.identityCard,
          firstName: userData.firstName,
          lastName: userData.lastName,
          birthDate: userData.birthDate,
          gender: userData.gender,
          password: userData.password || userData.studentCode, // Default password
          phone: userData.phone,
          admissionYear: userData.admissionYear,
          curriculumYear: userData.curriculumYear,
          facultyCode: userData.facultyCode,
          trainingSystem: userData.trainingSystem,
          trainingLevel: userData.trainingLevel,
          userType: userData.userType || UserType.SINH_VIEN,
          membershipStatus: userData.membershipStatus || MembershipStatus.ACTIVE,
          classId: classEntity?.id,
          departmentId: department?.id
        });
        
        // 4. Xử lý Organization nếu có className
        if (userData.className) {
          await this.handleClassOrganization(
            userData.className, 
            userData.facultyCode, 
            user.id
          );
        }
        
        results.importedCount++;
        
      } catch (error) {
        results.failedCount++;
        results.errors.push(`Row ${userData.rowIndex}: ${error.message}`);
      }
    }
    
    return results;
  }
}
```

### 8. API Endpoints cần cập nhật

```typescript
// users.controller.ts
@Get('template')
async downloadTemplate(@Res() res: Response) {
  const buffer = await this.importService.generateUserImportTemplate();
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename="users_import_template_v2.xlsx"');
  res.send(buffer);
}
```

### 9. Migration Script

```sql
-- Add new columns to users table
ALTER TABLE users 
ADD COLUMN student_code VARCHAR(50) UNIQUE NOT NULL DEFAULT '',
ADD COLUMN identity_card VARCHAR(20),
ADD COLUMN birth_date DATE,
ADD COLUMN gender ENUM('NAM', 'NU'),
ADD COLUMN admission_year VARCHAR(10),
ADD COLUMN curriculum_year VARCHAR(10),
ADD COLUMN faculty_code VARCHAR(20),
ADD COLUMN training_system ENUM('VLVH', 'CQ', 'QT', 'DTTX'),
ADD COLUMN training_level ENUM('DH'),
ADD COLUMN user_type ENUM('SINH_VIEN', 'GIANG_VIEN', 'CAN_BO') DEFAULT 'SINH_VIEN',
ADD COLUMN membership_status ENUM('ACTIVE', 'INACTIVE', 'GRADUATED') DEFAULT 'ACTIVE',
ADD COLUMN class_id VARCHAR(36),
ADD COLUMN department_id VARCHAR(36);

-- Add foreign key constraints
ALTER TABLE users 
ADD CONSTRAINT fk_users_class FOREIGN KEY (class_id) REFERENCES classes(id),
ADD CONSTRAINT fk_users_department FOREIGN KEY (department_id) REFERENCES departments(id);
```

### 10. Testing Plan

1. **Unit Tests:** Validate từng function riêng lẻ
2. **Integration Tests:** Test luồng import hoàn chỉnh
3. **Edge Cases:** 
   - Lớp có prefix CC, CN, CT, TT
   - Lớp không có faculty code
   - Duplicate student codes
   - Invalid enum values

Kế hoạch này sẽ thay thế hoàn toàn hệ thống import hiện tại với cấu trúc dữ liệu mới và logic tự động tạo organization dựa trên tên lớp.