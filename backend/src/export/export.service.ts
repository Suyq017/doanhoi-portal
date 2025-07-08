import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as XLSX from 'xlsx';
import { User } from '../entities/user.entity';
import { Organization } from '../entities/organization.entity';
import { UserOrganization } from '../entities/user-organization.entity';
import { ExportRequestDto, ExportFormat } from './dto/export-request.dto';

@Injectable()
export class ExportService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Organization)
    private organizationRepository: Repository<Organization>,
    @InjectRepository(UserOrganization)
    private userOrganizationRepository: Repository<UserOrganization>,
  ) {}

  async exportUsers(exportRequest: ExportRequestDto): Promise<Buffer> {
    const { fields, format } = exportRequest;

    // Query users with relations
    const users = await this.userRepository.find({
      relations: {
        managementDepartment: true,
        trainingDepartment: true,
        class: true,
        organizations: {
          organization: true,
        },
      },
    });

    if (users.length === 0) {
      throw new Error('Không có dữ liệu để xuất');
    }

    // Generate Excel file with safe sheet name
    const safeSheetName = this.createSafeSheetName('Danh sách người dùng');
    const buffer = await this.generateExcelFile(users, fields, safeSheetName);
    return buffer;
  }

  async exportOrganizationMembers(
    organizationId: string,
    exportRequest: ExportRequestDto,
  ): Promise<Buffer> {
    const { fields, format } = exportRequest;

    // Verify organization exists
    const organization = await this.organizationRepository.findOne({
      where: { id: organizationId },
    });

    if (!organization) {
      throw new Error('Không tìm thấy tổ chức');
    }

    // Query organization members
    const userOrganizations = await this.userOrganizationRepository.find({
      where: { organizationId },
      relations: {
        user: {
          managementDepartment: true,
          trainingDepartment: true,
          class: true,
        },
      },
    });

    if (userOrganizations.length === 0) {
      throw new Error('Tổ chức không có thành viên nào');
    }

    const users = userOrganizations.map(uo => ({
      ...uo.user,
      role: uo.role,
      joinedAt: uo.joinedAt,
      isActive: uo.isActive,
    }));

    // Generate Excel file with safe sheet name
    const safeSheetName = this.createSafeSheetName(`Danh sách thành viên - ${organization.name}`);
    const buffer = await this.generateExcelFile(
      users,
      fields,
      safeSheetName,
    );
    return buffer;
  }

  private async generateExcelFile(
    users: any[],
    fields: string[],
    sheetName: string,
  ): Promise<Buffer> {
    const workbook = XLSX.utils.book_new();

    // Define field mappings
    const fieldMappings = this.getFieldMappings();

    // Create headers
    const headers = fields.map(field => fieldMappings[field]?.label || field);

    // Create data rows
    const rows = users.map(user => {
      const row = {};
      fields.forEach((field, index) => {
        row[headers[index]] = this.getFieldValue(user, field);
      });
      return row;
    });

    // Create worksheet
    const worksheet = XLSX.utils.json_to_sheet(rows);

    // Set column widths
    const columnWidths = headers.map(header => ({ wch: Math.max(header.length, 15) }));
    worksheet['!cols'] = columnWidths;

    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

    // Generate buffer
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    return buffer;
  }

  private getFieldMappings(): Record<string, { label: string; formatter?: (value: any) => string }> {
    return {
      code: { label: 'Mã số' },
      familyName: { label: 'Họ và tên lót' },
      givenName: { label: 'Tên' },
      fullName: { label: 'Họ và tên đầy đủ' },
      email: { label: 'Email' },
      phone: { label: 'Số điện thoại' },
      managementDepartment: { 
        label: 'Khoa quản lý',
        formatter: (value: any) => value?.name || '',
      },
      trainingDepartment: { 
        label: 'Khoa đào tạo',
        formatter: (value: any) => value?.name || '',
      },
      class: { 
        label: 'Lớp',
        formatter: (value: any) => value?.name || '',
      },
      userType: { 
        label: 'Loại người dùng',
        formatter: (value: string) => {
          const types = { student: 'Sinh viên', staff: 'Cán bộ' };
          return types[value] || value;
        },
      },
      membershipStatus: { 
        label: 'Tình trạng thành viên',
        formatter: (value: string) => {
          const statuses = {
            doan_vien: 'Đoàn viên',
            hoi_vien: 'Hội viên',
            both: 'Cả hai',
            none: 'Không'
          };
          return statuses[value] || value;
        },
      },
      role: { 
        label: 'Vai trò trong tổ chức',
        formatter: (value: string) => {
          const roles = {
            member: 'Thành viên',
            admin: 'Quản trị viên',
            super_admin: 'Quản trị viên cao cấp'
          };
          return roles[value] || value;
        },
      },
      isActive: { 
        label: 'Trạng thái hoạt động',
        formatter: (value: boolean) => value ? 'Hoạt động' : 'Không hoạt động',
      },
      createdAt: { 
        label: 'Ngày tạo',
        formatter: (value: Date) => value ? new Date(value).toLocaleDateString('vi-VN') : '',
      },
      updatedAt: { 
        label: 'Ngày cập nhật',
        formatter: (value: Date) => value ? new Date(value).toLocaleDateString('vi-VN') : '',
      },
      joinedAt: { 
        label: 'Ngày tham gia',
        formatter: (value: Date) => value ? new Date(value).toLocaleDateString('vi-VN') : '',
      },
    };
  }

  private getFieldValue(user: any, field: string): string {
    const mappings = this.getFieldMappings();
    const mapping = mappings[field];
    
    let value = user[field];
    
    // Handle nested properties
    if (field.includes('.')) {
      const parts = field.split('.');
      value = parts.reduce((obj, part) => obj?.[part], user);
    }
    
    // Handle special cases
    if (field === 'fullName') {
      value = user.fullName || `${user.familyName || ''} ${user.givenName || ''}`.trim();
    }
    
    // Apply formatter if available
    if (mapping?.formatter && value !== null && value !== undefined) {
      return mapping.formatter(value);
    }
    
    // Return empty string for null/undefined values
    return value !== null && value !== undefined ? String(value) : '';
  }

  generateFileName(prefix: string, organizationName?: string): string {
    const now = new Date();
    const timestamp = now.toISOString().split('T')[0]; // YYYY-MM-DD
    
    if (organizationName) {
      const cleanOrgName = organizationName
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '_');
      return `${prefix}_${cleanOrgName}_${timestamp}.xlsx`;
    }
    
    return `${prefix}_${timestamp}.xlsx`;
  }

  private createSafeSheetName(name: string): string {
    // Excel sheet name limitations:
    // - Maximum 31 characters
    // - Cannot contain: \ / ? * [ ] : 
    let safeName = name
      .replace(/[\\\/\?\*\[\]:]/g, '') // Remove invalid characters
      .trim();
    
    // If name is too long, truncate it but keep meaningful part
    if (safeName.length > 31) {
      // Try to keep the most important part
      if (safeName.includes(' - ')) {
        const parts = safeName.split(' - ');
        const prefix = 'DS thành viên'; // Short prefix
        const orgName = parts[1] || parts[0];
        safeName = `${prefix} - ${orgName}`;
        
        // If still too long, truncate organization name
        if (safeName.length > 31) {
          const maxOrgLength = 31 - prefix.length - 3; // 3 for " - "
          const truncatedOrg = orgName.substring(0, maxOrgLength);
          safeName = `${prefix} - ${truncatedOrg}`;
        }
      } else {
        // Simple truncation as fallback
        safeName = safeName.substring(0, 31);
      }
    }
    
    return safeName;
  }
}
