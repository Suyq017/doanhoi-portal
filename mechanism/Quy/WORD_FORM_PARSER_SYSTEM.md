## 🧩 CHỨC NĂNG: QUẢN LÝ TEMPLATE

### 1. **Mục đích và Vai trò**

Module **Quản lý Template** là trung tâm của hệ thống, giúp **biến các file Word tĩnh thành biểu mẫu động** mà người dùng có thể điền trực tiếp trên web.

Hệ thống hoạt động theo quy trình:
**Admin upload file Word → Hệ thống xử lý & parse → Admin cấu hình field → Sinh form mẫu → Người dùng điền → Hệ thống xuất file Word hoàn chỉnh.**

---

### 2. **Lưu trữ và Xử lý File Word Gốc**

#### **Lưu file Word gốc để làm gì?**

File Word gốc được xem là **mẫu chuẩn (template master)**, chứa bố cục, định dạng, và các placeholder (`{{field_name}}`, `_____`, `[_____]`, `.......`) mà hệ thống sẽ nhận diện.

Việc lưu file gốc giúp:

1. **Giữ nguyên cấu trúc tài liệu gốc** khi sinh file kết quả (đảm bảo layout, logo, header/footer, bảng biểu, v.v.).
2. **Tái sử dụng template** cho nhiều lượt tạo form hoặc nhiều người dùng khác nhau.
3. **Hỗ trợ re-parse lại** khi cần cập nhật placeholder hoặc thay đổi cấu hình.
4. **Đảm bảo khả năng audit và bảo trì lâu dài**, không phụ thuộc vào bản form đã sinh.

#### **Quy trình hệ thống xử lý file Word:**

1. **Upload**: Admin tải file Word (.docx) lên hệ thống.

2. **Validation**: Hệ thống kiểm tra định dạng, kích thước, tính bảo mật (virus/macro).

3. **Parsing với Docxtemplater**:
   - Sử dụng thư viện **docxtemplater** (https://docxtemplater.com/) để xử lý file .docx
   - **Cách hoạt động:**
     ```javascript
     // 1. Load file Word từ S3 hoặc upload
     const content = await s3.getObject({Bucket, Key}).promise();
     
     // 2. Unzip file .docx (docx là file zip)
     const zip = new PizZip(content.Body);
     
     // 3. Load vào docxtemplater
     const doc = new Docxtemplater(zip, {
       paragraphLoop: true,
       linebreaks: true,
     });
     
     // 4. Lấy danh sách tất cả placeholder
     const tags = doc.getFullText().match(/\{\{([^}]+)\}\}/g);
     // Kết quả: ['{{student_name}}', '{{birth_date}}', '{{class_id}}']
     
     // 5. Parse và tạo schema
     const fields = tags.map(tag => {
       const fieldName = tag.replace(/[{}]/g, ''); // Bỏ {{ }}
       return {
         fieldName: fieldName,
         displayName: fieldName.replace(/_/g, ' '), // student_name -> student name
         fieldType: 'text', // Default type
         required: false,
         position: doc.getFullText().indexOf(tag)
       };
     });
     ```
   - **Format hỗ trợ:** Chỉ nhận diện placeholder `{{field_name}}`
   - **Lưu ý:** Các format khác như `_____`, `[_____]`, `.......` chưa được hỗ trợ tự động vì độ phức tạp trong việc nhận diện chính xác.

4. **Sinh Schema Form (tự động):**
   - Tạo cấu trúc JSON cơ bản chứa danh sách field được tìm thấy.
   - Mỗi field sẽ có:
     - Tên field (từ `{{field_name}}`)
     - Loại input mặc định (text)
     - Vị trí trong document gốc
   - **Giải pháp:** Admin phải cấu hình thủ công sau khi parse để:
     - Đặt lại tên hiển thị cho field
     - Chọn loại input phù hợp (text, date, select, number...)
     - Thêm validation rule (required, format, length...)
     - Thêm options cho select/radio (nếu cần)

5. **Sinh giao diện form động (auto UI)** để admin kiểm tra, hiệu chỉnh, và hoàn thiện cấu hình.

---

### 3. **Cấu hình Field (Field Configuration)**

Sau khi file Word được parse, hệ thống tự động sinh danh sách các trường dữ liệu (fields) từ placeholder. Admin có thể **chỉnh sửa hoặc mở rộng cấu hình** để đảm bảo form hiển thị chính xác.

#### **Thuộc tính chính:**

- Tên field kỹ thuật (vd: `student_name`) và tên hiển thị (`Họ và tên sinh viên`).
- Loại input (text, textarea, date, select, checkbox, number...).
- Tùy chọn (options) cho select hoặc radio.
- Validation rule (bắt buộc, định dạng, giới hạn ký tự...).
- Vị trí mapping trong document Word gốc.

---

### 4. **Sinh Form Mẫu và Điền Dữ Liệu**

#### **Sinh form mẫu (auto-generate UI):**

- Hệ thống render form động dựa trên schema đã sinh ra.
- Giao diện bao gồm các component tương ứng (input, date picker, select...).
- Admin có thể kiểm tra preview trước khi public.

#### **Người dùng điền dữ liệu:**

- Truy cập form đã được kích hoạt.
- Hệ thống hỗ trợ kiểm tra dữ liệu theo thời gian thực (real-time validation).
- Người dùng có thể lưu nháp hoặc hoàn thiện form.

---

### 5. **Sinh và Xuất File Word Hoàn Chỉnh với Docxtemplater**

Sau khi người dùng điền xong form:

1. **Load template từ S3:**
   ```javascript
   const templateContent = await s3.getObject({
     Bucket: AWS_S3_BUCKET,
     Key: template.originalFileUrl
   }).promise();
   ```

2. **Thay thế placeholder bằng dữ liệu thực:**
   ```javascript
   const zip = new PizZip(templateContent.Body);
   const doc = new Docxtemplater(zip, {
     paragraphLoop: true,
     linebreaks: true,
   });
   
   // Set data cho các placeholder
   doc.setData({
     student_name: 'Nguyễn Văn A',
     birth_date: '01/01/2000',
     class_id: 'CNPM01',
     // ... các field khác từ formData
   });
   
   // Render document
   doc.render();
   ```

3. **Generate file Word mới:**
   ```javascript
   const outputBuffer = doc.getZip().generate({
     type: 'nodebuffer',
     compression: 'DEFLATE'
   });
   ```

4. **Upload lên S3 và trả về URL:**
   ```javascript
   const outputKey = `outputs/${submissionId}/${Date.now()}.docx`;
   await s3.putObject({
     Bucket: AWS_S3_BUCKET,
     Key: outputKey,
     Body: outputBuffer,
     ContentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
   }).promise();
   
   const downloadUrl = `${AWS_S3_ENDPOINT}/${AWS_S3_BUCKET}/${outputKey}`;
   ```

#### **Lưu dữ liệu form:**

- Toàn bộ dữ liệu điền được lưu dạng JSON trong database (PostgreSQL).
- File Word gốc (template) được lưu trên S3.
- File Word kết quả (output) được lưu trên S3 với lifecycle policy (tự động xóa sau 30-90 ngày hoặc tùy cấu hình).
- Cho phép tái sinh lại file Word từ JSON data + template gốc nếu cần.

---

### 6. **Cấu hình AWS S3 (Long Vân Cloud)**

Hệ thống sử dụng **Long Vân S3-compatible storage** để lưu trữ file:

#### **Biến môi trường cần thiết:**

```env
# AWS S3 Configuration (Long Vân Cloud)
# Cấu hình trong file .env của backend
AWS_ACCESS_KEY_ID=<your_access_key>
AWS_SECRET_ACCESS_KEY=<your_secret_key>
AWS_REGION=ap-southeast-1
AWS_S3_BUCKET=<your_bucket_name>
AWS_S3_ENDPOINT=https://s3-hcm5-r1.longvan.net
```

#### **Cách hoạt động:**

1. **Upload Template:**
   - Admin upload file Word (.docx)
   - File được validate và upload lên S3 bucket
   - Lưu URL của file trong database

2. **Generate Output:**
   - Hệ thống tải template từ S3
   - Xử lý và thay thế placeholder
   - Upload file kết quả lên S3
   - Trả về URL cho người dùng tải về

3. **Fallback to Local Storage:**
   - Nếu S3 không khả dụng, hệ thống tự động fallback sang lưu trữ local
   - File được lưu trong thư mục `uploads/templates/` và `uploads/outputs/`

#### **Ưu điểm của S3:**

- ✅ Lưu trữ không giới hạn
- ✅ Tốc độ truy cập nhanh
- ✅ Bảo mật cao với access control
- ✅ Backup tự động
- ✅ Có thể cấu hình lifecycle policy (tự động xóa file cũ)
- ✅ Public URL cho việc download

---

### 7. **Tóm tắt Flow Xử Lý**

```
Admin Upload File Word (.docx)
        ↓
[Validation] Kiểm tra format, size, bảo mật
        ↓
[S3 Upload] Lưu template gốc lên Long Vân S3
        ↓
[Parsing] Tìm placeholder {{field_name}} bằng docxtemplater
        ↓
[Auto Schema] Sinh schema JSON cơ bản từ placeholder
        ↓
[Admin Config] Admin cấu hình thủ công:
               - Tên hiển thị field
               - Loại input (text/date/select...)
               - Validation rules
               - Options (nếu cần)
        ↓
[Generate Form UI] Sinh giao diện form động
        ↓
[User Preview] Admin kiểm tra form trước khi public
        ↓
[Activate] Kích hoạt template cho người dùng
        ↓
[User Fill] Người dùng truy cập và điền form
        ↓
[Real-time Validation] Kiểm tra dữ liệu khi nhập
        ↓
[Save Draft] Tự động lưu JSON data vào database
        ↓
[Submit] Người dùng hoàn thiện và submit
        ↓
[Generate Word] 
  1. Load template từ S3
  2. Replace {{field_name}} với data thực
  3. Maintain format gốc
        ↓
[S3 Upload Output] Upload file kết quả lên S3
        ↓
[Return URL] Cung cấp link download cho user
        ↓
[User Download] Người dùng tải file Word hoàn chỉnh
```

---

### 8. **Cấu trúc Database (TypeORM Entities)**

#### **⚠️ VẤN ĐỀ CẦN CHỈNH SỬA:**

Sau khi phân tích code hiện tại, tôi phát hiện một số vấn đề:

1. **❌ Thiếu decorator `@JoinColumn`:** Cần thêm cho tất cả `@ManyToOne` relations
2. **❌ Không consistent với naming convention:** Dự án dùng snake_case cho column names
3. **❌ Thiếu nullable và default values:** Cần rõ ràng hơn
4. **❌ Relations chưa tối ưu:** Cần lazy loading cho performance
5. **✅ Dependencies đã có:** TypeORM, class-validator, class-transformer đã được cài sẵn
6. **❌ THIẾU:** docxtemplater, pizzip chưa được cài (cần cài thêm)

#### **Entity: Template (Đã sửa)**
```typescript
// backend/src/entities/template.entity.ts
import { 
  Entity, 
  Column, 
  PrimaryGeneratedColumn, 
  ManyToOne, 
  OneToMany, 
  CreateDateColumn, 
  UpdateDateColumn,
  JoinColumn 
} from 'typeorm';
import { User } from './user.entity';
import { Organization } from './organization.entity';
import { TemplateField } from './template-field.entity';
import { TemplateSubmission } from './template-submission.entity';

export enum TemplateStatus {
  PROCESSING = 'processing',  // Đang parse file Word
  ACTIVE = 'active',          // Hoạt động, user có thể dùng
  INACTIVE = 'inactive',      // Tạm ngưng
  ERROR = 'error'             // Lỗi khi parse
}

@Entity('templates')
export class Template {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  name: string; // "Sơ yếu lý lịch", "Đơn xin thực tập"

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ name: 'original_file_url', type: 'varchar' })
  originalFileUrl: string; // URL trên S3: templates/abc-xyz.docx

  @Column({ name: 'original_file_name', type: 'varchar' })
  originalFileName: string; // Tên file gốc: so_yeu_ly_lich.docx

  @Column({ name: 'file_size', type: 'integer', nullable: true })
  fileSize: number; // Kích thước file (bytes)

  @Column({ type: 'jsonb', nullable: true, comment: 'Auto-parsed schema from docxtemplater' })
  schema: {
    fields: Array<{
      fieldName: string;
      position: number;
    }>;
    parsedAt: Date;
  };

  @Column({ 
    type: 'enum', 
    enum: TemplateStatus, 
    default: TemplateStatus.PROCESSING 
  })
  status: TemplateStatus;

  @Column({ name: 'error_message', type: 'text', nullable: true })
  errorMessage: string; // Lưu lỗi nếu parse fail

  // Relations
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

#### **Entity: TemplateField (Đã sửa)**
```typescript
// backend/src/entities/template-field.entity.ts
import { 
  Entity, 
  Column, 
  PrimaryGeneratedColumn, 
  ManyToOne, 
  CreateDateColumn,
  JoinColumn,
  Index 
} from 'typeorm';
import { Template } from './template.entity';

export enum FieldType {
  TEXT = 'text',
  TEXTAREA = 'textarea',
  DATE = 'date',
  SELECT = 'select',
  CHECKBOX = 'checkbox',
  RADIO = 'radio',
  NUMBER = 'number',
  EMAIL = 'email'
}

@Entity('template_fields')
@Index(['template_id', 'position']) // Index cho sort nhanh
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
  fieldName: string; // student_name (từ {{student_name}})

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
    nullable: true,
    comment: 'Validation rules: {required, minLength, maxLength, pattern, min, max}'
  })
  validationRules: {
    required?: boolean;
    minLength?: number;
    maxLength?: number;
    pattern?: string; // Regex pattern
    min?: number;     // For number fields
    max?: number;     // For number fields
    message?: string; // Custom error message
  };

  @Column({ 
    name: 'options', 
    type: 'jsonb', 
    nullable: true,
    comment: 'Options for select/radio: [{label, value}]'
  })
  options: Array<{
    label: string;
    value: string;
  }>;

  @Column({ type: 'integer', default: 0 })
  position: number; // Thứ tự hiển thị trong form (0, 1, 2...)

  @Column({ type: 'varchar', length: 255, nullable: true })
  placeholder: string; // Placeholder text cho input

  @Column({ name: 'help_text', type: 'text', nullable: true })
  helpText: string; // Text hướng dẫn dưới field

  @Column({ name: 'default_value', type: 'varchar', nullable: true })
  defaultValue: string; // Giá trị mặc định

  @Column({ name: 'is_visible', type: 'boolean', default: true })
  isVisible: boolean; // Có hiển thị field này không (cho conditional fields sau này)

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
```

#### **Entity: TemplateSubmission (Đã sửa)**
```typescript
// backend/src/entities/template-submission.entity.ts
import { 
  Entity, 
  Column, 
  PrimaryGeneratedColumn, 
  ManyToOne, 
  CreateDateColumn, 
  UpdateDateColumn,
  JoinColumn,
  Index 
} from 'typeorm';
import { Template } from './template.entity';
import { User } from './user.entity';

export enum SubmissionStatus {
  DRAFT = 'draft',           // Đang lưu nháp
  SUBMITTED = 'submitted',   // Đã nộp, đang generate
  COMPLETED = 'completed',   // Đã hoàn thành, có file
  FAILED = 'failed'          // Lỗi khi generate
}

@Entity('template_submissions')
@Index(['user_id', 'created_at']) // Index cho query submissions của user
@Index(['template_id', 'status'])  // Index cho query submissions theo template
export class TemplateSubmission {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'template_id', type: 'uuid' })
  templateId: string;

  @ManyToOne(() => Template, template => template.submissions, { 
    eager: true,
    nullable: false 
  })
  @JoinColumn({ name: 'template_id' })
  template: Template;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @ManyToOne(() => User, { 
    eager: true,
    nullable: false 
  })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ 
    name: 'form_data', 
    type: 'jsonb',
    comment: 'User input data: {student_name: "Nguyễn Văn A", birth_date: "2000-01-01", ...}'
  })
  formData: Record<string, any>;

  @Column({ name: 'output_file_url', type: 'varchar', nullable: true })
  outputFileUrl: string; // URL file Word kết quả trên S3

  @Column({ name: 'output_file_name', type: 'varchar', nullable: true })
  outputFileName: string; // Tên file kết quả: so_yeu_ly_lich_nguyen_van_a.docx

  @Column({ name: 'output_file_size', type: 'integer', nullable: true })
  outputFileSize: number; // Kích thước file output (bytes)

  @Column({ 
    type: 'enum', 
    enum: SubmissionStatus, 
    default: SubmissionStatus.DRAFT 
  })
  status: SubmissionStatus;

  @Column({ name: 'error_message', type: 'text', nullable: true })
  errorMessage: string; // Lưu lỗi nếu generate fail

  @Column({ name: 'submitted_at', type: 'timestamp', nullable: true })
  submittedAt: Date; // Thời gian submit (chuyển từ draft -> submitted)

  @Column({ name: 'completed_at', type: 'timestamp', nullable: true })
  completedAt: Date; // Thời gian hoàn thành generate

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
```

#### **Export trong all-entities.ts**
```typescript
// backend/src/entities/all-entities.ts
// Thêm vào file này:

export { Template, TemplateStatus } from './template.entity';
export { TemplateField, FieldType } from './template-field.entity';
export { TemplateSubmission, SubmissionStatus } from './template-submission.entity';
```

#### **Migration Script (Đã sửa - Tương thích với pattern hiện tại)**
```typescript
// backend/src/database/migrations/XXXXXX-create-template-system.ts
import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateTemplateSystem1234567890123 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Tạo bảng templates
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
          FOREIGN KEY (created_by) 
          REFERENCES users(id) 
          ON DELETE CASCADE,
          
        CONSTRAINT fk_templates_organization 
          FOREIGN KEY (organization_id) 
          REFERENCES organizations(id) 
          ON DELETE CASCADE
      );
      
      CREATE INDEX idx_templates_status ON templates(status);
      CREATE INDEX idx_templates_organization ON templates(organization_id);
    `);

    // 2. Tạo bảng template_fields
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
          FOREIGN KEY (template_id) 
          REFERENCES templates(id) 
          ON DELETE CASCADE
      );
      
      CREATE INDEX idx_template_fields_template ON template_fields(template_id, position);
    `);

    // 3. Tạo bảng template_submissions
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
          FOREIGN KEY (template_id) 
          REFERENCES templates(id) 
          ON DELETE CASCADE,
          
        CONSTRAINT fk_submissions_user 
          FOREIGN KEY (user_id) 
          REFERENCES users(id) 
          ON DELETE CASCADE
      );
      
      CREATE INDEX idx_submissions_user ON template_submissions(user_id, created_at);
      CREATE INDEX idx_submissions_template_status ON template_submissions(template_id, status);
    `);

    console.log('✅ Template system tables created successfully');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS template_submissions CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS template_fields CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS templates CASCADE`);
    
    console.log('✅ Template system tables dropped successfully');
  }
}
```

#### **Chạy Migration:**
```bash
# Tạo migration file mới
npm run typeorm migration:create src/database/migrations/CreateTemplateSystem

# Hoặc tạo file migration thủ công với tên:
# backend/src/database/migrations/1731312000000-create-template-system.ts

# Run migration
npm run typeorm migration:run

# Rollback nếu cần
npm run typeorm migration:revert
```

---

### 9. **API Endpoints Cần Thiết**

#### **Template Management (Admin)**
- `POST /api/templates/upload` - Upload file Word template
- `GET /api/templates` - Danh sách templates
- `GET /api/templates/:id` - Chi tiết template
- `PUT /api/templates/:id/configure` - Cấu hình fields
- `PATCH /api/templates/:id/status` - Kích hoạt/vô hiệu hóa
- `DELETE /api/templates/:id` - Xóa template

#### **Form Filling (User)**
- `GET /api/templates/:id/form` - Lấy schema form để render
- `POST /api/submissions` - Tạo submission mới (draft)
- `PUT /api/submissions/:id` - Cập nhật draft
- `POST /api/submissions/:id/submit` - Submit và generate Word
- `GET /api/submissions/:id/download` - Download file kết quả

#### **File Management**
- `GET /api/files/:id` - Download file từ S3

---

### 10. **Thư Viện và Dependencies**

#### **Backend (NestJS)**
```json
{
  "docxtemplater": "^3.47.0",    // Parse và generate Word
  "pizzip": "^3.1.6",            // Zip/unzip docx files
  "aws-sdk": "^2.1691.0",        // AWS S3 client
  "file-type": "^16.5.4",        // Detect file type
  "class-validator": "^0.14.0",  // Validation
  "class-transformer": "^0.5.1"  // DTO transformation
}
```

**Cài đặt:**
```bash
cd backend
npm install docxtemplater pizzip aws-sdk file-type
```

**Import và sử dụng:**
```typescript
// backend/src/templates/templates.service.ts
import Docxtemplater from 'docxtemplater';
import PizZip from 'pizzip';
import * as AWS from 'aws-sdk';

@Injectable()
export class TemplatesService {
  private s3: AWS.S3;

  constructor() {
    this.s3 = new AWS.S3({
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      region: process.env.AWS_REGION,
      endpoint: process.env.AWS_S3_ENDPOINT,
      s3ForcePathStyle: true
    });
  }

  async parseTemplate(fileBuffer: Buffer): Promise<{fields: any[]}> {
    const zip = new PizZip(fileBuffer);
    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
    });

    // Extract all tags/placeholders
    const text = doc.getFullText();
    const tags = text.match(/\{\{([^}]+)\}\}/g) || [];
    
    const fields = tags.map((tag, index) => {
      const fieldName = tag.replace(/[{}]/g, '').trim();
      return {
        fieldName,
        displayName: fieldName.replace(/_/g, ' '),
        fieldType: 'text',
        position: index,
        required: false
      };
    });

    return { fields };
  }

  async generateDocument(templateUrl: string, data: any): Promise<Buffer> {
    // Download template from S3
    const template = await this.s3.getObject({
      Bucket: process.env.AWS_S3_BUCKET,
      Key: templateUrl
    }).promise();

    // Load and fill template
    const zip = new PizZip(template.Body);
    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
    });

    doc.setData(data);
    doc.render();

    return doc.getZip().generate({
      type: 'nodebuffer',
      compression: 'DEFLATE'
    });
  }
}
```

#### **Frontend (React)**
```json
{
  "react-hook-form": "^7.52.0",       // Form management
  "zod": "^3.23.0",                   // Validation schema (thay vì yup)
  "@tanstack/react-query": "^5.51.0", // Data fetching
  "date-fns": "^3.6.0",               // Date handling
  "react-datepicker": "^7.3.0",       // Date picker component
  "lucide-react": "^0.424.0",         // Icons
  "@radix-ui/react-select": "^2.1.1", // Select component
  "sonner": "^1.5.0"                  // Toast notifications
}
```

**Cài đặt:**
```bash
cd frontend
npm install react-hook-form zod @tanstack/react-query date-fns react-datepicker lucide-react sonner
npm install @radix-ui/react-select @radix-ui/react-dialog @radix-ui/react-label
```

---

### 11. **Frontend - Chi tiết Pages và Components**

#### **1. Page: Admin - Template Management (`/admin/templates`)**

**Tổng cộng: 3 pages thực tế**

**Chức năng:**
- Hiển thị danh sách templates (cards)
- Click vào card → Mở modal/side panel xem chi tiết (không phải trang riêng)
- Upload template Word mới
- Cấu hình fields cho template
- Kích hoạt/vô hiệu hóa template
- Xóa template

**Components:**
```
frontend/src/features/templates/
├── pages/
│   ├── TemplateListPage.tsx          // Danh sách + Chi tiết (modal)
│   ├── TemplateUploadPage.tsx        // Upload template mới
│   └── TemplateConfigPage.tsx        // Cấu hình fields
├── components/
│   ├── TemplateCard.tsx              // Card hiển thị template
│   ├── TemplateDetailModal.tsx       // Modal chi tiết (không phải page riêng)
│   ├── TemplateUploadForm.tsx        // Form upload file
│   ├── FieldConfigForm.tsx           // Form cấu hình từng field
│   ├── FieldTypeSelector.tsx         // Chọn loại input
│   ├── ValidationRuleBuilder.tsx     // Tạo validation rules
│   └── TemplatePreview.tsx           // Preview form
└── hooks/
    ├── useTemplates.ts               // React Query hooks
    ├── useTemplateUpload.ts
    └── useTemplateConfig.ts
```

**Chi tiết implementation:**

**TemplateListPage.tsx:**
```typescript
// frontend/src/features/templates/pages/TemplateListPage.tsx
import { useTemplates } from '../hooks/useTemplates';
import { TemplateCard } from '../components/TemplateCard';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { Link } from 'react-router-dom';

export function TemplateListPage() {
  const { data: templates, isLoading } = useTemplates();

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Quản lý Template</h1>
        <Link to="/admin/templates/upload">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Tạo Template Mới
          </Button>
        </Link>
      </div>

      {isLoading ? (
        <div>Đang tải...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates?.map(template => (
            <TemplateCard key={template.id} template={template} />
          ))}
        </div>
      )}
    </div>
  );
}
```

**TemplateUploadPage.tsx:**
```typescript
// frontend/src/features/templates/pages/TemplateUploadPage.tsx
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTemplateUpload } from '../hooks/useTemplateUpload';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

const schema = z.object({
  name: z.string().min(3, 'Tên phải có ít nhất 3 ký tự'),
  description: z.string().optional(),
  file: z.instanceof(FileList).refine(files => files.length > 0, 'Vui lòng chọn file')
});

export function TemplateUploadPage() {
  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(schema)
  });
  const uploadMutation = useTemplateUpload();

  const onSubmit = async (data: any) => {
    const formData = new FormData();
    formData.append('name', data.name);
    formData.append('description', data.description || '');
    formData.append('file', data.file[0]);

    uploadMutation.mutate(formData, {
      onSuccess: () => {
        toast.success('Upload template thành công!');
      },
      onError: (error: any) => {
        toast.error(error.message || 'Có lỗi xảy ra');
      }
    });
  };

  return (
    <div className="container mx-auto p-6 max-w-2xl">
      <h1 className="text-3xl font-bold mb-6">Upload Template Mới</h1>
      
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="block mb-2 font-medium">Tên Template</label>
          <Input {...register('name')} placeholder="VD: Sơ yếu lý lịch" />
          {errors.name && <p className="text-red-500 text-sm">{errors.name.message}</p>}
        </div>

        <div>
          <label className="block mb-2 font-medium">Mô tả</label>
          <Textarea {...register('description')} rows={3} />
        </div>

        <div>
          <label className="block mb-2 font-medium">File Word Template</label>
          <Input type="file" accept=".docx" {...register('file')} />
          {errors.file && <p className="text-red-500 text-sm">{errors.file.message}</p>}
          <p className="text-sm text-gray-500 mt-1">
            * File phải có placeholder theo format: {`{{field_name}}`}
          </p>
        </div>

        <Button type="submit" disabled={uploadMutation.isPending}>
          {uploadMutation.isPending ? 'Đang upload...' : 'Upload và Parse'}
        </Button>
      </form>
    </div>
  );
}
```

**TemplateConfigPage.tsx:**
```typescript
// frontend/src/features/templates/pages/TemplateConfigPage.tsx
import { useParams } from 'react-router-dom';
import { useTemplate, useUpdateField } from '../hooks/useTemplates';
import { FieldConfigForm } from '../components/FieldConfigForm';

export function TemplateConfigPage() {
  const { id } = useParams();
  const { data: template, isLoading } = useTemplate(id);
  const updateFieldMutation = useUpdateField();

  const handleFieldUpdate = (fieldId: string, data: any) => {
    updateFieldMutation.mutate({ templateId: id, fieldId, data });
  };

  if (isLoading) return <div>Đang tải...</div>;

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Cấu hình Fields: {template?.name}</h1>
      
      <div className="space-y-4">
        {template?.fields?.map(field => (
          <FieldConfigForm
            key={field.id}
            field={field}
            onSave={(data) => handleFieldUpdate(field.id, data)}
          />
        ))}
      </div>
    </div>
  );
}
```

**FieldConfigForm.tsx:**
```typescript
// frontend/src/features/templates/components/FieldConfigForm.tsx
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';

const fieldTypes = [
  { value: 'text', label: 'Text' },
  { value: 'textarea', label: 'Text Area' },
  { value: 'date', label: 'Date' },
  { value: 'select', label: 'Select' },
  { value: 'number', label: 'Number' },
  { value: 'email', label: 'Email' }
];

export function FieldConfigForm({ field, onSave }) {
  const { register, handleSubmit, watch } = useForm({
    defaultValues: field
  });

  const fieldType = watch('fieldType');

  return (
    <div className="border p-4 rounded-lg">
      <form onSubmit={handleSubmit(onSave)} className="space-y-3">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium">Field Name (Technical)</label>
            <Input {...register('fieldName')} disabled className="bg-gray-100" />
          </div>
          
          <div>
            <label className="text-sm font-medium">Display Name</label>
            <Input {...register('displayName')} placeholder="Họ và tên" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium">Field Type</label>
            <select {...register('fieldType')} className="w-full border rounded px-3 py-2">
              {fieldTypes.map(type => (
                <option key={type.value} value={type.value}>{type.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm font-medium">Position</label>
            <Input type="number" {...register('position')} />
          </div>
        </div>

        <div>
          <label className="text-sm font-medium">Placeholder</label>
          <Input {...register('placeholder')} placeholder="Nhập họ và tên..." />
        </div>

        <div>
          <label className="text-sm font-medium">Help Text</label>
          <Input {...register('helpText')} placeholder="Hướng dẫn điền..." />
        </div>

        <div className="flex items-center space-x-2">
          <Checkbox {...register('validationRules.required')} />
          <label className="text-sm">Required (bắt buộc)</label>
        </div>

        {fieldType === 'select' && (
          <div>
            <label className="text-sm font-medium">Options (JSON)</label>
            <textarea 
              {...register('options')} 
              className="w-full border rounded p-2"
              rows={3}
              placeholder='[{"label": "Nam", "value": "male"}, {"label": "Nữ", "value": "female"}]'
            />
          </div>
        )}

        <Button type="submit" size="sm">Lưu cấu hình</Button>
      </form>
    </div>
  );
}
```

#### **2. Page: User - Forms Management (`/forms`)**

**Tổng cộng: 1 page duy nhất với 3 tabs**

**Chức năng:**
- Tab 1: Xem danh sách forms có thể điền
- Tab 2: Điền form động với real-time validation
- Tab 3: Xem forms đã nộp và download lại
- Auto-save draft
- Submit và generate Word file
- Download file kết quả

**Components:**
```
frontend/src/features/forms/
├── pages/
│   └── FormsPage.tsx                 // 1 PAGE duy nhất với 3 tabs
├── components/
│   ├── FormListView.tsx              // Tab 1: Danh sách forms
│   ├── FormFillView.tsx              // Tab 2: Điền form
│   ├── MySubmissionsView.tsx         // Tab 3: Forms đã nộp
│   ├── DynamicFormRenderer.tsx       // Render form động
│   ├── FormField.tsx                 // Component cho từng field
│   ├── DateField.tsx                 // Date picker field
│   ├── SelectField.tsx               // Select field
│   └── SubmissionCard.tsx            // Card submission
└── hooks/
    ├── useForms.ts
    ├── useSubmission.ts
    └── useAutoSave.ts
```

**FormsPage.tsx (1 page với tabs):**
```typescript
// frontend/src/features/forms/pages/FormsPage.tsx
import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FormListView } from '../components/FormListView';
import { FormFillView } from '../components/FormFillView';
import { MySubmissionsView } from '../components/MySubmissionsView';

export function FormsPage() {
  const [activeTab, setActiveTab] = useState('available');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);

  const handleSelectTemplate = (templateId: string) => {
    setSelectedTemplateId(templateId);
    setActiveTab('fill');
  };

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Quản lý Forms</h1>
      
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="available">Forms có thể điền</TabsTrigger>
          <TabsTrigger value="submissions">Forms đã nộp</TabsTrigger>
        </TabsList>
        
        <TabsContent value="available">
          <FormListView onSelectTemplate={handleSelectTemplate} />
        </TabsContent>
        
        <TabsContent value="fill">
          {selectedTemplateId && (
            <FormFillView 
              templateId={selectedTemplateId} 
              onBack={() => setActiveTab('available')}
            />
          )}
        </TabsContent>
        
        <TabsContent value="submissions">
          <MySubmissionsView />
        </TabsContent>
      </Tabs>
    </div>
  );
}
```

**FormFillView.tsx (Component trong tab):**
**FormFillView.tsx (Component trong tab):**
```typescript
// frontend/src/features/forms/components/FormFillView.tsx
import { useTemplate } from '@/features/templates/hooks/useTemplates';
import { useSubmission, useCreateSubmission } from '../hooks/useSubmission';
import { DynamicFormRenderer } from './DynamicFormRenderer';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Download } from 'lucide-react';

interface Props {
  templateId: string;
  onBack: () => void;
}

export function FormFillView({ templateId, onBack }: Props) {
  const { data: template } = useTemplate(templateId);
  const { data: submission } = useSubmission(templateId);
  const createMutation = useCreateSubmission();

  const handleSubmit = async (data: any) => {
    createMutation.mutate({
      templateId,
      formData: data
    }, {
      onSuccess: (result) => {
        // Auto download hoặc chuyển sang tab submissions
        window.location.href = result.outputFileUrl;
      }
    });
  };

  return (
    <div>
      <Button variant="ghost" onClick={onBack} className="mb-4">
        <ArrowLeft className="mr-2 h-4 w-4" />
        Quay lại danh sách
      </Button>

      <h2 className="text-2xl font-bold mb-2">{template?.name}</h2>
      <p className="text-gray-600 mb-6">{template?.description}</p>

      <DynamicFormRenderer
        fields={template?.fields || []}
        initialData={submission?.formData || {}}
        onSubmit={handleSubmit}
        isSubmitting={createMutation.isPending}
      />
    </div>
  );
}
```

**DynamicFormRenderer.tsx:**
```typescript
// frontend/src/features/forms/components/DynamicFormRenderer.tsx
import { useForm } from 'react-hook-form';
import { FormField } from './FormField';
import { Button } from '@/components/ui/button';
import { useAutoSave } from '../hooks/useAutoSave';

export function DynamicFormRenderer({ fields, initialData, onSubmit, isSubmitting }) {
  const { register, handleSubmit, watch, formState: { errors } } = useForm({
    defaultValues: initialData
  });

  const formData = watch();
  useAutoSave(formData); // Auto-save every 30s

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {fields
        .sort((a, b) => a.position - b.position)
        .map(field => (
          <FormField
            key={field.id}
            field={field}
            register={register}
            error={errors[field.fieldName]}
          />
        ))}

      <div className="flex justify-end space-x-4">
        <Button type="button" variant="outline">Lưu nháp</Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Đang xử lý...' : 'Tạo file Word'}
        </Button>
      </div>
    </form>
  );
}
```

**FormField.tsx:**
```typescript
// frontend/src/features/forms/components/FormField.tsx
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { DateField } from './DateField';
import { SelectField } from './SelectField';

export function FormField({ field, register, error }) {
  const commonProps = {
    ...register(field.fieldName, {
      required: field.validationRules?.required ? 'Trường này bắt buộc' : false
    }),
    placeholder: field.placeholder
  };

  let input;
  switch (field.fieldType) {
    case 'textarea':
      input = <Textarea {...commonProps} rows={4} />;
      break;
    case 'date':
      input = <DateField {...commonProps} />;
      break;
    case 'select':
      input = <SelectField {...commonProps} options={field.options} />;
      break;
    case 'number':
      input = <Input type="number" {...commonProps} />;
      break;
    case 'email':
      input = <Input type="email" {...commonProps} />;
      break;
    default:
      input = <Input type="text" {...commonProps} />;
  }

  return (
    <div>
      <label className="block mb-2 font-medium">
        {field.displayName}
        {field.validationRules?.required && <span className="text-red-500">*</span>}
      </label>
      {input}
      {field.helpText && <p className="text-sm text-gray-500 mt-1">{field.helpText}</p>}
      {error && <p className="text-red-500 text-sm mt-1">{error.message}</p>}
    </div>
  );
}
```

---

### 12. **Tổng kết Frontend Pages**

#### **Admin Pages (3 pages thực tế)**

| Page | Route | Chức năng chính | Components chính |
|------|-------|----------------|------------------|
| **TemplateListPage** | `/admin/templates` | Xem danh sách templates + Chi tiết template (modal/detail panel) | TemplateCard, TemplateDetailModal, UploadButton |
| **TemplateUploadPage** | `/admin/templates/upload` | Upload file Word, hệ thống parse tự động | TemplateUploadForm, FileDropzone |
| **TemplateConfigPage** | `/admin/templates/:id/config` | Cấu hình fields, validation, preview | FieldConfigForm, TemplatePreview |

**Lưu ý:** `TemplateDetailPage` được tích hợp vào `TemplateListPage` dưới dạng Modal hoặc Side Panel, không phải trang riêng.

#### **User Pages (1 page duy nhất với tabs)**

| Page | Route | Chức năng chính | Tabs |
|------|-------|----------------|------|
| **FormsPage** | `/forms` | Quản lý form templates và submissions | 1. **Danh sách Forms** (có thể điền)<br>2. **Điền Form** (khi chọn template)<br>3. **Forms đã nộp** (My Submissions) |

**Cấu trúc User Page:**
```typescript
// frontend/src/features/forms/pages/FormsPage.tsx
export function FormsPage() {
  const [activeTab, setActiveTab] = useState('available'); // 'available' | 'fill' | 'submissions'
  
  return (
    <Tabs value={activeTab} onValueChange={setActiveTab}>
      <TabsList>
        <TabsTrigger value="available">Forms có thể điền</TabsTrigger>
        <TabsTrigger value="submissions">Forms đã nộp</TabsTrigger>
      </TabsList>
      
      <TabsContent value="available">
        <FormListView /> {/* Click vào form -> chuyển sang tab fill */}
      </TabsContent>
      
      <TabsContent value="fill">
        <FormFillView templateId={selectedTemplateId} />
      </TabsContent>
      
      <TabsContent value="submissions">
        <MySubmissionsView />
      </TabsContent>
    </Tabs>
  );
}
```

---

### 13. **Phân tích Tương thích với Code Hiện tại**

#### ✅ **Backend - Đã có sẵn:**

| Mục | Có sẵn | Cần thêm |
|-----|--------|----------|
| **TypeORM** | ✅ v0.3.17 | - |
| **AWS S3 SDK** | ✅ @aws-sdk/client-s3 v3.927.0 | - |
| **Multer** | ✅ v2.0.1 | - |
| **Class Validator** | ✅ v0.14.2 | - |
| **Class Transformer** | ✅ v0.5.1 | - |
| **UUID** | ✅ v9.0.1 | - |
| **Docxtemplater** | ❌ | **CÀI MỚI** |
| **PizZip** | ❌ | **CÀI MỚI** |

**Entities hiện có tương thích:**
- ✅ `User` entity - Có đầy đủ fields, dùng được cho `createdBy`, `userId`
- ✅ `Organization` entity - Có Tree structure, dùng cho `organizationId`
- ⚠️ **Cần tạo mới:** `Template`, `TemplateField`, `TemplateSubmission`

**S3 Config hiện có:**
```typescript
// backend/src/entities/aws-s3-config.entity.ts đã có
// Có thể tái sử dụng logic upload từ documents.service.ts
```

#### ✅ **Frontend - Đã có sẵn:**

| Thư viện | Có sẵn | Version | Ghi chú |
|----------|--------|---------|---------|
| **React Hook Form** | ✅ | v7.48.2 | Perfect! |
| **Zod** | ✅ | v3.22.4 | Perfect! |
| **React Query** | ✅ | v5.0.0 (@tanstack) | Perfect! |
| **Radix UI** | ✅ | Dialog, Select, Label, Tabs... | Đầy đủ! |
| **Lucide React** | ✅ | v0.294.0 | Icons |
| **React Dropzone** | ✅ | v14.3.8 | Upload files |
| **Axios** | ✅ | v1.6.2 | HTTP client |
| **React Router** | ✅ | v6.20.1 | Routing |
| **Yup** | ✅ | v1.7.1 | (dùng Zod thay thế) |
| **Date-fns** | ❌ | - | **CÀI MỚI** (optional) |
| **React Datepicker** | ❌ | - | **CÀI MỚI** (optional) |

**Component structure hiện có:**
```
frontend/src/features/
├── auth/           ✅ Pattern đã có
├── classes/        ✅ Pattern đã có
├── ctxh/           ✅ Pattern đã có
├── dashboard/      ✅ Pattern đã có
├── organizations/  ✅ Pattern đã có
└── users/          ✅ Pattern đã có

→ Có thể tạo templates/ và forms/ theo pattern này
```

#### 🔧 **Cần cài đặt thêm:**

**Backend:**
```bash
cd backend
npm install docxtemplater pizzip
npm install --save-dev @types/node
```

**Frontend (Optional):**
```bash
cd frontend
npm install date-fns react-datepicker
npm install --save-dev @types/react-datepicker
```

#### 🔄 **Tích hợp với hệ thống hiện có:**

**1. S3 Storage:** Tái sử dụng logic từ `documents2.service.ts`
```typescript
// Đã có sẵn pattern upload S3 với Long Vân
private s3: AWS.S3;
constructor() {
  this.s3 = new AWS.S3({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION,
    endpoint: process.env.AWS_S3_ENDPOINT,
    s3ForcePathStyle: true
  });
}
```

**2. Authentication:** Tích hợp với auth hiện có
```typescript
// Sử dụng JWT guard và decorators có sẵn
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import { CurrentUser } from '@/auth/decorators/current-user.decorator';

@Controller('templates')
@UseGuards(JwtAuthGuard)
export class TemplatesController {
  @Post()
  create(@Body() dto: CreateTemplateDto, @CurrentUser() user: User) {
    // user.id, user.organizationId đã có
  }
}
```

**3. Permissions:** Tích hợp với RBAC hiện có
```typescript
// Có thể dùng @RequirePermissions decorator
import { RequirePermissions } from '@/auth/decorators/permissions.decorator';

@Post()
@RequirePermissions('template:create')
async create(@Body() dto: CreateTemplateDto) {
  // ...
}
```

**4. Frontend Routes:** Thêm vào router hiện có
```typescript
// frontend/src/App.tsx
import { TemplatesRoutes } from '@/features/templates/routes';
import { FormsRoutes } from '@/features/forms/routes';

function App() {
  return (
    <Routes>
      {/* Existing routes */}
      <Route path="/admin/templates/*" element={<TemplatesRoutes />} />
      <Route path="/forms/*" element={<FormsRoutes />} />
    </Routes>
  );
}
```

#### 📊 **Migration Strategy:**

**Bước 1:** Tạo entities mới
```bash
# backend/src/entities/template.entity.ts
# backend/src/entities/template-field.entity.ts
# backend/src/entities/template-submission.entity.ts
```

**Bước 2:** Tạo migration
```bash
npm run typeorm migration:create src/migrations/CreateTemplateSystem
# Edit migration file
npm run typeorm migration:run
```

**Bước 3:** Update all-entities.ts
```typescript
// backend/src/entities/all-entities.ts
export * from './template.entity';
export * from './template-field.entity';
export * from './template-submission.entity';
```

**Bước 4:** Tạo module structure
```bash
# Backend
backend/src/templates/
├── templates.module.ts
├── templates.controller.ts
├── templates.service.ts
└── dto/
    ├── create-template.dto.ts
    ├── update-template.dto.ts
    └── ...

# Frontend
frontend/src/features/templates/
frontend/src/features/forms/
```

#### ⚠️ **Lưu ý tương thích:**

1. **Entity naming:** Entities hiện tại dùng camelCase cho column names với decorator `@Column({ name: 'snake_case' })` - Giữ nguyên pattern này

2. **UUID v4:** Đã dùng `uuid_generate_v4()` ở migrations - Tiếp tục dùng

3. **TypeORM relations:** Dùng eager/lazy loading đúng cách như entities hiện có

4. **Frontend folder structure:** Theo pattern `features/[feature-name]/[pages|components|hooks]`

5. **API response format:** Theo chuẩn hiện tại (có `data`, `message`, `statusCode`)

---

### 14. **Lộ Trình Triển Khai (Roadmap)**

#### **Phase 1: MVP (2-3 tuần) ✅ KHẢ THI**

**Backend (1 tuần):**
- ✅ Cài docxtemplater, pizzip
- ✅ Tạo 3 entities: Template, TemplateField, TemplateSubmission
- ✅ Tạo migration và chạy
- ✅ Tạo templates module với CRUD APIs
- ✅ Upload template Word, parse `{{field_name}}`
- ✅ Generate Word output từ form data
- ✅ Tích hợp S3 Long Vân (tái sử dụng code documents)

**Frontend (1-2 tuần):**
- ✅ Tạo folder structure: `features/templates/` và `features/forms/`
- ✅ **Admin:** TemplateListPage, TemplateUploadPage, TemplateConfigPage (3 pages)
- ✅ **User:** FormsPage với 3 tabs (1 page)
- ✅ Dynamic form renderer với React Hook Form
- ✅ Upload file với react-dropzone (đã có)
- ✅ Download file Word từ S3

**API Endpoints Phase 1:**
```typescript
// Templates (Admin)
POST   /api/templates/upload          // Upload & parse
GET    /api/templates                 // List templates
GET    /api/templates/:id             // Get detail
PUT    /api/templates/:id/configure   // Update field config
DELETE /api/templates/:id             // Delete

// Forms (User)
GET    /api/templates/active          // Active templates for users
POST   /api/submissions                // Create submission
PUT    /api/submissions/:id           // Update draft
POST   /api/submissions/:id/submit    // Submit & generate Word
GET    /api/submissions/my            // My submissions
GET    /api/submissions/:id/download  // Download file
```

#### **Phase 2: Nâng cao (2-3 tuần)**
- Auto-detect field type từ context (text xung quanh)
- Real-time validation phức tạp
- Auto-save draft (mỗi 30s)
- Preview PDF từ Word
- Quản lý version template
- Clone template

#### **Phase 3: Tối ưu (sau này)**
- Parse thêm format `_____`, `[_____]` (nếu cần)
- AI đoán validation rules
- Template marketplace (share giữa organizations)
- Bulk generate (nhiều users cùng lúc)
- Export Excel từ submissions
- Analytics dashboard