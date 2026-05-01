# 📋 HỆ THỐNG QUẢN LÝ TEMPLATE - HƯỚNG DẪN ĐẦY ĐỦ

## 🎯 1. TỔNG QUAN HỆ THỐNG

### Mục đích
Module **Quản lý Template** giúp **biến các file Word tĩnh thành biểu mẫu động** mà người dùng có thể điền trực tiếp trên web.

### Quy trình
```
Admin Upload File Word → Parse Placeholder → Cấu hình Fields 
→ User Điền Form → Generate Word File → Download
```

### Tính khả thi
✅ **HOÀN TOÀN KHẢ THI** - Tương thích 95% với code hiện tại
- Backend: Chỉ cần cài 2 thư viện (docxtemplater, pizzip)
- Frontend: 100% thư viện đã có sẵn
- Thời gian ước tính: **5-7 ngày làm việc**

---

## 📊 2. CẤU TRÚC PAGES

### Admin Pages (3 pages)
1. **TemplateListPage** (`/admin/templates`) - Danh sách + Chi tiết (modal)
2. **TemplateUploadPage** (`/admin/templates/upload`) - Upload file Word
3. **TemplateConfigPage** (`/admin/templates/:id/config`) - Cấu hình fields

### User Pages (1 page với 3 tabs)
**FormsPage** (`/forms`)
- Tab 1: Forms có thể điền (FormListView)
- Tab 2: Điền form động (FormFillView)
- Tab 3: Forms đã nộp (MySubmissionsView)

---

## 🗃️ 3. DATABASE SCHEMA

### Entity 1: Template
```typescript
// backend/src/entities/template.entity.ts
import { 
  Entity, Column, PrimaryGeneratedColumn, ManyToOne, OneToMany,
  CreateDateColumn, UpdateDateColumn, JoinColumn 
} from 'typeorm';

export enum TemplateStatus {
  PROCESSING = 'processing',  // Đang parse file Word
  ACTIVE = 'active',          // Hoạt động
  INACTIVE = 'inactive',      // Tạm ngưng
  ERROR = 'error'             // Lỗi khi parse
}

@Entity('templates')
export class Template {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  name: string; // "Sơ yếu lý lịch"

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ name: 'original_file_url', type: 'varchar' })
  originalFileUrl: string; // S3 URL

  @Column({ name: 'original_file_name', type: 'varchar' })
  originalFileName: string;

  @Column({ name: 'file_size', type: 'integer', nullable: true })
  fileSize: number;

  @Column({ 
    type: 'jsonb', 
    nullable: true,
    comment: 'Auto-parsed schema from docxtemplater' 
  })
  schema: {
    fields: Array<{ fieldName: string; position: number }>;
    parsedAt: Date;
  };

  @Column({ 
    type: 'enum', 
    enum: TemplateStatus, 
    default: TemplateStatus.PROCESSING 
  })
  status: TemplateStatus;

  @Column({ name: 'error_message', type: 'text', nullable: true })
  errorMessage: string;

  @Column({ name: 'created_by', type: 'uuid' })
  createdBy: string;

  @ManyToOne(() => User, { eager: false, nullable: false })
  @JoinColumn({ name: 'created_by' })
  creator: User;

  @Column({ name: 'organization_id', type: 'uuid' })
  organizationId: string;

  @ManyToOne(() => Organization, { eager: false, nullable: false })
  @JoinColumn({ name: 'organization_id' })
  organization: Organization;

  @OneToMany(() => TemplateField, field => field.template, { cascade: true })
  fields: TemplateField[];

  @OneToMany(() => TemplateSubmission, submission => submission.template)
  submissions: TemplateSubmission[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
```

### Entity 2: TemplateField
```typescript
// backend/src/entities/template-field.entity.ts
import { 
  Entity, Column, PrimaryGeneratedColumn, ManyToOne,
  CreateDateColumn, JoinColumn, Index 
} from 'typeorm';

export enum FieldType {
  TEXT = 'text',
  TEXTAREA = 'textarea',
  DATE = 'date',
  SELECT = 'select',
  NUMBER = 'number',
  EMAIL = 'email'
}

@Entity('template_fields')
@Index(['template_id', 'position'])
export class TemplateField {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'template_id', type: 'uuid' })
  templateId: string;

  @ManyToOne(() => Template, template => template.fields, { 
    onDelete: 'CASCADE',
    nullable: false 
  })
  @JoinColumn({ name: 'template_id' })
  template: Template;

  @Column({ name: 'field_name', type: 'varchar', length: 100 })
  fieldName: string; // student_name

  @Column({ name: 'display_name', type: 'varchar', length: 255 })
  displayName: string; // "Họ và tên sinh viên"

  @Column({ 
    name: 'field_type', 
    type: 'enum', 
    enum: FieldType, 
    default: FieldType.TEXT 
  })
  fieldType: FieldType;

  @Column({ 
    name: 'validation_rules', 
    type: 'jsonb', 
    nullable: true 
  })
  validationRules: {
    required?: boolean;
    minLength?: number;
    maxLength?: number;
    pattern?: string;
    message?: string;
  };

  @Column({ name: 'options', type: 'jsonb', nullable: true })
  options: Array<{ label: string; value: string }>;

  @Column({ type: 'integer', default: 0 })
  position: number;

  @Column({ type: 'varchar', length: 255, nullable: true })
  placeholder: string;

  @Column({ name: 'help_text', type: 'text', nullable: true })
  helpText: string;

  @Column({ name: 'default_value', type: 'varchar', nullable: true })
  defaultValue: string;

  @Column({ name: 'is_visible', type: 'boolean', default: true })
  isVisible: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
```

### Entity 3: TemplateSubmission
```typescript
// backend/src/entities/template-submission.entity.ts
import { 
  Entity, Column, PrimaryGeneratedColumn, ManyToOne,
  CreateDateColumn, UpdateDateColumn, JoinColumn, Index 
} from 'typeorm';

export enum SubmissionStatus {
  DRAFT = 'draft',
  SUBMITTED = 'submitted',
  COMPLETED = 'completed',
  FAILED = 'failed'
}

@Entity('template_submissions')
@Index(['user_id', 'created_at'])
@Index(['template_id', 'status'])
export class TemplateSubmission {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'template_id', type: 'uuid' })
  templateId: string;

  @ManyToOne(() => Template, { eager: true, nullable: false })
  @JoinColumn({ name: 'template_id' })
  template: Template;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @ManyToOne(() => User, { eager: true, nullable: false })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'form_data', type: 'jsonb' })
  formData: Record<string, any>;

  @Column({ name: 'output_file_url', type: 'varchar', nullable: true })
  outputFileUrl: string;

  @Column({ name: 'output_file_name', type: 'varchar', nullable: true })
  outputFileName: string;

  @Column({ name: 'output_file_size', type: 'integer', nullable: true })
  outputFileSize: number;

  @Column({ 
    type: 'enum', 
    enum: SubmissionStatus, 
    default: SubmissionStatus.DRAFT 
  })
  status: SubmissionStatus;

  @Column({ name: 'error_message', type: 'text', nullable: true })
  errorMessage: string;

  @Column({ name: 'submitted_at', type: 'timestamp', nullable: true })
  submittedAt: Date;

  @Column({ name: 'completed_at', type: 'timestamp', nullable: true })
  completedAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
```

### Export Entities
```typescript
// backend/src/entities/all-entities.ts
export { Template, TemplateStatus } from './template.entity';
export { TemplateField, FieldType } from './template-field.entity';
export { TemplateSubmission, SubmissionStatus } from './template-submission.entity';
```

---

## 🔧 4. MIGRATION

```typescript
// backend/src/database/migrations/XXXXXX-create-template-system.ts
import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateTemplateSystem1731312000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE templates (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        name VARCHAR(255) NOT NULL,
        description TEXT,
        original_file_url VARCHAR NOT NULL,
        original_file_name VARCHAR NOT NULL,
        file_size INTEGER,
        schema JSONB,
        status VARCHAR NOT NULL DEFAULT 'processing',
        error_message TEXT,
        created_by UUID NOT NULL,
        organization_id UUID NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
        
        CONSTRAINT fk_templates_created_by 
          FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE,
        CONSTRAINT fk_templates_organization 
          FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
      );
      CREATE INDEX idx_templates_status ON templates(status);
      CREATE INDEX idx_templates_organization ON templates(organization_id);
    `);

    await queryRunner.query(`
      CREATE TABLE template_fields (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        template_id UUID NOT NULL,
        field_name VARCHAR(100) NOT NULL,
        display_name VARCHAR(255) NOT NULL,
        field_type VARCHAR NOT NULL DEFAULT 'text',
        validation_rules JSONB,
        options JSONB,
        position INTEGER DEFAULT 0,
        placeholder VARCHAR(255),
        help_text TEXT,
        default_value VARCHAR,
        is_visible BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        
        CONSTRAINT fk_template_fields_template 
          FOREIGN KEY (template_id) REFERENCES templates(id) ON DELETE CASCADE
      );
      CREATE INDEX idx_template_fields_template ON template_fields(template_id, position);
    `);

    await queryRunner.query(`
      CREATE TABLE template_submissions (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        template_id UUID NOT NULL,
        user_id UUID NOT NULL,
        form_data JSONB NOT NULL,
        output_file_url VARCHAR,
        output_file_name VARCHAR,
        output_file_size INTEGER,
        status VARCHAR NOT NULL DEFAULT 'draft',
        error_message TEXT,
        submitted_at TIMESTAMP,
        completed_at TIMESTAMP,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
        
        CONSTRAINT fk_submissions_template 
          FOREIGN KEY (template_id) REFERENCES templates(id) ON DELETE CASCADE,
        CONSTRAINT fk_submissions_user 
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );
      CREATE INDEX idx_submissions_user ON template_submissions(user_id, created_at);
      CREATE INDEX idx_submissions_template_status ON template_submissions(template_id, status);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS template_submissions CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS template_fields CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS templates CASCADE`);
  }
}
```

**Chạy migration:**
```bash
npm run typeorm migration:create src/database/migrations/CreateTemplateSystem
npm run typeorm migration:run
```

---

## 📦 5. DEPENDENCIES

### Backend - Cần cài thêm
```bash
cd backend
npm install docxtemplater@3.47.0 pizzip@3.1.6
```

### Backend - Đã có sẵn ✅
- TypeORM, class-validator, class-transformer
- @aws-sdk/client-s3 (hoặc aws-sdk)
- multer, uuid

### Frontend - Đã có sẵn 100% ✅
- react-hook-form, zod
- @tanstack/react-query
- @radix-ui/* (UI components)
- react-dropzone, lucide-react

---

## 🔑 6. AWS S3 CONFIGURATION

### Biến môi trường (.env)
```env
# AWS S3 Configuration (Long Vân Cloud)
AWS_ACCESS_KEY_ID=<your_access_key>
AWS_SECRET_ACCESS_KEY=<your_secret_key>
AWS_REGION=ap-southeast-1
AWS_S3_BUCKET=<your_bucket_name>
AWS_S3_ENDPOINT=https://s3-hcm5-r1.longvan.net
```

### S3 Setup trong Service
```typescript
// Tái sử dụng từ documents.service.ts
private s3: AWS.S3;

constructor(private configService: ConfigService) {
  this.s3 = new AWS.S3({
    accessKeyId: this.configService.get('AWS_ACCESS_KEY_ID'),
    secretAccessKey: this.configService.get('AWS_SECRET_ACCESS_KEY'),
    region: this.configService.get('AWS_REGION'),
    endpoint: this.configService.get('AWS_S3_ENDPOINT'),
    s3ForcePathStyle: true
  });
}
```

---

## 🚀 7. DOCXTEMPLATER USAGE

### Parse Template
```typescript
import Docxtemplater from 'docxtemplater';
import PizZip from 'pizzip';

async parseTemplate(fileBuffer: Buffer) {
  const zip = new PizZip(fileBuffer);
  const doc = new Docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks: true,
  });

  // Extract placeholders
  const text = doc.getFullText();
  const tags = text.match(/\{\{([^}]+)\}\}/g) || [];
  
  const fields = tags.map((tag, index) => {
    const fieldName = tag.replace(/[{}]/g, '').trim();
    return {
      fieldName,
      displayName: fieldName.replace(/_/g, ' '),
      fieldType: 'text',
      position: index
    };
  });

  return { fields };
}
```

### Generate Document
```typescript
async generateDocument(templateUrl: string, data: any): Promise<Buffer> {
  // 1. Download template from S3
  const template = await this.s3.getObject({
    Bucket: process.env.AWS_S3_BUCKET,
    Key: templateUrl
  }).promise();

  // 2. Load and fill template
  const zip = new PizZip(template.Body);
  const doc = new Docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks: true,
  });

  // 3. Replace placeholders
  doc.setData(data);
  doc.render();

  // 4. Generate output
  return doc.getZip().generate({
    type: 'nodebuffer',
    compression: 'DEFLATE'
  });
}
```

---

## 📡 8. API ENDPOINTS

### Admin APIs
```
POST   /api/templates/upload              - Upload file Word
GET    /api/templates                     - Danh sách templates
GET    /api/templates/:id                 - Chi tiết template
PUT    /api/templates/:id/configure       - Cấu hình fields
PATCH  /api/templates/:id/status          - Kích hoạt/vô hiệu hóa
DELETE /api/templates/:id                 - Xóa template
```

### User APIs
```
GET    /api/templates/:id/form            - Lấy schema form
POST   /api/submissions                   - Tạo submission (draft)
PUT    /api/submissions/:id               - Cập nhật draft
POST   /api/submissions/:id/submit        - Submit và generate Word
GET    /api/submissions/:id/download      - Download file kết quả
GET    /api/submissions/my                - Danh sách submissions của user
```

---

## 📁 9. FOLDER STRUCTURE

### Backend
```
backend/src/
├── entities/
│   ├── template.entity.ts
│   ├── template-field.entity.ts
│   ├── template-submission.entity.ts
│   └── all-entities.ts
├── templates/
│   ├── templates.module.ts
│   ├── templates.controller.ts
│   ├── templates.service.ts
│   └── dto/
│       ├── create-template.dto.ts
│       ├── update-template.dto.ts
│       ├── configure-fields.dto.ts
│       └── template-filter.dto.ts
└── database/migrations/
    └── XXXXXX-create-template-system.ts
```

### Frontend
```
frontend/src/features/
├── templates/              # ADMIN
│   ├── pages/
│   │   ├── TemplateListPage.tsx
│   │   ├── TemplateUploadPage.tsx
│   │   └── TemplateConfigPage.tsx
│   ├── components/
│   │   ├── TemplateCard.tsx
│   │   ├── TemplateDetailModal.tsx
│   │   ├── FieldConfigForm.tsx
│   │   └── TemplatePreview.tsx
│   └── hooks/
│       └── useTemplates.ts
└── forms/                  # USER
    ├── pages/
    │   └── FormsPage.tsx   # 1 page với 3 tabs
    ├── components/
    │   ├── FormListView.tsx
    │   ├── FormFillView.tsx
    │   ├── MySubmissionsView.tsx
    │   ├── DynamicFormRenderer.tsx
    │   └── FormField.tsx
    └── hooks/
        ├── useSubmissions.ts
        └── useAutoSave.ts
```

---

## ⏱️ 10. TIMELINE

| Phase | Công việc | Thời gian |
|-------|-----------|-----------|
| Setup | Cài thư viện, entities, migration | 2-3 giờ |
| Backend | Service, Controller, DTOs, APIs | 1-2 ngày |
| Frontend | Pages, Components, Hooks | 2-3 ngày |
| Testing | Unit test, Integration test | 1 ngày |
| Refinement | UI/UX polish, bug fixes | 1 ngày |
| **TOTAL** | | **5-7 ngày** |

---

## ✅ 11. CHECKLIST TRIỂN KHAI

### Phase 1: Setup (2-3 giờ)
- [ ] Cài docxtemplater, pizzip
- [ ] Tạo 3 entity files
- [ ] Update all-entities.ts
- [ ] Tạo migration
- [ ] Run migration
- [ ] Verify tables created

### Phase 2: Backend (1-2 ngày)
- [ ] Tạo module structure
- [ ] Implement TemplatesService
  - [ ] Upload & parse template
  - [ ] Configure fields
  - [ ] S3 integration
- [ ] Implement SubmissionsService
  - [ ] Create/update draft
  - [ ] Generate Word document
- [ ] Tạo DTOs với validation
- [ ] Implement Controllers
- [ ] Test APIs với Postman

### Phase 3: Frontend (2-3 ngày)
- [ ] Admin - TemplateListPage
- [ ] Admin - TemplateUploadPage
- [ ] Admin - TemplateConfigPage
- [ ] User - FormsPage với tabs
- [ ] DynamicFormRenderer
- [ ] Auto-save functionality
- [ ] File download handling

### Phase 4: Testing & Polish (2 ngày)
- [ ] Unit tests
- [ ] Integration tests
- [ ] Manual testing full flow
- [ ] UI/UX improvements
- [ ] Error handling
- [ ] Loading states
- [ ] Toast notifications

---

## 🎯 12. GHI CHÚ QUAN TRỌNG

### Placeholder Format
- ✅ **Hỗ trợ:** `{{field_name}}`
- ❌ **Không hỗ trợ:** `_____`, `[_____]`, `.......`

### File Word Requirements
- Format: `.docx` (không hỗ trợ .doc)
- Placeholder phải viết đúng format `{{field_name}}`
- Không chứa macro hoặc virus

### Compatibility
- Entity design 100% tương thích với pattern hiện tại
- Tái sử dụng S3 logic từ documents.service
- Follow naming convention: snake_case cho columns
- Indexes đã được optimize cho performance

### Security
- AWS credentials trong .env (đã gitignore)
- File upload validation (size, type)
- Permission-based access control
- S3 presigned URLs cho download

---

## 📞 13. SUPPORT

Nếu gặp vấn đề, kiểm tra:
1. Dependencies đã cài đủ chưa
2. Migration đã chạy thành công chưa
3. AWS S3 credentials đúng chưa
4. File Word có placeholder đúng format không

**HỆ THỐNG SẴN SÀNG TRIỂN KHAI!** 🚀
