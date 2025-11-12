import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateTemplateSystem1731312000000 implements MigrationInterface {
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
