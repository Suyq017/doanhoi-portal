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
            isActive: true // Mặc định là active vì không có cột này trong template
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
        'Họ*',
        'Tên*',
        'Email*', 
        'Mã số*',
        'Mật khẩu',
        'Điện thoại',
        'Tên lớp',
        'Mã đơn vị quản lý',
        'Mã đơn vị đào tạo',
        'Mã tổ chức',
        'Loại người dùng',
        'Tình trạng thành viên'
      ],
      // Sample data rows
      [
        'Nguyễn Văn',
        'A',
        'a.nguyen@example.com',
        'SV001',
        '123456',
        '0987654321',
        'TH2024A',
        'CNTT',
        'CNTT',
        'ORG1;ORG2',
        'sinh_vien',
        'doan_vien'
      ],
      [
        'Trần Thị',
        'B',
        'b.tran@example.com',
        'CB002',
        'password123',
        '0987654322',
        '',
        'TOAN',
        'TOAN',
        'ORG1',
        'can_bo',
        'hoi_vien'
      ]
    ];

    const worksheet = XLSX.utils.aoa_to_sheet(templateData);
    
    // Set column widths
    worksheet['!cols'] = [
      { width: 15 }, // Họ
      { width: 15 }, // Tên
      { width: 25 }, // Email
      { width: 10 }, // Mã số
      { width: 12 }, // Mật khẩu
      { width: 15 }, // Điện thoại
      { width: 12 }, // Tên lớp
      { width: 20 }, // Mã đơn vị quản lý
      { width: 20 }, // Mã đơn vị đào tạo
      { width: 20 }, // Mã tổ chức
      { width: 15 }, // Loại người dùng
      { width: 20 }  // Tình trạng thành viên
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
      className: -1,
      managementDepartmentCode: -1,
      trainingDepartmentCode: -1,
      organizationCodes: -1,
      userType: -1,
      membershipStatus: -1
      // Bỏ isActive
    };

    headers.forEach((header, index) => {
      // Normalize header: lowercase, remove *, remove spaces, remove Vietnamese accents
      const normalizedHeader = header?.toString().toLowerCase().trim()
        .replace(/[*]/g, '') // Remove asterisks
        .replace(/\s+/g, '') // Remove all spaces
        .replace(/[àáạảãâầấậẩẫăằắặẳẵ]/g, 'a')
        .replace(/[èéẹẻẽêềếệểễ]/g, 'e')
        .replace(/[ìíịỉĩ]/g, 'i')
        .replace(/[òóọỏõôồốộổỗơờớợởỡ]/g, 'o')
        .replace(/[ùúụủũưừứựửữ]/g, 'u')
        .replace(/[ỳýỵỷỹ]/g, 'y')
        .replace(/[đ]/g, 'd')
        .replace(/[ñ]/g, 'n');
      
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
        case 'maso':
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
        case 'dienthoai':
          map.phone = index;
          break;
        case 'classcode':
        case 'classname':
        case 'class':
        case 'malop':
        case 'tenlop':
          map.className = index;
          break;
        case 'managementdepartmentcode':
        case 'managementdepartment':
        case 'madonviquanly':
        case 'maphongbanquanly':
          map.managementDepartmentCode = index;
          break;
        case 'trainingdepartmentcode':
        case 'trainingdepartment':
        case 'madonvidaotao':
        case 'maphongbandaotao':
          map.trainingDepartmentCode = index;
          break;
        case 'organizationcodes':
        case 'organization':
        case 'organizations':
        case 'matochuc':
          map.organizationCodes = index;
          break;
        case 'usertype':
        case 'loainguoidung':
          map.userType = index;
          break;
        case 'membershipstatus':
        case 'tinhtrangthanhvien':
        case 'trangthaithanhdoan':
          map.membershipStatus = index;
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
    
    if (['student', 'sinh viên', 'sinhvien', 'sv', 'sinh_vien'].includes(normalizedValue)) {
      return 'student';
    }
    
    if (['staff', 'cán bộ', 'canbo', 'cb', 'nhân viên', 'nhanvien', 'nv', 'can_bo'].includes(normalizedValue)) {
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
