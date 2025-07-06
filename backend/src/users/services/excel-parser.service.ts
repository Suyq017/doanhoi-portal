import { Injectable } from '@nestjs/common';
import * as XLSX from 'xlsx';

export interface UserImportData {
  familyName: string;
  givenName: string;
  email: string;
  code: string; // Mã số sinh viên/cán bộ (thay cho username)
  password?: string;
  phone?: string;
  className?: string;  // Changed from classCode to className since Class entity uses name
  managementDepartmentCode?: string;
  trainingDepartmentCode?: string;
  organizationCodes?: string; // "ORG1;ORG2;ORG3"
  userType?: 'student' | 'staff';
  membershipStatus?: 'doan_vien' | 'hoi_vien' | 'both' | 'none';
  isActive?: boolean;
}

@Injectable()
export class ExcelParserService {
  private readonly MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
  private readonly MAX_ROWS = 50000; // Maximum rows to process
  private readonly CHUNK_SIZE = 1000; // Process rows in chunks

  async parseExcelFile(buffer: Buffer): Promise<UserImportData[]> {
    try {
      // Check file size
      if (buffer.length > this.MAX_FILE_SIZE) {
        throw new Error(`File size exceeds maximum limit of ${this.MAX_FILE_SIZE / (1024 * 1024)}MB`);
      }

      // Parse with memory optimization
      const workbook = XLSX.read(buffer, { 
        type: 'buffer',
        cellDates: true,
        cellNF: false,
        cellText: false
      });
      
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      
      // Get worksheet range to check size
      const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1:A1');
      const totalRows = range.e.r - range.s.r;
      
      if (totalRows > this.MAX_ROWS) {
        throw new Error(`File contains ${totalRows} rows, maximum allowed is ${this.MAX_ROWS}`);
      }

      // Convert to JSON with header mapping
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
        header: 1,
        defval: '',
        blankrows: false
      });
      
      if (jsonData.length < 2) {
        throw new Error('Excel file must contain header row and at least one data row');
      }

      const headers = jsonData[0] as string[];
      const dataRows = jsonData.slice(1);

      // Map headers to expected columns (case insensitive)
      const headerMap = this.createHeaderMap(headers);
      
      // Process rows in chunks to manage memory
      const parsedData: UserImportData[] = [];
      
      for (let chunkStart = 0; chunkStart < dataRows.length; chunkStart += this.CHUNK_SIZE) {
        const chunkEnd = Math.min(chunkStart + this.CHUNK_SIZE, dataRows.length);
        const chunk = dataRows.slice(chunkStart, chunkEnd);
        
        for (let i = 0; i < chunk.length; i++) {
          const row = chunk[i] as any[];
          
          // Skip empty rows
          if (!row || row.every(cell => !cell || cell.toString().trim() === '')) {
            continue;
          }

          const userData: UserImportData = {
            familyName: this.getCellValue(row, headerMap.familyName),
            givenName: this.getCellValue(row, headerMap.givenName),
            email: this.getCellValue(row, headerMap.email),
            code: this.getCellValue(row, headerMap.code),
            password: this.getCellValue(row, headerMap.password),
            phone: this.getCellValue(row, headerMap.phone),
            className: this.getCellValue(row, headerMap.className),
            managementDepartmentCode: this.getCellValue(row, headerMap.managementDepartmentCode),
            trainingDepartmentCode: this.getCellValue(row, headerMap.trainingDepartmentCode),
            organizationCodes: this.getCellValue(row, headerMap.organizationCodes),
            userType: this.parseUserType(this.getCellValue(row, headerMap.userType)),
            membershipStatus: this.parseMembershipStatus(this.getCellValue(row, headerMap.membershipStatus)),
            isActive: this.parseBooleanValue(this.getCellValue(row, headerMap.isActive))
          };

          parsedData.push(userData);
        }
        
        // Force garbage collection after each chunk
        if (global.gc) {
          global.gc();
        }
      }

      return parsedData;
    } catch (error) {
      throw new Error(`Failed to parse Excel file: ${error.message}`);
    }
  }

  async generateTemplate(): Promise<Buffer> {
    const templateData = [
      // Header row
      [
        'Family Name*',
        'Given Name*',
        'Email*', 
        'Code*',
        'Password',
        'Phone',
        'Class Name',
        'Management Department Code',
        'Training Department Code',
        'Organization Codes',
        'User Type',
        'Membership Status',
        'Is Active'
      ],
      // Sample data rows
      [
        'Nguyễn Văn',
        'A',
        'a.nguyen@example.com',
        'SV001',
        '123456',
        '0987654321',
        'CS2024A',
        'IT',
        'CNTT',
        'ORG1;ORG2',
        'student',
        'doan_vien',
        'TRUE'
      ],
      [
        'Trần Thị',
        'B',
        'b.tran@example.com',
        'CB002',
        'password123',
        '0987654322',
        '',
        'MATH',
        'TOAN',
        'ORG1',
        'staff',
        'hoi_vien',
        'TRUE'
      ]
    ];

    const worksheet = XLSX.utils.aoa_to_sheet(templateData);
    
    // Set column widths
    worksheet['!cols'] = [
      { width: 15 }, // Family Name
      { width: 15 }, // Given Name
      { width: 25 }, // Email
      { width: 10 }, // Code
      { width: 12 }, // Password
      { width: 15 }, // Phone
      { width: 12 }, // Class Code
      { width: 20 }, // Management Department Code
      { width: 20 }, // Training Department Code
      { width: 20 }, // Organization Codes
      { width: 12 }, // User Type
      { width: 18 }, // Membership Status
      { width: 10 }  // Is Active
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Users');
    
    return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
  }

  private createHeaderMap(headers: string[]): Record<string, number> {
    const map = {
      familyName: -1,
      givenName: -1,
      email: -1,
      code: -1,
      password: -1,
      phone: -1,
      className: -1,  // Changed from classCode
      managementDepartmentCode: -1,
      trainingDepartmentCode: -1,
      organizationCodes: -1,
      userType: -1,
      membershipStatus: -1,
      isActive: -1
    };

    headers.forEach((header, index) => {
      const normalizedHeader = header?.toString().toLowerCase().trim().replace(/[*\s]/g, '');
      
      switch (normalizedHeader) {
        case 'familyname':
        case 'lastname':
        case 'ho':
          map.familyName = index;
          break;
        case 'givenname':
        case 'firstname':
        case 'ten':
          map.givenName = index;
          break;
        case 'email':
        case 'emailaddress':
          map.email = index;
          break;
        case 'code':
        case 'studentcode':
        case 'staffcode':
        case 'masv':
        case 'macb':
          map.code = index;
          break;
        case 'password':
        case 'pass':
        case 'matkhau':
          map.password = index;
          break;
        case 'phone':
        case 'phonenumber':
        case 'sodienthoai':
          map.phone = index;
          break;
        case 'classcode':
        case 'classname':
        case 'class':
        case 'malop':
          map.className = index;
          break;
        case 'managementdepartmentcode':
        case 'managementdepartment':
        case 'maphongbanquanly':
          map.managementDepartmentCode = index;
          break;
        case 'trainingdepartmentcode':
        case 'trainingdepartment':
        case 'maphongbandaotao':
          map.trainingDepartmentCode = index;
          break;
        case 'organizationcodes':
        case 'organizations':
        case 'matochuc':
          map.organizationCodes = index;
          break;
        case 'usertype':
        case 'loainguoidung':
          map.userType = index;
          break;
        case 'membershipstatus':
        case 'trangthaithanhdoan':
          map.membershipStatus = index;
          break;
        case 'isactive':
        case 'active':
        case 'hoatdong':
          map.isActive = index;
          break;
      }
    });

    return map;
  }

  private getCellValue(row: any[], columnIndex: number): string | undefined {
    if (columnIndex === -1 || !row[columnIndex]) {
      return undefined;
    }
    
    const value = row[columnIndex].toString().trim();
    return value === '' ? undefined : value;
  }

  private parseBooleanValue(value: string | undefined): boolean | undefined {
    if (!value) return undefined;
    
    const normalizedValue = value.toLowerCase().trim();
    
    if (['true', '1', 'yes', 'y', 'có', 'đúng'].includes(normalizedValue)) {
      return true;
    }
    
    if (['false', '0', 'no', 'n', 'không', 'sai'].includes(normalizedValue)) {
      return false;
    }
    
    return undefined;
  }

  private parseUserType(value: string | undefined): 'student' | 'staff' | undefined {
    if (!value) return undefined;
    
    const normalizedValue = value.toLowerCase().trim();
    
    if (['student', 'sinh viên', 'sinhvien', 'sv'].includes(normalizedValue)) {
      return 'student';
    }
    
    if (['staff', 'cán bộ', 'canbo', 'cb', 'nhân viên', 'nhanvien'].includes(normalizedValue)) {
      return 'staff';
    }
    
    return undefined;
  }

  private parseMembershipStatus(value: string | undefined): 'doan_vien' | 'hoi_vien' | 'both' | 'none' | undefined {
    if (!value) return undefined;
    
    const normalizedValue = value.toLowerCase().trim();
    
    if (['doan_vien', 'đoàn viên', 'doanvien'].includes(normalizedValue)) {
      return 'doan_vien';
    }
    
    if (['hoi_vien', 'hội viên', 'hoivien'].includes(normalizedValue)) {
      return 'hoi_vien';
    }
    
    if (['both', 'cả hai', 'cahai'].includes(normalizedValue)) {
      return 'both';
    }
    
    if (['none', 'không', 'khong'].includes(normalizedValue)) {
      return 'none';
    }
    
    return undefined;
  }
}
