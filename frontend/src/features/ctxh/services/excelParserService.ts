import * as XLSX from 'xlsx';

export interface ParticipantImportData {
  studentCode: string;
  name?: string;
  email?: string;
  actualDays?: number;
  note?: string;
}

export interface GradingImportData {
  studentCode: string;
  name?: string;
  actualDays: number;
  note?: string;
  _hasParseError?: boolean;
  _parseErrorMessage?: string;
}

export interface ParseResult<T> {
  data: T[];
  errors: ParseError[];
  totalRows: number;
  validRows: number;
}

export interface ParseError {
  row: number;
  field: string;
  value: any;
  message: string;
  type: 'validation' | 'format' | 'required';
}

export class ExcelParserService {
  /**
   * Parse Excel file for participant import (students)
   */
  async parseParticipantFile(
    file: File,
    onProgress?: (progress: number) => void
  ): Promise<ParseResult<ParticipantImportData>> {
    this.validateFile(file);
    
    onProgress?.(10);
    
    const workbook = await this.readExcelFile(file);
    onProgress?.(30);
    
    const jsonData = this.extractSheetData(workbook);
    onProgress?.(50);
    
    const result = this.parseParticipantData(jsonData);
    onProgress?.(100);
    
    return result;
  }

  /**
   * Parse Excel file for grading import
   */
  async parseGradingFile(
    file: File,
    onProgress?: (progress: number) => void
  ): Promise<ParseResult<GradingImportData>> {
    this.validateFile(file);
    
    onProgress?.(10);
    
    const workbook = await this.readExcelFile(file);
    onProgress?.(30);
    
    const jsonData = this.extractSheetData(workbook);
    onProgress?.(50);
    
    const result = this.parseGradingData(jsonData);
    onProgress?.(100);
    
    return result;
  }

  /**
   * Validate file type and size
   */
  private validateFile(file: File): void {
    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      throw new Error('Định dạng file không hợp lệ. Chỉ hỗ trợ file Excel (.xlsx, .xls)');
    }

    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      throw new Error('Kích thước file quá lớn. Tối đa 10MB');
    }
  }

  /**
   * Read Excel file and return workbook
   */
  private async readExcelFile(file: File): Promise<XLSX.WorkBook> {
    const arrayBuffer = await file.arrayBuffer();
    return XLSX.read(arrayBuffer, { type: 'array' });
  }

  /**
   * Extract data from first sheet
   */
  private extractSheetData(workbook: XLSX.WorkBook): any[][] {
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) {
      throw new Error('File Excel không có sheet nào');
    }

    const worksheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

    if (!jsonData || jsonData.length < 2) {
      throw new Error('File không có dữ liệu hoặc thiếu header');
    }

    return jsonData as any[][];
  }

  /**
   * Parse participant data (student import)
   */
  private parseParticipantData(jsonData: any[][]): ParseResult<ParticipantImportData> {
    const headers = jsonData[0] as string[];
    const dataRows = jsonData.slice(1).filter(row => 
      row && Array.isArray(row) && row.some(cell => cell !== null && cell !== undefined && cell !== '')
    );

    // Find column indices
    const studentCodeIndex = this.findColumnIndex(headers, [
      'mssv', 
      'mã số sinh viên', 
      'ma so sinh vien',
      'mã số', 
      'ma so',
      'student code', 
      'student id',
      'studentcode',
      'studentid',
      'code',
      'id'
    ]);
    const nameIndex = this.findColumnIndex(headers, ['tên', 'họ tên', 'name', 'full name']);
    const emailIndex = this.findColumnIndex(headers, ['email', 'mail']);

    if (studentCodeIndex === -1) {
      throw new Error('Không tìm thấy cột mã số sinh viên (MSSV) trong file');
    }

    const data: ParticipantImportData[] = [];
    const errors: ParseError[] = [];

    dataRows.forEach((row, index) => {
      const rowNumber = index + 2; // +2 because of header and 0-based index
      
      const studentCode = this.getCellValue(row, studentCodeIndex);
      const name = this.getCellValue(row, nameIndex);
      const email = this.getCellValue(row, emailIndex);

      // Validate required fields
      if (!studentCode || studentCode.toString().trim() === '') {
        errors.push({
          row: rowNumber,
          field: 'studentCode',
          value: studentCode,
          message: 'Mã số sinh viên không được để trống',
          type: 'required'
        });
        return;
      }

      // Parse and validate student code
      const parsedStudentCode = studentCode.toString().trim();
      
      // Log student code for debugging

      // Validate email format if provided
      if (email && !this.isValidEmail(email)) {
        errors.push({
          row: rowNumber,
          field: 'email',
          value: email,
          message: 'Định dạng email không hợp lệ',
          type: 'format'
        });
      }

      data.push({
        studentCode: parsedStudentCode,
        name: name ? name.toString().trim() : undefined,
        email: email ? email.toString().trim() : undefined
      });
    });

    return {
      data,
      errors,
      totalRows: dataRows.length,
      validRows: data.length
    };
  }

  /**
   * Parse grading data
   */
  private parseGradingData(jsonData: any[][]): ParseResult<GradingImportData> {
    const headers = jsonData[0] as string[];
    const dataRows = jsonData.slice(1).filter(row => 
      row && Array.isArray(row) && row.some(cell => cell !== null && cell !== undefined && cell !== '')
    );


    // Find column indices for grading template
    const studentCodeIndex = this.findColumnIndex(headers, [
      'mssv', 
      'mã số sinh viên', 
      'ma so sinh vien',
      'mã số', 
      'ma so',
      'student code', 
      'student id',
      'studentcode',
      'studentid',
      'code',
      'id'
    ]);
    const nameIndex = this.findColumnIndex(headers, ['tên', 'họ tên', 'name', 'full name']);
    const daysIndex = this.findColumnIndex(headers, ['số ngày', 'ctxh', 'days', 'actual days']);
    const noteIndex = this.findColumnIndex(headers, ['ghi chú', 'note', 'notes']);

    if (studentCodeIndex === -1) {
      throw new Error('Không tìm thấy cột mã số sinh viên (MSSV) trong file');
    }

    if (daysIndex === -1) {
      throw new Error('Không tìm thấy cột số ngày CTXH trong file');
    }

    const data: GradingImportData[] = [];
    const errors: ParseError[] = [];

    dataRows.forEach((row, index) => {
      const rowNumber = index + 2; // +2 because of header and 0-based index
      
      const studentCode = this.getCellValue(row, studentCodeIndex);
      const name = this.getCellValue(row, nameIndex);
      const daysValue = this.getCellValue(row, daysIndex);
      const note = this.getCellValue(row, noteIndex);

      // Validate required fields
      if (!studentCode || studentCode.toString().trim() === '') {
        errors.push({
          row: rowNumber,
          field: 'studentCode',
          value: studentCode,
          message: 'Mã số sinh viên không được để trống',
          type: 'required'
        });
        return;
      }

      // Parse and validate student code
      const parsedStudentCode = studentCode.toString().trim();
      
      // Log student code for debugging

      if (!daysValue && daysValue !== 0) {
        errors.push({
          row: rowNumber,
          field: 'actualDays',
          value: daysValue,
          message: 'Số ngày CTXH không được để trống',
          type: 'required'
        });
        return;
      }

      // Validate and parse days
      const daysString = daysValue.toString().trim();
      let actualDays = 0; // Default value for invalid cases
      let hasParseError = false;
      let parseErrorMessage = '';
      
      // Check for common text values that shouldn't be numbers
      const invalidTextValues = ['abc', 'xyz', 'text', 'không', 'null', 'undefined', 'n/a', 'na'];
      if (invalidTextValues.some(invalid => daysString.toLowerCase().includes(invalid))) {
        errors.push({
          row: rowNumber,
          field: 'actualDays',
          value: daysValue,
          message: `Số ngày CTXH không hợp lệ: "${daysValue}". Vui lòng nhập một số hợp lệ`,
          type: 'validation'
        });
        hasParseError = true;
        parseErrorMessage = `Số ngày CTXH không hợp lệ: "${daysValue}"`;
      } else {
        const parsedDays = parseFloat(daysString);
        
        // Check if value is not a valid number
        if (isNaN(parsedDays)) {
          errors.push({
            row: rowNumber,
            field: 'actualDays',
            value: daysValue,
            message: `Số ngày CTXH không hợp lệ: "${daysValue}". Vui lòng nhập một số hợp lệ`,
            type: 'validation'
          });
          hasParseError = true;
          parseErrorMessage = `Số ngày CTXH không hợp lệ: "${daysValue}"`;
        } else if (parsedDays < 0) {
          // Check if value is negative
          errors.push({
            row: rowNumber,
            field: 'actualDays',
            value: daysValue,
            message: `Số ngày CTXH không được âm: ${parsedDays}`,
            type: 'validation'
          });
          hasParseError = true;
          parseErrorMessage = `Số ngày CTXH không được âm: ${parsedDays}`;
        } else if (parsedDays > 365) {
          // Check if value is unreasonably large (more than 365 days)
          errors.push({
            row: rowNumber,
            field: 'actualDays',
            value: daysValue,
            message: `Số ngày CTXH quá lớn: ${parsedDays}. Vui lòng kiểm tra lại`,
            type: 'validation'
          });
          hasParseError = true;
          parseErrorMessage = `Số ngày CTXH quá lớn: ${parsedDays}`;
        } else {
          actualDays = parsedDays;
        }
      }

      // Always add the record, even if it has errors (but use default actualDays = 0 for invalid cases)
      data.push({
        studentCode: parsedStudentCode,
        name: name ? name.toString().trim() : undefined,
        actualDays,
        note: note ? note.toString().trim() : undefined,
        _hasParseError: hasParseError,
        _parseErrorMessage: hasParseError ? parseErrorMessage : undefined
      });
    });

    return {
      data,
      errors,
      totalRows: dataRows.length,
      validRows: data.length
    };
  }

  /**
   * Find column index by possible names
   */
  private findColumnIndex(headers: string[], possibleNames: string[]): number {
    
    const index = headers.findIndex(header => {
      if (!header) return false;
      
      // Normalize header: remove accents, convert to lowercase, remove special chars
      const normalizedHeader = header.toString()
        .toLowerCase()
        .trim()
        .replace(/[àáạảãâầấậẩẫăằắặẳẵ]/g, 'a')
        .replace(/[èéẹẻẽêềếệểễ]/g, 'e')
        .replace(/[ìíịỉĩ]/g, 'i')
        .replace(/[òóọỏõôồốộổỗơờớợởỡ]/g, 'o')
        .replace(/[ùúụủũưừứựửữ]/g, 'u')
        .replace(/[ỳýỵỷỹ]/g, 'y')
        .replace(/[đ]/g, 'd')
        .replace(/[^a-z0-9]/g, ''); // Remove all non-alphanumeric
      
      
      return possibleNames.some(name => {
        const normalizedName = name.toLowerCase()
          .replace(/[àáạảãâầấậẩẫăằắặẳẵ]/g, 'a')
          .replace(/[èéẹẻẽêềếệểễ]/g, 'e')
          .replace(/[ìíịỉĩ]/g, 'i')
          .replace(/[òóọỏõôồốộổỗơờớợởỡ]/g, 'o')
          .replace(/[ùúụủũưừứựửữ]/g, 'u')
          .replace(/[ỳýỵỷỹ]/g, 'y')
          .replace(/[đ]/g, 'd')
          .replace(/[^a-z0-9]/g, '');
        
        const match = normalizedHeader.includes(normalizedName) || normalizedName.includes(normalizedHeader);
        if (match) {
        }
        return match;
      });
    });
    
    return index;
  }

  /**
   * Get cell value safely
   */
  private getCellValue(row: any[], index: number): any {
    if (index === -1 || index >= row.length) return null;
    
    const value = row[index];
    
    // Handle null/undefined/empty
    if (value === null || value === undefined || value === '') return null;
    
    // Convert to string and trim whitespace
    const stringValue = value.toString().trim();
    
    // Return null if empty after trimming
    if (stringValue === '') return null;
    
    // Log for debugging
    
    return stringValue;
  }

  /**
   * Validate email format
   */
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Process data in batches for large files
   */
  async processInBatches<T>(
    data: T[],
    batchSize: number,
    processor: (batch: T[], batchIndex: number) => Promise<any>,
    onProgress?: (progress: { currentBatch: number; totalBatches: number; percentage: number }) => void
  ): Promise<any[]> {
    const results: any[] = [];
    const totalBatches = Math.ceil(data.length / batchSize);

    for (let i = 0; i < totalBatches; i++) {
      const batch = data.slice(i * batchSize, (i + 1) * batchSize);
      
      try {
        const result = await processor(batch, i + 1);
        results.push(result);

        onProgress?.({
          currentBatch: i + 1,
          totalBatches,
          percentage: Math.round(((i + 1) / totalBatches) * 100)
        });

        // Small delay to prevent overwhelming the server
        if (i < totalBatches - 1) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      } catch (error) {
        console.error(`Batch ${i + 1} failed:`, error);
        throw error;
      }
    }

    return results;
  }
}

export const excelParserService = new ExcelParserService();
