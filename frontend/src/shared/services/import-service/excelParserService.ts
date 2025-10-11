import * as XLSX from 'xlsx';
import { UserImportData } from '../../types/userImport';

export class ExcelParserService {
  private readonly MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

  /**
   * Utility method to split array into chunks
   */
  static chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }

  /**
   * Parse Excel file to UserImportData array
   */
  async parseUserImportFile(file: File): Promise<UserImportData[]> {
    this.validateFileType(file);
    this.validateFileSize(file);

    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const data = e.target?.result as ArrayBuffer;
          const workbook = XLSX.read(data, { 
            type: 'array',
            cellDates: true,
            cellNF: false,
            cellText: false
          });
          
          const result = this.parseExcelToJson(workbook);
          resolve(result);
        } catch (error) {
          reject(new Error(`Failed to parse Excel file: ${error instanceof Error ? error.message : 'Unknown error'}`));
        }
      };
      
      reader.onerror = () => {
        reject(new Error('Failed to read file'));
      };
      
      reader.readAsArrayBuffer(file);
    });
  }

  /**
   * Parse large files in chunks with progress callback
   */
  async parseInChunks(
    file: File, 
    onProgress?: (progress: number) => void
  ): Promise<UserImportData[]> {
    const data = await this.parseUserImportFile(file);
    
    // Simulate chunked processing for progress feedback
    const results: UserImportData[] = [];
    const chunkSize = 1000;
    
    for (let i = 0; i < data.length; i += chunkSize) {
      const chunk = data.slice(i, i + chunkSize);
      
      // Process chunk (can add validation here)
      results.push(...chunk);
      
      // Update progress
      const progress = Math.min(((i + chunkSize) / data.length) * 100, 100);
      onProgress?.(progress);
      
      // Small delay to prevent UI blocking
      await new Promise(resolve => setTimeout(resolve, 10));
    }
    
    return results;
  }

  private validateFileType(file: File): void {
    const allowedTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/vnd.ms-excel', // .xls
    ];
    
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
    const allowedExtensions = ['.xlsx', '.xls'];
    
    if (!allowedTypes.includes(file.type) && !allowedExtensions.includes(fileExtension)) {
      throw new Error('Invalid file type. Only Excel files (.xlsx, .xls) are allowed.');
    }
  }

  private validateFileSize(file: File): void {
    if (file.size > this.MAX_FILE_SIZE) {
      throw new Error(`File size exceeds maximum limit of ${this.MAX_FILE_SIZE / (1024 * 1024)}MB`);
    }
  }

  private parseExcelToJson(workbook: XLSX.WorkBook): UserImportData[] {
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) {
      throw new Error('No worksheet found in Excel file');
    }

    const worksheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
      header: 1,
      raw: false,
      dateNF: 'yyyy-mm-dd'
    }) as any[][];

    if (jsonData.length === 0) {
      throw new Error('Excel file is empty');
    }

    // Remove empty rows
    const filteredData = jsonData.filter(row => 
      row && row.some(cell => cell !== null && cell !== undefined && cell !== '')
    );

    if (filteredData.length <= 1) {
      throw new Error('No data rows found in Excel file');
    }

    const headers = filteredData[0];
    const dataRows = filteredData.slice(1);

    // Map headers to expected field names (case-insensitive)
    const headerMapping = this.createHeaderMapping(headers);

    const results: UserImportData[] = [];

    for (let i = 0; i < dataRows.length; i++) {
      try {
        const userData = this.mapRowToUserData(dataRows[i], headerMapping);
        if (userData) {
          results.push(userData);
        }
      } catch (error) {
        console.warn(`Skipping row ${i + 2}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    return results;
  }

  private createHeaderMapping(headers: any[]): Record<string, number> {
    const mapping: Record<string, number> = {};
    
    // Expected header patterns (case-insensitive) - Order matters: specific patterns first!
    const headerPatterns: Record<string, string[]> = {
      // Specific patterns first to avoid conflicts
      className: ['tên lớp', 'class name', 'lớp học', 'lớp'],
      familyName: ['họ và tên lót', 'họ tên lót', 'family name', 'surname', 'last name', 'họ'],
      givenName: ['tên gọi', 'given name', 'first name', 'tên'],
      managementDepartmentCode: ['mã đơn vị quản lý', 'management dept code', 'đơn vị quản lý'],
      trainingDepartmentCode: ['mã đơn vị đào tạo', 'training dept code', 'đơn vị đào tạo'],
      admissionYear: ['năm nhập học', 'admission year', 'năm vào học', 'năm vào'],
      curriculumYear: ['năm chương trình', 'năm ct', 'curriculum year'],
      trainingSystem: ['hệ đào tạo', 'training system', 'hệ học'],
      trainingLevel: ['bậc đào tạo', 'training level', 'bậc học'],
      identityCard: ['số cmnd', 'số cccd', 'identity card', 'id card', 'cmnd', 'cccd'],
      birthDate: ['ngày sinh', 'date of birth', 'birth date', 'dob'],
      userType: ['loại người dùng', 'user type', 'loại user'],
      membershipStatus: ['tình trạng thành viên', 'membership status', 'tình trạng'],
      organizationCodes: ['mã tổ chức', 'organization codes', 'tổ chức'],
      facultyCode: ['mã khoa', 'faculty code', 'mã faculty'],
      
      // General patterns after specific ones
      code: ['mã số sinh viên', 'mã sinh viên', 'student code', 'staff code', 'mã cán bộ', 'mã số', 'code'],
      email: ['địa chỉ email', 'email address', 'e-mail', 'thư điện tử', 'email'],
      password: ['mật khẩu', 'password', 'pass'],
      phone: ['số điện thoại', 'điện thoại', 'phone number', 'mobile', 'phone'],
      gender: ['giới tính', 'gender', 'sex']
    };

    headers.forEach((header, index) => {
      if (!header) return;
      
      const headerStr = String(header).toLowerCase().trim();
      
      // Find best match - prioritize exact matches first, then partial matches
      let bestMatch: { fieldName: string; matchLength: number } | null = null;
      
      for (const [fieldName, patterns] of Object.entries(headerPatterns)) {
        for (const pattern of patterns) {
          const patternLower = pattern.toLowerCase();
          
          // Exact match has highest priority
          if (headerStr === patternLower) {
            mapping[fieldName] = index;
            return; // Exit early for exact match
          }
          
          // Partial match - prefer longer matches
          if (headerStr.includes(patternLower)) {
            if (!bestMatch || patternLower.length > bestMatch.matchLength) {
              bestMatch = { fieldName, matchLength: patternLower.length };
            }
          }
        }
      }
      
      // Apply best partial match if found
      if (bestMatch) {
        mapping[bestMatch.fieldName] = index;
      }
    });

    // Debug logging
    console.log('Excel Header Mapping:', {
      headers,
      mapping,
      mappedFields: Object.keys(mapping)
    });

    return mapping;
  }

  private mapRowToUserData(row: any[], headerMapping: Record<string, number>): UserImportData | null {
    // Check if row has required data
    if (!row || row.length === 0) {
      return null;
    }

    // Extract required fields
    const code = this.getCellValue(row, headerMapping.code);
    const familyName = this.getCellValue(row, headerMapping.familyName);
    const givenName = this.getCellValue(row, headerMapping.givenName);

    // Skip row if missing required fields
    if (!code || !familyName || !givenName) {
      return null;
    }

    // Extract email and normalize
    const emailValue = this.getCellValue(row, headerMapping.email);
    const email = this.normalizeEmail(emailValue);

    // Debug logging for first few rows
    const genderRaw = this.getCellValue(row, headerMapping.gender);
    const classNameRaw = this.getCellValue(row, headerMapping.className);
    
    if (row === row && Math.random() < 0.1) { // Log ~10% of rows for debugging
      console.log('Row mapping debug:', {
        row,
        headerMapping: {
          givenName: headerMapping.givenName,
          gender: headerMapping.gender,
          className: headerMapping.className
        },
        extractedValues: {
          code,
          familyName,
          givenName,
          genderRaw,
          genderNormalized: this.normalizeGender(genderRaw),
          classNameRaw
        }
      });
    }

    const userData: UserImportData = {
      code: String(code).trim(),
      familyName: String(familyName).trim(),
      givenName: String(givenName).trim(),
      email,
      password: this.getCellValue(row, headerMapping.password),
      phone: this.getCellValue(row, headerMapping.phone),
      identityCard: this.getCellValue(row, headerMapping.identityCard),
      birthDate: this.parseDateValue(this.getCellValue(row, headerMapping.birthDate)),
      gender: this.normalizeGender(genderRaw),
      className: classNameRaw,
      admissionYear: this.getCellValue(row, headerMapping.admissionYear),
      curriculumYear: this.getCellValue(row, headerMapping.curriculumYear),
      facultyCode: this.getCellValue(row, headerMapping.facultyCode),
      managementDepartmentCode: this.getCellValue(row, headerMapping.managementDepartmentCode),
      trainingDepartmentCode: this.getCellValue(row, headerMapping.trainingDepartmentCode),
      trainingSystem: this.normalizeTrainingSystem(this.getCellValue(row, headerMapping.trainingSystem)),
      trainingLevel: this.normalizeTrainingLevel(this.getCellValue(row, headerMapping.trainingLevel)),
      userType: this.normalizeUserType(this.getCellValue(row, headerMapping.userType)),
      membershipStatus: this.normalizeMembershipStatus(this.getCellValue(row, headerMapping.membershipStatus)),
      organizationCodes: this.getCellValue(row, headerMapping.organizationCodes),
      isActive: true // Default to active
    };

    return userData;
  }

  private getCellValue(row: any[], index: number | undefined): string | undefined {
    if (index === undefined || index < 0 || index >= row.length) {
      return undefined;
    }
    
    const value = row[index];
    if (value === null || value === undefined || value === '') {
      return undefined;
    }
    
    return String(value).trim();
  }

  private normalizeEmail(email: string | undefined): string | null {
    if (!email || email === '*' || email === '-') {
      return null;
    }
    
    return email.toLowerCase().trim();
  }

  private parseDateValue(dateStr: string | undefined): Date | undefined {
    if (!dateStr) return undefined;
    
    try {
      // Try parsing various date formats
      const date = new Date(dateStr);
      if (!isNaN(date.getTime())) {
        return date;
      }
      
      // Try DD/MM/YYYY format
      const parts = dateStr.split(/[\/\-\.]/);
      if (parts.length === 3) {
        const day = parseInt(parts[0]);
        const month = parseInt(parts[1]) - 1; // Month is 0-indexed
        const year = parseInt(parts[2]);
        
        const parsedDate = new Date(year, month, day);
        if (!isNaN(parsedDate.getTime())) {
          return parsedDate;
        }
      }
    } catch (error) {
      console.warn(`Failed to parse date: ${dateStr}`);
    }
    
    return undefined;
  }

  private normalizeGender(gender: string | undefined): 'NAM' | 'NU' | undefined {
    if (!gender) return undefined;
    
    const normalized = gender.toLowerCase().trim();
    
    if (['nam', 'male', 'm', '1'].includes(normalized)) {
      return 'NAM';
    }
    
    if (['nữ', 'nu', 'female', 'f', '0'].includes(normalized)) {
      return 'NU';
    }
    
    return undefined;
  }

  private normalizeTrainingSystem(system: string | undefined): 'VLVH' | 'CQ' | 'QT' | 'DTTX' | undefined {
    if (!system) return undefined;
    
    const normalized = system.toLowerCase().trim();
    
    if (['vlvh', 'vừa làm vừa học'].includes(normalized)) {
      return 'VLVH';
    }
    
    if (['cq', 'chính quy'].includes(normalized)) {
      return 'CQ';
    }
    
    if (['qt', 'quốc tế'].includes(normalized)) {
      return 'QT';
    }
    
    if (['dttx', 'đào tạo từ xa'].includes(normalized)) {
      return 'DTTX';
    }
    
    return undefined;
  }

  private normalizeTrainingLevel(level: string | undefined): 'DH' | undefined {
    if (!level) return undefined;
    
    const normalized = level.toLowerCase().trim();
    
    if (['dh', 'đại học'].includes(normalized)) {
      return 'DH';
    }
    
    return undefined;
  }

  private normalizeUserType(type: string | undefined): 'student' | 'staff' | 'SINH_VIEN' | 'CAN_BO' | undefined {
    if (!type) return undefined;
    
    const normalized = type.toLowerCase().trim();
    
    if (['sinh viên', 'sinh_vien', 'student', 'sv'].includes(normalized)) {
      return 'SINH_VIEN';
    }
    
    if (['cán bộ', 'can_bo', 'staff', 'cb', 'giảng viên'].includes(normalized)) {
      return 'CAN_BO';
    }
    
    return undefined;
  }

  private normalizeMembershipStatus(status: string | undefined): 'doan_vien' | 'hoi_vien' | 'both' | 'none' | 'ACTIVE' | 'INACTIVE' | 'GRADUATED' | undefined {
    if (!status) return undefined;
    
    const normalized = status.toLowerCase().trim();
    
    if (['đoàn viên', 'doan_vien', 'doan vien'].includes(normalized)) {
      return 'doan_vien';
    }
    
    if (['hội viên', 'hoi_vien', 'hoi vien'].includes(normalized)) {
      return 'hoi_vien';
    }
    
    if (['cả hai', 'both', 'ca hai'].includes(normalized)) {
      return 'both';
    }
    
    if (['hoạt động', 'active', 'hoat dong'].includes(normalized)) {
      return 'ACTIVE';
    }
    
    if (['không hoạt động', 'inactive', 'khong hoat dong'].includes(normalized)) {
      return 'INACTIVE';
    }
    
    if (['tốt nghiệp', 'graduated', 'tot nghiep'].includes(normalized)) {
      return 'GRADUATED';
    }
    
    if (['không', 'none', 'khong'].includes(normalized)) {
      return 'none';
    }
    
    return undefined;
  }
}